// api/'s internalAuth.ts messages for a deployment-level x-api-key
// problem this app's own staff/customers can't fix themselves (the key
// baked into TENANT_API_KEY is wrong, or the company it belongs to was
// deactivated) — see requireInternalAuth() there. Rewritten to a single
// friendly message wherever they'd otherwise surface verbatim (see
// friendlyApiKeyErrorMessage below). Deliberately excludes "This API key
// is read-only." (a real, actionable scope setting, not a broken key) and
// "Missing x-api-key header." (apiClient.ts always sends one, so this
// would only ever indicate a bug in this app, not a deployment problem).
const API_KEY_PROBLEM_MESSAGES = new Set(["Invalid API key.", "This company has been deactivated."]);

export const API_KEY_PROBLEM_FRIENDLY_MESSAGE =
  "This portal can't reach the platform right now. Please contact your system administrator.";

// Swaps a raw internalAuth.ts message for the friendly one above when it
// matches a known deployment-level API key problem; returns the message
// unchanged otherwise. Centralized here (called from apiClient.ts's
// json()/bytes()) so every page/component that surfaces an ApiError's
// message gets the friendly version automatically, with nothing to
// remember at each call site.
export function friendlyApiKeyErrorMessage(message: string): string {
  return API_KEY_PROBLEM_MESSAGES.has(message) ? API_KEY_PROBLEM_FRIENDLY_MESSAGE : message;
}

export class ApiError extends Error {
  status: number;
  // Duck-typing marker, checked by isApiError() below instead of
  // `instanceof` — Next's dev-mode module graph can load this file via
  // more than one resolution path across a hot reload, which makes
  // `instanceof` unreliable even for a genuine ApiError instance.
  readonly isApiError = true as const;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { isApiError?: unknown }).isApiError === true &&
    typeof (err as { status?: unknown }).status === "number" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}
