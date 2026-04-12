import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditEntriesTable = pgTable("audit_entries", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  sku: text("sku").notNull(),
  auditedBultos: numeric("audited_bultos"),
  auditedUnidades: numeric("audited_unidades"),
  auditorName: text("auditor_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAuditEntrySchema = createInsertSchema(auditEntriesTable).omit({ id: true, updatedAt: true });
export type InsertAuditEntry = z.infer<typeof insertAuditEntrySchema>;
export type AuditEntry = typeof auditEntriesTable.$inferSelect;
