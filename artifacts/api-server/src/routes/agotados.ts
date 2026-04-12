import { Router, type IRouter } from "express";
import { db, agotadosTable } from "@workspace/db";
import { SetAgotadosBody } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /agotados
router.get("/agotados", async (_req, res): Promise<void> => {
  const rows = await db.select().from(agotadosTable);
  res.json({ skus: rows.map((r) => r.sku) });
});

// POST /agotados
router.post("/agotados", async (req, res): Promise<void> => {
  const parsed = SetAgotadosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.delete(agotadosTable);

  if (parsed.data.skus.length > 0) {
    await db.insert(agotadosTable).values(parsed.data.skus.map((sku) => ({ sku })));
  }

  res.json({ skus: parsed.data.skus });
});

export default router;
