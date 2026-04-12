import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trucksTable = pgTable("trucks", {
  id: serial("id").primaryKey(),
  nae: text("nae").notNull(),
  type: text("type").notNull(),
  arrivalTime: text("arrival_time"),
  startUnloadTime: text("start_unload_time"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTruckSchema = createInsertSchema(trucksTable).omit({ id: true, createdAt: true });
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucksTable.$inferSelect;
