using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Distribo.Api.Contracts;
using Distribo.Api.Data;
using Distribo.Api.Data.Entities;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;

namespace Distribo.Api.Auth;

public class AuthService(
    AppDbContext db,
    TokenService tokens,
    IOptions<RegistrationOptions> registration,
    IOptions<SecurityOptions> security,
    TimeProvider clock,
    ILogger<AuthService> logger)
{
    private const string InvalidCredentialsMessage = "Numri i telefonit/email-i ose fjalëkalimi është i gabuar.";

    public async Task<RegisterResponse> RegisterAsync(RegisterRequest r, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var fullName = r.FullName?.Trim() ?? "";
        var businessName = r.BusinessName?.Trim() ?? "";
        var email = Identifiers.NormalizeEmail(r.Email);
        var phone = Identifiers.NormalizePhone(r.Phone);

        if (fullName.Length is < 2 or > 150) errors["fullName"] = ["Shkruaj emrin dhe mbiemrin."];
        if (businessName.Length is < 2 or > 200) errors["businessName"] = ["Shkruaj emrin e biznesit."];
        if (email is null) errors["email"] = ["Email-i nuk është i vlefshëm."];
        if (phone is null) errors["phone"] = ["Numri i telefonit nuk është i vlefshëm."];
        if (Identifiers.ValidatePassword(r.Password) is { } pwError) errors["password"] = [pwError];
        if (r.TaxNumber is { Length: > 20 }) errors["taxNumber"] = ["NIPT-i nuk është i vlefshëm."];
        if (errors.Count > 0) throw ApiException.Validation(errors);

        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw ApiException.Conflict(ErrorCodes.EmailTaken, "Ky email është i regjistruar tashmë.");
        if (await db.Users.AnyAsync(u => u.Phone == phone, ct))
            throw ApiException.Conflict(ErrorCodes.PhoneTaken, "Ky numër telefoni është i regjistruar tashmë.");

        var now = clock.GetUtcNow().UtcDateTime;
        var autoApprove = registration.Value.AutoApprove;
        var customer = new Customer
        {
            BusinessName = businessName,
            TaxNumber = string.IsNullOrWhiteSpace(r.TaxNumber) ? null : r.TaxNumber.Trim().ToUpperInvariant(),
            Status = autoApprove ? CustomerStatus.Active : CustomerStatus.PendingApproval,
            CreatedAt = now,
        };
        if (!string.IsNullOrWhiteSpace(r.Street) && !string.IsNullOrWhiteSpace(r.City))
        {
            customer.Addresses.Add(new Address
            {
                Name = businessName,
                Street = r.Street.Trim(),
                City = r.City.Trim(),
                ContactName = fullName,
                ContactPhone = phone,
                IsDefault = true,
            });
        }

        var user = new UserAccount
        {
            Customer = customer,
            FullName = fullName,
            Email = email!,
            Phone = phone!,
            PasswordHash = PasswordHasher.Hash(r.Password),
            CreatedAt = now,
        };
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            throw ApiException.Conflict(ErrorCodes.EmailTaken, "Email-i ose numri i telefonit është i regjistruar tashmë.");
        }

        logger.LogInformation("U regjistrua përdoruesi {UserId} për klientin {CustomerId}.", user.Id, customer.Id);

        if (!autoApprove)
            return new RegisterResponse(true, null,
                "Regjistrimi u krye. Llogaria do të aktivizohet pasi distributori të verifikojë biznesin tuaj.");

        var session = await CreateSessionAsync(user, ct);
        return new RegisterResponse(false, session, "Regjistrimi u krye me sukses.");
    }

    /// <summary>Hyrje me numër telefoni ose email + fjalëkalim.</summary>
    public async Task<AuthResponse> LoginAsync(LoginRequest r, CancellationToken ct)
    {
        var identifier = r.Identifier?.Trim() ?? "";
        if (identifier.Length == 0 || string.IsNullOrEmpty(r.Password))
            throw ApiException.Validation(new Dictionary<string, string[]>
            {
                ["identifier"] = ["Shkruaj numrin e telefonit ose email-in."],
            });

        UserAccount? user = null;
        if (Identifiers.LooksLikeEmail(identifier))
        {
            var email = Identifiers.NormalizeEmail(identifier);
            if (email is not null)
                user = await db.Users.Include(u => u.Customer).SingleOrDefaultAsync(u => u.Email == email, ct);
        }
        else
        {
            var phone = Identifiers.NormalizePhone(identifier);
            if (phone is not null)
                user = await db.Users.Include(u => u.Customer).SingleOrDefaultAsync(u => u.Phone == phone, ct);
        }

        var now = clock.GetUtcNow().UtcDateTime;
        if (user is null)
        {
            PasswordHasher.Verify(r.Password, PasswordHasher.DummyHash);
            throw new ApiException(401, ErrorCodes.InvalidCredentials, InvalidCredentialsMessage);
        }

        if (user.LockoutEndUtc is { } lockout && lockout > now)
        {
            var minutes = (int)Math.Ceiling((lockout - now).TotalMinutes);
            throw new ApiException(429, ErrorCodes.AccountLocked,
                $"Shumë tentativa të gabuara. Provo përsëri pas {minutes} minutash.");
        }

        if (!PasswordHasher.Verify(r.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= security.Value.MaxFailedLogins)
            {
                user.LockoutEndUtc = now.AddMinutes(security.Value.LockoutMinutes);
                user.FailedLoginCount = 0;
                logger.LogWarning("Llogaria {UserId} u bllokua përkohësisht pas tentativave të gabuara.", user.Id);
            }
            await db.SaveChangesAsync(ct);
            throw new ApiException(401, ErrorCodes.InvalidCredentials, InvalidCredentialsMessage);
        }

        if (!user.IsActive || user.Customer.Status == CustomerStatus.Blocked)
            throw ApiException.Forbidden(ErrorCodes.AccountDisabled, "Llogaria është çaktivizuar. Kontakto distributorin.");
        if (user.Customer.Status == CustomerStatus.PendingApproval)
            throw ApiException.Forbidden(ErrorCodes.AccountPending,
                "Llogaria është në pritje të miratimit nga distributori.");

        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        user.LastLoginAt = now;
        await db.SaveChangesAsync(ct);

        return await CreateSessionAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var (user, issued) = await tokens.RefreshAsync(refreshToken, ct);
        return ToResponse(user, issued);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest r, CancellationToken ct)
    {
        var user = await db.Users.SingleAsync(u => u.Id == userId, ct);
        if (!PasswordHasher.Verify(r.CurrentPassword ?? "", user.PasswordHash))
            throw ApiException.BadRequest(ErrorCodes.WrongPassword, "Fjalëkalimi aktual është i gabuar.");
        if (Identifiers.ValidatePassword(r.NewPassword) is { } error)
            throw ApiException.Validation(new Dictionary<string, string[]> { ["newPassword"] = [error] });

        user.PasswordHash = PasswordHasher.Hash(r.NewPassword);
        await db.SaveChangesAsync(ct);
        // Pas ndryshimit të fjalëkalimit, mbyll sesionet e tjera.
        await tokens.RevokeAllForUserAsync(userId, ct);
    }

    private async Task<AuthResponse> CreateSessionAsync(UserAccount user, CancellationToken ct)
    {
        var issued = await tokens.IssueAsync(user, ct);
        return ToResponse(user, issued);
    }

    private static AuthResponse ToResponse(UserAccount user, IssuedTokens t) =>
        new(t.AccessToken, t.AccessExpiresAt, t.RefreshToken, t.RefreshExpiresAt, ToMe(user));

    public static MeResponse ToMe(UserAccount u) => new(
        u.Id,
        u.FullName,
        u.Email,
        u.Phone,
        u.Language,
        new NotificationPreferencesDto(u.NotifyOrderUpdates, u.NotifyOffers),
        new CustomerDto(u.Customer.Id, u.Customer.BusinessName, u.Customer.TaxNumber, u.Customer.ExternalCode,
            u.Customer.Status.ToString()));
}
