import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  ArrowLeft, CheckCircle2, AlertCircle, PackageCheck, TrendingDown,
  TrendingUp, Download, FlagTriangleRight, Lock, Loader2
} from "lucide-react";
import {
  useGetTruck,
  useGetAgotados,
  useUpsertAuditEntry,
  useFinalizeDepartment,
  useFinalizeTruck,
  getGetTruckQueryKey,
  getListTrucksQueryKey,
  type ProductAudit,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TRUCK_CONFIGS } from "../types";
import { useNavigate } from "../hooks/useNavigate";
import { useDebounce } from "../hooks/useDebounce";
import { exportAuditReport } from "../lib/exportReport";

export function TruckAudit() {
  const [, params] = useRoute("/truck/:truckId");
  const truckId = params?.truckId ? parseInt(params.truckId, 10) : 0;
  const { navigate } = useNavigate();
  const qc = useQueryClient();

  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [showFinalizeModal, setShowFinalizeModal] = useState<string | null>(null);
  const [finalizeAuditor, setFinalizeAuditor] = useState("");
  const [showFinalizeTruckModal, setShowFinalizeTruckModal] = useState(false);

  const { data: truck, isLoading, error } = useGetTruck(truckId, {
    query: { refetchInterval: 4000, enabled: truckId > 0 },
  });

  const { data: agotadosData } = useGetAgotados({
    query: { refetchInterval: 30000 },
  });

  const agotadosSet = new Set<string>(agotadosData?.skus ?? []);

  const finalizeDept = useFinalizeDepartment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTruckQueryKey(truckId) });
        setShowFinalizeModal(null);
        setFinalizeAuditor("");
      },
    },
  });

  const finalizeTruckMutation = useFinalizeTruck({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTruckQueryKey(truckId) });
        qc.invalidateQueries({ queryKey: getListTrucksQueryKey() });
        setShowFinalizeTruckModal(false);
      },
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !truck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600">No se encontró el camión.</p>
        <button onClick={() => navigate("/")} className="text-blue-600 underline text-sm">
          Volver al inicio
        </button>
      </div>
    );
  }

  const config = TRUCK_CONFIGS[truck.type as keyof typeof TRUCK_CONFIGS] ?? TRUCK_CONFIGS["secos-moreno"];

  const departments = Array.from(new Set(truck.products.map((p) => p.department))).sort(
    (a, b) => Number(a) - Number(b)
  );

  const finalizedDepts = new Set(truck.deptFinalizations.map((d) => d.department));

  function getProductsForDept(dept: string) {
    return dept === "all" ? truck!.products : truck!.products.filter((p) => p.department === dept);
  }

  function getDeptStats(dept: string) {
    const prods = getProductsForDept(dept);
    const audited = prods.filter((p) => p.auditedBultos != null || p.auditedUnidades != null).length;
    const faltantes = prods.filter((p) => {
      if (p.auditedBultos == null && p.auditedUnidades == null) return false;
      return (
        (p.expectedBultos != null && p.auditedBultos != null && p.auditedBultos < p.expectedBultos) ||
        (p.expectedUnidades != null && p.auditedUnidades != null && p.auditedUnidades < p.expectedUnidades)
      );
    }).length;
    const sobrantes = prods.filter((p) => {
      if (p.auditedBultos == null && p.auditedUnidades == null) return false;
      return (
        (p.expectedBultos != null && p.auditedBultos != null && p.auditedBultos > p.expectedBultos) ||
        (p.expectedUnidades != null && p.auditedUnidades != null && p.auditedUnidades > p.expectedUnidades)
      );
    }).length;
    return { total: prods.length, audited, faltantes, sobrantes };
  }

  const overallStats = getDeptStats("all");
  const visibleProducts = getProductsForDept(selectedDept);

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className={`${config.bgColor} border-b-2 ${config.borderColor} sticky top-0 z-10`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-1 rounded-lg hover:bg-black/5">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">{config.icon}</span>
                <h1 className={`text-lg font-bold ${config.textColor} truncate`}>NAE {truck.nae}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${config.badgeColor}`}>
                  {config.label}
                </span>
                {truck.status === "completed" && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Completada
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {overallStats.audited}/{overallStats.total} auditados
                {overallStats.faltantes > 0 && (
                  <span className="text-red-600 font-semibold ml-2">· {overallStats.faltantes} faltantes</span>
                )}
                {overallStats.sobrantes > 0 && (
                  <span className="text-green-700 font-semibold ml-2">· {overallStats.sobrantes} sobrantes</span>
                )}
              </p>
            </div>
            {truck.status === "completed" && (
              <button
                onClick={() => exportAuditReport(truck, agotadosSet)}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={<PackageCheck className="w-4 h-4 text-blue-500" />} label="Total" value={overallStats.total} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Audit." value={overallStats.audited} color="green" />
          <StatCard icon={<TrendingDown className="w-4 h-4 text-red-500" />} label="Faltant." value={overallStats.faltantes} color="red" />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-500" />} label="Sobrant." value={overallStats.sobrantes} color="amber" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
          <DeptButton
            label="Todos"
            count={overallStats.total}
            audited={overallStats.audited}
            faltantes={overallStats.faltantes}
            isActive={selectedDept === "all"}
            isFinalized={false}
            onClick={() => setSelectedDept("all")}
          />
          {departments.map((dept) => {
            const s = getDeptStats(dept);
            return (
              <DeptButton
                key={dept}
                label={`Dpto ${dept}`}
                count={s.total}
                audited={s.audited}
                faltantes={s.faltantes}
                isActive={selectedDept === dept}
                isFinalized={finalizedDepts.has(dept)}
                onClick={() => setSelectedDept(dept)}
              />
            );
          })}
        </div>

        {visibleProducts.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No hay productos en esta selección.</p>
        )}

        <div className="space-y-2">
          {visibleProducts.map((product) => (
            <ProductRow
              key={product.sku}
              product={product}
              truckId={truckId}
              isAgotado={agotadosSet.has(product.sku)}
              isLocked={truck.status === "completed"}
            />
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-2">
          {selectedDept !== "all" && truck.status !== "completed" && (
            <button
              onClick={() => setShowFinalizeModal(selectedDept)}
              disabled={finalizedDepts.has(selectedDept)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                finalizedDepts.has(selectedDept)
                  ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow"
              }`}
            >
              {finalizedDepts.has(selectedDept) ? (
                <>
                  <Lock className="w-4 h-4" />
                  Dpto {selectedDept} — finalizado por {truck.deptFinalizations.find((d) => d.department === selectedDept)?.auditorName}
                </>
              ) : (
                <>
                  <FlagTriangleRight className="w-4 h-4" />
                  Finalizar Dpto {selectedDept}
                </>
              )}
            </button>
          )}
          {truck.status !== "completed" && (
            <button
              onClick={() => setShowFinalizeTruckModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-gray-800 hover:bg-gray-900 text-white shadow"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar Auditoría
            </button>
          )}
          {truck.status === "completed" && (
            <button
              onClick={() => exportAuditReport(truck, agotadosSet)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-700 text-white shadow"
            >
              <Download className="w-4 h-4" />
              Exportar Reporte Excel
            </button>
          )}
        </div>
      </div>

      {showFinalizeModal && (
        <Modal
          title={`Finalizar Departamento ${showFinalizeModal}`}
          onClose={() => { setShowFinalizeModal(null); setFinalizeAuditor(""); }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Registrá el nombre del auditor responsable de este departamento.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del auditor</label>
              <input
                autoFocus
                type="text"
                placeholder="Ej: Juan Pérez"
                value={finalizeAuditor}
                onChange={(e) => setFinalizeAuditor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && finalizeAuditor.trim()) {
                    finalizeDept.mutate({ truckId, department: showFinalizeModal, data: { auditorName: finalizeAuditor.trim() } });
                  }
                }}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowFinalizeModal(null); setFinalizeAuditor(""); }}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!finalizeAuditor.trim()) return;
                  finalizeDept.mutate({ truckId, department: showFinalizeModal, data: { auditorName: finalizeAuditor.trim() } });
                }}
                disabled={!finalizeAuditor.trim() || finalizeDept.isPending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finalizeDept.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showFinalizeTruckModal && (
        <Modal title="Finalizar Auditoría del Camión" onClose={() => setShowFinalizeTruckModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Confirmás que la auditoría del NAE <strong>{truck.nae}</strong> está completa?
              Esto marcará el camión como <strong>Completado</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <strong>{overallStats.total - overallStats.audited}</strong> productos sin auditar
              {overallStats.faltantes > 0 && <> · <strong>{overallStats.faltantes}</strong> faltantes detectados</>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeTruckModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => finalizeTruckMutation.mutate({ truckId })}
                disabled={finalizeTruckMutation.isPending}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finalizeTruckMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Finalizar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}) {
  const bg = color === "green" ? "bg-green-50" : color === "red" ? "bg-red-50" : color === "amber" ? "bg-amber-50" : "bg-white";
  return (
    <div className={`${bg} rounded-xl p-2.5 border border-gray-200 text-center`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-800 leading-tight">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function DeptButton({ label, count, audited, faltantes, isActive, isFinalized, onClick }: {
  label: string;
  count: number;
  audited: number;
  faltantes: number;
  isActive: boolean;
  isFinalized: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`snap-start shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
        isActive
          ? "bg-blue-600 border-blue-700 text-white shadow"
          : isFinalized
          ? "bg-green-50 border-green-300 text-green-700"
          : "bg-white border-gray-300 text-gray-700"
      }`}
    >
      <span className="flex items-center gap-1">
        {isFinalized && <Lock className="w-3 h-3" />}
        {label}
      </span>
      <span className={`font-normal ${isActive ? "text-blue-200" : "text-gray-400"}`}>
        {audited}/{count}
        {faltantes > 0 && (
          <span className={isActive ? " text-red-300" : " text-red-500"}> ⚠{faltantes}</span>
        )}
      </span>
    </button>
  );
}

interface ProductRowProps {
  product: ProductAudit;
  truckId: number;
  isAgotado: boolean;
  isLocked: boolean;
}

function ProductRow({ product, truckId, isAgotado, isLocked }: ProductRowProps) {
  const [bultos, setBultos] = useState(product.auditedBultos?.toString() ?? "");
  const [unidades, setUnidades] = useState(product.auditedUnidades?.toString() ?? "");
  const hasChanged = useRef(false);

  const debouncedBultos = useDebounce(bultos, 700);
  const debouncedUnidades = useDebounce(unidades, 700);

  const upsert = useUpsertAuditEntry();
  const qc = useQueryClient();

  useEffect(() => {
    if (!hasChanged.current) return;
    upsert.mutate(
      {
        truckId,
        sku: product.sku,
        data: {
          auditedBultos: debouncedBultos !== "" ? Number(debouncedBultos) : null,
          auditedUnidades: debouncedUnidades !== "" ? Number(debouncedUnidades) : null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetTruckQueryKey(truckId) });
        },
      }
    );
  }, [debouncedBultos, debouncedUnidades]);

  const auditedB = bultos !== "" ? Number(bultos) : null;
  const auditedU = unidades !== "" ? Number(unidades) : null;

  const diffBultos =
    product.expectedBultos != null && auditedB != null ? auditedB - product.expectedBultos : null;
  const diffUnidades =
    product.expectedUnidades != null && auditedU != null ? auditedU - product.expectedUnidades : null;

  const isFaltante = (diffBultos != null && diffBultos < 0) || (diffUnidades != null && diffUnidades < 0);
  const isSobrante = (diffBultos != null && diffBultos > 0) || (diffUnidades != null && diffUnidades > 0);
  const isOk = (auditedB != null || auditedU != null) && !isFaltante && !isSobrante;

  const rowBg = isAgotado
    ? "bg-red-50 border-red-200"
    : isFaltante
    ? "bg-red-50 border-red-200"
    : isSobrante
    ? "bg-amber-50 border-amber-200"
    : isOk
    ? "bg-green-50 border-green-200"
    : "bg-white border-gray-200";

  return (
    <div className={`rounded-xl border p-3 transition-colors ${rowBg}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400">SKU {product.sku}</span>
            {product.ean && <span className="text-xs text-gray-400">UPC {product.ean}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isAgotado && (
            <span className="text-xs bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full font-bold">
              AGOTADO
            </span>
          )}
          {upsert.isPending && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
          {isOk && !upsert.isPending && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {isFaltante && <span className="text-xs font-bold text-red-600">FALTANTE</span>}
          {isSobrante && <span className="text-xs font-bold text-amber-600">SOBRANTE</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Bultos auditados</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={bultos}
              onChange={(e) => { hasChanged.current = true; setBultos(e.target.value); }}
              placeholder={`Esp: ${product.expectedBultos ?? "—"}`}
              disabled={isLocked}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {diffBultos != null && (
              <span className={`text-xs shrink-0 font-bold ${diffBultos < 0 ? "text-red-600" : diffBultos > 0 ? "text-amber-600" : "text-green-600"}`}>
                {diffBultos > 0 ? `+${diffBultos}` : diffBultos}
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Unidades auditadas</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={unidades}
              onChange={(e) => { hasChanged.current = true; setUnidades(e.target.value); }}
              placeholder={`Esp: ${product.expectedUnidades ?? "—"}`}
              disabled={isLocked}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {diffUnidades != null && (
              <span className={`text-xs shrink-0 font-bold ${diffUnidades < 0 ? "text-red-600" : diffUnidades > 0 ? "text-amber-600" : "text-green-600"}`}>
                {diffUnidades > 0 ? `+${diffUnidades}` : diffUnidades}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
