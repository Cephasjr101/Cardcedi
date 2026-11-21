import { getDb } from "../api/queries/connection";
import { orders, orderEvents } from "./schema";
import { eq } from "drizzle-orm";
import { findBrand, payoutPesewasFor, ratePesewasPerUsd } from "../contracts/catalog";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  const existing = await db.query.orders.findFirst({
    where: eq(orders.publicId, "CC-7K2QX9"),
  });
  if (!existing) {
    const brand = findBrand("amazon")!;
    const amountUsdCents = 100_00;
    const [{ id }] = await db
      .insert(orders)
      .values({
        publicId: "CC-7K2QX9",
        brandId: brand.id,
        amountUsdCents,
        ratePesewasPerUsd: ratePesewasPerUsd(brand),
        payoutPesewas: payoutPesewasFor(brand, amountUsdCents),
        network: "mtn",
        phone: "0551234567",
        accountName: "Ama Serwaa",
        cardCode: "DEMO-AMZN-7K2Q-X9PL",
        codeLast4: "X9PL",
        status: "paid",
      })
      .$returningId();

    const now = Date.now();
    await db.insert(orderEvents).values([
      { orderId: id, status: "submitted", createdAt: new Date(now - 14 * 60_000) },
      { orderId: id, status: "verifying", createdAt: new Date(now - 12 * 60_000) },
      { orderId: id, status: "sold", createdAt: new Date(now - 8 * 60_000) },
      { orderId: id, status: "paid", createdAt: new Date(now - 5 * 60_000) },
    ]);
    console.log("Seeded demo order CC-7K2QX9 (paid).");
  } else {
    console.log("Demo order CC-7K2QX9 already exists — skipping.");
  }

  // Live listings so the marketplace has stock on first load.
  const listings: { publicId: string; brandId: string; usd: number }[] = [
    { publicId: "CC-AMZ234", brandId: "amazon", usd: 200 },
    { publicId: "CC-APL567", brandId: "apple", usd: 50 },
    { publicId: "CC-STM345", brandId: "steam", usd: 100 },
    { publicId: "CC-GP2589", brandId: "googleplay", usd: 25 },
  ];
  for (const l of listings) {
    const exists = await db.query.orders.findFirst({ where: eq(orders.publicId, l.publicId) });
    if (exists) continue;
    const b = findBrand(l.brandId)!;
    const [{ id: oid }] = await db
      .insert(orders)
      .values({
        publicId: l.publicId,
        brandId: b.id,
        amountUsdCents: l.usd * 100,
        ratePesewasPerUsd: ratePesewasPerUsd(b),
        payoutPesewas: payoutPesewasFor(b, l.usd * 100),
        network: "mtn",
        phone: "0551234567",
        accountName: "Demo Seller",
        cardCode: `DEMO-${b.short}-${l.publicId.slice(3)}-SEED`,
        codeLast4: "SEED",
        status: "active",
      })
      .$returningId();
    await db.insert(orderEvents).values([
      { orderId: oid, status: "submitted" },
      { orderId: oid, status: "verifying" },
      { orderId: oid, status: "active" },
    ]);
  }
  console.log("Seeded live market listings.");
  process.exit(0); // close MySQL connection pool
}

seed();
