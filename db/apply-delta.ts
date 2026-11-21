import "dotenv/config";
import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const enumDef = "enum('submitted','verifying','active','reserved','sold','paid','rejected','delisted')";
  const pEnumDef = "enum('awaiting_payment','payment_sent','confirmed','completed','disputed','refunded','cancelled')";
  await db.execute(sql.raw(`ALTER TABLE orders MODIFY COLUMN status ${enumDef} NOT NULL DEFAULT 'submitted'`));
  await db.execute(sql.raw("ALTER TABLE order_events MODIFY COLUMN status enum('submitted','verifying','approved','active','reserved','sold','paid','rejected','delisted') NOT NULL"));
  await db.execute(sql.raw("UPDATE order_events SET status='sold' WHERE status='approved'"));
  await db.execute(sql.raw(`ALTER TABLE order_events MODIFY COLUMN status ${enumDef} NOT NULL`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS purchases (
    id serial AUTO_INCREMENT NOT NULL,
    publicId varchar(16) NOT NULL,
    orderId bigint unsigned NOT NULL,
    buyerName varchar(255) NOT NULL,
    buyerPhone varchar(10) NOT NULL,
    buyerNetwork enum('mtn','telecel','airteltigo') NOT NULL,
    pricePesewas int unsigned NOT NULL,
    status ${pEnumDef} NOT NULL DEFAULT 'awaiting_payment',
    buyerNote text,
    adminNote text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT purchases_id PRIMARY KEY(id),
    CONSTRAINT purchases_publicId_unique UNIQUE(publicId)
  )`));
  await db.execute(sql.raw("CREATE INDEX purchases_order_idx ON purchases (orderId)"));
  await db.execute(sql.raw("CREATE INDEX purchases_status_idx ON purchases (status)"));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS purchase_events (
    id serial AUTO_INCREMENT NOT NULL,
    purchaseId bigint unsigned NOT NULL,
    status ${pEnumDef} NOT NULL,
    note text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT purchase_events_id PRIMARY KEY(id)
  )`));
  await db.execute(sql.raw("CREATE INDEX purchase_events_purchase_idx ON purchase_events (purchaseId)"));
  console.log("delta applied");
  process.exit(0);
}
main();
