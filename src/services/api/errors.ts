/** Gabim i kthyer nga API-ja (ProblemDetails me "code"). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Nuk u arrit serveri: pa internet, timeout ose server i paarritshëm. */
export class NetworkError extends Error {
  constructor(readonly reason: 'offline' | 'timeout' | 'unreachable') {
    super(reason);
    this.name = 'NetworkError';
  }
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}

/** Gabimi i parë i një fushe, p.sh. fieldError(e, 'email'). */
export function fieldError(e: unknown, field: string): string | undefined {
  if (!(e instanceof ApiError)) return undefined;
  const key = Object.keys(e.fieldErrors).find((k) => k.toLowerCase() === field.toLowerCase());
  return key ? e.fieldErrors[key]?.[0] : undefined;
}
