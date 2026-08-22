import "dotenv/config";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { AuthTokenPayload } from "../types/auth.js";

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN;

if (!secret) throw new Error("JWT_SECRET must be set before the server starts.");
if (!expiresIn) throw new Error("JWT_EXPIRES_IN must be set before the server starts.");

export const createAccessToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, secret, { expiresIn: expiresIn as SignOptions["expiresIn"] });

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || typeof decoded.userId !== "string" || typeof decoded.email !== "string") {
    throw new Error("Token payload is invalid.");
  }
  return { userId: decoded.userId, email: decoded.email };
};
