// src/contexts/PercentageChangeContext.tsx

import React, { createContext, useState, useMemo } from "react";

export interface PercentageChangeContextType {
  percentageChange: number;
  setPercentageChange: (value: number) => void;
}

// Create the context with a default value
export const PercentageChange = createContext<PercentageChangeContextType>({
  percentageChange: 0,
  setPercentageChange: () => {}, // Default empty function
});

// Create a Provider component that will manage the state
export const PercentageChangeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [percentageChange, setPercentageChange] = useState(0);

  // useMemo ensures the context value object is stable unless state changes
  const value = useMemo(
    () => ({ percentageChange, setPercentageChange }),
    [percentageChange]
  );

  return (
    <PercentageChange.Provider value={value}>
      {children}
    </PercentageChange.Provider>
  );
};