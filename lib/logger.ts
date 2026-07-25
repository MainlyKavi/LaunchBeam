const sensitiveKeyPattern =
  /(password|secret|token|authorization|cookie|service.?role|email|ip)/i;

function sanitizeContext(context: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !sensitiveKeyPattern.test(key))
      .map(([key, value]) => {
        if (
          value === null ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return [key, typeof value === "string" ? value.slice(0, 160) : value];
        }
        return [key, "[redacted-structure]"];
      }),
  );
}

export function logServerError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code.slice(0, 64)
      : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      event: event.slice(0, 80),
      errorName,
      ...(code ? { code } : {}),
      ...sanitizeContext(context),
      timestamp: new Date().toISOString(),
    }),
  );
}
