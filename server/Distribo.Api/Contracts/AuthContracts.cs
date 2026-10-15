namespace Distribo.Api.Contracts;

public record RegisterRequest(
    string FullName,
    string BusinessName,
    string Email,
    string Phone,
    string Password,
    string? TaxNumber,
    string? City,
    string? Street);

/// <summary>Identifikuesi mund të jetë numër telefoni (parazgjedhje) ose email.</summary>
public record LoginRequest(string Identifier, string Password);

public record RefreshRequest(string RefreshToken);

public record LogoutRequest(string? RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt,
    MeResponse User);

public record RegisterResponse(bool RequiresApproval, AuthResponse? Session, string Message);

public record MeResponse(
    int UserId,
    string FullName,
    string Email,
    string Phone,
    string Language,
    NotificationPreferencesDto NotificationPreferences,
    CustomerDto Customer);

public record CustomerDto(int Id, string BusinessName, string? TaxNumber, string? ExternalCode, string Status);

public record NotificationPreferencesDto(bool OrderUpdates, bool Offers);

public record UpdatePreferencesRequest(bool? OrderUpdates, bool? Offers, string? Language);

public record AddressDto(
    int Id,
    string Name,
    string Street,
    string City,
    string? ContactName,
    string? ContactPhone,
    bool IsDefault);
