"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { GarmentView } from "@/lib/database.types";

type FabricRatio = "65/35" | "20/80";
type CustomizerState = {
  baseSwatch: number;
  setBaseSwatch: (value: number) => void;
  accentSwatch: number;
  setAccentSwatch: (value: number) => void;
  garmentView: GarmentView;
  setGarmentView: (value: GarmentView) => void;
  backView: boolean;
  setBackView: (value: boolean) => void;
  reflectiveTape: boolean;
  setReflectiveTape: (value: boolean) => void;
  reflectiveColor: string;
  setReflectiveColor: (value: string) => void;
  fabricRatio: FabricRatio;
  setFabricRatio: (value: FabricRatio) => void;
  logoText: string;
  setLogoText: (value: string) => void;
  lux: number;
  setLux: (value: number) => void;
  selectedProductId: string;
  setSelectedProductId: (value: string) => void;
};

const CustomizerContext = createContext<CustomizerState | null>(null);

export function CustomizerProvider({ children, initialProductId }: { children: ReactNode; initialProductId: string }) {
  const [baseSwatch, setBaseSwatch] = useState(202);
  const [accentSwatch, setAccentSwatch] = useState(209);
  const [garmentView, setGarmentView] = useState<GarmentView>("suit");
  const [backView, setBackView] = useState(false);
  const [reflectiveTape, setReflectiveTape] = useState(true);
  const [reflectiveColor, setReflectiveColor] = useState("#E2E8F0");
  const [fabricRatio, setFabricRatio] = useState<FabricRatio>("65/35");
  const [logoText, setLogoText] = useState("");
  const [lux, setLux] = useState(500);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);

  return (
    <CustomizerContext.Provider
      value={{
        baseSwatch,
        setBaseSwatch,
        accentSwatch,
        setAccentSwatch,
        garmentView,
        setGarmentView,
        backView,
        setBackView,
        reflectiveTape,
        setReflectiveTape,
        reflectiveColor,
        setReflectiveColor,
        fabricRatio,
        setFabricRatio,
        logoText,
        setLogoText,
        lux,
        setLux,
        selectedProductId,
        setSelectedProductId,
      }}
    >
      {children}
    </CustomizerContext.Provider>
  );
}

export function useCustomizer() {
  const context = useContext(CustomizerContext);
  if (!context) throw new Error("useCustomizer must be used within CustomizerProvider.");
  return context;
}
