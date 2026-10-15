namespace Distribo.Api.Options;

public class JwtOptions
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "Distribo";
    public string Audience { get; set; } = "Distribo.Mobile";

    /// <summary>Çelësi i nënshkrimit (min. 32 karaktere). Vendoset me user-secrets ose variabla mjedisi, kurrë në repo.</summary>
    public string SigningKey { get; set; } = "";

    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
}

public class PricingOptions
{
    public const string Section = "Pricing";

    public decimal DeliveryFee { get; set; } = 300;
    public decimal FreeDeliveryThreshold { get; set; } = 10000;

    /// <summary>Nëse true, sasia e porositur nuk mund të kalojë stokun.</summary>
    public bool EnforceStock { get; set; } = true;
}

public class RegistrationOptions
{
    public const string Section = "Registration";

    /// <summary>
    /// Nëse true, klienti i ri aktivizohet menjëherë (vetëm për zhvillim/testim).
    /// Në prodhim, klienti duhet të miratohet dhe të lidhet me kodin e tij në programin e distribucionit.
    /// </summary>
    public bool AutoApprove { get; set; }
}

public class SecurityOptions
{
    public const string Section = "Security";

    public int MaxFailedLogins { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
}

public class IntegrationOptions
{
    public const string Section = "Integration";

    /// <summary>
    /// Çelësi për endpoint-et server-me-server (/api/integration/*): ndryshimi i statusit të porosive
    /// dhe miratimi i klientëve nga programi i distribucionit. Bosh = endpoint-et janë joaktive.
    /// </summary>
    public string ApiKey { get; set; } = "";
}

/// <summary>Tekstet e kryefaqes (njoftimi lart dhe shiriti lëvizës), të ndryshueshme pa publikim të ri.</summary>
public class StorefrontOptions
{
    public const string Section = "Storefront";

    public string? Notice { get; set; }
    public string? Ticker { get; set; }
}

public class PushOptions
{
    public const string Section = "Push";

    public bool Enabled { get; set; } = true;
    public string ExpoPushUrl { get; set; } = "https://exp.host/--/api/v2/push/send";
}
