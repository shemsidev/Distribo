namespace Distribo.Api.Data.Entities;

/// <summary>Llogaria e hyrjes në aplikacion, e lidhur gjithmonë me një klient.</summary>
public class UserAccount
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public required string FullName { get; set; }

    /// <summary>Email i normalizuar (shkronja të vogla).</summary>
    public required string Email { get; set; }

    /// <summary>Numër telefoni në formatin E.164, p.sh. +355691234567.</summary>
    public required string Phone { get; set; }

    public required string PasswordHash { get; set; }
    public bool IsActive { get; set; } = true;

    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    public bool NotifyOrderUpdates { get; set; } = true;
    public bool NotifyOffers { get; set; }
    public string Language { get; set; } = "sq";

    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public List<RefreshToken> RefreshTokens { get; set; } = [];
    public List<PushToken> PushTokens { get; set; } = [];
}

/// <summary>Refresh token me rrotullim. Ruhet vetëm hash-i SHA-256, jo vlera.</summary>
public class RefreshToken
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public UserAccount User { get; set; } = null!;

    public required string TokenHash { get; set; }

    /// <summary>Identifikon zinxhirin e rrotullimit; ripërdorimi i një token-i të vjetër revokon gjithë familjen.</summary>
    public Guid FamilyId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public long? ReplacedById { get; set; }

    public bool IsActive(DateTime now) => RevokedAt is null && ExpiresAt > now;
}

public class PushToken
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public UserAccount User { get; set; } = null!;

    public required string Token { get; set; }
    public required string Platform { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}

/// <summary>Njoftim brenda aplikacionit (historik), i dërguar edhe si push nëse përdoruesi e lejon.</summary>
public class Notification
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public UserAccount User { get; set; } = null!;

    public required string Title { get; set; }
    public required string Body { get; set; }
    public Guid? OrderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}
