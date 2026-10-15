namespace Distribo.Api.Data.Entities;

public enum OrderStatus
{
    Pending = 0,
    Confirmed = 1,
    Preparing = 2,
    InTransit = 3,
    Delivered = 4,
    Cancelled = 5,
}

public class Order
{
    public Guid Id { get; set; }
    public required string Number { get; set; }

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int UserId { get; set; }
    public UserAccount User { get; set; } = null!;

    /// <summary>Çelësi i idempotencës i dërguar nga klienti; unik për çdo klient.</summary>
    public required string IdempotencyKey { get; set; }

    /// <summary>Hash i përmbajtjes së kërkesës, për të dalluar ripërdorimin e çelësit me të dhëna të tjera.</summary>
    public required string RequestHash { get; set; }

    // Kopje e adresës në momentin e porosisë.
    public int AddressId { get; set; }
    public required string DeliveryName { get; set; }
    public required string DeliveryStreet { get; set; }
    public required string DeliveryCity { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }

    public string? Notes { get; set; }
    public DateOnly? RequestedDeliveryDate { get; set; }

    public OrderStatus Status { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<OrderLine> Lines { get; set; } = [];
    public List<OrderStatusChange> StatusHistory { get; set; } = [];
}

public class OrderLine
{
    public long Id { get; set; }
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int ProductId { get; set; }
    public required string ProductCode { get; set; }
    public required string ProductName { get; set; }
    public string? ImageUrl { get; set; }
    public required string Unit { get; set; }
    public decimal Quantity { get; set; }

    /// <summary>Çmimi i listës për klientin (para promocionit).</summary>
    public decimal ListPrice { get; set; }

    /// <summary>Çmimi i aplikuar për njësi.</summary>
    public decimal UnitPrice { get; set; }

    public decimal LineDiscount { get; set; }
    public decimal LineTotal { get; set; }
}

public class OrderStatusChange
{
    public long Id { get; set; }
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public OrderStatus Status { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Note { get; set; }
}
