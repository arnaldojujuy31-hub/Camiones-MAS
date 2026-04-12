import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const agotadosTable = pgTable("agotados", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
});

export type Agotado = typeof agotadosTable.$inferSelect;
