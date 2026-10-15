using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Distribo.Api.Data;
using Distribo.Api.Data.Entities;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;

namespace Distribo.Api.Auth;

public record IssuedTokens(string AccessToken, DateTime AccessExpiresAt, string RefreshToken, DateTime RefreshExpiresAt);

public class TokenService(AppDbContext db, IOptions<JwtOptions> options, TimeProvider clock, ILogger<TokenService> logger)
{
    private readonly JwtOptions _opt = options.Value;

    public static SymmetricSecurityKey CreateSigningKey(string key) => new(Encoding.UTF8.GetBytes(key));

    /// <summary>Krijon access token + refresh token të ri (familje e re, p.sh. pas login-it).</summary>
    public Task<IssuedTokens> IssueAsync(UserAccount user, CancellationToken ct) =>
        IssueInternalAsync(user, Guid.NewGuid(), previous: null, ct);

    /// <summary>
    /// Rrotullon refresh token-in. Nëse paraqitet një token tashmë i revokuar (ripërdorim),
    /// revokohet gjithë familja, sepse token-i mund të jetë vjedhur.
    /// </summary>
    public async Task<(UserAccount User, IssuedTokens Tokens)> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var hash = Hash(refreshToken);
        var stored = await db.RefreshTokens
            .Include(t => t.User).ThenInclude(u => u.Customer)
            .SingleOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null)
            throw new ApiException(401, ErrorCodes.InvalidRefreshToken, "Sesioni ka skaduar. Identifikohu përsëri.");

        if (stored.RevokedAt is not null)
        {
            logger.LogWarning("Ripërdorim i refresh token-it për përdoruesin {UserId}; revokohet familja.", stored.UserId);
            await RevokeFamilyAsync(stored.FamilyId, now, ct);
            throw new ApiException(401, ErrorCodes.InvalidRefreshToken, "Sesioni ka skaduar. Identifikohu përsëri.");
        }

        if (stored.ExpiresAt <= now)
            throw new ApiException(401, ErrorCodes.InvalidRefreshToken, "Sesioni ka skaduar. Identifikohu përsëri.");

        var user = stored.User;
        if (!user.IsActive || user.Customer.Status != CustomerStatus.Active)
        {
            await RevokeFamilyAsync(stored.FamilyId, now, ct);
            throw new ApiException(401, ErrorCodes.AccountDisabled, "Llogaria nuk është aktive.");
        }

        var tokens = await IssueInternalAsync(user, stored.FamilyId, stored, ct);
        return (user, tokens);
    }

    public async Task RevokeAsync(string refreshToken, int userId, CancellationToken ct)
    {
        var hash = Hash(refreshToken);
        var stored = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash && t.UserId == userId, ct);
        if (stored is not null)
            await RevokeFamilyAsync(stored.FamilyId, clock.GetUtcNow().UtcDateTime, ct);
    }

    public async Task RevokeAllForUserAsync(int userId, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
    }

    private async Task<IssuedTokens> IssueInternalAsync(UserAccount user, Guid familyId, RefreshToken? previous, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var accessExpires = now.AddMinutes(_opt.AccessTokenMinutes);
        var refreshExpires = now.AddDays(_opt.RefreshTokenDays);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(AppClaims.CustomerId, user.CustomerId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };

        var credentials = new SigningCredentials(CreateSigningKey(_opt.SigningKey), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(_opt.Issuer, _opt.Audience, claims, now, accessExpires, credentials);
        var accessToken = new JwtSecurityTokenHandler().WriteToken(jwt);

        var refreshValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var entity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = Hash(refreshValue),
            FamilyId = familyId,
            CreatedAt = now,
            ExpiresAt = refreshExpires,
        };
        db.RefreshTokens.Add(entity);

        if (previous is not null)
        {
            previous.RevokedAt = now;
            await db.SaveChangesAsync(ct);
            previous.ReplacedById = entity.Id;
        }

        await db.SaveChangesAsync(ct);
        return new IssuedTokens(accessToken, accessExpires, refreshValue, refreshExpires);
    }

    private Task RevokeFamilyAsync(Guid familyId, DateTime now, CancellationToken ct) =>
        db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
