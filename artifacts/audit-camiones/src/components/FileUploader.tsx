import { useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { parseNaeFile, parseAgotadosFile } from "../lib/excelParser";
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
}

export function FileUploader() {
  const qc = useQueryClient();
  const naeInputRef = useRef<HTMLInputElement>(null);
  const agotadosInputRef = useRef<HTMLInputElement>(null);
  const [naeState, setNaeState] = useState<UploadState>({ status: "idle", message: "" });
  const [agotadosState, setAgotadosState] = useState<UploadState>({ status: "idle", message: "" });

  async function handleNaeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNaeState({ status: "loading", message: "Procesando archivo..." });
    try {
      const { nae, products } = await parseNaeFile(file);
      if (!nae) throw new Error("No se pudo detectar el número de NAE.");
      if (products.length === 0) throw new Error("No se encontraron productos en el archivo.");

      const type = classifyTruck(nae, products);
      await createTruck({
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
      await qc.invalidateQueries({ queryKey: getListTrucksQueryKey() });
      setNaeState({
        status: "success",
        message: `NAE ${nae} cargado — ${products.length} productos`,
      });
    } catch (err) {
      setNaeState({
        status: "error",
        message: err instanceof Error ? err.message : "Error al procesar el archivo.",
      });
    }
    if (naeInputRef.current) naeInputRef.current.value = "";
  }

  async function handleAgotadosUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAgotadosState({ status: "loading", message: "Procesando..." });
    try {
      const skuSet = await parseAgotadosFile(file);
      await setAgotados({ skus: Array.from(skuSet) });
      await qc.invalidateQueries({ queryKey: getGetAgotadosQueryKey() });
      setAgotadosState({
        status: "success",
        message: `${skuSet.size} SKUs agotados cargados`,
      });
    } catch (err) {
      setAgotadosState({
        status: "error",
        message: err instanceof Error ? err.message : "Error al procesar el archivo.",
      });
    }
    if (agotadosInputRef.current) agotadosInputRef.current.value = "";
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UploadCard
        title="Reporte NAE"
        description="Detalle de mercadería del camión"
        accept=".xlsx,.xls,.csv"
        inputRef={naeInputRef}
        state={naeState}
        onChange={handleNaeUpload}
        color="blue"
      />
      <UploadCard
        title="Agotados en Tránsito"
        description="Mercadería crítica (se resalta en rojo)"
        accept=".xlsx,.xls,.csv"
        inputRef={agotadosInputRef}
        state={agotadosState}
        onChange={handleAgotadosUpload}
        color="red"
      />
    </div>
  );
}

interface UploadCardProps {
  title: string;
  description: string;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  state: UploadState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color: "blue" | "red";
  badge?: string;
}

function UploadCard({ title, description, accept, inputRef, state, onChange, color, badge }: UploadCardProps) {
  const colorMap = {
    blue: {
      border: "border-blue-200 hover:border-blue-400",
      bg: "bg-blue-50 hover:bg-blue-100",
      icon: "text-blue-400",
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    red: {
      border: "border-red-200 hover:border-red-400",
      bg: "bg-red-50 hover:bg-red-100",
      icon: "text-red-400",
      btn: "bg-red-600 hover:bg-red-700 text-white",
    },
  }[color];

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer ${colorMap.border} ${colorMap.bg}`}
      onClick={() => inputRef.current?.click()}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-xs bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5 font-semibold">
          {badge}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex flex-col items-center text-center gap-2 py-2">
        {state.status === "loading" ? (
          <Loader2 className={`w-8 h-8 ${colorMap.icon} animate-spin`} />
        ) : state.status === "success" ? (
          <CheckCircle className="w-8 h-8 text-green-500" />
        ) : state.status === "error" ? (
          <AlertCircle className="w-8 h-8 text-red-500" />
        ) : (
          <Upload className={`w-8 h-8 ${colorMap.icon}`} />
        )}
        <div>
          <p className="font-semibold text-gray-800 text-sm">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        {state.status !== "idle" && (
          <p className={`text-xs font-medium mt-1 ${state.status === "success" ? "text-green-600" : state.status === "error" ? "text-red-600" : "text-gray-500"}`}>
            {state.message}
          </p>
        )}
        {state.status === "idle" && (
          <span className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${colorMap.btn} mt-1`}>
            Seleccionar archivo
          </span>
        )}
      </div>
    </div>
  );
}
