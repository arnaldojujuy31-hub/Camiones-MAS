import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Truck } from "../types";
import { saveTrucks, loadTrucks, saveAgotados, loadAgotados, clearAll } from "../lib/storage";

interface AppContextType {
  trucks: Truck[];
  agotadosSet: Set<string>;
  addTruck: (truck: Truck) => void;
  updateTruck: (truck: Truck) => void;
  deleteTruck: (id: string) => void;
  setAgotados: (eans: Set<string>) => void;
  toggleAudited: (truckId: string, ean: string) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [trucks, setTrucks] = useState<Truck[]>(() => loadTrucks());
  const [agotadosSet, setAgotadosSet] = useState<Set<string>>(() => loadAgotados());

  useEffect(() => {
    saveTrucks(trucks);
  }, [trucks]);

  const addTruck = useCallback((truck: Truck) => {
    setTrucks((prev) => {
      const existing = prev.findIndex((t) => t.nae === truck.nae);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...truck };
        return updated;
      }
      return [...prev, truck];
    });
  }, []);

  const updateTruck = useCallback((truck: Truck) => {
    setTrucks((prev) => prev.map((t) => (t.id === truck.id ? truck : t)));
  }, []);

  const deleteTruck = useCallback((id: string) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setAgotados = useCallback((eans: Set<string>) => {
    setAgotadosSet(eans);
    saveAgotados(Array.from(eans));
  }, []);

  const toggleAudited = useCallback((truckId: string, ean: string) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        const updated = { ...t, auditedProducts: { ...t.auditedProducts } };
        if (updated.auditedProducts[ean]) {
          delete updated.auditedProducts[ean];
        } else {
          updated.auditedProducts[ean] = true;
        }
        return updated;
      })
    );
  }, []);

  const clearAllData = useCallback(() => {
    setTrucks([]);
    setAgotadosSet(new Set());
    clearAll();
  }, []);

  return (
    <AppContext.Provider
      value={{
        trucks,
        agotadosSet,
        addTruck,
        updateTruck,
        deleteTruck,
        setAgotados,
        toggleAudited,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
