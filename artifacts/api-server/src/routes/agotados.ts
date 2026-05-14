import { Router, type IRouter } from "express";
import { db, agotadosTable, truckProductsTable, trucksTable } from "@workspace/db";
import { SetAgotadosBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /agotados
router.get("/agotados", async (req, res): Promise<void> => {
  const truckId = req.query.truckId ? parseInt(req.query.truckId as string, 10) : null;
  const query = db.select().from(agotadosTable);
  const rows = truckId 
    ? await query.where(eq(agotadosTable.truckId, truckId))
    : await query;
  res.json({ skus: rows.map((r) => r.sku) });
});

// POST /agotados — Agrega nuevos SKUs asociados a un camión
router.post("/agotados", async (req, res): Promise<void> => {
  const parsed = SetAgotadosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { truckId, skus } = parsed.data;

  if (skus.length > 0) {
    await db
      .insert(agotadosTable)
      .values(skus.map((sku) => ({ truckId, sku })));
  }

  const rows = await db.select().from(agotadosTable).where(eq(agotadosTable.truckId, truckId));
  res.json({ skus: rows.map((r) => r.sku) });
});

// GET /agotados/details?truckId=N — agotados con detalle de producto
router.get("/agotados/details", async (req, res): Promise<void> => {
  const truckId = req.query.truckId ? parseInt(req.query.truckId as string, 10) : null;

  if (!truckId) {
    res.status(400).json({ error: "truckId is required for details" });
    return;
  }

  const rows = await db
    .select({
      sku: agotadosTable.sku,
      description: truckProductsTable.description,
      department: truckProductsTable.department,
      ean: truckProductsTable.ean,
      expectedBultos: truckProductsTable.expectedBultos,
      expectedUnidades: truckProductsTable.expectedUnidades,
      truckNae: trucksTable.nae,
      truckType: trucksTable.type,
    })
    .from(agotadosTable)
    .innerJoin(
      truckProductsTable, 
      and(
        eq(agotadosTable.sku, truckProductsTable.sku),
        eq(agotadosTable.truckId, truckProductsTable.truckId)
      )
    )
    .innerJoin(trucksTable, eq(truckProductsTable.truckId, trucksTable.id))
    .where(eq(agotadosTable.truckId, truckId))
    .orderBy(truckProductsTable.department, truckProductsTable.description);

  res.json({ products: rows });
});

// DELETE /agotados?truckId=N — borra los agotados de un camión o todos
router.delete("/agotados", async (req, res): Promise<void> => {
  const truckId = req.query.truckId ? parseInt(req.query.truckId as string, 10) : null;
  if (truckId) {
    await db.delete(agotadosTable).where(eq(agotadosTable.truckId, truckId));
  } else {
    await db.delete(agotadosTable);
  }
  res.status(204).send();
});

export default router;
