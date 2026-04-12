# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### audit-camiones (React + Vite)
- **Path**: `artifacts/audit-camiones/`
- **Preview**: `/` (root)
- **Purpose**: Truck receiving audit system for retail logistics
- **Key files**:
  - `src/types.ts` — data types (NaeProduct uses `sku` as primary key for cross-referencing)
  - `src/lib/excelParser.ts` — Excel/CSV parser (NAE + Agotados files)
  - `src/lib/truckClassifier.ts` — classifies trucks by NAE prefix + dept 91
  - `src/lib/storage.ts` — LocalStorage persistence
  - `src/context/AppContext.tsx` — global state
  - `src/pages/Dashboard.tsx` — main truck list + file upload
  - `src/pages/TruckAudit.tsx` — product audit checklist

### Excel file format (real structure)
- Row 0: Sheet title
- Row 1: Empty
- Row 2: Real headers (NAE, SKU, DESCRIPCION DE SKU, UPC, Bultos Esperados, Unidades Esperadas, ...)
- Row 3+: Data (Agotados has a "Total" summary row to skip)
- **Cross-referencing**: done by SKU column (not EAN/UPC)
