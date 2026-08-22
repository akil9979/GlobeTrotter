import type { Request } from "express";

// Route validators guarantee these values before controllers execute.
export const routeParam = (request: Request, name: string): string => request.params[name] as string;
