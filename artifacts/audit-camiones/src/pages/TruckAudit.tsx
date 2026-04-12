import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { ArrowLeft, Search, CheckSquare, Square, AlertTriangle, Package, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { TRUCK_CONFIGS } from "../types";
import { useNavigate } from "../hooks/useNavigate";

export function TruckAudit() {
  const [, params] = useRoute("/truck/:id");
  const { trucks, agotadosSet, toggleAudited } = useApp();
  const { navigate } = useNavigate();
  const [search, setSearch] = useState("");
  const [filterAgotados, setFilterAgotados] = useState(false);
  const [filterPending, setFilterPending] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const truck = trucks.find((t) => t.id === params?.id);

  if (!truck) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Camión no encontrado.</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-blue-600 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </button>
      </div>
    );
  }

  const config = TRUCK_CONFIGS[truck.type];

  const departments = useMemo(() => {
    const deptMap = new Map<string, { count: number; agotados: number; pending: number }>();
    for (const p of truck.products) {
      const dept = p.departamento?.toString().trim() || "Sin depto";
      const isAgotado = agotadosSet.has(p.sku);
      const isAudited = !!truck.auditedProducts[p.sku];
      if (!deptMap.has(dept)) deptMap.set(dept, { count: 0, agotados: 0, pending: 0 });
      const d = deptMap.get(dept)!;
      d.count++;
      if (isAgotado) d.agotados++;
      if (!isAudited) d.pending++;
    }
    return Array.from(deptMap.entries())
      .map(([dept, stats]) => ({ dept, ...stats }))
      .sort((a, b) => a.dept.localeCompare(b.dept, "es"));
  }, [truck, agotadosSet]);

  const filtered = useMemo(() => {
    return truck.products.filter((p) => {
      const isAgotado = agotadosSet.has(p.sku);
      const isAudited = !!truck.auditedProducts[p.sku];
      const dept = p.departamento?.toString().trim() || "Sin depto";
      const q = search.toLowerCase();

      if (selectedDept && dept !== selectedDept) return false;
      if (filterAgotados && !isAgotado) return false;
      if (filterPending && isAudited) return false;

      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.ean.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q)
      );
    });
  }, [truck, agotadosSet, search, filterAgotados, filterPending, selectedDept]);

  const auditedCount = Object.keys(truck.auditedProducts || {}).length;
  const agotadoCount = truck.products.filter((p) => agotadosSet.has(p.sku)).length;
  const totalCount = truck.products.length;
  const progressPct = totalCount > 0 ? Math.round((auditedCount / totalCount) * 100) : 0;

  const selectedDeptStats = selectedDept ? departments.find((d) => d.dept === selectedDept) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className={`sticky top-0 z-10 shadow-sm border-b-2 ${config.borderColor} bg-white`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${config.badgeColor}`}>
                  {config.label}
                </span>
                {agotadoCount > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {agotadoCount} agotados
                  </span>
                )}
              </div>
              <h1 className={`text-xl font-bold mt-0.5 ${config.textColor}`}>NAE {truck.nae}</h1>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{auditedCount} / {totalCount} auditados</span>
              <span className="font-bold">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-3 space-y-2 sticky top-[110px] z-10 bg-gray-50 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar por SKU, descripción o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <button
            onClick={() => setFilterAgotados((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              filterAgotados
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-red-600 border-red-300 hover:bg-red-50"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Agotados
          </button>
          <button
            onClick={() => setFilterPending((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              filterPending
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
            }`}
          >
            <Square className="w-3 h-3" />
            Pendientes
          </button>
          <span className="ml-auto shrink-0 text-xs text-gray-400 self-center pr-1">
            {filtered.length} productos
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Filtrar por departamento
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {selectedDept && (
              <button
                onClick={() => setSelectedDept(null)}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-gray-700 text-white border-gray-700"
              >
                <X className="w-3 h-3" />
                Todos
              </button>
            )}
            {departments.map(({ dept, count, agotados, pending }) => {
              const isActive = selectedDept === dept;
              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(isActive ? null : dept)}
                  className={`shrink-0 flex flex-col items-start text-left px-3 py-1.5 rounded-lg border transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">Dpto {dept}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] leading-none ${isActive ? "text-indigo-200" : "text-gray-400"}`}>
                      {count} prod.
                    </span>
                    {agotados > 0 && (
                      <span className={`text-[10px] font-bold leading-none ${isActive ? "text-red-200" : "text-red-500"}`}>
                        {agotados} agot.
                      </span>
                    )}
                    {pending > 0 && (
                      <span className={`text-[10px] leading-none ${isActive ? "text-indigo-200" : "text-gray-400"}`}>
                        {pending} pend.
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedDeptStats && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 border border-indigo-200 text-indigo-800`}>
            <span>Dpto {selectedDept}</span>
            <span className="text-indigo-400">·</span>
            <span>{selectedDeptStats.count} productos</span>
            {selectedDeptStats.agotados > 0 && (
              <>
                <span className="text-indigo-400">·</span>
                <span className="text-red-600 font-bold">{selectedDeptStats.agotados} agotados</span>
              </>
            )}
            <button
              onClick={() => setSelectedDept(null)}
              className="ml-auto text-indigo-400 hover:text-indigo-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-8 pt-2 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No hay productos que coincidan.</p>
          </div>
        )}

        {filtered.map((product, idx) => {
          const isAgotado = agotadosSet.has(product.sku);
          const isAudited = !!truck.auditedProducts[product.sku];
          const key = product.sku || `${product.descripcion}-${idx}`;

          return (
            <button
              key={key}
              onClick={() => toggleAudited(truck.id, product.sku)}
              className={`w-full text-left rounded-xl border-2 p-3 transition-all active:scale-[0.98] ${
                isAgotado
                  ? "bg-red-50 border-red-500 shadow-sm shadow-red-100"
                  : isAudited
                  ? "bg-green-50 border-green-300"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isAudited ? (
                    <CheckSquare className={`w-5 h-5 ${isAgotado ? "text-red-600" : "text-green-600"}`} />
                  ) : (
                    <Square className={`w-5 h-5 ${isAgotado ? "text-red-400" : "text-gray-400"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold leading-tight ${
                      isAgotado ? "text-red-800" : isAudited ? "text-green-800" : "text-gray-800"
                    }`}>
                      {product.descripcion || "(sin descripción)"}
                    </p>
                    {isAgotado && (
                      <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        AGOTADO
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {product.sku && (
                      <span className="text-xs text-gray-500 font-medium">SKU: {product.sku}</span>
                    )}
                    {product.departamento && (
                      <span className="text-xs text-gray-400">Dpto: {product.departamento}</span>
                    )}
                    {product.bultos !== "" && product.bultos !== undefined && (
                      <span className="text-xs text-gray-400">Bultos: {product.bultos}</span>
                    )}
                    {product.unidades !== "" && product.unidades !== undefined && (
                      <span className="text-xs text-gray-400">Uds: {product.unidades}</span>
                    )}
                    {product.ean && (
                      <span className="text-xs text-gray-400">UPC: {product.ean}</span>
                    )}
                  </div>
                  {isAgotado && (
                    <p className="text-xs font-bold text-red-600 mt-1 uppercase tracking-wide">
                      Directo al piso de venta
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </main>
    </div>
  );
}
