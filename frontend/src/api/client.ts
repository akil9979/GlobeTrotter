const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem("globetrotter_token");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => undefined) as { error?: string; details?: unknown } | undefined;
  if (!response.ok) throw new ApiError(payload?.error ?? "Something went wrong.", response.status, payload?.details);
  return payload as T;
};
