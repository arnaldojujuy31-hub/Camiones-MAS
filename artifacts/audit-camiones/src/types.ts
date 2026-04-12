export type TruckType = "secos-moreno" | "secos-escobar" | "congelados" | "frios";

export interface TruckConfig {
  type: TruckType;
  label: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeColor: string;
}

export const TRUCK_CONFIGS: Record<TruckType, TruckConfig> = {
  "secos-moreno": {
    type: "secos-moreno",
    label: "Secos - Moreno",
    icon: "📦",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    textColor: "text-amber-900",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  "secos-escobar": {
    type: "secos-escobar",
    label: "Secos - Escobar",
    icon: "📦",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-400",
    textColor: "text-orange-900",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
  },
  congelados: {
    type: "congelados",
    label: "Congelados",
    icon: "❄️",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-400",
    textColor: "text-sky-900",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
  },
  frios: {
    type: "frios",
    label: "Fríos",
    icon: "🌡️",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    textColor: "text-blue-900",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },
};

export interface NaeProduct {
  nae: string;
  ean: string;
  descripcion: string;
  departamento: string | number;
  bultos: number | string;
  unidades: number | string;
  [key: string]: string | number | undefined;
}

export interface Truck {
  id: string;
  nae: string;
  type: TruckType;
  products: NaeProduct[];
  arrivalTime: string;
  startUnloadTime: string;
  auditedProducts: Record<string, boolean>;
  createdAt: number;
}

export interface AppState {
  trucks: Truck[];
  agotadosSet: Set<string>;
}
