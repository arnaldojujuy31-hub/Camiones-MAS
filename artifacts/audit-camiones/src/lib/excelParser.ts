import * as XLSX from "xlsx";
import type { NaeProduct } from "../types";

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] as (string | number | null | undefined)[];
    const hasNae = row.some(
      (cell) => typeof cell === "string" && cell.trim().toUpperCase() === "NAE"
    );
    const hasSku = row.some(
      (cell) => typeof cell === "string" && cell.trim().toUpperCase() === "SKU"
    );
    if (hasNae && hasSku) return i;
  }
  return -1;
}

function normalizeKey(key: string | null | undefined): string {
  if (!key) return `__empty_${Math.random()}`;
  return key
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

export interface ParsedNaeFile {
  nae: string;
  products: NaeProduct[];
  agotadoSkus: Set<string>;
}

export function parseNaeFile(file: File): Promise<ParsedNaeFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as (string | number | null | undefined)[][];

        const headerRowIdx = findHeaderRow(rawRows);
        if (headerRowIdx < 0) {
          reject(
            new Error(
              "No se encontró la fila de encabezados (NAE, SKU) en el archivo. Verificá que sea un reporte NAE válido."
            )
          );
          return;
        }

        const headerRow = rawRows[headerRowIdx] as (string | null | undefined)[];
        const normalizedHeaders = headerRow.map(normalizeKey);

        const products: NaeProduct[] = [];
        const agotadoSkus = new Set<string>();
        let detectedNae = "";

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i] as (string | number)[];
          if (!row || row.every((cell) => cell === "" || cell === null || cell === undefined)) {
            continue;
          }

          const obj: Record<string, string | number | undefined> = {};
          normalizedHeaders.forEach((header, idx) => {
            obj[header] = row[idx] as string | number | undefined;
          });

          const naeVal = (obj["nae"] ?? "").toString().trim();
          const skuVal = (obj["sku"] ?? "").toString().trim();
          const descripVal = (
            obj["descripcion_de_sku"] ??
            obj["descripcion_del_sku"] ??
            obj["descripcion"] ??
            obj["descripcion_sku"] ??
            ""
          ).toString().trim();
          const deptVal = (obj["departamento"] ?? obj["dpto"] ?? "").toString().trim();
          const upcVal = (obj["upc"] ?? "").toString().trim();
          const bultosVal = obj["bultos_esperados"] ?? obj["bultos"] ?? "";
          const unidadesVal = obj["unidades_esperadas"] ?? obj["unidades"] ?? "";

          if (naeVal.toLowerCase() === "total" || (!skuVal && !descripVal)) continue;

          if (!detectedNae && naeVal) {
            const match = naeVal.match(/^(\d+)/);
            detectedNae = match ? match[1] : naeVal;
          }

          const product: NaeProduct = {
            nae: naeVal,
            sku: skuVal,
            ean: upcVal,
            descripcion: descripVal,
            departamento: deptVal,
            bultos: bultosVal ?? "",
            unidades: unidadesVal ?? "",
          };

          if (product.sku || product.descripcion) {
            products.push(product);

            // Detectar agotados: columna "stock disponible" (o variantes) con valor 0
            const stockRaw =
              obj["stock_disponible"] ??
              obj["stock"] ??
              obj["disponible"] ??
              obj["stock_disp"] ??
              obj["stk_disponible"] ??
              obj["stk"];

            if (skuVal && stockRaw !== undefined && stockRaw !== "") {
              const stockNum = Number(stockRaw);
              if (!isNaN(stockNum) && stockNum === 0) {
                agotadoSkus.add(skuVal);
              }
            }
          }
        }

        if (!detectedNae) {
          const match = file.name.match(/(\d+)/);
          if (match) detectedNae = match[1];
        }

        if (products.length === 0) {
          reject(
            new Error(
              `Archivo procesado pero no se encontraron productos. ` +
              `Fila de encabezados detectada en fila ${headerRowIdx + 1}. ` +
              `Verificá que el archivo tenga columnas SKU y DESCRIPCION DE SKU.`
            )
          );
          return;
        }

        resolve({ nae: detectedNae, products, agotadoSkus });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}
