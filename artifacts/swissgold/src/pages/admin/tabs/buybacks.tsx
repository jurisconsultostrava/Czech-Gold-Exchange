import { useEffect, useState } from "react";
import {
  useAdminListBuybacks,
  useAdminGetBuyback,
  getAdminGetBuybackQueryKey,
  useAdminUpdateBuyback,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const STATUSES = [
  { value: "new", label: "Nová" },
  { value: "in_progress", label: "Zpracovává se" },
  { value: "offered", label: "Nabídka zaslána" },
  { value: "completed", label: "Dokončeno" },
  { value: "cancelled", label: "Zrušeno" },
];

function statusLabel(s: string) {
  return STATUSES.find((x) => x.value === s)?.label ?? s;
}

export default function AdminBuybacks() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: buybacks } = useAdminListBuybacks(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: buyback } = useAdminGetBuyback(selectedId ?? "", {
    query: {
      enabled: !!selectedId,
      queryKey: getAdminGetBuybackQueryKey(selectedId ?? ""),
    },
  });
  const updateBuyback = useAdminUpdateBuyback();
  const { toast } = useToast();

  const [status, setStatus] = useState("new");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (buyback) {
      setStatus(buyback.status);
      setNote(buyback.adminNote ?? "");
    }
  }, [buyback]);

  const handleSave = () => {
    if (!selectedId) return;
    updateBuyback.mutate(
      { id: selectedId, data: { status, adminNote: note || null } },
      {
        onSuccess: () =>
          toast({ title: "Uloženo", description: "Výkup byl aktualizován." }),
        onError: () =>
          toast({
            title: "Chyba",
            description: "Změny se nepodařilo uložit.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-display text-ink-1 mb-6">Výkupy</h2>

      <div className="mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-bg-2 border-bg-3 rounded-none w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-bg-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-3 text-ink-3 uppercase text-xs tracking-wider">
              <th className="text-left p-3">Číslo</th>
              <th className="text-left p-3">Zákazník</th>
              <th className="text-left p-3">Datum</th>
              <th className="text-right p-3">Odhad</th>
              <th className="text-left p-3">Stav</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {buybacks?.map((b) => (
              <tr key={b.id} className="border-b border-bg-3 hover:bg-bg-2">
                <td className="p-3 font-mono text-ink-2">{b.requestNumber}</td>
                <td className="p-3 text-ink-1">{b.customerName}</td>
                <td className="p-3 text-ink-3">
                  {new Date(b.createdAt).toLocaleDateString("cs-CZ")}
                </td>
                <td className="p-3 text-right text-ink-1 font-mono">
                  {b.estimatedCzk
                    ? `${b.estimatedCzk.toLocaleString("cs-CZ")} Kč`
                    : "—"}
                </td>
                <td className="p-3 text-gold">{statusLabel(b.status)}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    className="border-gold text-gold hover:bg-gold/10 rounded-none h-8 px-3 text-xs"
                    onClick={() => setSelectedId(b.id)}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="bg-bg-1 border-bg-3 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Výkup {buyback?.requestNumber}</DialogTitle>
          </DialogHeader>
          {buyback && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-ink-3">Zákazník</div>
                  <div className="text-ink-1">{buyback.customerName}</div>
                </div>
                <div>
                  <div className="text-ink-3">E-mail</div>
                  <div className="text-ink-1">{buyback.customerEmail}</div>
                </div>
                <div>
                  <div className="text-ink-3">Telefon</div>
                  <div className="text-ink-1">{buyback.customerPhone || "—"}</div>
                </div>
                <div>
                  <div className="text-ink-3">Odhad</div>
                  <div className="text-ink-1">
                    {buyback.estimatedCzk
                      ? `${buyback.estimatedCzk.toLocaleString("cs-CZ")} Kč`
                      : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-ink-3 text-sm mb-1">Popis položek</div>
                <div className="text-ink-1 text-sm whitespace-pre-line border border-bg-3 p-3 bg-bg-2">
                  {buyback.itemDescription || "—"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stav</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-bg-2 border-bg-3 rounded-none w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Interní poznámka</Label>
                <Textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-bg-3 rounded-none"
              onClick={() => setSelectedId(null)}
            >
              Zavřít
            </Button>
            <Button
              className="bg-gold text-bg-0 hover:bg-gold-2 rounded-none"
              onClick={handleSave}
              disabled={updateBuyback.isPending}
            >
              {updateBuyback.isPending ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
