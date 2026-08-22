export interface AppError extends Error {
  statusCode?: number;
}

export class HttpError extends Error implements AppError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
