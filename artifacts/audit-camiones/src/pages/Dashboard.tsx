import { useState } from "react";
import { Truck, Search, Trash2, ChevronDown, ChevronUp, PackageOpen, RefreshCw } from "lucide-react";
import { useListTrucks, useGetAgotados, getListTrucksQueryKey, deleteTruck } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploader } from "../components/FileUploader";
import { TruckCard } from "../components/TruckCard";
import { TRUCK_CONFIGS } from "../types";

const TYPE_ORDER = ["secos-moreno", "secos-escobar", "congelados", "frios"] as const;

export function Dashboard() {
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const qc = useQueryClient();

  const { data: trucks = [], isLoading, error } = useListTrucks({
    query: { refetchInterval: 5000 },
  });

  const { data: agotadosData } = useGetAgotados({
    query: { refetchInterval: 30000 },
  });

  const agotadosCount = agotadosData?.skus?.length ?? 0;

  const filtered = trucks.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const cfg = TRUCK_CONFIGS[t.type as keyof typeof TRUCK_CONFIGS];
    return (
      t.nae.toLowerCase().includes(q) ||
      cfg?.label.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  });

  const grouped = TYPE_ORDER.reduce<Record<string, typeof filtered>>(
    (acc, type) => {
      acc[type] = filtered.filter((t) => t.type === type);
      return acc;
    },
    {} as Record<string, typeof filtered>
  );

  const totalAudited = trucks.reduce((sum, t) => sum + t.auditedCount, 0);
  const totalProducts = trucks.reduce((sum, t) => sum + t.productCount, 0);

  async function handleClearAll() {
    for (const truck of trucks) {
      await deleteTruck(truck.id);
    }
    await qc.invalidateQueries({ queryKey: getListTrucksQueryKey() });
    setConfirmClear(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-gray-900 text-lg leading-tight">
              Camiones<span className="text-blue-600">MAS</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {trucks.length > 0 && (
              <>
                <span className="font-medium text-gray-700">{trucks.length} camiones</span>
                <span>·</span>
                <span>{totalAudited}/{totalProducts} auditados</span>
                {agotadosCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 font-semibold">{agotadosCount} agotados</span>
                  </>
                )}
              </>
            )}
            <button
              onClick={() => qc.invalidateQueries({ queryKey: getListTrucksQueryKey() })}
              className="p-1 rounded text-gray-400 hover:text-blue-600"
              title="Actualizar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <span>Cargar archivos</span>
            {showUpload ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {showUpload && (
            <div className="px-4 pb-4">
              <FileUploader />
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-6 text-gray-400 text-sm">Cargando camiones...</div>
        )}
        {error && (
          <div className="text-center py-6 text-red-500 text-sm">Error al cargar datos. Verificá la conexión.</div>
        )}

        {trucks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar por NAE o tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="p-2.5 border border-gray-300 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors bg-white"
                title="Limpiar todo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={handleClearAll} className="text-xs bg-red-500 text-white px-3 py-2 rounded-xl font-semibold">
                  Borrar todo
                </button>
                <button onClick={() => setConfirmClear(false)} className="text-xs bg-gray-200 text-gray-700 px-3 py-2 rounded-xl">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && trucks.length === 0 && (
          <div className="text-center py-12">
            <PackageOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No hay camiones cargados</p>
            <p className="text-sm text-gray-400 mt-1">Sube un reporte NAE para comenzar</p>
          </div>
        )}

        {TYPE_ORDER.map((type) => {
          const group = grouped[type];
          if (!group || group.length === 0) return null;
          const cfg = TRUCK_CONFIGS[type];
          return (
            <section key={type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{cfg.icon}</span>
                <h3 className="font-semibold text-gray-700 text-sm">{cfg.label}</h3>
                <span className="text-xs text-gray-400">({group.length})</span>
              </div>
              <div className="space-y-3">
                {group.map((truck) => (
                  <TruckCard key={truck.id} truck={truck} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
