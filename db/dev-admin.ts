import "dotenv/config";
import { getDb } from "../api/queries/connection";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { signSessionToken } from "../api/kimi/session";

/**
 * DEV-ONLY helper: creates a local admin user and prints a session token
 * so the admin console can be verified in a real browser without completing
 * OAuth. Not used by the app; delete before publishing if undesired.
 */
async function main() {
  const db = getDb();
  const unionId = "dev-admin-local";
  const existing = await db.query.users.findFirst({ where: eq(users.unionId, unionId) });
  if (!existing) {
    await db.insert(users).values({ unionId, name: "Cephas (Admin)", role: "admin" });
  } else if (existing.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.unionId, unionId));
  }
  const token = await signSessionToken({
    unionId,
    clientId: process.env.APP_ID!,
  });
  console.log("TOKEN:" + token);
  process.exit(0);
}

main();
