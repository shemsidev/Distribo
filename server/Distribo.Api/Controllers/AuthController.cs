using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Distribo.Api.Auth;
using Distribo.Api.Contracts;
using Distribo.Api.Infrastructure;

namespace Distribo.Api.Controllers;

/// <summary>
/// Celulari merr refresh token-in në trup dhe e ruan në SecureStore.
/// Shfletuesi (header "X-Client-Type: web") e merr në cookie HttpOnly, që JavaScript të mos e lexojë dot.
/// </summary>
[ApiController]
[Route("api/auth")]
[EnableRateLimiting(RateLimitPolicies.Auth)]
public class AuthController(AuthService auth, TokenService tokens) : ControllerBase
{
    public const string RefreshCookie = "distribo_refresh";

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var result = await auth.RegisterAsync(request, ct);
        if (result.Session is not null)
            result = result with { Session = PrepareForClient(result.Session) };
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct) =>
        Ok(PrepareForClient(await auth.LoginAsync(request, ct)));

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest? request, CancellationToken ct)
    {
        var token = IsWebClient ? Request.Cookies[RefreshCookie] : request?.RefreshToken;
        if (string.IsNullOrEmpty(token))
            throw new ApiException(401, ErrorCodes.InvalidRefreshToken, "Sesioni ka skaduar. Identifikohu përsëri.");
        return Ok(PrepareForClient(await auth.RefreshAsync(token, ct)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutRequest? request, CancellationToken ct)
    {
        var token = IsWebClient ? Request.Cookies[RefreshCookie] : request?.RefreshToken;
        if (!string.IsNullOrEmpty(token))
            await tokens.RevokeAsync(token, User.UserId(), ct);
        if (IsWebClient)
            Response.Cookies.Delete(RefreshCookie, CookieOptions(DateTimeOffset.UnixEpoch));
        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(User.UserId(), request, ct);
        return NoContent();
    }

    private bool IsWebClient =>
        string.Equals(Request.Headers["X-Client-Type"], "web", StringComparison.OrdinalIgnoreCase);

    private AuthResponse PrepareForClient(AuthResponse response)
    {
        if (!IsWebClient) return response;
        Response.Cookies.Append(RefreshCookie, response.RefreshToken, CookieOptions(response.RefreshTokenExpiresAt));
        return response with { RefreshToken = "" };
    }

    private CookieOptions CookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        // Shfletuesit e trajtojnë localhost si kontekst të sigurt, ndaj Secure funksionon edhe në zhvillim.
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = expires,
        IsEssential = true,
    };
}
