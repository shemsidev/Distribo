using Microsoft.Extensions.Options;
using Distribo.Api.Contracts;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;

namespace Distribo.Api.Services;

/// <summary>
/// Burimi i vetëm i së vërtetës për çmimet. Totali që llogarit celulari është vetëm parashikim;
/// porosia ruhet gjithmonë me vlerat e llogaritura këtu.
/// </summary>
public class PricingService(CatalogQueries catalog, IOptions<PricingOptions> options)
{
    public const int MaxLines = 200;
    public const decimal MaxQuantity = 100_000;
    public const string Currency = "ALL";

    private readonly PricingOptions _opt = options.Value;

    public async Task<CartPricingResponse> PriceAsync(int? customerId, IReadOnlyList<CartItemRequest>? items, CancellationToken ct)
    {
        items ??= [];
        if (items.Count > MaxLines)
            throw ApiException.BadRequest(ErrorCodes.CartInvalid, $"Shporta mund të ketë maksimumi {MaxLines} artikuj.");

        // Bashko rreshtat e përsëritur të të njëjtit produkt.
        var merged = items
            .GroupBy(i => i.ProductId)
            .Select(g => new CartItemRequest(g.Key, g.Sum(i => i.Quantity)))
            .ToList();

        var products = await catalog.GetPricedByIdsAsync(customerId, merged.Select(i => i.ProductId), ct);
        var lines = new List<CartLineDto>(merged.Count);

        foreach (var item in merged)
        {
            if (!products.TryGetValue(item.ProductId, out var p))
            {
                lines.Add(new CartLineDto(item.ProductId, "", "Produkt i padisponueshëm", null, "", item.Quantity, 1, 1,
                    0, 0, 0, 0, [new CartLineIssue("unavailable", "Produkti nuk është më i disponueshëm.")]));
                continue;
            }

            var issues = new List<CartLineIssue>();
            var product = p.Product;
            if (item.Quantity <= 0 || item.Quantity > MaxQuantity)
                issues.Add(new("invalid_quantity", "Sasia nuk është e vlefshme."));
            else
            {
                if (item.Quantity < product.MinOrderQuantity)
                    issues.Add(new("below_minimum", $"Sasia minimale është {Fmt(product.MinOrderQuantity)} {product.Unit}."));
                if (product.PackSize > 0 && item.Quantity % product.PackSize != 0)
                    issues.Add(new("not_pack_multiple", $"Sasia duhet të jetë shumëfish i {Fmt(product.PackSize)} {product.Unit}."));
                if (_opt.EnforceStock && item.Quantity > product.StockQuantity)
                    issues.Add(product.StockQuantity <= 0
                        ? new("out_of_stock", "Produkti nuk ka stok.")
                        : new("insufficient_stock", product.ShowStock
                            ? $"Stoku i disponueshëm: {Fmt(product.StockQuantity)} {product.Unit}."
                            : "Sasia e kërkuar nuk është në stok."));
            }

            var unitPrice = p.EffectivePrice;
            var lineTotal = Round(unitPrice * item.Quantity);
            var lineDiscount = Round((p.ListPrice - unitPrice) * item.Quantity);
            lines.Add(new CartLineDto(product.Id, product.Code, product.Name, product.ImageUrl, product.Unit,
                item.Quantity, product.PackSize, product.MinOrderQuantity, p.ListPrice, unitPrice,
                lineDiscount, lineTotal, issues));
        }

        var valid = lines.Where(l => l.Issues.Count == 0).ToList();
        var subtotal = valid.Sum(l => Round(l.ListPrice * l.Quantity));
        var discount = valid.Sum(l => l.LineDiscount);
        var net = subtotal - discount;
        var delivery = net <= 0 || net >= _opt.FreeDeliveryThreshold ? 0 : _opt.DeliveryFee;

        return new CartPricingResponse(
            lines,
            subtotal,
            discount,
            delivery,
            _opt.FreeDeliveryThreshold,
            net + delivery,
            IsValid: lines.Count > 0 && lines.All(l => l.Issues.Count == 0),
            Currency);
    }

    private static decimal Round(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    private static string Fmt(decimal v) => v.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
}
