import { useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { parseNaeFile } from "../lib/excelParser";
import { classifyTruck } from "../lib/truckClassifier";
import {
  createTruck,
  setAgotados,
  getListTrucksQueryKey,
  getGetAgotadosQueryKey,
} from "@workspace/api-client-react";

type UploadStatus = "idle" | "loading" | "success" | "error";

interface UploadState {
  status: UploadStatus;
  message: string;
  detail?: string;
}

export function FileUploader() {
  const qc = useQueryClient();
  const naeInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle", message: "" });

  async function handleNaeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState({ status: "loading", message: "Procesando archivo..." });
    try {
      const { nae, products, agotadoSkus } = await parseNaeFile(file);
      if (!nae) throw new Error("No se pudo detectar el número de NAE.");
      if (products.length === 0) throw new Error("No se encontraron productos en el archivo.");

      const type = classifyTruck(nae, products);

      const truck = await createTruck({
        nae,
        type,
        products: products.map((p) => ({
          sku: p.sku,
          ean: p.ean ?? "",
          description: p.descripcion,
          department: p.departamento?.toString() ?? "",
          expectedBultos: p.bultos !== "" ? Number(p.bultos) : null,
          expectedUnidades: p.unidades !== "" ? Number(p.unidades) : null,
        })),
      });

      if (agotadoSkus.size > 0) {
        await setAgotados({ truckId: truck.id, skus: Array.from(agotadoSkus) });
        await qc.invalidateQueries({ queryKey: getGetAgotadosQueryKey() });
      }

      await qc.invalidateQueries({ queryKey: getListTrucksQueryKey() });

      setUploadState({
        status: "success",
        message: `NAE ${nae} cargado — ${products.length} productos`,
        detail: agotadoSkus.size > 0
          ? `${agotadoSkus.size} agotados en tránsito detectados automáticamente`
          : undefined,
      });
    } catch (err) {
      setUploadState({
        status: "error",
        message: err instanceof Error ? err.message : "Error al procesar el archivo.",
      });
    }
    if (naeInputRef.current) naeInputRef.current.value = "";
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-5 transition-all cursor-pointer
        ${uploadState.status === "error"
          ? "border-red-300 bg-red-50"
          : uploadState.status === "success"
          ? "border-green-300 bg-green-50"
          : "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"
        }`}
      onClick={() => naeInputRef.current?.click()}
    >
      <input
        ref={naeInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleNaeUpload}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex flex-col items-center text-center gap-2">
        {uploadState.status === "loading" ? (
          <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
        ) : uploadState.status === "success" ? (
          <CheckCircle className="w-9 h-9 text-green-500" />
        ) : uploadState.status === "error" ? (
          <AlertCircle className="w-9 h-9 text-red-500" />
        ) : (
          <Upload className="w-9 h-9 text-blue-400" />
        )}

        <div>
          <p className="font-semibold text-gray-800">Cargar Reporte NAE</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Incluye detalle de mercadería y columna <strong>Stock Disponible</strong>
          </p>
        </div>

        {uploadState.status !== "idle" && (
          <div className="mt-1 space-y-0.5">
            <p className={`text-sm font-semibold ${
              uploadState.status === "success" ? "text-green-700"
              : uploadState.status === "error" ? "text-red-600"
              : "text-gray-500"
            }`}>
              {uploadState.message}
            </p>
            {uploadState.detail && (
              <p className="text-xs text-red-600 font-medium">
                {uploadState.detail}
              </p>
            )}
          </div>
        )}

        <span className="text-xs px-4 py-1.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-1">
          Seleccionar archivo
        </span>
      </div>
    </div>
  );
}
