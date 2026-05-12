import * as XLSX from "xlsx";
import type { TruckDetail } from "@workspace/api-client-react";

export function exportAuditReport(truck: TruckDetail, agotadosSet: Set<string>) {
  const wb = XLSX.utils.book_new();

  const auditedProducts = truck.products.filter(
    (p) => p.auditedBultos != null || p.auditedUnidades != null
  );

  const faltantes = truck.products.filter((p) => {
    if (p.auditedBultos == null && p.auditedUnidades == null) return false;
    const bFaltante = p.expectedBultos != null && p.auditedBultos != null && p.auditedBultos < p.expectedBultos;
    const uFaltante = p.expectedUnidades != null && p.auditedUnidades != null && p.auditedUnidades < p.expectedUnidades;
    return bFaltante || uFaltante;
  });

  const sobrantes = truck.products.filter((p) => {
    if (p.auditedBultos == null && p.auditedUnidades == null) return false;
    const bSobrante = p.expectedBultos != null && p.auditedBultos != null && p.auditedBultos > p.expectedBultos;
    const uSobrante = p.expectedUnidades != null && p.auditedUnidades != null && p.auditedUnidades > p.expectedUnidades;
    return bSobrante || uSobrante;
  });

  const noAuditados = truck.products.filter(
    (p) => p.auditedBultos == null && p.auditedUnidades == null
  );

  // Sheet 1: Resumen
  const resumenData = [
    ["NAE", truck.nae],
    ["Tipo", truck.type],
    ["Estado", truck.status === "completed" ? "Completada" : "Activa"],
    ["Llegada a tienda", truck.arrivalTime ?? "—"],
    ["Inicio descarga", truck.startUnloadTime ?? "—"],
    ["Fecha auditoría", new Date().toLocaleString("es-AR")],
    [],
    ["RESUMEN PRODUCTOS"],
    ["Total productos", truck.products.length],
    ["Auditados", auditedProducts.length],
    ["Sin auditar", noAuditados.length],
    ["Faltantes", faltantes.length],
    ["Sobrantes", sobrantes.length],
    ["Agotados en tránsito", truck.products.filter((p) => agotadosSet.has(p.sku)).length],
    [],
    ["DEPARTAMENTOS AUDITADOS"],
    ["Departamento", "Auditor", "Fecha finalización"],
    ...truck.deptFinalizations.map((d) => [
      `Dpto ${d.department}`,
      d.auditorName,
      new Date(d.finalizedAt).toLocaleString("es-AR"),
    ]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // Sheet 2: Detalle completo
  const detalleHeaders = [
    "SKU",
    "Descripción",
    "Departamento",
    "EAN/UPC",
    "Bultos Esperados",
    "Bultos Auditados",
    "Diff Bultos",
    "Unidades Esperadas",
    "Unidades Auditadas",
    "Diff Unidades",
    "Estado",
    "Agotado",
    "Auditado por",
  ];

  const detalleRows = truck.products.map((p) => {
    const diffBultos =
      p.expectedBultos != null && p.auditedBultos != null
        ? p.auditedBultos - p.expectedBultos
        : null;
    const diffUnidades =
      p.expectedUnidades != null && p.auditedUnidades != null
        ? p.auditedUnidades - p.expectedUnidades
        : null;

    let estado = "Sin auditar";
    if (p.auditedBultos != null || p.auditedUnidades != null) {
      const isFaltante =
        (diffBultos != null && diffBultos < 0) ||
        (diffUnidades != null && diffUnidades < 0);
      const isSobrante =
        (diffBultos != null && diffBultos > 0) ||
        (diffUnidades != null && diffUnidades > 0);
      if (isFaltante) estado = "FALTANTE";
      else if (isSobrante) estado = "SOBRANTE";
      else estado = "OK";
    }

    return [
      p.sku,
      p.description,
      `Dpto ${p.department}`,
      p.ean,
      p.expectedBultos ?? "",
      p.auditedBultos ?? "",
      diffBultos ?? "",
      p.expectedUnidades ?? "",
      p.auditedUnidades ?? "",
      diffUnidades ?? "",
      estado,
      agotadosSet.has(p.sku) ? "SÍ" : "NO",
      p.auditorName ?? "",
    ];
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet([detalleHeaders, ...detalleRows]);
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

  // Sheet 3: Faltantes
  if (faltantes.length > 0) {
    const faltantesRows = faltantes.map((p) => [
      p.sku,
      p.description,
      `Dpto ${p.department}`,
      p.expectedBultos ?? "",
      p.auditedBultos ?? "",
      p.expectedBultos != null && p.auditedBultos != null
        ? p.auditedBultos - p.expectedBultos
        : "",
      p.expectedUnidades ?? "",
      p.auditedUnidades ?? "",
      p.expectedUnidades != null && p.auditedUnidades != null
        ? p.auditedUnidades - p.expectedUnidades
        : "",
      p.auditorName ?? "",
    ]);
    const wsFaltantes = XLSX.utils.aoa_to_sheet([
      ["SKU", "Descripción", "Departamento", "Bultos Esp.", "Bultos Aud.", "Diff Bultos", "Uds Esp.", "Uds Aud.", "Diff Uds", "Auditado por"],
      ...faltantesRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsFaltantes, "Faltantes");
  }

  // Sheet 4: Sobrantes
  if (sobrantes.length > 0) {
    const sobrantesRows = sobrantes.map((p) => [
      p.sku,
      p.description,
      `Dpto ${p.department}`,
      p.expectedBultos ?? "",
      p.auditedBultos ?? "",
      p.expectedBultos != null && p.auditedBultos != null
        ? p.auditedBultos - p.expectedBultos
        : "",
      p.expectedUnidades ?? "",
      p.auditedUnidades ?? "",
      p.expectedUnidades != null && p.auditedUnidades != null
        ? p.auditedUnidades - p.expectedUnidades
        : "",
      p.auditorName ?? "",
    ]);
    const wsSobrantes = XLSX.utils.aoa_to_sheet([
      ["SKU", "Descripción", "Departamento", "Bultos Esp.", "Bultos Aud.", "Diff Bultos", "Uds Esp.", "Uds Aud.", "Diff Uds", "Auditado por"],
      ...sobrantesRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsSobrantes, "Sobrantes");
  }

  // Sheet 5: Sin auditar
  if (noAuditados.length > 0) {
    const sinAuditarRows = noAuditados.map((p) => [
      p.sku,
      p.description,
      `Dpto ${p.department}`,
      p.expectedBultos ?? "",
      p.expectedUnidades ?? "",
    ]);
    const wsSinAuditar = XLSX.utils.aoa_to_sheet([
      ["SKU", "Descripción", "Departamento", "Bultos Esperados", "Unidades Esperadas"],
      ...sinAuditarRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsSinAuditar, "Sin Auditar");
  }

  const fileName = `Auditoria_NAE${truck.nae}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
