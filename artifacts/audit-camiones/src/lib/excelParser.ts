import * as XLSX from "xlsx";
import type { NaeProduct } from "../types";

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

export function parseNaeFile(file: File): Promise<{ nae: string; products: NaeProduct[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

        if (rawRows.length < 2) {
          reject(new Error("El archivo NAE está vacío o no tiene filas de datos."));
          return;
        }

        const headerRow = rawRows[0] as string[];
        const normalizedHeaders = headerRow.map(normalizeKey);

        const products: NaeProduct[] = [];
        let detectedNae = "";

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i] as (string | number)[];
          if (!row || row.every((cell) => cell === "" || cell === null || cell === undefined)) {
            continue;
          }

          const obj: Record<string, string | number | undefined> = {};
          normalizedHeaders.forEach((header, idx) => {
            obj[header] = row[idx] as string | number | undefined;
          });

          const naeVal =
            (obj["nae"] ?? obj["numero_nae"] ?? obj["n_nae"] ?? obj["nae_"] ?? "") + "";
          const eanVal =
            (obj["ean"] ?? obj["cod_barras"] ?? obj["codigo_ean"] ?? obj["barcode"] ?? "") + "";
          const descripVal =
            (obj["descripcion"] ??
              obj["descripcion_"] ??
              obj["descrip"] ??
              obj["descripcion_del_articulo"] ??
              obj["nombre"] ??
              "") + "";
          const deptVal =
            obj["departamento"] ??
            obj["dpto"] ??
            obj["depto"] ??
            obj["dept"] ??
            obj["cod_departamento"] ??
            "";
          const bultosVal = obj["bultos"] ?? obj["cantidad_bultos"] ?? obj["qty_bultos"] ?? "";
          const unidadesVal =
            obj["unidades"] ?? obj["cantidad"] ?? obj["uds"] ?? obj["qty"] ?? "";

          if (!detectedNae && naeVal) {
            detectedNae = naeVal.toString().trim();
          }

          const product: NaeProduct = {
            nae: naeVal.toString().trim(),
            ean: eanVal.toString().trim(),
            descripcion: descripVal.toString().trim(),
            departamento: deptVal ? deptVal.toString().trim() : "",
            bultos: bultosVal ?? "",
            unidades: unidadesVal ?? "",
          };

          if (product.ean || product.descripcion) {
            products.push(product);
          }
        }

        if (!detectedNae) {
          const fileName = file.name;
          const match = fileName.match(/(\d+)/);
          if (match) detectedNae = match[1];
        }

        resolve({ nae: detectedNae, products });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

export function parseAgotadosFile(file: File): Promise<Set<string>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

        const eanSet = new Set<string>();
        if (rawRows.length < 2) {
          resolve(eanSet);
          return;
        }

        const headerRow = rawRows[0] as string[];
        const normalizedHeaders = headerRow.map(normalizeKey);

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i] as (string | number)[];
          if (!row || row.every((cell) => cell === "" || cell === null || cell === undefined)) {
            continue;
          }

          const obj: Record<string, string | number | undefined> = {};
          normalizedHeaders.forEach((header, idx) => {
            obj[header] = row[idx] as string | number | undefined;
          });

          const ean =
            obj["ean"] ?? obj["cod_barras"] ?? obj["codigo_ean"] ?? obj["barcode"] ?? "";
          if (ean) {
            eanSet.add(ean.toString().trim());
          }
        }

        resolve(eanSet);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}
