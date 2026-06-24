import { useState } from "react";
import { useLocation } from "wouter";
import { clearAdminToken } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import AdminOverview from "./tabs/overview";
import AdminProducts from "./tabs/products";
import AdminOrders from "./tabs/orders";
import AdminBuybacks from "./tabs/buybacks";
import AdminContent from "./tabs/content";
import AdminPricing from "./tabs/pricing";
import AdminImportExport from "./tabs/import-export";

type TabKey =
  | "overview"
  | "products"
  | "orders"
  | "buybacks"
  | "content"
  | "pricing"
  | "io";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Přehled" },
  { key: "products", label: "Produkty" },
  { key: "orders", label: "Objednávky" },
  { key: "buybacks", label: "Výkupy" },
  { key: "content", label: "Obsah webu" },
  { key: "pricing", label: "Cenotvorba" },
  { key: "io", label: "Import / Export" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [, navigate] = useLocation();

  const handleLogout = () => {
    clearAdminToken();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-bg-1 text-ink-1">
      <aside className="w-56 bg-bg-0 border-r border-bg-3 flex flex-col shrink-0">
        <div className="p-6 border-b border-bg-3">
          <h1 className="text-lg font-display">
            SwissGold<span className="text-gold">.cz</span>
          </h1>
          <p className="text-xs text-ink-3 mt-1">Administrace</p>
        </div>
        <nav className="flex-1 py-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`block w-full text-left px-6 py-3 text-sm transition-colors border-l-2 ${
                tab === t.key
                  ? "border-gold text-ink-1 bg-bg-2"
                  : "border-transparent text-ink-3 hover:text-ink-1 hover:bg-bg-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-bg-3">
          <Button
            variant="outline"
            className="w-full border-bg-3 text-ink-2 hover:bg-bg-2 rounded-none"
            onClick={handleLogout}
          >
            Odhlásit se
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-x-hidden">
        {tab === "overview" && <AdminOverview />}
        {tab === "products" && <AdminProducts />}
        {tab === "orders" && <AdminOrders />}
        {tab === "buybacks" && <AdminBuybacks />}
        {tab === "content" && <AdminContent />}
        {tab === "pricing" && <AdminPricing />}
        {tab === "io" && <AdminImportExport />}
      </main>
    </div>
  );
}
