using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Distribo.Api.Data;

public enum DatabaseProvider
{
    SqlServer,
    Postgres,
}

/// <summary>
/// Të vetmet vende ku kodi ndryshon sipas databazës. Gjithçka tjetër kalon nëpër EF Core
/// dhe funksionon njësoj në SQL Server dhe PostgreSQL.
/// </summary>
public static class DbDialect
{
    public static async Task<long> NextOrderNumberAsync(this AppDbContext db, CancellationToken ct)
    {
        var sql = db.Database.IsNpgsql()
            ? $"SELECT nextval('app.\"{AppDbContext.OrderNumberSequence}\"') AS \"Value\""
            : $"SELECT NEXT VALUE FOR [app].[{AppDbContext.OrderNumberSequence}] AS [Value]";
        var values = await db.Database.SqlQueryRaw<long>(sql).ToListAsync(ct);
        return values[0];
    }

    public static bool IsUniqueViolation(this DbUpdateException ex) => ex.InnerException switch
    {
        SqlException sql => sql.Number is 2601 or 2627,
        PostgresException pg => pg.SqlState == PostgresErrorCodes.UniqueViolation,
        _ => false,
    };

    /// <summary>Escape për karakteret speciale të LIKE, që kërkimi i përdoruesit të trajtohet si tekst.</summary>
    public static string LikeContains(string term) =>
        "%" + term.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_").Replace("[", "\\[") + "%";
}
