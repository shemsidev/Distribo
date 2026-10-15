using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Distribo.Api.Data;

// Përdoren vetëm nga "dotnet ef migrations add". Lidhja nuk hapet gjatë gjenerimit të migrimeve.

public class SqlServerDesignTimeFactory : IDesignTimeDbContextFactory<SqlServerAppDbContext>
{
    public SqlServerAppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<SqlServerAppDbContext>()
            .UseSqlServer("Server=.;Database=DistriboDb;Trusted_Connection=True",
                o => o.MigrationsHistoryTable("__EFMigrationsHistory", "app").UseCompatibilityLevel(110))
            .Options);
}

public class PostgresDesignTimeFactory : IDesignTimeDbContextFactory<PostgresAppDbContext>
{
    public PostgresAppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<PostgresAppDbContext>()
            .UseNpgsql("Host=localhost;Database=distribo", o => o.MigrationsHistoryTable("__EFMigrationsHistory", "app"))
            .Options);
}
