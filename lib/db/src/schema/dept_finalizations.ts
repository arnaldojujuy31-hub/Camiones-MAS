import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deptFinalizationsTable = pgTable("dept_finalizations", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  department: text("department").notNull(),
  auditorName: text("auditor_name").notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeptFinalizationSchema = createInsertSchema(deptFinalizationsTable).omit({ id: true, finalizedAt: true });
export type InsertDeptFinalization = z.infer<typeof insertDeptFinalizationSchema>;
export type DeptFinalization = typeof deptFinalizationsTable.$inferSelect;
