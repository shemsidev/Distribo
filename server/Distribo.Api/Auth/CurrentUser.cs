using System.Security.Claims;

namespace Distribo.Api.Auth;

public static class AppClaims
{
    public const string CustomerId = "cid";
}

/// <summary>
/// Identiteti i përdoruesit merret vetëm nga token-i i nënshkruar, kurrë nga parametrat e kërkesës,
/// që një klient të mos lexojë të dhënat e një tjetri duke ndryshuar ID-të.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static int UserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? throw new InvalidOperationException("Mungon identifikuesi i përdoruesit."));

    /// <summary>Klienti i identifikuar, ose null për vizitorët (katalogu publik me çmime bazë).</summary>
    public static int? OptionalCustomerId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(AppClaims.CustomerId), out var id) ? id : null;

    public static int? OptionalUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static int CustomerId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(AppClaims.CustomerId)
                  ?? throw new InvalidOperationException("Mungon identifikuesi i klientit."));
}
