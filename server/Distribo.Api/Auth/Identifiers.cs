using System.Net.Mail;
using System.Text.RegularExpressions;

namespace Distribo.Api.Auth;

public static partial class Identifiers
{
    /// <summary>
    /// Normalizon numrat shqiptarë në E.164 (+355…). Pranon "069 123 4567", "0691234567",
    /// "355691234567", "+355 69 123 4567". Numrat ndërkombëtarë me "+" pranohen nëse kanë 8–15 shifra.
    /// </summary>
    public static string? NormalizePhone(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var trimmed = input.Trim();
        var hasPlus = trimmed.StartsWith('+');
        var digits = NonDigits().Replace(trimmed, "");
        if (trimmed.StartsWith("00"))
        {
            digits = digits[2..];
            hasPlus = true;
        }

        if (!hasPlus)
        {
            if (digits.StartsWith('0')) digits = "355" + digits[1..];
            else if (!digits.StartsWith("355")) digits = "355" + digits;
        }

        if (digits.StartsWith("355"))
        {
            // Numër shqiptar: 355 + 8 ose 9 shifra (celular 6X XXX XXXX, fiks me prefiks qyteti).
            var national = digits[3..];
            if (national.StartsWith('0')) national = national[1..];
            return national.Length is 8 or 9 ? "+355" + national : null;
        }

        return digits.Length is >= 8 and <= 15 ? "+" + digits : null;
    }

    public static string? NormalizeEmail(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var email = input.Trim().ToLowerInvariant();
        if (email.Length > 254 || !EmailShape().IsMatch(email)) return null;
        return MailAddress.TryCreate(email, out _) ? email : null;
    }

    public static bool LooksLikeEmail(string input) => input.Contains('@');

    /// <summary>Min. 8 karaktere, të paktën një shkronjë dhe një shifër.</summary>
    public static string? ValidatePassword(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8)
            return "Fjalëkalimi duhet të ketë të paktën 8 karaktere.";
        if (password.Length > 128) return "Fjalëkalimi është shumë i gjatë.";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "Fjalëkalimi duhet të përmbajë shkronja dhe shifra.";
        return null;
    }

    [GeneratedRegex(@"\D")]
    private static partial Regex NonDigits();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")]
    private static partial Regex EmailShape();
}
