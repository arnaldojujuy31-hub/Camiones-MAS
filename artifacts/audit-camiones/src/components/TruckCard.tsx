import { useState } from "react";
import { Truck as TruckIcon, Trash2, ChevronRight, CheckCircle2, AlertTriangle, PackageOpen } from "lucide-react";
import type { TruckSummary } from "@workspace/api-client-react";
import { useUpdateTruck, useDeleteTruck, getListTrucksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TRUCK_CONFIGS } from "../types";
import { useNavigate } from "../hooks/useNavigate";

interface TruckCardProps {
  truck: TruckSummary;
}

export function TruckCard({ truck }: TruckCardProps) {
  const qc = useQueryClient();
  const config = TRUCK_CONFIGS[truck.type as keyof typeof TRUCK_CONFIGS] ?? TRUCK_CONFIGS["secos-moreno"];
  const { navigate } = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateTruck = useUpdateTruck({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTrucksQueryKey() }),
    },
  });
  const deleteTruck = useDeleteTruck({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTrucksQueryKey() }),
    },
  });

  const progressPct =
    truck.productCount > 0
      ? Math.round((truck.auditedCount / truck.productCount) * 100)
      : 0;

  const isDescargado = !!truck.arrivalTime;

  function toggleEstado() {
    if (isDescargado) {
      updateTruck.mutate({ truckId: truck.id, data: { arrivalTime: null } });
    } else {
      updateTruck.mutate({ truckId: truck.id, data: { arrivalTime: new Date().toISOString() } });
    }
  }

  return (
    <div className={`rounded-2xl border-2 ${config.borderColor} ${config.bgColor} p-4 shadow-sm transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => navigate(`/truck/${truck.id}`)} className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{config.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${config.badgeColor}`}>
                  {config.label}
                </span>
                {truck.status === "completed" && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Completada
                  </span>
                )}
              </div>
              <h2 className={`text-xl font-bold mt-1 ${config.textColor} truncate`}>NAE {truck.nae}</h2>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-sm text-gray-500">
                  {truck.productCount} productos · {truck.auditedCount} auditados
                </span>
                {truck.agotadoCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-400 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    {truck.agotadoCount} agotados
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button onClick={() => navigate(`/truck/${truck.id}`)} className={`text-sm font-medium ${config.textColor}`}>
            <ChevronRight className="w-5 h-5" />
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => { deleteTruck.mutate({ truckId: truck.id }); setConfirmDelete(false); }}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg"
              >
                Borrar
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-lg">
                No
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Auditoría (por unidades)</span>
          <span className="text-xs font-bold text-gray-700">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-3">
        <button
          onClick={toggleEstado}
          disabled={updateTruck.isPending}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
            isDescargado
              ? "bg-green-100 border-green-400 text-green-800 hover:bg-green-200"
              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {isDescargado ? (
            <>
              <PackageOpen className="w-4 h-4" />
              Descargado
            </>
          ) : (
            <>
              <TruckIcon className="w-4 h-4" />
              En tránsito
            </>
          )}
        </button>
      </div>
    </div>
  );
}
