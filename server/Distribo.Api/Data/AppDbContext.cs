using Microsoft.EntityFrameworkCore;
using Distribo.Api.Data.Entities;

namespace Distribo.Api.Data;

/// <summary>
/// Modeli i përbashkët. Ofruesi (SQL Server ose PostgreSQL) zgjidhet në konfigurim;
/// çdo ofrues ka nënklasën e vet vetëm që migrimet të mbahen veçmas.
/// </summary>
public abstract class AppDbContext(DbContextOptions options) : DbContext(options)
{
    public const string OrderNumberSequence = "OrderNumbers";

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CustomerPrice> CustomerPrices => Set<CustomerPrice>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<OrderStatusChange> OrderStatusChanges => Set<OrderStatusChange>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Të gjitha tabelat në skemën "app" që të mos përzihen me tabela të tjera në të njëjtin server.
        b.HasDefaultSchema("app");
        b.HasSequence<long>(OrderNumberSequence).StartsAt(1).IncrementsBy(1);

        b.Entity<Customer>(e =>
        {
            e.Property(x => x.BusinessName).HasMaxLength(200);
            e.Property(x => x.ExternalCode).HasMaxLength(50);
            e.Property(x => x.TaxNumber).HasMaxLength(20);
            var externalCode = e.HasIndex(x => x.ExternalCode).IsUnique();
            // SQL Server i trajton NULL-et si të barabarta në indekse unike; PostgreSQL jo.
            if (Database.IsSqlServer()) externalCode.HasFilter("[ExternalCode] IS NOT NULL");
        });

        b.Entity<Address>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Street).HasMaxLength(250);
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.ContactName).HasMaxLength(150);
            e.Property(x => x.ContactPhone).HasMaxLength(20);
            e.HasOne(x => x.Customer).WithMany(c => c.Addresses).HasForeignKey(x => x.CustomerId);
        });

        b.Entity<UserAccount>(e =>
        {
            e.ToTable("Users");
            e.Property(x => x.FullName).HasMaxLength(150);
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.PasswordHash).HasMaxLength(500);
            e.Property(x => x.Language).HasMaxLength(5);
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.Phone).IsUnique();
            e.HasOne(x => x.Customer).WithMany(c => c.Users).HasForeignKey(x => x.CustomerId);
        });

        b.Entity<RefreshToken>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(64);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.FamilyId);
            e.HasOne(x => x.User).WithMany(u => u.RefreshTokens).HasForeignKey(x => x.UserId);
        });

        b.Entity<PushToken>(e =>
        {
            e.Property(x => x.Token).HasMaxLength(255);
            e.Property(x => x.Platform).HasMaxLength(10);
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.User).WithMany(u => u.PushTokens).HasForeignKey(x => x.UserId);
        });

        b.Entity<Notification>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(150);
            e.Property(x => x.Body).HasMaxLength(500);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });

        b.Entity<Category>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.HasOne(x => x.Parent).WithMany(x => x.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ParentId, x.SortOrder });
        });

        b.Entity<Product>(e =>
        {
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.Barcode).HasMaxLength(50);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.Unit).HasMaxLength(20);
            e.Property(x => x.PackagingInfo).HasMaxLength(100);
            e.Property(x => x.PackSize).HasPrecision(18, 3);
            e.Property(x => x.MinOrderQuantity).HasPrecision(18, 3);
            e.Property(x => x.BasePrice).HasPrecision(18, 2);
            e.Property(x => x.StockQuantity).HasPrecision(18, 3);
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.Barcode);
            e.HasIndex(x => x.Name);
        });

        b.Entity<CustomerPrice>(e =>
        {
            e.HasKey(x => new { x.CustomerId, x.ProductId });
            e.Property(x => x.Price).HasPrecision(18, 2);
        });

        b.Entity<Promotion>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(150);
            e.Property(x => x.PromoPrice).HasPrecision(18, 2);
            e.HasIndex(x => new { x.ProductId, x.StartsAt, x.EndsAt });
        });

        b.Entity<Order>(e =>
        {
            e.Property(x => x.Number).HasMaxLength(20);
            e.Property(x => x.IdempotencyKey).HasMaxLength(64);
            e.Property(x => x.RequestHash).HasMaxLength(64);
            e.Property(x => x.DeliveryName).HasMaxLength(150);
            e.Property(x => x.DeliveryStreet).HasMaxLength(250);
            e.Property(x => x.DeliveryCity).HasMaxLength(100);
            e.Property(x => x.ContactName).HasMaxLength(150);
            e.Property(x => x.ContactPhone).HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.Property(x => x.Subtotal).HasPrecision(18, 2);
            e.Property(x => x.DiscountTotal).HasPrecision(18, 2);
            e.Property(x => x.DeliveryFee).HasPrecision(18, 2);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.HasIndex(x => x.Number).IsUnique();
            e.HasIndex(x => new { x.CustomerId, x.IdempotencyKey }).IsUnique();
            e.HasIndex(x => new { x.CustomerId, x.CreatedAt });
            e.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<OrderLine>(e =>
        {
            e.Property(x => x.ProductCode).HasMaxLength(50);
            e.Property(x => x.ProductName).HasMaxLength(200);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.Unit).HasMaxLength(20);
            e.Property(x => x.Quantity).HasPrecision(18, 3);
            e.Property(x => x.ListPrice).HasPrecision(18, 2);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.LineDiscount).HasPrecision(18, 2);
            e.Property(x => x.LineTotal).HasPrecision(18, 2);
            e.HasOne(x => x.Order).WithMany(o => o.Lines).HasForeignKey(x => x.OrderId);
        });

        b.Entity<OrderStatusChange>(e =>
        {
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.Order).WithMany(o => o.StatusHistory).HasForeignKey(x => x.OrderId);
        });
    }
}

public class SqlServerAppDbContext(DbContextOptions<SqlServerAppDbContext> options) : AppDbContext(options);

public class PostgresAppDbContext(DbContextOptions<PostgresAppDbContext> options) : AppDbContext(options);
