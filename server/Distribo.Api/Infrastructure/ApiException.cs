using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Distribo.Api.Infrastructure;

/// <summary>
/// Gabim biznesi që i kthehet klientit si ProblemDetails me një "code" të qëndrueshëm,
/// të cilin aplikacioni celular e përkthen në mesazh për përdoruesin.
/// </summary>
public class ApiException(int statusCode, string code, string message, IDictionary<string, string[]>? errors = null)
    : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;
    public IDictionary<string, string[]>? Errors { get; } = errors;

    public static ApiException BadRequest(string code, string message) => new(400, code, message);
    public static ApiException NotFound(string code = "not_found", string message = "Burimi nuk u gjet.") => new(404, code, message);
    public static ApiException Conflict(string code, string message) => new(409, code, message);
    public static ApiException Forbidden(string code, string message) => new(403, code, message);

    public static ApiException Validation(IDictionary<string, string[]> errors) =>
        new(400, ErrorCodes.ValidationFailed, "Të dhënat nuk janë të vlefshme.", errors);
}

public static class ErrorCodes
{
    public const string ValidationFailed = "validation_failed";
    public const string InvalidCredentials = "invalid_credentials";
    public const string AccountLocked = "account_locked";
    public const string AccountPending = "account_pending";
    public const string AccountDisabled = "account_disabled";
    public const string EmailTaken = "email_taken";
    public const string PhoneTaken = "phone_taken";
    public const string InvalidRefreshToken = "invalid_refresh_token";
    public const string IdempotencyKeyRequired = "idempotency_key_required";
    public const string IdempotencyKeyReused = "idempotency_key_reused";
    public const string CartInvalid = "cart_invalid";
    public const string AddressInvalid = "address_invalid";
    public const string InvalidStatusTransition = "invalid_status_transition";
    public const string WrongPassword = "wrong_password";
}

/// <summary>
/// Gabimet e biznesit (ApiException) janë të pritura: kthehen si ProblemDetails pa u loguar si dështime.
/// Gabimet e tjera kalojnë te <see cref="ApiExceptionHandler"/>.
/// </summary>
public sealed class ApiExceptionFilter : Microsoft.AspNetCore.Mvc.Filters.IExceptionFilter
{
    public void OnException(Microsoft.AspNetCore.Mvc.Filters.ExceptionContext context)
    {
        if (context.Exception is not ApiException api) return;
        var problem = new ProblemDetails { Status = api.StatusCode, Title = api.Message };
        problem.Extensions["code"] = api.Code;
        if (api.Errors is not null) problem.Extensions["errors"] = api.Errors;
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        context.Result = new ObjectResult(problem)
        {
            StatusCode = api.StatusCode,
            ContentTypes = { "application/problem+json" },
        };
        context.ExceptionHandled = true;
    }
}

public sealed class ApiExceptionHandler(IProblemDetailsService problemDetails, ILogger<ApiExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem;
        if (exception is ApiException api)
        {
            http.Response.StatusCode = api.StatusCode;
            problem = new ProblemDetails { Status = api.StatusCode, Title = api.Message };
            problem.Extensions["code"] = api.Code;
            if (api.Errors is not null) problem.Extensions["errors"] = api.Errors;
        }
        else
        {
            // Mos ekspozo detaje të brendshme te klienti.
            logger.LogError(exception, "Gabim i patrajtuar për {Method} {Path}", http.Request.Method, http.Request.Path);
            http.Response.StatusCode = StatusCodes.Status500InternalServerError;
            problem = new ProblemDetails { Status = 500, Title = "Ndodhi një gabim në server." };
            problem.Extensions["code"] = "server_error";
        }

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
