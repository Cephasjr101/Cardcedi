import { createHmac, randomBytes } from "node:crypto";
import * as jose from "jose";
import { TRPCError } from "@trpc/server";
import { env } from "./env";
import type { TrpcContext } from "../context";

/**
 * Admin two-factor auth — TOTP (RFC 6238, SHA-1, 30s step, 6 digits), the
 * standard every authenticator app (Google/Microsoft Authenticator, Authy,
 * 1Password…) implements, so no SMS costs and it works offline.
 *
 * Passing the challenge mints a short-lived signed "2FA pass" cookie
 * (`cc_2fa`); admin procedures require it whenever the account has TOTP on.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const PASS_COOKIE = "cc_2fa";
const PASS_TTL_SECONDS = 12 * 60 * 60; // 12h — one challenge per working session

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of clean) bits += BASE32_ALPHABET.indexOf(ch).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(msg).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function totpAt(secret: string, timestampMs: number): string {
  return hotp(secret, Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS));
}

/** Accept the current step plus one either side (clock drift). */
export function verifyTotp(secret: string, code: string, timestampMs = Date.now()): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    if (hotp(secret, step + drift) === clean) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, accountName: string): string {
  const label = encodeURIComponent(`CardCedi:${accountName}`);
  const params = new URLSearchParams({ secret, issuer: "CardCedi", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ---------------- 2FA pass token (post-challenge session marker) ---------------- */

async function signTwoFactorPass(unionId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT({ unionId, scope: "admin-2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PASS_TTL_SECONDS}s`)
    .sign(secret);
}

async function verifyTwoFactorPass(token: string, unionId: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload.scope === "admin-2fa" && payload.unionId === unionId;
  } catch {
    return false;
  }
}

export const TWO_FACTOR_COOKIE = PASS_COOKIE;
export const TWO_FACTOR_MAX_AGE = PASS_TTL_SECONDS;

/** Mint the Set-Cookie value for a freshly-passed challenge. */
export async function twoFactorCookieValue(unionId: string): Promise<string> {
  return signTwoFactorPass(unionId);
}

function readPassCookie(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === PASS_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function hasTwoFactorPass(ctx: TrpcContext): Promise<boolean> {
  if (!ctx.user) return false;
  const token = readPassCookie(ctx.req);
  return token ? verifyTwoFactorPass(token, ctx.user.unionId) : false;
}

export const TWOFA_SETUP_MESSAGE = "2FA_SETUP_REQUIRED";
export const TWOFA_VERIFY_MESSAGE = "2FA_REQUIRED";

/**
 * Gate for every admin business procedure:
 *  - TOTP not configured yet → tell the client to run setup first.
 *  - Configured but this session hasn't passed the challenge → challenge it.
 */
export async function requireTwoFactor(ctx: TrpcContext): Promise<void> {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!ctx.user.totpEnabled) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: TWOFA_SETUP_MESSAGE });
  }
  if (!(await hasTwoFactorPass(ctx))) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: TWOFA_VERIFY_MESSAGE });
  }
}
