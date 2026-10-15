using Microsoft.EntityFrameworkCore;
using Distribo.Api.Contracts;
using Distribo.Api.Data;
using Distribo.Api.Data.Entities;

namespace Distribo.Api.Services;

/// <summary>Rresht produkti me çmimin e vlefshëm për një klient të caktuar.</summary>
public record PricedProduct(
    Product Product,
    string CategoryName,
    decimal ListPrice,
    decimal? PromoPrice,
    string? PromoTitle,
    DateTime? PromoEndsAt)
{
    /// <summary>Çmimi që aplikohet: promocioni vetëm nëse është më i ulët se çmimi i listës.</summary>
    public decimal EffectivePrice => PromoPrice is { } p && p < ListPrice ? p : ListPrice;
}

public class CatalogQueries(AppDbContext db, TimeProvider clock)
{
    /// <summary>
    /// Produktet aktive me çmimin e klientit (çmim i veçantë ose çmimi bazë) dhe promocionin aktiv.
    /// Për vizitorët (customerId = null) përdoret çmimi bazë.
    /// Gjithçka llogaritet në SQL që renditja sipas çmimit dhe paginimi të funksionojnë në server.
    /// </summary>
    public IQueryable<PricedRow> PricedProducts(int? customerId)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        return
            from p in db.Products.AsNoTracking()
            where p.IsActive && p.Category.IsActive
            let customerPrice = db.CustomerPrices
                .Where(cp => customerId != null && cp.CustomerId == customerId && cp.ProductId == p.Id)
                .Select(cp => (decimal?)cp.Price)
                .FirstOrDefault()
            let promo = db.Promotions
                .Where(pr => pr.ProductId == p.Id && pr.IsActive && pr.StartsAt <= now && pr.EndsAt > now)
                .OrderBy(pr => pr.PromoPrice)
                .FirstOrDefault()
            let listPrice = customerPrice ?? p.BasePrice
            select new PricedRow
            {
                Product = p,
                CategoryName = p.Category.Name,
                ListPrice = listPrice,
                PromoPrice = promo != null && promo.PromoPrice < listPrice ? promo.PromoPrice : null,
                PromoTitle = promo != null && promo.PromoPrice < listPrice ? promo.Title : null,
                PromoEndsAt = promo != null && promo.PromoPrice < listPrice ? promo.EndsAt : null,
                EffectivePrice = promo != null && promo.PromoPrice < listPrice ? promo.PromoPrice : listPrice,
            };
    }

    public async Task<Dictionary<int, PricedProduct>> GetPricedByIdsAsync(int? customerId, IEnumerable<int> ids, CancellationToken ct)
    {
        var idList = ids.Distinct().ToList();
        var rows = await PricedProducts(customerId).Where(r => idList.Contains(r.Product.Id)).ToListAsync(ct);
        return rows.ToDictionary(r => r.Product.Id, r => r.ToPriced());
    }

    public static ProductDto ToDto(PricedProduct p) => new(
        p.Product.Id,
        p.Product.Code,
        p.Product.Barcode,
        p.Product.Name,
        p.Product.CategoryId,
        p.CategoryName,
        p.Product.ImageUrl,
        p.Product.Unit,
        p.Product.PackagingInfo,
        p.Product.PackSize,
        p.Product.MinOrderQuantity,
        p.ListPrice,
        p.PromoPrice,
        p.PromoTitle,
        Stock(p.Product));

    public static ProductDetailDto ToDetailDto(PricedProduct p) => new(
        p.Product.Id,
        p.Product.Code,
        p.Product.Barcode,
        p.Product.Name,
        p.Product.Description,
        p.Product.CategoryId,
        p.CategoryName,
        p.Product.ImageUrl,
        p.Product.Unit,
        p.Product.PackagingInfo,
        p.Product.PackSize,
        p.Product.MinOrderQuantity,
        p.ListPrice,
        p.PromoPrice,
        p.PromoTitle,
        p.PromoEndsAt,
        Stock(p.Product));

    private static StockDto Stock(Product p) =>
        new(p.ShowStock, p.ShowStock ? p.StockQuantity : null, p.StockQuantity > 0);
}

/// <summary>Formë e përkohshme për projeksionin në SQL (EF nuk projekton dot direkt në record me konstruktor).</summary>
public class PricedRow
{
    public Product Product { get; set; } = null!;
    public string CategoryName { get; set; } = "";
    public decimal ListPrice { get; set; }
    public decimal? PromoPrice { get; set; }
    public string? PromoTitle { get; set; }
    public DateTime? PromoEndsAt { get; set; }
    public decimal EffectivePrice { get; set; }

    public PricedProduct ToPriced() => new(Product, CategoryName, ListPrice, PromoPrice, PromoTitle, PromoEndsAt);
}
