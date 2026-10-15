using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Distribo.Api.Auth;
using Distribo.Api.Contracts;
using Distribo.Api.Data.Entities;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;
using Distribo.Api.Services;
using Microsoft.Extensions.Options;

namespace Distribo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class OrdersController(OrderService orders, PricingService pricing) : ControllerBase
{
    /// <summary>
    /// Rillogarit shportën me çmimet aktuale dhe kthen problemet për çdo rresht.
    /// Publik: vizitori sheh çmimet bazë; pas identifikimit çmimet llogariten sipas klientit.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("cart/pricing")]
    public async Task<ActionResult<CartPricingResponse>> Pricing(CartPricingRequest request, CancellationToken ct) =>
        Ok(await pricing.PriceAsync(User.OptionalCustomerId(), request.Items, ct));

    /// <summary>
    /// Krijon porosinë. Header-i "Idempotency-Key" është i detyrueshëm: e njëjta kërkesë e përsëritur
    /// (p.sh. pas humbjes së lidhjes) kthen të njëjtën porosi në vend që të krijojë një të dytë.
    /// </summary>
    [HttpPost("orders")]
    public async Task<ActionResult<CreateOrderResponse>> Create(
        CreateOrderRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken ct)
    {
        var result = await orders.CreateAsync(User.CustomerId(), User.UserId(), idempotencyKey, request, ct);
        return result.Replayed
            ? Ok(result)
            : CreatedAtAction(nameof(Get), new { id = result.Order.Id }, result);
    }

    [HttpGet("orders")]
    public async Task<ActionResult<PagedResult<OrderSummaryDto>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        (page, pageSize) = Paging.Clamp(page, pageSize);
        return Ok(await orders.ListAsync(User.CustomerId(), page, pageSize, ct));
    }

    [HttpGet("orders/{id:guid}")]
    public async Task<ActionResult<OrderDetailDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await orders.GetAsync(User.CustomerId(), id, ct));

    [HttpPost("orders/{id:guid}/cancel")]
    public async Task<ActionResult<OrderDetailDto>> Cancel(Guid id, CancellationToken ct) =>
        Ok(await orders.CancelByCustomerAsync(User.CustomerId(), id, ct));
}

/// <summary>
/// Endpoint-e server-me-server për programin e distribucionit (ose një administrator): ndryshojnë statusin
/// e porosive (dhe dërgojnë njoftimet) dhe miratojnë klientët e rinj. Kërkojnë header-in "X-Integration-Key";
/// pa çelës të konfiguruar janë joaktive. Mos e përdorni këtë çelës në aplikacionin celular.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/integration")]
public class IntegrationController(OrderService orders, IOptions<IntegrationOptions> options, Data.AppDbContext db)
    : ControllerBase
{
    [HttpPost("orders/{id:guid}/status")]
    public async Task<ActionResult<OrderDetailDto>> ChangeStatus(Guid id, ChangeStatusRequest request,
        [FromHeader(Name = "X-Integration-Key")] string? key, CancellationToken ct)
    {
        EnsureAllowed(key);
        if (!Enum.TryParse<OrderStatus>(request.Status, ignoreCase: true, out var status))
            throw ApiException.BadRequest(ErrorCodes.ValidationFailed, "Status i panjohur.");
        return Ok(await orders.ChangeStatusAsync(id, status, request.Note, ct));
    }

    [HttpPost("customers/{id:int}/approve")]
    public async Task<IActionResult> ApproveCustomer(int id, [FromHeader(Name = "X-Integration-Key")] string? key,
        [FromQuery] string? externalCode, CancellationToken ct)
    {
        EnsureAllowed(key);
        var customer = await db.Customers.FindAsync([id], ct) ?? throw ApiException.NotFound();
        customer.Status = CustomerStatus.Active;
        // Lidh llogarinë me kodin e klientit në programin e distribucionit.
        if (!string.IsNullOrWhiteSpace(externalCode)) customer.ExternalCode = externalCode.Trim();
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private void EnsureAllowed(string? key)
    {
        var expected = options.Value.ApiKey;
        if (string.IsNullOrEmpty(expected) ||
            !System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(key ?? ""), System.Text.Encoding.UTF8.GetBytes(expected)))
            throw ApiException.NotFound();
    }
}
