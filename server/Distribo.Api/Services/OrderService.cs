using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Distribo.Api.Contracts;
using Distribo.Api.Data;
using Distribo.Api.Data.Entities;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;

namespace Distribo.Api.Services;

public partial class OrderService(
    AppDbContext db,
    PricingService pricing,
    NotificationService notifications,
    IOptions<PricingOptions> pricingOptions,
    TimeProvider clock,
    ILogger<OrderService> logger)
{
    public const int MaxRequestedDeliveryDays = 30;

    /// <summary>Kalimet e lejuara të statusit. Vendosen vetëm nga backend-i.</summary>
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Transitions = new()
    {
        [OrderStatus.Pending] = [OrderStatus.Confirmed, OrderStatus.Cancelled],
        [OrderStatus.Confirmed] = [OrderStatus.Preparing, OrderStatus.Cancelled],
        [OrderStatus.Preparing] = [OrderStatus.InTransit],
        [OrderStatus.InTransit] = [OrderStatus.Delivered],
        [OrderStatus.Delivered] = [],
        [OrderStatus.Cancelled] = [],
    };

    public static bool CanTransition(OrderStatus from, OrderStatus to) => Transitions[from].Contains(to);

    /// <summary>Klienti mund ta anulojë vetë porosinë vetëm para se të konfirmohet.</summary>
    public static bool CustomerCanCancel(OrderStatus status) => status == OrderStatus.Pending;

    public async Task<CreateOrderResponse> CreateAsync(
        int customerId, int userId, string? idempotencyKey, CreateOrderRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey) || !IdempotencyKeyShape().IsMatch(idempotencyKey))
            throw ApiException.BadRequest(ErrorCodes.IdempotencyKeyRequired,
                "Mungon ose është i pavlefshëm header-i Idempotency-Key (8–64 karaktere).");

        var requestHash = HashRequest(request);

        // Ripërsëritje e së njëjtës kërkesë (p.sh. pas humbjes së lidhjes): kthe porosinë ekzistuese.
        var existing = await FindByKeyAsync(customerId, idempotencyKey, ct);
        if (existing is not null) return Replay(existing, requestHash);

        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (request.RequestedDeliveryDate is { } date &&
            (date < today || date > today.AddDays(MaxRequestedDeliveryDays)))
            throw ApiException.Validation(new Dictionary<string, string[]>
            {
                ["requestedDeliveryDate"] = [$"Data duhet të jetë nga sot deri në {MaxRequestedDeliveryDays} ditë."],
            });

        if (request.Notes is { Length: > 1000 })
            throw ApiException.Validation(new Dictionary<string, string[]>
            {
                ["notes"] = ["Shënimet mund të kenë maksimumi 1000 karaktere."],
            });

        var address = await db.Addresses.AsNoTracking()
            .SingleOrDefaultAsync(a => a.Id == request.AddressId && a.CustomerId == customerId && a.IsActive, ct)
            ?? throw ApiException.BadRequest(ErrorCodes.AddressInvalid, "Adresa e dorëzimit nuk është e vlefshme.");

        var priced = await pricing.PriceAsync(customerId, request.Items, ct);
        if (!priced.IsValid)
            throw ApiException.Conflict(ErrorCodes.CartInvalid,
                "Disa artikuj në shportë kanë ndryshuar. Rishiko shportën para dërgimit.");

        if (request.ExpectedTotal is { } expected && expected != priced.Total)
            throw ApiException.Conflict("price_changed",
                "Çmimet kanë ndryshuar që nga hapja e shportës. Rishiko totalin e ri.");

        var now = clock.GetUtcNow().UtcDateTime;
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        if (pricingOptions.Value.EnforceStock)
        {
            // Rezervim atomik i stokut: dështon nëse dikush tjetër e ka marrë ndërkohë.
            foreach (var line in priced.Lines)
            {
                var affected = await db.Products
                    .Where(p => p.Id == line.ProductId && p.StockQuantity >= line.Quantity)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.StockQuantity, p => p.StockQuantity - line.Quantity), ct);
                if (affected == 0)
                {
                    await tx.RollbackAsync(ct);
                    throw ApiException.Conflict(ErrorCodes.CartInvalid,
                        $"Stoku për \"{line.Name}\" nuk mjafton më. Rishiko shportën.");
                }
            }
        }

        var sequence = await db.NextOrderNumberAsync(ct);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            Number = $"P{now:yy}-{sequence:D6}",
            CustomerId = customerId,
            UserId = userId,
            IdempotencyKey = idempotencyKey,
            RequestHash = requestHash,
            AddressId = address.Id,
            DeliveryName = address.Name,
            DeliveryStreet = address.Street,
            DeliveryCity = address.City,
            ContactName = address.ContactName,
            ContactPhone = address.ContactPhone,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            RequestedDeliveryDate = request.RequestedDeliveryDate,
            Status = OrderStatus.Pending,
            Subtotal = priced.Subtotal,
            DiscountTotal = priced.DiscountTotal,
            DeliveryFee = priced.DeliveryFee,
            Total = priced.Total,
            CreatedAt = now,
            UpdatedAt = now,
            Lines = priced.Lines.Select(l => new OrderLine
            {
                ProductId = l.ProductId,
                ProductCode = l.Code,
                ProductName = l.Name,
                ImageUrl = l.ImageUrl,
                Unit = l.Unit,
                Quantity = l.Quantity,
                ListPrice = l.ListPrice,
                UnitPrice = l.UnitPrice,
                LineDiscount = l.LineDiscount,
                LineTotal = l.LineTotal,
            }).ToList(),
            StatusHistory = [new OrderStatusChange { Status = OrderStatus.Pending, ChangedAt = now }],
        };

        db.Orders.Add(order);
        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // Dy kërkesa me të njëjtin çelës njëkohësisht: fiton e para, e dyta kthen të njëjtën porosi.
            await tx.RollbackAsync(ct);
            db.ChangeTracker.Clear();
            var winner = await FindByKeyAsync(customerId, idempotencyKey, ct);
            if (winner is null) throw;
            return Replay(winner, requestHash);
        }

        logger.LogInformation("U krijua porosia {OrderNumber} për klientin {CustomerId}.", order.Number, customerId);
        await notifications.NotifyAsync(userId, NotificationKind.OrderUpdate, $"Porosia {order.Number}",
            NotificationService.StatusMessage(OrderStatus.Pending), order.Id, ct);

        return new CreateOrderResponse(ToDetail(order), Replayed: false);
    }

    public async Task<PagedResult<OrderSummaryDto>> ListAsync(int customerId, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Orders.AsNoTracking().Where(o => o.CustomerId == customerId);
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderSummaryDto(o.Id, o.Number, o.CreatedAt, o.Status.ToString(), o.Total, o.Lines.Count))
            .ToListAsync(ct);
        return new PagedResult<OrderSummaryDto>(items, page, pageSize, total);
    }

    public async Task<OrderDetailDto> GetAsync(int customerId, Guid id, CancellationToken ct)
    {
        // Filtri sipas klientit garanton që një klient nuk lexon dot porosinë e tjetrit (kthehet 404, jo 403).
        var order = await LoadAsync(customerId, id, ct) ?? throw ApiException.NotFound(message: "Porosia nuk u gjet.");
        return ToDetail(order);
    }

    public async Task<OrderDetailDto> CancelByCustomerAsync(int customerId, Guid id, CancellationToken ct)
    {
        var order = await db.Orders.SingleOrDefaultAsync(o => o.Id == id && o.CustomerId == customerId, ct)
                    ?? throw ApiException.NotFound(message: "Porosia nuk u gjet.");
        if (!CustomerCanCancel(order.Status))
            throw ApiException.Conflict(ErrorCodes.InvalidStatusTransition,
                "Porosia nuk mund të anulohet më, sepse është konfirmuar. Kontakto distributorin.");

        await ChangeStatusAsync(order, OrderStatus.Cancelled, "Anuluar nga klienti.", ct);
        return ToDetail((await LoadAsync(customerId, id, ct))!);
    }

    /// <summary>Ndryshim statusi nga një proces i autorizuar (p.sh. programi i distribucionit).</summary>
    public async Task<OrderDetailDto> ChangeStatusAsync(Guid id, OrderStatus status, string? note, CancellationToken ct)
    {
        var order = await db.Orders.SingleOrDefaultAsync(o => o.Id == id, ct)
                    ?? throw ApiException.NotFound(message: "Porosia nuk u gjet.");
        await ChangeStatusAsync(order, status, note, ct);
        return ToDetail((await LoadAsync(order.CustomerId, id, ct))!);
    }

    private async Task ChangeStatusAsync(Order order, OrderStatus status, string? note, CancellationToken ct)
    {
        if (!CanTransition(order.Status, status))
            throw ApiException.Conflict(ErrorCodes.InvalidStatusTransition,
                $"Kalimi nga {order.Status} në {status} nuk lejohet.");

        var now = clock.GetUtcNow().UtcDateTime;
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        if (status == OrderStatus.Cancelled && pricingOptions.Value.EnforceStock)
        {
            var lines = await db.OrderLines.Where(l => l.OrderId == order.Id).ToListAsync(ct);
            foreach (var line in lines)
            {
                await db.Products.Where(p => p.Id == line.ProductId)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.StockQuantity, p => p.StockQuantity + line.Quantity), ct);
            }
        }

        order.Status = status;
        order.UpdatedAt = now;
        db.OrderStatusChanges.Add(new OrderStatusChange { OrderId = order.Id, Status = status, ChangedAt = now, Note = note });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await notifications.NotifyAsync(order.UserId, NotificationKind.OrderUpdate, $"Porosia {order.Number}",
            NotificationService.StatusMessage(status), order.Id, ct);
    }

    private Task<Order?> LoadAsync(int customerId, Guid id, CancellationToken ct) =>
        db.Orders.AsNoTracking()
            .Include(o => o.Lines)
            .Include(o => o.StatusHistory)
            .AsSplitQuery()
            .SingleOrDefaultAsync(o => o.Id == id && o.CustomerId == customerId, ct);

    private Task<Order?> FindByKeyAsync(int customerId, string key, CancellationToken ct) =>
        db.Orders.AsNoTracking()
            .Include(o => o.Lines)
            .Include(o => o.StatusHistory)
            .AsSplitQuery()
            .SingleOrDefaultAsync(o => o.CustomerId == customerId && o.IdempotencyKey == key, ct);

    private static CreateOrderResponse Replay(Order existing, string requestHash)
    {
        if (existing.RequestHash != requestHash)
            throw ApiException.Conflict(ErrorCodes.IdempotencyKeyReused,
                "Ky çelës idempotence është përdorur për një porosi tjetër.");
        return new CreateOrderResponse(ToDetail(existing), Replayed: true);
    }

    public static OrderDetailDto ToDetail(Order o) => new(
        o.Id,
        o.Number,
        o.CreatedAt,
        o.Status.ToString(),
        CustomerCanCancel(o.Status),
        o.Subtotal,
        o.DiscountTotal,
        o.DeliveryFee,
        o.Total,
        o.Notes,
        o.RequestedDeliveryDate,
        new DeliveryAddressDto(o.AddressId, o.DeliveryName, o.DeliveryStreet, o.DeliveryCity, o.ContactName, o.ContactPhone),
        o.Lines.OrderBy(l => l.Id).Select(l => new OrderLineDto(l.ProductId, l.ProductCode, l.ProductName, l.ImageUrl,
            l.Unit, l.Quantity, l.ListPrice, l.UnitPrice, l.LineDiscount, l.LineTotal)).ToList(),
        o.StatusHistory.OrderBy(h => h.ChangedAt).ThenBy(h => h.Id)
            .Select(h => new OrderStatusChangeDto(h.Status.ToString(), h.ChangedAt, h.Note)).ToList());

    /// <summary>Hash i përmbajtjes; renditja e artikujve nuk ndikon.</summary>
    private static string HashRequest(CreateOrderRequest r)
    {
        var sb = new StringBuilder();
        sb.Append(r.AddressId).Append('|').Append(r.Notes?.Trim()).Append('|')
          .Append(r.RequestedDeliveryDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)).Append('|');
        foreach (var item in (r.Items ?? []).OrderBy(i => i.ProductId))
            sb.Append(item.ProductId).Append(':').Append(item.Quantity.ToString("0.###", CultureInfo.InvariantCulture)).Append(';');
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString())));
    }

    [GeneratedRegex("^[A-Za-z0-9_-]{8,64}$")]
    private static partial Regex IdempotencyKeyShape();
}
