import { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { SpotTicker } from "./spot-ticker";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SpotTicker />
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
