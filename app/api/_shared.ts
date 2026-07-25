const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export function apiJson(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", JSON_CONTENT_TYPE);
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(body), { status, headers });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  return apiJson({ error: message, code }, status, extraHeaders);
}

export async function readJsonBody(
  request: Request,
  maximumBytes: number,
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const advertisedBytes = Number(contentLength);
    if (
      !Number.isFinite(advertisedBytes) ||
      advertisedBytes < 0 ||
      advertisedBytes > maximumBytes
    ) {
      throw new ApiRequestError(
        "payload_too_large",
        "The request is too large.",
        413,
      );
    }
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new ApiRequestError(
      "payload_too_large",
      "The request is too large.",
      413,
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError(
      "invalid_json",
      "Send a valid JSON request.",
      400,
    );
  }
}

export function firstValidationMessage(
  issues: ReadonlyArray<{ message: string }>,
  fallback: string,
): string {
  return issues[0]?.message || fallback;
}

export function requestErrorResponse(error: unknown): Response | null {
  if (!(error instanceof ApiRequestError)) return null;
  return apiError(error.code, error.message, error.status);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
