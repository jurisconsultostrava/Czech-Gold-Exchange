import { createContext, useContext, useState, ReactNode } from "react";
import { useGetSpot, getGetSpotQueryKey } from "@workspace/api-client-react";

type Currency = "CZK" | "EUR";

interface CurrencyContextValue {
  currency: Currency;
  toggle: () => void;
  eurCzk: number;
  format: (czk?: number | null) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("CZK");
  const { data } = useGetSpot({ query: { queryKey: getGetSpotQueryKey() } });
  const eurCzk = data?.eurCzk ?? 25.2;

  const format = (czk?: number | null) => {
    if (czk == null) return "—";
    if (currency === "EUR") {
      const eur = czk / eurCzk;
      return eur.toLocaleString("cs-CZ", { maximumFractionDigits: 0 }) + " €";
    }
    return czk.toLocaleString("cs-CZ") + " Kč";
  };

  const toggle = () => setCurrency((c) => (c === "CZK" ? "EUR" : "CZK"));

  return (
    <CurrencyContext.Provider value={{ currency, toggle, eurCzk, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
