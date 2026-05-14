import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { trucksTable } from "./trucks";

export const agotadosTable = pgTable("agotados", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id")
    .notNull()
    .references(() => trucksTable.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
});

export type Agotado = typeof agotadosTable.$inferSelect;
