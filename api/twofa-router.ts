import { z } from "zod";
import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { getSessionCookieOptions } from "./lib/cookies";
import {
  generateTotpSecret,
  hasTwoFactorPass,
  otpauthUrl,
  twoFactorCookieValue,
  verifyTotp,
  TWO_FACTOR_COOKIE,
  TWO_FACTOR_MAX_AGE,
} from "./lib/twofa";

const codeInput = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.");

async function passCookie(ctx: { req: Request; resHeaders: Headers }, unionId: string): Promise<void> {
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(TWO_FACTOR_COOKIE, await twoFactorCookieValue(unionId), {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: TWO_FACTOR_MAX_AGE,
    }),
  );
}

export const twoFactorRouter = createRouter({
  /** Gate state for the admin console: setup needed / challenge needed / through. */
  state: adminQuery.query(async ({ ctx }) => {
    return {
      enabled: ctx.user.totpEnabled,
      passed: await hasTwoFactorPass(ctx),
    };
  }),

  /** Start setup: mint a secret (not yet active) and return it with a QR code. */
  beginSetup: adminQuery.mutation(async ({ ctx }) => {
    const secret = generateTotpSecret();
    const db = getDb();
    await db.update(users).set({ totpSecret: secret, totpEnabled: false }).where(eq(users.id, ctx.user.id));
    const url = otpauthUrl(secret, ctx.user.email ?? ctx.user.name ?? "admin");
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
    return { secret, otpauthUrl: url, qrDataUrl };
  }),

  /** Finish setup: prove the authenticator is paired, then activate 2FA. */
  enableSetup: adminQuery.input(z.object({ code: codeInput })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.totpSecret) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Start the setup first." });
    }
    if (!verifyTotp(ctx.user.totpSecret, input.code)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match — check the time on your phone and try again." });
    }
    const db = getDb();
    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, ctx.user.id));
    await passCookie(ctx, ctx.user.unionId);
    return { ok: true as const };
  }),

  /** The per-session challenge for accounts that already have 2FA on. */
  verify: adminQuery.input(z.object({ code: codeInput })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.totpEnabled || !ctx.user.totpSecret) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor is not set up on this account." });
    }
    if (!verifyTotp(ctx.user.totpSecret, input.code)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match — wait for a fresh one and try again." });
    }
    await passCookie(ctx, ctx.user.unionId);
    return { ok: true as const };
  }),
});
