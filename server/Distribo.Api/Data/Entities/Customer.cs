namespace Distribo.Api.Data.Entities;

public enum CustomerStatus
{
    PendingApproval = 0,
    Active = 1,
    Blocked = 2,
}

/// <summary>Klienti tregtar (biznesi). Një klient mund të ketë disa përdorues dhe disa pika shitjeje.</summary>
public class Customer
{
    public int Id { get; set; }

    /// <summary>Kodi i klientit në programin e distribucionit (për integrimin e mëvonshëm).</summary>
    public string? ExternalCode { get; set; }

    public required string BusinessName { get; set; }
    public string? TaxNumber { get; set; }
    public CustomerStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<UserAccount> Users { get; set; } = [];
    public List<Address> Addresses { get; set; } = [];
}

/// <summary>Pikë shitjeje / adresë dorëzimi e autorizuar për klientin.</summary>
public class Address
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public required string Name { get; set; }
    public required string Street { get; set; }
    public required string City { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}
