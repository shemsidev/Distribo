using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Distribo.Api.Auth;
using Distribo.Api.Contracts;
using Distribo.Api.Data;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;
using Distribo.Api.Services;

namespace Distribo.Api.Controllers;

/// <summary>
/// Katalogu është publik: vizitorët shohin kategoritë, produktet dhe çmimet bazë.
/// Me token, çmimet llogariten sipas klientit. Porosia kërkon gjithmonë identifikim.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api")]
public class CatalogController(AppDbContext db, CatalogQueries catalog, OrderService orders, IOptions<StorefrontOptions> storefront)
    : ControllerBase
{
    /// <summary>Kategoritë e një niveli: kryesoret (pa parentId) ose nënkategoritë e një kategorie.</summary>
    [HttpGet("catalog/categories")]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> Categories([FromQuery] int? parentId, CancellationToken ct)
    {
        Response.Headers.CacheControl = "public, max-age=300";
        return Ok(await LoadCategoriesAsync(parentId, ct));
    }

    [HttpGet("catalog/categories/{id:int}")]
    public async Task<ActionResult<CategoryDetailDto>> Category(int id, CancellationToken ct)
    {
        var category = (await ProjectCategories(db.Categories.Where(c => c.Id == id && c.IsActive)).ToListAsync(ct)).SingleOrDefault()
                       ?? throw ApiException.NotFound(message: "Kategoria nuk u gjet.");
        var parent = category.ParentId is { } pid
            ? (await ProjectCategories(db.Categories.Where(c => c.Id == pid)).ToListAsync(ct)).SingleOrDefault()
            : null;
        var children = await LoadCategoriesAsync(id, ct);
        return Ok(new CategoryDetailDto(category, parent, children));
    }

    /// <summary>Kërkim sipas emrit, kodit ose barkodit, me filtrim, renditje dhe paginim në server.</summary>
    [HttpGet("catalog/products")]
    public async Task<ActionResult<PagedResult<ProductDto>>> Products(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] string? sort,
        [FromQuery] bool promoOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        (page, pageSize) = Paging.Clamp(page, pageSize);
        var query = catalog.PricedProducts(User.OptionalCustomerId());

        // Kategoria kryesore përfshin edhe produktet e nënkategorive të saj.
        if (categoryId is { } cid)
            query = query.Where(r => r.Product.CategoryId == cid || r.Product.Category.ParentId == cid);
        if (promoOnly) query = query.Where(r => r.PromoPrice != null);

        var term = search?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            if (term.Length > 100) term = term[..100];
            var pattern = DbDialect.LikeContains(term);
            query = db.Database.IsNpgsql()
                ? query.Where(r => EF.Functions.ILike(r.Product.Name, pattern, "\\")
                                   || EF.Functions.ILike(r.Product.Code, pattern, "\\")
                                   || r.Product.Barcode == term)
                : query.Where(r => EF.Functions.Like(r.Product.Name, pattern, "\\")
                                   || EF.Functions.Like(r.Product.Code, pattern, "\\")
                                   || r.Product.Barcode == term);
        }

        query = sort switch
        {
            "price_asc" => query.OrderBy(r => r.EffectivePrice).ThenBy(r => r.Product.Id),
            "price_desc" => query.OrderByDescending(r => r.EffectivePrice).ThenBy(r => r.Product.Id),
            "name_desc" => query.OrderByDescending(r => r.Product.Name).ThenBy(r => r.Product.Id),
            _ => query.OrderBy(r => r.Product.Name).ThenBy(r => r.Product.Id),
        };

        var total = await query.CountAsync(ct);
        var rows = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var items = rows.Select(r => CatalogQueries.ToDto(r.ToPriced())).ToList();
        return Ok(new PagedResult<ProductDto>(items, page, pageSize, total));
    }

    [HttpGet("catalog/products/{id:int}")]
    public async Task<ActionResult<ProductDetailDto>> Product(int id, CancellationToken ct)
    {
        var row = await catalog.PricedProducts(User.OptionalCustomerId()).SingleOrDefaultAsync(r => r.Product.Id == id, ct)
                  ?? throw ApiException.NotFound(message: "Produkti nuk u gjet ose nuk është më aktiv.");
        return Ok(CatalogQueries.ToDetailDto(row.ToPriced()));
    }

    /// <summary>Të dhënat e kryefaqes në një kërkesë të vetme (më pak vonesë në rrjete të ngadalta).</summary>
    [HttpGet("home")]
    public async Task<ActionResult<HomeResponse>> Home(CancellationToken ct)
    {
        var customerId = User.OptionalCustomerId();
        var userId = User.OptionalUserId();

        string? greeting = null;
        if (userId is { } uid)
        {
            var name = await db.Users.Where(u => u.Id == uid).Select(u => u.FullName).SingleOrDefaultAsync(ct);
            greeting = name?.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? name;
        }

        var categories = await LoadCategoriesAsync(null, ct);

        var offerRows = await catalog.PricedProducts(customerId)
            .Where(r => r.PromoPrice != null)
            .OrderBy(r => r.PromoEndsAt).ThenBy(r => r.Product.Id)
            .Take(12).ToListAsync(ct);

        // Të blerat shpesh nga ky klient; për vizitorët (ose pa histori) më të porositurat në përgjithësi.
        var frequentIds = customerId is { } cid
            ? await db.OrderLines.Where(l => l.Order.CustomerId == cid)
                .GroupBy(l => l.ProductId).OrderByDescending(g => g.Count()).ThenBy(g => g.Key)
                .Select(g => g.Key).Take(12).ToListAsync(ct)
            : [];
        if (frequentIds.Count == 0)
            frequentIds = await db.OrderLines.GroupBy(l => l.ProductId)
                .OrderByDescending(g => g.Count()).ThenBy(g => g.Key)
                .Select(g => g.Key).Take(12).ToListAsync(ct);
        if (frequentIds.Count == 0)
            frequentIds = await db.Products.Where(p => p.IsActive).OrderByDescending(p => p.StockQuantity)
                .ThenBy(p => p.Id).Select(p => p.Id).Take(12).ToListAsync(ct);

        var frequentMap = await catalog.GetPricedByIdsAsync(customerId, frequentIds, ct);
        var frequent = frequentIds.Where(frequentMap.ContainsKey).Select(id => CatalogQueries.ToDto(frequentMap[id])).ToList();

        var recent = customerId is { } c ? (await orders.ListAsync(c, 1, 3, ct)).Items : [];

        return Ok(new HomeResponse(
            greeting,
            NullIfEmpty(storefront.Value.Notice),
            NullIfEmpty(storefront.Value.Ticker),
            categories,
            offerRows.Select(r => CatalogQueries.ToDto(r.ToPriced())).ToList(),
            frequent,
            recent));
    }

    private static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private Task<List<CategoryDto>> LoadCategoriesAsync(int? parentId, CancellationToken ct) =>
        ProjectCategories(db.Categories.Where(c => c.IsActive && c.ParentId == parentId))
            .ToListAsync(ct);

    private IQueryable<CategoryDto> ProjectCategories(IQueryable<Data.Entities.Category> source) =>
        source.AsNoTracking()
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new CategoryDto(
                c.Id,
                c.ParentId,
                c.Name,
                c.Icon,
                c.ImageUrl,
                db.Products.Count(p => p.IsActive && (p.CategoryId == c.Id || p.Category.ParentId == c.Id)),
                c.Children.Count(ch => ch.IsActive)));
}
