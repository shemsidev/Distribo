namespace Distribo.Api.Data.Entities;

/// <summary>Kategori me dy nivele: kategori kryesore (ParentId = null) dhe nënkategori.</summary>
public class Category
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public Category? Parent { get; set; }
    public List<Category> Children { get; set; } = [];

    public required string Name { get; set; }
    public string? Icon { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Product
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public string? Barcode { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public string? ImageUrl { get; set; }

    /// <summary>Njësia e shitjes, p.sh. "copë", "pako", "kg".</summary>
    public required string Unit { get; set; }

    /// <summary>Përshkrimi i paketimit, p.sh. "Arkë 24 copë".</summary>
    public string? PackagingInfo { get; set; }

    /// <summary>Sasia duhet të jetë shumëfish i kësaj vlere (p.sh. 6 për pako me 6).</summary>
    public decimal PackSize { get; set; } = 1;

    public decimal MinOrderQuantity { get; set; } = 1;

    /// <summary>Çmimi bazë (pa TVSH-në e veçuar), përdoret kur klienti nuk ka çmim të veçantë.</summary>
    public decimal BasePrice { get; set; }

    public decimal StockQuantity { get; set; }
    public bool ShowStock { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Çmim i veçantë për një klient të caktuar.</summary>
public class CustomerPrice
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Price { get; set; }
}

public class Promotion
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public required string Title { get; set; }
    public decimal PromoPrice { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
}
