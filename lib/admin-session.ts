import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h
const DEFAULT_SECRET = "change-this-secret-in-production";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || DEFAULT_SECRET;

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadBase64: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
}

export function createAdminSessionToken(): string {
  const payload = {
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function isValidAdminSession(token?: string): boolean {
  if (!token) return false;

  const [payloadBase64, providedSignature] = token.split(".");
  if (!payloadBase64 || !providedSignature) return false;

  const expectedSignature = sign(payloadBase64);
  const providedSignatureBuffer = Buffer.from(providedSignature, "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) return false;
  if (!timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)) return false;

  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64)) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function clearAdminSession(_token?: string): void {
  // Stateless token; logout is handled by deleting the cookie.
}
