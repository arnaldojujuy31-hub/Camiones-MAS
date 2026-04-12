import { pgTable, serial, integer, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const truckProductsTable = pgTable("truck_products", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  sku: text("sku").notNull(),
  ean: text("ean").notNull().default(""),
  description: text("description").notNull().default(""),
  department: text("department").notNull().default(""),
  expectedBultos: numeric("expected_bultos"),
  expectedUnidades: numeric("expected_unidades"),
});

export const insertTruckProductSchema = createInsertSchema(truckProductsTable).omit({ id: true });
export type InsertTruckProduct = z.infer<typeof insertTruckProductSchema>;
export type TruckProduct = typeof truckProductsTable.$inferSelect;
