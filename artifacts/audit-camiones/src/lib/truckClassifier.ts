import type { NaeProduct, TruckType } from "../types";

export function classifyTruck(nae: string, products: NaeProduct[]): TruckType {
  const normalized = nae.trim().replace(/^0+/, "") || "0";
  const prefix = normalized.charAt(0);

  if (prefix === "1") return "secos-moreno";
  if (prefix === "8") return "secos-escobar";

  if (prefix === "5") {
    const hasDept91 = products.some((p) => {
      const dpto = p.departamento?.toString().trim();
      return dpto === "91";
    });
    return hasDept91 ? "congelados" : "frios";
  }

  return "secos-moreno";
}
