# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Sistema de Auditoría de Camiones — a multi-user mobile-first web app for retail logistics teams to audit incoming trucks in real-time.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (artifacts/audit-camiones)
- **Backend**: Express 5 + Pino logging (artifacts/api-server)
- **Database**: PostgreSQL via Drizzle ORM (lib/db)
- **API client**: React Query + Orval-generated hooks (lib/api-client-react)
- **API spec**: OpenAPI 3.1 → Orval codegen (lib/api-spec)
- **Zod schemas**: auto-generated from OpenAPI spec (lib/api-zod)

## Architecture

### Database Schema (lib/db/src/schema/)
- `trucks` — truck records (nae, type, arrivalTime, startUnloadTime, status)
- `truck_products` — products per truck (sku, ean, description, department, expectedBultos, expectedUnidades)
- `audit_entries` — per-product audit quantities (auditedBultos, auditedUnidades, auditorName)
- `dept_finalizations` — department finalization records (department, auditorName, finalizedAt)
- `agotados` — global set of out-of-stock SKUs

### Truck Types (truckClassifier.ts)
- NAE prefix "1" → Secos Moreno
- NAE prefix "8" → Secos Escobar
- NAE prefix "5" + dept 91 → Congelados
- NAE prefix "5" + other → Fríos

### Excel File Format (excelParser.ts)
- Row 0: title, Row 1: empty, Row 2: real headers (NAE, SKU, DESCRIPCION DE SKU, UPC, Bultos Esperados, Unidades Esperadas)
- Data starts at row 3
- Agotados file has División/Clase columns and a "Total" summary row to skip

### API Routes (artifacts/api-server/src/routes/)
- GET/POST /api/trucks — list / create truck
- GET/PATCH/DELETE /api/trucks/:truckId — detail / update / delete
- PUT /api/trucks/:truckId/audit/:sku — upsert audit entry
- POST /api/trucks/:truckId/departments/:dept/finalize — finalize dept
- POST /api/trucks/:truckId/finalize — finalize truck
- GET/POST /api/agotados — get/set agotados SKUs

### Frontend Pages (artifacts/audit-camiones/src/)
- `Dashboard` — lists trucks grouped by type with polling (5s), file upload
- `TruckAudit` — per-truck audit with quantity inputs (debounced API save), dept filter, faltantes/sobrantes, dept finalization modal, truck finalization, Excel export

### Key Libraries
- `xlsx` — Excel parsing (client) and export generation
- `@tanstack/react-query` — data fetching with polling
- `wouter` — client-side routing

## Ports
- Frontend: PORT env var (set by Replit)
- API server: 8080

## Codegen Commands
```
pnpm --filter @workspace/api-spec run codegen   # regenerate API client
pnpm --filter @workspace/db run push             # push schema to DB
```
