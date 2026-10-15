using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Distribo.Api.Auth;
using Distribo.Api.Contracts;
using Distribo.Api.Data;
using Distribo.Api.Data.Entities;
using Distribo.Api.Infrastructure;

namespace Distribo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class MeController(AppDbContext db, TimeProvider clock) : ControllerBase
{
    private static readonly string[] SupportedLanguages = ["sq", "en"];

    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Get(CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Customer)
            .SingleAsync(u => u.Id == User.UserId(), ct);
        return Ok(AuthService.ToMe(user));
    }

    /// <summary>Vetëm preferencat personale; të dhënat tregtare të klientit ndryshohen nga distributori.</summary>
    [HttpPut("me/preferences")]
    public async Task<ActionResult<MeResponse>> UpdatePreferences(UpdatePreferencesRequest request, CancellationToken ct)
    {
        var user = await db.Users.Include(u => u.Customer).SingleAsync(u => u.Id == User.UserId(), ct);
        if (request.OrderUpdates is { } orders) user.NotifyOrderUpdates = orders;
        if (request.Offers is { } offers) user.NotifyOffers = offers;
        if (request.Language is { } language)
        {
            if (!SupportedLanguages.Contains(language))
                throw ApiException.BadRequest(ErrorCodes.ValidationFailed, "Gjuha nuk mbështetet.");
            user.Language = language;
        }
        await db.SaveChangesAsync(ct);
        return Ok(AuthService.ToMe(user));
    }

    [HttpGet("addresses")]
    public async Task<ActionResult<IReadOnlyList<AddressDto>>> Addresses(CancellationToken ct)
    {
        var customerId = User.CustomerId();
        var items = await db.Addresses.AsNoTracking()
            .Where(a => a.CustomerId == customerId && a.IsActive)
            .OrderByDescending(a => a.IsDefault).ThenBy(a => a.Name)
            .Select(a => new AddressDto(a.Id, a.Name, a.Street, a.City, a.ContactName, a.ContactPhone, a.IsDefault))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<PagedResult<NotificationDto>>> Notifications(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        (page, pageSize) = Paging.Clamp(page, pageSize);
        var query = db.Notifications.AsNoTracking().Where(n => n.UserId == User.UserId());
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Body, n.OrderId, n.CreatedAt, n.ReadAt != null))
            .ToListAsync(ct);
        return Ok(new PagedResult<NotificationDto>(items, page, pageSize, total));
    }

    [HttpPost("notifications/read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        await db.Notifications.Where(n => n.UserId == User.UserId() && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
        return NoContent();
    }

    [HttpPost("devices/push-token")]
    public async Task<IActionResult> RegisterPushToken(RegisterPushTokenRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || request.Token.Length > 255 ||
            !request.Token.StartsWith("ExponentPushToken[", StringComparison.Ordinal))
            throw ApiException.BadRequest(ErrorCodes.ValidationFailed, "Token-i i pajisjes nuk është i vlefshëm.");
        if (request.Platform is not ("ios" or "android" or "web"))
            throw ApiException.BadRequest(ErrorCodes.ValidationFailed, "Platforma nuk është e vlefshme.");

        var now = clock.GetUtcNow().UtcDateTime;
        var existing = await db.PushTokens.SingleOrDefaultAsync(t => t.Token == request.Token, ct);
        if (existing is null)
        {
            db.PushTokens.Add(new PushToken
            {
                UserId = User.UserId(), Token = request.Token, Platform = request.Platform, CreatedAt = now, LastSeenAt = now,
            });
        }
        else
        {
            // E njëjta pajisje, përdorues tjetër: token-i kalon te llogaria aktuale.
            existing.UserId = User.UserId();
            existing.Platform = request.Platform;
            existing.LastSeenAt = now;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("devices/push-token/remove")]
    public async Task<IActionResult> UnregisterPushToken(UnregisterPushTokenRequest request, CancellationToken ct)
    {
        await db.PushTokens.Where(t => t.Token == request.Token && t.UserId == User.UserId()).ExecuteDeleteAsync(ct);
        return NoContent();
    }
}

public static class Paging
{
    public static (int Page, int PageSize) Clamp(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));
}
