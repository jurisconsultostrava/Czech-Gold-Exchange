import { useEffect, useMemo, useState } from "react";
import {
  useAdminGetSettings,
  useAdminUpdateSettings,
  useAdminListProducts,
  useAdminListOverrides,
  useAdminUpdateOverride,
  type SettingsUpdate,
  type PriceOverride,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const FIELDS: { key: keyof SettingsUpdate; label: string }[] = [
  { key: "eurToCzk", label: "Kurz EUR → CZK" },
  { key: "globalMarginCzk", label: "Globální přirážka (Kč)" },
  { key: "marginInvestZlato", label: "Přirážka – investiční zlato (Kč)" },
  { key: "marginInvestStribro", label: "Přirážka – investiční stříbro (Kč)" },
  { key: "marginPlatinaPalladium", label: "Přirážka – platina/palladium (Kč)" },
  { key: "marginMinceCnb", label: "Přirážka – mince ČNB (Kč)" },
  { key: "buybackSpreadPct", label: "Výkupní spread (%)" },
  { key: "deferredDiscountPct", label: "Sleva terminované dodání (%)" },
  { key: "bulkTier1Qty", label: "Množství – sleva 1 (ks)" },
  { key: "bulkTier1DiscountPct", label: "Sleva 1 (%)" },
  { key: "bulkTier2Qty", label: "Množství – sleva 2 (ks)" },
  { key: "bulkTier2DiscountPct", label: "Sleva 2 (%)" },
  { key: "bulkTier3Qty", label: "Množství – sleva 3 (ks)" },
  { key: "bulkTier3DiscountPct", label: "Sleva 3 (%)" },
];

export default function AdminPricing() {
  const { data: settings } = useAdminGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const { data: products } = useAdminListProducts();
  const { data: overrides } = useAdminListOverrides();
  const updateOverride = useAdminUpdateOverride();
  const { toast } = useToast();

  const [form, setForm] = useState<SettingsUpdate>({});

  useEffect(() => {
    if (settings) {
      const { id, ...rest } = settings;
      void id;
      setForm(rest);
    }
  }, [settings]);

  const saveSettings = () => {
    updateSettings.mutate(
      { data: form },
      {
        onSuccess: () =>
          toast({ title: "Uloženo", description: "Cenotvorba byla uložena." }),
        onError: () =>
          toast({
            title: "Chyba",
            description: "Nastavení se nepodařilo uložit.",
            variant: "destructive",
          }),
      }
    );
  };

  // ---- Overrides ----
  const overrideMap = useMemo(() => {
    const map: Record<string, PriceOverride> = {};
    overrides?.forEach((o) => {
      map[o.productId] = o;
    });
    return map;
  }, [overrides]);

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<
    Record<string, { marginCzk: string; marginPct: string; active: boolean }>
  >({});

  const getDraft = (productId: string) => {
    if (draft[productId]) return draft[productId];
    const o = overrideMap[productId];
    return {
      marginCzk: o?.marginCzk != null ? String(o.marginCzk) : "",
      marginPct: o?.marginPct != null ? String(o.marginPct) : "",
      active: o?.active ?? true,
    };
  };

  const setDraftField = (
    productId: string,
    patch: Partial<{ marginCzk: string; marginPct: string; active: boolean }>
  ) => {
    setDraft((d) => ({
      ...d,
      [productId]: { ...getDraft(productId), ...patch },
    }));
  };

  const saveOverride = (productId: string) => {
    const d = getDraft(productId);
    updateOverride.mutate(
      {
        id: productId,
        data: {
          marginCzk: d.marginCzk === "" ? null : parseFloat(d.marginCzk),
          marginPct: d.marginPct === "" ? null : parseFloat(d.marginPct),
          active: d.active,
        },
      },
      {
        onSuccess: () =>
          toast({ title: "Uloženo", description: "Přirážka produktu uložena." }),
        onError: () =>
          toast({
            title: "Chyba",
            description: "Přirážku se nepodařilo uložit.",
            variant: "destructive",
          }),
      }
    );
  };

  const filteredProducts = useMemo(() => {
    if (!search) return (products ?? []).slice(0, 30);
    return (products ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  return (
    <div className="space-y-12">
      {/* Settings */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display text-ink-1">Cenotvorba</h2>
          <Button
            className="bg-gold text-bg-0 hover:bg-gold-2 rounded-none"
            onClick={saveSettings}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? "Ukládám..." : "Uložit nastavení"}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label>{f.label}</Label>
              <Input
                type="number"
                step="any"
                value={form[f.key] ?? ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    [f.key]:
                      e.target.value === "" ? undefined : parseFloat(e.target.value),
                  }))
                }
                className="bg-bg-2 border-bg-3 rounded-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-product overrides */}
      <div>
        <h3 className="text-xl font-display text-ink-1 mb-4">
          Přirážka per produkt
        </h3>
        <Input
          placeholder="Hledat produkt podle názvu nebo kódu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-2 border-bg-3 rounded-none max-w-md mb-4"
        />
        <div className="border border-bg-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-3 text-ink-3 uppercase text-xs tracking-wider">
                <th className="text-left p-3">Produkt</th>
                <th className="text-left p-3">Přirážka (Kč)</th>
                <th className="text-left p-3">Přirážka (%)</th>
                <th className="text-center p-3">Aktivní</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const d = getDraft(p.id);
                return (
                  <tr key={p.id} className="border-b border-bg-3 hover:bg-bg-2">
                    <td className="p-3 text-ink-1">
                      <div>{p.name}</div>
                      <div className="font-mono text-xs text-ink-3">{p.id}</div>
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="any"
                        value={d.marginCzk}
                        onChange={(e) =>
                          setDraftField(p.id, { marginCzk: e.target.value })
                        }
                        className="bg-bg-1 border-bg-3 rounded-none w-28 h-9"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="any"
                        value={d.marginPct}
                        onChange={(e) =>
                          setDraftField(p.id, { marginPct: e.target.value })
                        }
                        className="bg-bg-1 border-bg-3 rounded-none w-24 h-9"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={d.active}
                        onCheckedChange={(v) => setDraftField(p.id, { active: v })}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        className="border-gold text-gold hover:bg-gold/10 rounded-none h-8 px-3 text-xs"
                        onClick={() => saveOverride(p.id)}
                      >
                        Uložit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
