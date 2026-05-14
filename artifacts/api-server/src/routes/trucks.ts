import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  trucksTable,
  truckProductsTable,
  auditEntriesTable,
  deptFinalizationsTable,
  agotadosTable,
} from "@workspace/db";
import {
  CreateTruckBody,
  UpdateTruckBody,
  UpdateTruckParams,
  GetTruckParams,
  DeleteTruckParams,
  UpsertAuditEntryBody,
  UpsertAuditEntryParams,
  FinalizeDepartmentBody,
  FinalizeDepartmentParams,
  FinalizeTruckParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getTruckStats(truckId: number) {
  const [productRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(truckProductsTable)
    .where(eq(truckProductsTable.truckId, truckId));

  const [auditedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditEntriesTable)
    .where(
      and(
        eq(auditEntriesTable.truckId, truckId),
        sql`${auditEntriesTable.auditedUnidades} is not null`
      )
    );

  const [agotadoRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(truckProductsTable)
    .innerJoin(agotadosTable, eq(truckProductsTable.sku, agotadosTable.sku))
    .where(eq(truckProductsTable.truckId, truckId));

  return {
    productCount: productRow?.count ?? 0,
    auditedCount: auditedRow?.count ?? 0,
    agotadoCount: agotadoRow?.count ?? 0,
  };
}

function formatTruckSummary(
  truck: typeof trucksTable.$inferSelect,
  stats: { productCount: number; auditedCount: number; agotadoCount: number }
) {
  return {
    id: truck.id,
    nae: truck.nae,
    type: truck.type,
    arrivalTime: truck.arrivalTime,
    startUnloadTime: truck.startUnloadTime,
    status: truck.status,
    productCount: stats.productCount,
    auditedCount: stats.auditedCount,
    agotadoCount: stats.agotadoCount,
    createdAt: truck.createdAt.toISOString(),
  };
}

// GET /trucks
router.get("/trucks", async (req, res): Promise<void> => {
  const trucks = await db.select().from(trucksTable).orderBy(trucksTable.createdAt);

  const summaries = await Promise.all(
    trucks.map(async (truck) => {
      const stats = await getTruckStats(truck.id);
      return formatTruckSummary(truck, stats);
    })
  );

  res.json(summaries);
});

// POST /trucks
router.post("/trucks", async (req, res): Promise<void> => {
  const parsed = CreateTruckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { nae, type, products } = parsed.data;

  const [truck] = await db
    .insert(trucksTable)
    .values({ nae, type, status: "active" })
    .returning();

  if (products.length > 0) {
    await db.insert(truckProductsTable).values(
      products.map((p) => ({
        truckId: truck.id,
        sku: p.sku,
        ean: p.ean ?? "",
        description: p.description,
        department: p.department,
        expectedBultos: p.expectedBultos != null ? String(p.expectedBultos) : null,
        expectedUnidades: p.expectedUnidades != null ? String(p.expectedUnidades) : null,
      }))
    );
  }

  const stats = await getTruckStats(truck.id);
  res.status(201).json(formatTruckSummary(truck, stats));
});

// GET /trucks/:truckId
router.get("/trucks/:truckId", async (req, res): Promise<void> => {
  const params = GetTruckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [truck] = await db
    .select()
    .from(trucksTable)
    .where(eq(trucksTable.id, params.data.truckId));

  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const dbProducts = await db
    .select()
    .from(truckProductsTable)
    .where(eq(truckProductsTable.truckId, truck.id));

  const dbAuditEntries = await db
    .select()
    .from(auditEntriesTable)
    .where(eq(auditEntriesTable.truckId, truck.id));

  const dbDeptFinalizations = await db
    .select()
    .from(deptFinalizationsTable)
    .where(eq(deptFinalizationsTable.truckId, truck.id));

  const auditMap = new Map(dbAuditEntries.map((e) => [e.sku, e]));

  const products = dbProducts.map((p) => {
    const entry = auditMap.get(p.sku);
    return {
      sku: p.sku,
      ean: p.ean,
      description: p.description,
      department: p.department,
      expectedBultos: p.expectedBultos != null ? Number(p.expectedBultos) : null,
      expectedUnidades: p.expectedUnidades != null ? Number(p.expectedUnidades) : null,
      auditedBultos: entry?.auditedBultos != null ? Number(entry.auditedBultos) : null,
      auditedUnidades: entry?.auditedUnidades != null ? Number(entry.auditedUnidades) : null,
      auditorName: entry?.auditorName ?? null,
      updatedAt: entry?.updatedAt?.toISOString() ?? null,
    };
  });

  const deptFinalizations = dbDeptFinalizations.map((d) => ({
    id: d.id,
    truckId: d.truckId,
    department: d.department,
    auditorName: d.auditorName,
    finalizedAt: d.finalizedAt.toISOString(),
  }));

  res.json({
    id: truck.id,
    nae: truck.nae,
    type: truck.type,
    arrivalTime: truck.arrivalTime,
    startUnloadTime: truck.startUnloadTime,
    status: truck.status,
    createdAt: truck.createdAt.toISOString(),
    products,
    deptFinalizations,
  });
});

// PATCH /trucks/:truckId
router.patch("/trucks/:truckId", async (req, res): Promise<void> => {
  const params = UpdateTruckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTruckBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const update: Record<string, string | null> = {};
  if (body.data.arrivalTime !== undefined) update.arrivalTime = body.data.arrivalTime ?? null;
  if (body.data.startUnloadTime !== undefined)
    update.startUnloadTime = body.data.startUnloadTime ?? null;
  if (body.data.status !== undefined) update.status = body.data.status ?? null;

  const [truck] = await db
    .update(trucksTable)
    .set(update)
    .where(eq(trucksTable.id, params.data.truckId))
    .returning();

  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const stats = await getTruckStats(truck.id);
  res.json(formatTruckSummary(truck, stats));
});

// DELETE /trucks/:truckId
router.delete("/trucks/:truckId", async (req, res): Promise<void> => {
  const params = DeleteTruckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(auditEntriesTable).where(eq(auditEntriesTable.truckId, params.data.truckId));
  await db
    .delete(deptFinalizationsTable)
    .where(eq(deptFinalizationsTable.truckId, params.data.truckId));
  await db
    .delete(truckProductsTable)
    .where(eq(truckProductsTable.truckId, params.data.truckId));
  await db.delete(agotadosTable).where(eq(agotadosTable.truckId, params.data.truckId));
  await db.delete(trucksTable).where(eq(trucksTable.id, params.data.truckId));

  res.sendStatus(204);
});

// PUT /trucks/:truckId/audit/:sku
router.put("/trucks/:truckId/audit/:sku", async (req, res): Promise<void> => {
  const rawTruckId = Array.isArray(req.params.truckId) ? req.params.truckId[0] : req.params.truckId;
  const rawSku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
  const params = UpsertAuditEntryParams.safeParse({ truckId: rawTruckId, sku: rawSku });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpsertAuditEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(auditEntriesTable)
    .where(
      and(
        eq(auditEntriesTable.truckId, params.data.truckId),
        eq(auditEntriesTable.sku, params.data.sku)
      )
    );

  const values = {
    auditedBultos: body.data.auditedBultos != null ? String(body.data.auditedBultos) : null,
    auditedUnidades: body.data.auditedUnidades != null ? String(body.data.auditedUnidades) : null,
    auditorName: body.data.auditorName ?? null,
  };

  let entry;
  if (existing.length > 0) {
    [entry] = await db
      .update(auditEntriesTable)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(auditEntriesTable.truckId, params.data.truckId),
          eq(auditEntriesTable.sku, params.data.sku)
        )
      )
      .returning();
  } else {
    [entry] = await db
      .insert(auditEntriesTable)
      .values({ truckId: params.data.truckId, sku: params.data.sku, ...values })
      .returning();
  }

  res.json({
    truckId: entry.truckId,
    sku: entry.sku,
    auditedBultos: entry.auditedBultos != null ? Number(entry.auditedBultos) : null,
    auditedUnidades: entry.auditedUnidades != null ? Number(entry.auditedUnidades) : null,
    auditorName: entry.auditorName,
    updatedAt: entry.updatedAt.toISOString(),
  });
});

// POST /trucks/:truckId/departments/:department/finalize
router.post(
  "/trucks/:truckId/departments/:department/finalize",
  async (req, res): Promise<void> => {
    const rawTruckId = Array.isArray(req.params.truckId)
      ? req.params.truckId[0]
      : req.params.truckId;
    const rawDept = Array.isArray(req.params.department)
      ? req.params.department[0]
      : req.params.department;
    const params = FinalizeDepartmentParams.safeParse({
      truckId: rawTruckId,
      department: rawDept,
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = FinalizeDepartmentBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    await db
      .delete(deptFinalizationsTable)
      .where(
        and(
          eq(deptFinalizationsTable.truckId, params.data.truckId),
          eq(deptFinalizationsTable.department, params.data.department)
        )
      );

    const [finalization] = await db
      .insert(deptFinalizationsTable)
      .values({
        truckId: params.data.truckId,
        department: params.data.department,
        auditorName: body.data.auditorName,
      })
      .returning();

    res.json({
      id: finalization.id,
      truckId: finalization.truckId,
      department: finalization.department,
      auditorName: finalization.auditorName,
      finalizedAt: finalization.finalizedAt.toISOString(),
    });
  }
);

// POST /trucks/:truckId/finalize
router.post("/trucks/:truckId/finalize", async (req, res): Promise<void> => {
  const params = FinalizeTruckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [truck] = await db
    .update(trucksTable)
    .set({ status: "completed" })
    .where(eq(trucksTable.id, params.data.truckId))
    .returning();

  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const stats = await getTruckStats(truck.id);
  res.json(formatTruckSummary(truck, stats));
});

export default router;
