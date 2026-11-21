import { authRouter } from "./auth-router";
import { ordersRouter } from "./orders-router";
import { adminRouter } from "./admin-router";
import { marketRouter } from "./market-router";
import { twoFactorRouter } from "./twofa-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  orders: ordersRouter,
  market: marketRouter,
  admin: adminRouter,
  twofa: twoFactorRouter,
});

export type AppRouter = typeof appRouter;
