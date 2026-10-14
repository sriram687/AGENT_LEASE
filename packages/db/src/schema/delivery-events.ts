import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { purchaseRequests } from "./purchase-requests";

export const deliveryEventType = pgEnum("delivery_event_type", [
  "TRACKING_ADDED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNED",
]);

export const deliveryEvents = pgTable("delivery_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseRequestId: uuid("purchase_request_id")
    .notNull()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),

  eventType: deliveryEventType("event_type").notNull(),

  // From PayPal Add Tracking API or demo store carrier simulator
  trackingNumber: varchar("tracking_number", { length: 128 }),
  carrier: varchar("carrier", { length: 64 }),
  paypalTrackingId: varchar("paypal_tracking_id", { length: 64 }),

  // Raw carrier / demo store payload
  rawPayload: jsonb("raw_payload"),

  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DeliveryEvent = typeof deliveryEvents.$inferSelect;
export type NewDeliveryEvent = typeof deliveryEvents.$inferInsert;
