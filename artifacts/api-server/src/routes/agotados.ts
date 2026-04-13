import { Router, type IRouter } from "express";
import { db, agotadosTable } from "@workspace/db";
import { SetAgotadosBody } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// GET /agotados
router.get("/agotados", async (_req, res): Promise<void> => {
  const rows = await db.select().from(agotadosTable);
  res.json({ skus: rows.map((r) => r.sku) });
});

// POST /agotados — MERGE: agrega nuevos SKUs sin borrar los existentes
router.post("/agotados", async (req, res): Promise<void> => {
  const parsed = SetAgotadosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.skus.length > 0) {
    await db
      .insert(agotadosTable)
      .values(parsed.data.skus.map((sku) => ({ sku })))
      .onConflictDoNothing();
  }

  const rows = await db.select().from(agotadosTable);
  res.json({ skus: rows.map((r) => r.sku) });
});

// DELETE /agotados — borra todos los agotados
router.delete("/agotados", async (_req, res): Promise<void> => {
  await db.delete(agotadosTable);
  res.status(204).send();
});

export default router;
