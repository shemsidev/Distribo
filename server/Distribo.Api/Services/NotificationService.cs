using System.Net.Http.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Distribo.Api.Data;
using Distribo.Api.Data.Entities;
using Distribo.Api.Options;

namespace Distribo.Api.Services;

public record PushMessage(int UserId, string Title, string Body, Guid? OrderId);

public enum NotificationKind
{
    OrderUpdate,
    Offer,
}

/// <summary>
/// Ruan njoftimin në historik dhe e vendos në radhë për push. Teksti nuk përmban vlera financiare,
/// sepse njoftimet shfaqen edhe në ekranin e kyçur.
/// </summary>
public class NotificationService(AppDbContext db, TimeProvider clock, Channel<PushMessage> queue)
{
    public async Task NotifyAsync(int userId, NotificationKind kind, string title, string body, Guid? orderId, CancellationToken ct)
    {
        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Body = body,
            OrderId = orderId,
            CreatedAt = clock.GetUtcNow().UtcDateTime,
        });
        await db.SaveChangesAsync(ct);

        var prefs = await db.Users.Where(u => u.Id == userId)
            .Select(u => new { u.NotifyOrderUpdates, u.NotifyOffers })
            .SingleAsync(ct);
        var allowed = kind == NotificationKind.OrderUpdate ? prefs.NotifyOrderUpdates : prefs.NotifyOffers;
        if (allowed)
            queue.Writer.TryWrite(new PushMessage(userId, title, body, orderId));
    }

    public static string StatusMessage(OrderStatus status) => status switch
    {
        OrderStatus.Pending => "Porosia juaj u pranua dhe është në pritje të konfirmimit.",
        OrderStatus.Confirmed => "Porosia juaj u konfirmua.",
        OrderStatus.Preparing => "Porosia juaj po përgatitet.",
        OrderStatus.InTransit => "Porosia juaj u nis për dorëzim.",
        OrderStatus.Delivered => "Porosia juaj u dorëzua.",
        OrderStatus.Cancelled => "Porosia juaj u anulua.",
        _ => "Statusi i porosisë u përditësua.",
    };
}

/// <summary>Dërgon push-et në Expo Push API në sfond, që kërkesa e klientit të mos presë.</summary>
public class ExpoPushSender(
    Channel<PushMessage> queue,
    IServiceScopeFactory scopes,
    IHttpClientFactory httpFactory,
    IOptions<PushOptions> options,
    ILogger<ExpoPushSender> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (!options.Value.Enabled) continue;
            try
            {
                await SendAsync(message, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Dërgimi i push-it dështoi për përdoruesin {UserId}.", message.UserId);
            }
        }
    }

    private async Task SendAsync(PushMessage message, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tokens = await db.PushTokens.Where(t => t.UserId == message.UserId).ToListAsync(ct);
        if (tokens.Count == 0) return;

        var payload = tokens.Select(t => new
        {
            to = t.Token,
            title = message.Title,
            body = message.Body,
            sound = "default",
            data = new { orderId = message.OrderId },
        }).ToList();

        var http = httpFactory.CreateClient(nameof(ExpoPushSender));
        using var response = await http.PostAsJsonAsync(options.Value.ExpoPushUrl, payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Expo Push API ktheu {Status}.", (int)response.StatusCode);
            return;
        }

        var result = await response.Content.ReadFromJsonAsync<ExpoPushResponse>(ct);
        if (result?.Data is null) return;

        // Fshi token-at që Expo i raporton si të paregjistruar (aplikacioni u çinstalua etj.).
        var stale = new List<PushToken>();
        for (var i = 0; i < result.Data.Count && i < tokens.Count; i++)
        {
            if (result.Data[i].Details?.Error == "DeviceNotRegistered") stale.Add(tokens[i]);
        }
        if (stale.Count > 0)
        {
            db.PushTokens.RemoveRange(stale);
            await db.SaveChangesAsync(ct);
        }
    }

    private sealed record ExpoPushResponse(List<ExpoTicket>? Data);
    private sealed record ExpoTicket(string? Status, string? Message, ExpoTicketDetails? Details);
    private sealed record ExpoTicketDetails(string? Error);
}
