export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export class HttpError extends Error implements AppError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
