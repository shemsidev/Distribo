namespace Distribo.Api.Contracts;

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public bool HasMore => Page * PageSize < TotalCount;
}

public record CategoryDto(int Id, int? ParentId, string Name, string? Icon, string? ImageUrl, int ProductCount, int SubcategoryCount);

public record CategoryDetailDto(CategoryDto Category, CategoryDto? Parent, IReadOnlyList<CategoryDto> Children);

public record StockDto(bool Visible, decimal? Quantity, bool InStock);

public record ProductDto(
    int Id,
    string Code,
    string? Barcode,
    string Name,
    int CategoryId,
    string CategoryName,
    string? ImageUrl,
    string Unit,
    string? PackagingInfo,
    decimal PackSize,
    decimal MinOrderQuantity,
    decimal Price,
    decimal? PromoPrice,
    string? PromoTitle,
    StockDto Stock);

public record ProductDetailDto(
    int Id,
    string Code,
    string? Barcode,
    string Name,
    string? Description,
    int CategoryId,
    string CategoryName,
    string? ImageUrl,
    string Unit,
    string? PackagingInfo,
    decimal PackSize,
    decimal MinOrderQuantity,
    decimal Price,
    decimal? PromoPrice,
    string? PromoTitle,
    DateTime? PromoEndsAt,
    StockDto Stock);

/// <summary>Kryefaqja; Greeting dhe RecentOrders janë bosh për vizitorët pa llogari.</summary>
public record HomeResponse(
    string? Greeting,
    string? Notice,
    string? Ticker,
    IReadOnlyList<CategoryDto> Categories,
    IReadOnlyList<ProductDto> Offers,
    IReadOnlyList<ProductDto> FrequentlyBought,
    IReadOnlyList<OrderSummaryDto> RecentOrders);
