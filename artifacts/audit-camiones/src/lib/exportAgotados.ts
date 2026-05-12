import * as XLSX from "xlsx";

interface AgotadoDetail {
  sku: string;
  description: string | null;
  department: string | null;
  ean: string | null;
  expectedBultos: string | null;
  expectedUnidades: string | null;
  truckNae: string | null;
  truckType: string | null;
}

export async function exportAgotadosByTruck(truckId: number, truckNae: string): Promise<void> {
  const res = await fetch(`/api/agotados/details?truckId=${truckId}`);
  if (!res.ok) throw new Error("Error al obtener los agotados");
  const data: { products: AgotadoDetail[] } = await res.json();

  const { products } = data;
  if (products.length === 0) {
    throw new Error("Este camión no tiene agotados en tránsito");
  }

  const rows = products.map((p) => ({
    SKU: p.sku,
    "Descripción": p.description ?? "",
    "Departamento": p.department ?? "",
    "EAN / UPC": p.ean ?? "",
    "Bultos Esperados": p.expectedBultos != null ? Number(p.expectedBultos) : "",
    "Unidades Esperadas": p.expectedUnidades != null ? Number(p.expectedUnidades) : "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 14 },
    { wch: 42 },
    { wch: 13 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Agotados en Tránsito");

  const fecha = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
  XLSX.writeFile(wb, `agotados_NAE${truckNae}_${fecha}.xlsx`);
}
