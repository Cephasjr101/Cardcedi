import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** TOTP secret (base32) for admin two-factor auth; null until setup begins */
  totpSecret: varchar("totpSecret", { length: 64 }),
  totpEnabled: boolean("totpEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const orderStatusEnum = [
  "submitted",
  "verifying",
  "active",
  "reserved",
  "sold",
  "paid",
  "rejected",
  "delisted",
] as const;

export const purchaseStatusEnum = [
  "awaiting_payment",
  "payment_sent",
  "confirmed",
  "completed",
  "disputed",
  "refunded",
  "cancelled",
] as const;

export const payoutStatusEnum = [
  "not_required", // manual mode — the buyer paid the seller directly
  "scheduled",    // auto mode — transfer fires at payoutDueAt
  "sent",         // auto mode — transfer left our Paystack balance
  "failed",       // auto mode — last transfer attempt failed (sweeper retries)
  "frozen",       // disputed — held back until the dispute is resolved
] as const;

export const orders = mysqlTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    /** Public tracking id, e.g. CC-7K2QX9 */
    publicId: varchar("publicId", { length: 16 }).notNull().unique(),
    brandId: varchar("brandId", { length: 32 }).notNull(),
    /** Face value in USD cents */
    amountUsdCents: int("amountUsdCents", { unsigned: true }).notNull(),
    /** Locked rate, pesewas per $1 */
    ratePesewasPerUsd: int("ratePesewasPerUsd", { unsigned: true }).notNull(),
    /** Locked payout in pesewas */
    payoutPesewas: int("payoutPesewas", { unsigned: true }).notNull(),
    network: mysqlEnum("network", ["mtn", "telecel", "airteltigo"]).notNull(),
    phone: varchar("phone", { length: 10 }).notNull(),
    accountName: varchar("accountName", { length: 255 }).notNull(),
    /** Full card code — server-only, never returned by public procedures */
    cardCode: text("cardCode").notNull(),
    codeLast4: varchar("codeLast4", { length: 4 }).notNull(),
    /** Object-storage key for the uploaded card photo (never a URL) */
    photoKey: varchar("photoKey", { length: 600 }),
    status: mysqlEnum("status", orderStatusEnum).default("submitted").notNull(),
    adminNote: text("adminNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    statusIdx: index("orders_status_idx").on(table.status),
    createdIdx: index("orders_created_idx").on(table.createdAt),
  }),
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderEvents = mysqlTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: bigint("orderId", { mode: "number", unsigned: true }).notNull(),
    status: mysqlEnum("status", orderStatusEnum).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index("order_events_order_idx").on(table.orderId),
  }),
);

export type OrderEvent = typeof orderEvents.$inferSelect;
export type InsertOrderEvent = typeof orderEvents.$inferInsert;

export const purchases = mysqlTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    /** Public tracking id, e.g. PU-9XK2QW */
    publicId: varchar("publicId", { length: 16 }).notNull().unique(),
    orderId: bigint("orderId", { mode: "number", unsigned: true }).notNull(),
    buyerName: varchar("buyerName", { length: 255 }).notNull(),
    buyerPhone: varchar("buyerPhone", { length: 10 }).notNull(),
    /** Network the buyer will send escrow from */
    buyerNetwork: mysqlEnum("buyerNetwork", ["mtn", "telecel", "airteltigo"]).notNull(),
    /** Escrow amount (buyer price) in pesewas */
    pricePesewas: int("pricePesewas", { unsigned: true }).notNull(),
    status: mysqlEnum("status", purchaseStatusEnum).default("awaiting_payment").notNull(),
    /** When payment was confirmed and the code released — start of the dispute window */
    confirmedAt: timestamp("confirmedAt"),
    /** Buyer may report a bad card until this moment */
    disputeDeadlineAt: timestamp("disputeDeadlineAt"),
    /** Seller payout is released at/after this moment (auto mode) */
    payoutDueAt: timestamp("payoutDueAt"),
    payoutStatus: mysqlEnum("payoutStatus", payoutStatusEnum).default("not_required").notNull(),
    /** Paystack transfer code once the seller payout leaves our balance */
    payoutReference: varchar("payoutReference", { length: 64 }),
    disputedAt: timestamp("disputedAt"),
    /** Object-storage key for the buyer's proof image (never a URL) */
    disputeProofKey: varchar("disputeProofKey", { length: 600 }),
    buyerNote: text("buyerNote"),
    adminNote: text("adminNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orderIdx: index("purchases_order_idx").on(table.orderId),
    statusIdx: index("purchases_status_idx").on(table.status),
  }),
);

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

export const purchaseEvents = mysqlTable(
  "purchase_events",
  {
    id: serial("id").primaryKey(),
    purchaseId: bigint("purchaseId", { mode: "number", unsigned: true }).notNull(),
    status: mysqlEnum("status", purchaseStatusEnum).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    purchaseIdx: index("purchase_events_purchase_idx").on(table.purchaseId),
  }),
);

export type PurchaseEvent = typeof purchaseEvents.$inferSelect;
export type InsertPurchaseEvent = typeof purchaseEvents.$inferInsert;
