// src/contexts/PercentageChangeContext.tsx
import { createContext } from "react";

export interface PercentageChangeContextType {
  percentageChange: number;
  setPercentageChange: (value: number) => void;
}

export const PercentageChange = createContext<PercentageChangeContextType>({
  percentageChange: 0,
  setPercentageChange: () => {},
});