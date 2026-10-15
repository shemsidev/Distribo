using System.Security;
using Microsoft.EntityFrameworkCore;
using Distribo.Api.Auth;
using Distribo.Api.Data.Entities;

namespace Distribo.Api.Data.Seed;

public class SeedOptions
{
    public const string Section = "Seed";

    /// <summary>Mbush katalogun e testimit nëse databaza është bosh. Vetëm për zhvillim.</summary>
    public bool Enabled { get; set; }

    public DemoUserOptions? DemoUser { get; set; }
}

public class DemoUserOptions
{
    public string FullName { get; set; } = "Klient Demo";
    public string BusinessName { get; set; } = "Market Demo";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Password { get; set; } = "";
}

/// <summary>
/// Të dhëna testimi, TË NDARA nga të dhënat reale. Në prodhim katalogu, çmimet dhe stoku
/// vijnë nga programi i distribucionit dhe ky seeder duhet të jetë i çaktivizuar.
/// Fotot janë SVG të gjeneruara (vend-mbajtëse), jo foto reale produktesh.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, SeedOptions options, string webRoot, ILogger logger, CancellationToken ct = default)
    {
        if (!options.Enabled) return;

        var now = DateTime.UtcNow;
        if (!await db.Categories.AnyAsync(ct))
        {
            var code = 1000;
            var rootOrder = 0;
            foreach (var root in SeedCatalog.Data)
            {
                var rootSlug = $"c{rootOrder + 1}";
                var category = new Category
                {
                    Name = root.Name,
                    Icon = root.Icon,
                    SortOrder = rootOrder++,
                    ImageUrl = "/" + WriteImage(webRoot, $"images/categories/{rootSlug}.svg", CategorySvg(root.Name, root.Color)),
                };
                db.Categories.Add(category);

                var subOrder = 0;
                foreach (var sub in root.Subs)
                {
                    var subcategory = new Category
                    {
                        Parent = category,
                        Name = sub.Name,
                        Icon = root.Icon,
                        SortOrder = subOrder++,
                        ImageUrl = "/" + WriteImage(webRoot, $"images/categories/{rootSlug}-{subOrder}.svg", SubcategorySvg(sub.Name, root.Color)),
                    };
                    db.Categories.Add(subcategory);

                    foreach (var p in sub.Products)
                    {
                        var productCode = $"ART{++code}";
                        db.Products.Add(new Product
                        {
                            Code = productCode,
                            Barcode = Ean13("200" + code.ToString("D9")),
                            Name = p.Name,
                            Description = p.Description ?? (p.Packaging is null ? p.Name : $"{p.Name}. Paketim: {p.Packaging}."),
                            Category = subcategory,
                            ImageUrl = "/" + WriteImage(webRoot, $"images/products/{productCode}.svg", ProductSvg(p.Name, root.Color)),
                            Unit = p.Unit,
                            PackagingInfo = p.Packaging,
                            PackSize = p.PackSize,
                            MinOrderQuantity = p.MinQty,
                            BasePrice = p.Price,
                            StockQuantity = p.Stock,
                            ShowStock = true,
                            UpdatedAt = now,
                        });
                    }
                }
            }
            await db.SaveChangesAsync(ct);

            var promoProducts = await db.Products.Where(p => SeedCatalog.PromoProducts.Contains(p.Name)).ToListAsync(ct);
            foreach (var p in promoProducts)
            {
                db.Promotions.Add(new Promotion
                {
                    ProductId = p.Id,
                    Title = "Ofertë javore",
                    PromoPrice = Math.Round(p.BasePrice * 0.85m, 0),
                    StartsAt = now.AddDays(-1),
                    EndsAt = now.AddDays(14),
                });
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Katalogu i testimit u krijua.");
        }

        if (options.DemoUser is { } demo && !string.IsNullOrEmpty(demo.Password))
        {
            var email = Identifiers.NormalizeEmail(demo.Email);
            var phone = Identifiers.NormalizePhone(demo.Phone);
            if (email is not null && phone is not null && !await db.Users.AnyAsync(u => u.Email == email || u.Phone == phone, ct))
            {
                var customer = new Customer
                {
                    BusinessName = demo.BusinessName,
                    ExternalCode = "DEMO001",
                    Status = CustomerStatus.Active,
                    CreatedAt = now,
                    Addresses =
                    {
                        new Address { Name = $"{demo.BusinessName} – Qendër", Street = "Rruga e Durrësit, Nr. 10", City = "Tiranë", ContactName = demo.FullName, ContactPhone = phone, IsDefault = true },
                        new Address { Name = $"{demo.BusinessName} – Laprakë", Street = "Rruga Dritan Hoxha, Nr. 45", City = "Tiranë", ContactName = demo.FullName, ContactPhone = phone },
                    },
                };
                db.Users.Add(new UserAccount
                {
                    Customer = customer,
                    FullName = demo.FullName,
                    Email = email,
                    Phone = phone,
                    PasswordHash = PasswordHasher.Hash(demo.Password),
                    CreatedAt = now,
                });
                await db.SaveChangesAsync(ct);

                var special = await db.Products.Where(p => SeedCatalog.DemoCustomerPrices.Contains(p.Name)).ToListAsync(ct);
                foreach (var p in special)
                    db.CustomerPrices.Add(new CustomerPrice { CustomerId = customer.Id, ProductId = p.Id, Price = Math.Round(p.BasePrice * 0.9m, 0) });
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Llogaria demo u krijua.");
            }
        }
    }

    private static string WriteImage(string webRoot, string relativePath, string svg)
    {
        var path = Path.Combine(webRoot, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, svg);
        return relativePath;
    }

    private static (string Line1, string Line2) SplitName(string name, int firstLineWords = 2)
    {
        var words = name.Split(' ');
        return (SecurityElement.Escape(string.Join(' ', words.Take(firstLineWords))) ?? "",
                SecurityElement.Escape(string.Join(' ', words.Skip(firstLineWords))) ?? "");
    }

    private static string Initial(string name) => SecurityElement.Escape(name[..1].ToUpperInvariant()) ?? "";

    private static string ProductSvg(string name, string color)
    {
        var (l1, l2) = SplitName(name);
        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
              <rect width="400" height="400" fill="#ffffff"/>
              <rect x="150" y="40" width="100" height="210" rx="24" fill="{color}" opacity="0.9"/>
              <rect x="175" y="10" width="50" height="45" rx="10" fill="{color}"/>
              <rect x="150" y="120" width="100" height="70" fill="#ffffff" opacity="0.85"/>
              <text x="200" y="168" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="{color}" text-anchor="middle">{Initial(name)}</text>
              <text x="200" y="310" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#1A2433" text-anchor="middle">{l1}</text>
              <text x="200" y="348" font-family="Arial, sans-serif" font-size="24" fill="#5B6778" text-anchor="middle">{l2}</text>
            </svg>
            """;
    }

    private static string CategorySvg(string name, string color) => $"""
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="150" fill="{color}" opacity="0.12"/>
          <rect x="85" y="80" width="40" height="130" rx="14" fill="{color}" opacity="0.75"/>
          <rect x="130" y="60" width="44" height="150" rx="14" fill="{color}"/>
          <rect x="179" y="95" width="38" height="115" rx="14" fill="{color}" opacity="0.6"/>
          <text x="150" y="250" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="{color}" text-anchor="middle">{Initial(name)}</text>
        </svg>
        """;

    private static string SubcategorySvg(string name, string color)
    {
        var (l1, l2) = SplitName(name, 3);
        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
              <rect width="480" height="300" fill="#ffffff"/>
              <rect x="150" y="70" width="44" height="160" rx="14" fill="{color}" opacity="0.6"/>
              <rect x="200" y="40" width="54" height="190" rx="16" fill="{color}"/>
              <rect x="260" y="60" width="48" height="170" rx="14" fill="{color}" opacity="0.8"/>
              <rect x="314" y="95" width="40" height="135" rx="12" fill="{color}" opacity="0.5"/>
              <text x="240" y="275" font-family="Arial, sans-serif" font-size="26" font-weight="600" fill="#1A2433" text-anchor="middle">{l1} {l2}</text>
            </svg>
            """;
    }

    /// <summary>Barkod EAN-13 i vlefshëm (me shifër kontrolli) nga 12 shifra.</summary>
    private static string Ean13(string twelve)
    {
        var sum = twelve.Select((c, i) => (c - '0') * (i % 2 == 0 ? 1 : 3)).Sum();
        return twelve + ((10 - sum % 10) % 10);
    }
}
