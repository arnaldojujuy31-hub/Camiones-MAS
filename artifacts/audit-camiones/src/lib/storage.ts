import type { Truck } from "../types";

const TRUCKS_KEY = "audit_camiones_trucks";
const AGOTADOS_KEY = "audit_camiones_agotados";

export function saveTrucks(trucks: Truck[]): void {
  try {
    localStorage.setItem(TRUCKS_KEY, JSON.stringify(trucks));
  } catch {
  }
}

export function loadTrucks(): Truck[] {
  try {
    const raw = localStorage.getItem(TRUCKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Truck[];
  } catch {
    return [];
  }
}

export function saveAgotados(eans: string[]): void {
  try {
    localStorage.setItem(AGOTADOS_KEY, JSON.stringify(eans));
  } catch {
  }
}

export function loadAgotados(): Set<string> {
  try {
    const raw = localStorage.getItem(AGOTADOS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function clearAll(): void {
  localStorage.removeItem(TRUCKS_KEY);
  localStorage.removeItem(AGOTADOS_KEY);
}
