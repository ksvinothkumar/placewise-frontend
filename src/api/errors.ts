/** Error thrown for every failed API call. `code` is the stable machine-readable value from the backend error envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(init: { status: number; code: string; message: string; details?: unknown; requestId?: string }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Human-readable text for any thrown value, for toasts and inline banners. */
export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');
