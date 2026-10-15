namespace Distribo.Api.Contracts;

public record CartItemRequest(int ProductId, decimal Quantity);

public record CartPricingRequest(IReadOnlyList<CartItemRequest> Items);

/// <summary>Problemet e një rreshti: "unavailable", "inactive", "below_minimum", "not_pack_multiple", "insufficient_stock".</summary>
public record CartLineIssue(string Code, string Message);

public record CartLineDto(
    int ProductId,
    string Code,
    string Name,
    string? ImageUrl,
    string Unit,
    decimal Quantity,
    decimal PackSize,
    decimal MinOrderQuantity,
    decimal ListPrice,
    decimal UnitPrice,
    decimal LineDiscount,
    decimal LineTotal,
    IReadOnlyList<CartLineIssue> Issues);

public record CartPricingResponse(
    IReadOnlyList<CartLineDto> Lines,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal DeliveryFee,
    decimal FreeDeliveryThreshold,
    decimal Total,
    bool IsValid,
    string Currency);

public record CreateOrderRequest(
    int AddressId,
    IReadOnlyList<CartItemRequest> Items,
    string? Notes,
    DateOnly? RequestedDeliveryDate,
    // Totali që klienti pa në ekranin e konfirmimit; nëse ndryshon, porosia refuzohet me "price_changed".
    decimal? ExpectedTotal);

public record CreateOrderResponse(OrderDetailDto Order, bool Replayed);

public record OrderSummaryDto(
    Guid Id,
    string Number,
    DateTime CreatedAt,
    string Status,
    decimal Total,
    int ItemCount);

public record OrderLineDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string? ImageUrl,
    string Unit,
    decimal Quantity,
    decimal ListPrice,
    decimal UnitPrice,
    decimal LineDiscount,
    decimal LineTotal);

public record OrderStatusChangeDto(string Status, DateTime ChangedAt, string? Note);

public record DeliveryAddressDto(int AddressId, string Name, string Street, string City, string? ContactName, string? ContactPhone);

public record OrderDetailDto(
    Guid Id,
    string Number,
    DateTime CreatedAt,
    string Status,
    bool CanCancel,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal DeliveryFee,
    decimal Total,
    string? Notes,
    DateOnly? RequestedDeliveryDate,
    DeliveryAddressDto DeliveryAddress,
    IReadOnlyList<OrderLineDto> Lines,
    IReadOnlyList<OrderStatusChangeDto> StatusHistory);

public record ChangeStatusRequest(string Status, string? Note);

public record NotificationDto(long Id, string Title, string Body, Guid? OrderId, DateTime CreatedAt, bool IsRead);

public record RegisterPushTokenRequest(string Token, string Platform);

public record UnregisterPushTokenRequest(string Token);
