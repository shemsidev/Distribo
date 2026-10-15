using System.Threading.Channels;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Distribo.Api.Auth;
using Distribo.Api.Data;
using Distribo.Api.Data.Seed;
using Distribo.Api.Infrastructure;
using Distribo.Api.Options;
using Distribo.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Opsionet ----------
builder.Services.Configure<JwtOptions>(config.GetSection(JwtOptions.Section));
builder.Services.Configure<PricingOptions>(config.GetSection(PricingOptions.Section));
builder.Services.Configure<RegistrationOptions>(config.GetSection(RegistrationOptions.Section));
builder.Services.Configure<SecurityOptions>(config.GetSection(SecurityOptions.Section));
builder.Services.Configure<IntegrationOptions>(config.GetSection(IntegrationOptions.Section));
builder.Services.Configure<PushOptions>(config.GetSection(PushOptions.Section));
builder.Services.Configure<StorefrontOptions>(config.GetSection(StorefrontOptions.Section));
builder.Services.Configure<SeedOptions>(config.GetSection(SeedOptions.Section));

var jwt = config.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
if (jwt.SigningKey.Length < 32)
    throw new InvalidOperationException(
        "Jwt:SigningKey mungon ose është më i shkurtër se 32 karaktere. Vendose me 'dotnet user-secrets' ose variabël mjedisi.");

// ---------- Databaza: SQL Server ose PostgreSQL ----------
var provider = config.GetValue("Database:Provider", DatabaseProvider.SqlServer);
var connectionString = config.GetConnectionString("Default")
                       ?? throw new InvalidOperationException("Mungon ConnectionStrings:Default.");
if (provider == DatabaseProvider.Postgres)
{
    builder.Services.AddDbContext<AppDbContext, PostgresAppDbContext>(o =>
        o.UseNpgsql(connectionString, npg => npg.MigrationsHistoryTable("__EFMigrationsHistory", "app")));
}
else
{
    builder.Services.AddDbContext<AppDbContext, SqlServerAppDbContext>(o =>
        o.UseSqlServer(connectionString, sql => sql
            .MigrationsHistoryTable("__EFMigrationsHistory", "app")
            // SQL Server 2012 nuk ka OPENJSON; ky nivel e shmang atë në pyetjet me liste.
            // Pa EnableRetryOnFailure: krijimi i porosisë përdor transaksione manuale dhe nuk duhet
            // të riprovohet automatikisht; dublikatat i mbron Idempotency-Key.
            .UseCompatibilityLevel(config.GetValue("Database:SqlServerCompatibilityLevel", 110))));
}

// ---------- Autentikimi ----------
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = TokenService.CreateSigningKey(jwt.SigningKey),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization();

// ---------- Kufizimi i kërkesave (mbrojtje nga sulmet brute-force) ----------
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy(RateLimitPolicies.Auth, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.ContentType = "application/problem+json";
        await ctx.HttpContext.Response.WriteAsync(
            """{"status":429,"title":"Shumë kërkesa. Provo përsëri pas pak.","code":"rate_limited"}""", ct);
    };
});

// ---------- CORS për versionin web ----------
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// ---------- Shërbimet ----------
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CatalogQueries>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddSingleton(Channel.CreateBounded<PushMessage>(new BoundedChannelOptions(1000)
{
    FullMode = BoundedChannelFullMode.DropOldest,
}));
builder.Services.AddHttpClient(nameof(ExpoPushSender), c => c.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddHostedService<ExpoPushSender>();

builder.Services.AddControllers(o => o.Filters.Add<ApiExceptionFilter>());
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    // Pas një reverse proxy (nginx në VPS) që IP-ja dhe HTTPS të njihen saktë.
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
// Endpoint-et publike (katalogu) pranojnë edhe vizitorë. Por nëse klienti dërgon token të skaduar,
// kthe 401 që ta rinovojë, në vend që t'i shfaqen në heshtje çmimet e vizitorit.
app.Use(async (ctx, next) =>
{
    var header = ctx.Request.Headers.Authorization.ToString();
    if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) && ctx.User.Identity?.IsAuthenticated != true)
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        ctx.Response.ContentType = "application/problem+json";
        await ctx.Response.WriteAsync("""{"status":401,"title":"Sesioni ka skaduar.","code":"token_expired"}""");
        return;
    }
    await next();
});
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

// ---------- Migrimet dhe të dhënat e testimit ----------
if (config.GetValue("Database:MigrateOnStartup", false) || app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    var seed = config.GetSection(SeedOptions.Section).Get<SeedOptions>() ?? new SeedOptions();
    await DbSeeder.SeedAsync(db, seed, app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"),
        app.Environment.ContentRootPath, app.Logger);
}

app.Run();

public static class RateLimitPolicies
{
    public const string Auth = "auth";
}

/// <summary>Për testet e integrimit (WebApplicationFactory).</summary>
public partial class Program;
