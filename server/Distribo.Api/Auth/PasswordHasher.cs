using System.Security.Cryptography;

namespace Distribo.Api.Auth;

/// <summary>
/// PBKDF2-HMAC-SHA256 me salt të rastësishëm. Formati "v1.{iterime}.{salt}.{hash}" lejon
/// rritjen e iterimeve në të ardhmen pa prishur fjalëkalimet ekzistuese.
/// </summary>
public static class PasswordHasher
{
    private const int Iterations = 600_000;
    private const int SaltSize = 16;
    private const int KeySize = 32;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"v1.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 4 || parts[0] != "v1" || !int.TryParse(parts[1], out var iterations)) return false;
        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    /// <summary>Hash fiktiv për të barazuar kohën e përgjigjes kur përdoruesi nuk ekziston.</summary>
    public static readonly string DummyHash = Hash("dummy-password-for-timing-1");
}
