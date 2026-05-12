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

const TRUCK_TYPE_LABELS: Record<string, string> = {
  "secos-moreno": "Secos - Moreno",
  "secos-escobar": "Secos - Escobar",
  "congelados": "Congelados",
  "frios": "Fríos",
};

export async function exportAgotadosToExcel(): Promise<void> {
  const res = await fetch("/api/agotados/details");
  if (!res.ok) throw new Error("Error al obtener los agotados");
  const data: { products: AgotadoDetail[] } = await res.json();

  const { products } = data;

  if (products.length === 0) {
    throw new Error("No hay agotados en tránsito para exportar");
  }

  const rows = products.map((p) => ({
    SKU: p.sku,
    Descripción: p.description ?? "",
    Departamento: p.department ?? "",
    "EAN / UPC": p.ean ?? "",
    "NAE Camión": p.truckNae ?? "",
    "Tipo Camión": p.truckType ? (TRUCK_TYPE_LABELS[p.truckType] ?? p.truckType) : "",
    "Bultos Esperados": p.expectedBultos != null ? Number(p.expectedBultos) : "",
    "Unidades Esperadas": p.expectedUnidades != null ? Number(p.expectedUnidades) : "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ancho de columnas
  ws["!cols"] = [
    { wch: 14 },  // SKU
    { wch: 40 },  // Descripción
    { wch: 13 },  // Departamento
    { wch: 14 },  // EAN
    { wch: 13 },  // NAE
    { wch: 18 },  // Tipo
    { wch: 16 },  // Bultos
    { wch: 18 },  // Unidades
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Agotados en Tránsito");

  const fecha = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
  XLSX.writeFile(wb, `agotados_transito_${fecha}.xlsx`);
}
