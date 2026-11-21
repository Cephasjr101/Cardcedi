import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { storage } from "./lib/storage";
import {
  createOrder,
  findOrderByPublicId,
  generatePublicId,
  listOrderEvents,
} from "./queries/orders";
import {
  findBrand,
  payoutPesewasFor,
  ratePesewasPerUsd,
  maskPhone,
  GHANA_PHONE_RE,
  type TrackedOrder,
} from "@contracts/catalog";

const PUBLIC_ID_RE = /^CC-[A-Z2-9]{6}$/i;

// Anonymous upload is a deliberate product decision: sellers are not logged in.
// Hard caps: image MIME only, 5 MB decoded, no list/delete exposed on this router.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const ordersRouter = createRouter({
  uploadPhoto: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(120),
        contentBase64: z.string().max(Math.ceil(MAX_PHOTO_BYTES * 1.4) + 64),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
      }),
    )
    .mutation(async ({ input }) => {
      const bytes = Uint8Array.from(Buffer.from(input.contentBase64, "base64"));
      if (bytes.byteLength > MAX_PHOTO_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Photo must be under 5 MB." });
      }
      const safeName = input.name.replace(/[^\w.\- ]+/g, "_").slice(-60) || "card.jpg";
      const saved = await storage.uploadFile({
        fileContent: bytes,
        fileName: `cards/${Date.now()}-${safeName}`,
        contentType: input.contentType,
      });
      return { key: saved.key };
    }),

  create: publicQuery
    .input(
      z.object({
        brandId: z.string().min(1).max(32),
        amountUsdCents: z.number().int().positive().max(200_000_00),
        network: z.enum(["mtn", "telecel", "airteltigo"]),
        phone: z.string().regex(GHANA_PHONE_RE, "Enter a 10-digit Ghana number starting with 0."),
        accountName: z.string().trim().min(2).max(120),
        cardCode: z.string().trim().min(8).max(200),
        photoKey: z.string().max(600).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const brand = findBrand(input.brandId);
      if (!brand) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown card brand." });
      }
      const usd = input.amountUsdCents / 100;
      if (usd < brand.minUsd || usd > brand.maxUsd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${brand.name} trades run $${brand.minUsd}–$${brand.maxUsd}.`,
        });
      }
      const order = await createOrder({
        publicId: generatePublicId(),
        brandId: brand.id,
        amountUsdCents: input.amountUsdCents,
        ratePesewasPerUsd: ratePesewasPerUsd(brand),
        payoutPesewas: payoutPesewasFor(brand, input.amountUsdCents),
        network: input.network,
        phone: input.phone,
        accountName: input.accountName,
        cardCode: input.cardCode,
        codeLast4: input.cardCode.replace(/[^A-Za-z0-9]/g, "").slice(-4) || "----",
        photoKey: input.photoKey,
      });
      return {
        publicId: order.publicId,
        payoutPesewas: order.payoutPesewas,
        createdAt: order.createdAt,
      };
    }),

  track: publicQuery
    .input(z.object({ publicId: z.string().trim().regex(PUBLIC_ID_RE, "Order IDs look like CC-7K2QX9.") }))
    .query(async ({ input }): Promise<TrackedOrder> => {
      const order = await findOrderByPublicId(input.publicId.toUpperCase());
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No trade with that ID." });
      }
      const events = await listOrderEvents(order.id);
      return {
        publicId: order.publicId,
        brandId: order.brandId,
        amountUsdCents: order.amountUsdCents,
        payoutPesewas: order.payoutPesewas,
        network: order.network,
        phoneMasked: maskPhone(order.phone),
        codeLast4: order.codeLast4,
        status: order.status,
        adminNote: order.status === "rejected" ? order.adminNote : null,
        createdAt: order.createdAt,
        events: events.map((e) => ({ status: e.status, note: e.note, createdAt: e.createdAt })),
      };
    }),
});
