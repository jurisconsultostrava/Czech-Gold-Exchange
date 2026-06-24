import { useMemo, useState } from "react";
import {
  useAdminListProducts,
  useAdminUpdateProduct,
  type Product,
  type ProductUpdate,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function emptyForm(p: Product): ProductUpdate {
  return {
    name: p.name,
    manufacturer: p.manufacturer ?? null,
    weightGrams: p.weightGrams,
    fineness: p.fineness,
    category: p.category,
    subcat: p.subcat,
    year: p.year ?? null,
    featured: p.featured,
    active: p.active,
    image: p.image ?? null,
    description: p.description ?? null,
    sortOrder: p.sortOrder,
  };
}

export default function AdminProducts() {
  const { data: products } = useAdminListProducts();
  const updateProduct = useAdminUpdateProduct();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductUpdate | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products?.forEach((p) => set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.id.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (activeFilter === "active" && !p.active) return false;
      if (activeFilter === "inactive" && p.active) return false;
      return true;
    });
  }, [products, search, categoryFilter, activeFilter]);

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm(emptyForm(p));
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(null);
  };

  const handleSave = () => {
    if (!editing || !form) return;
    updateProduct.mutate(
      { id: editing.id, data: form },
      {
        onSuccess: () => {
          toast({ title: "Uloženo", description: "Produkt byl aktualizován." });
          closeEdit();
        },
        onError: () => {
          toast({
            title: "Chyba",
            description: "Produkt se nepodařilo uložit.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const upd = (patch: Partial<ProductUpdate>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      <h2 className="text-2xl font-display text-ink-1 mb-6">Produkty</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="Hledat podle názvu nebo kódu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-2 border-bg-3 rounded-none max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-bg-2 border-bg-3 rounded-none w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="bg-bg-2 border-bg-3 rounded-none w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vše</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="inactive">Neaktivní</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-bg-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-3 text-ink-3 uppercase text-xs tracking-wider">
              <th className="text-left p-3">Kód</th>
              <th className="text-left p-3">Název</th>
              <th className="text-left p-3">Kategorie</th>
              <th className="text-left p-3">Hmotnost</th>
              <th className="text-center p-3">Akt.</th>
              <th className="text-center p-3">Top</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-bg-3 hover:bg-bg-2">
                <td className="p-3 font-mono text-ink-3">{p.id}</td>
                <td className="p-3 text-ink-1">{p.name}</td>
                <td className="p-3 text-ink-2">{p.category}</td>
                <td className="p-3 text-ink-2">{p.weightGrams} g</td>
                <td className="p-3 text-center">{p.active ? "✓" : "—"}</td>
                <td className="p-3 text-center">{p.featured ? "★" : "—"}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    className="border-gold text-gold hover:bg-gold/10 rounded-none h-8 px-3 text-xs"
                    onClick={() => openEdit(p)}
                  >
                    Upravit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="bg-bg-1 border-bg-3 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upravit produkt</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Název</Label>
                <Input
                  value={form.name}
                  onChange={(e) => upd({ name: e.target.value })}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Výrobce</Label>
                <Input
                  value={form.manufacturer ?? ""}
                  onChange={(e) =>
                    upd({ manufacturer: e.target.value || null })
                  }
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Input
                  value={form.category}
                  onChange={(e) => upd({ category: e.target.value })}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Podkategorie</Label>
                <Input
                  value={form.subcat}
                  onChange={(e) => upd({ subcat: e.target.value })}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Hmotnost (g)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.weightGrams}
                  onChange={(e) =>
                    upd({ weightGrams: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Ryzost</Label>
                <Input
                  value={form.fineness}
                  onChange={(e) => upd({ fineness: e.target.value })}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Rok</Label>
                <Input
                  type="number"
                  value={form.year ?? ""}
                  onChange={(e) =>
                    upd({
                      year: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Pořadí</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    upd({ sortOrder: parseInt(e.target.value, 10) || 0 })
                  }
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Obrázek (URL)</Label>
                <Input
                  value={form.image ?? ""}
                  onChange={(e) => upd({ image: e.target.value || null })}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Popis</Label>
                <Textarea
                  rows={4}
                  value={form.description ?? ""}
                  onChange={(e) =>
                    upd({ description: e.target.value || null })
                  }
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => upd({ featured: v })}
                />
                <Label>Doporučený</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => upd({ active: v })}
                />
                <Label>Aktivní</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-bg-3 rounded-none"
              onClick={closeEdit}
            >
              Zrušit
            </Button>
            <Button
              className="bg-gold text-bg-0 hover:bg-gold-2 rounded-none"
              onClick={handleSave}
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
