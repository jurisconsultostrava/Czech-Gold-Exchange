import { useState } from "react";
import {
  useAdminListOrders,
  useAdminGetOrder,
  getAdminGetOrderQueryKey,
  useAdminUpdateOrder,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { value: "new", label: "Nová" },
  { value: "paid", label: "Zaplaceno" },
  { value: "shipped", label: "Odesláno" },
  { value: "delivered", label: "Doručeno" },
  { value: "cancelled", label: "Zrušeno" },
];

function statusLabel(s: string) {
  return STATUSES.find((x) => x.value === s)?.label ?? s;
}

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: orders } = useAdminListOrders(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: order } = useAdminGetOrder(selectedId ?? "", {
    query: {
      enabled: !!selectedId,
      queryKey: getAdminGetOrderQueryKey(selectedId ?? ""),
    },
  });
  const updateOrder = useAdminUpdateOrder();
  const { toast } = useToast();

  const handleStatus = (status: string) => {
    if (!selectedId) return;
    updateOrder.mutate(
      { id: selectedId, data: { status } },
      {
        onSuccess: () =>
          toast({ title: "Uloženo", description: "Stav objednávky aktualizován." }),
        onError: () =>
          toast({
            title: "Chyba",
            description: "Stav se nepodařilo uložit.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-display text-ink-1 mb-6">Objednávky</h2>

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
              <th className="text-right p-3">Celkem</th>
              <th className="text-left p-3">Stav</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id} className="border-b border-bg-3 hover:bg-bg-2">
                <td className="p-3 font-mono text-ink-2">{o.orderNumber}</td>
                <td className="p-3 text-ink-1">{o.customerName}</td>
                <td className="p-3 text-ink-3">
                  {new Date(o.createdAt).toLocaleDateString("cs-CZ")}
                </td>
                <td className="p-3 text-right text-ink-1 font-mono">
                  {o.totalCzk.toLocaleString("cs-CZ")} Kč
                </td>
                <td className="p-3 text-gold">{statusLabel(o.status)}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    className="border-gold text-gold hover:bg-gold/10 rounded-none h-8 px-3 text-xs"
                    onClick={() => setSelectedId(o.id)}
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
        <DialogContent className="bg-bg-1 border-bg-3 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Objednávka {order?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {order && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-ink-3">Zákazník</div>
                  <div className="text-ink-1">{order.customerName}</div>
                </div>
                <div>
                  <div className="text-ink-3">E-mail</div>
                  <div className="text-ink-1">{order.customerEmail}</div>
                </div>
                <div>
                  <div className="text-ink-3">Telefon</div>
                  <div className="text-ink-1">{order.customerPhone || "—"}</div>
                </div>
                <div>
                  <div className="text-ink-3">Adresa</div>
                  <div className="text-ink-1">
                    {[order.customerAddress, order.customerCity, order.customerZip]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-ink-3">Doručení</div>
                  <div className="text-ink-1">{order.deliveryMethod}</div>
                </div>
                <div>
                  <div className="text-ink-3">Platba</div>
                  <div className="text-ink-1">{order.paymentMethod}</div>
                </div>
              </div>

              <div className="border border-bg-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bg-3 text-ink-3 text-xs uppercase">
                      <th className="text-left p-2">Produkt</th>
                      <th className="text-right p-2">Ks</th>
                      <th className="text-right p-2">Cena/ks</th>
                      <th className="text-right p-2">Celkem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id} className="border-b border-bg-3 last:border-0">
                        <td className="p-2 text-ink-1">{it.productName}</td>
                        <td className="p-2 text-right text-ink-2">{it.quantity}</td>
                        <td className="p-2 text-right text-ink-2 font-mono">
                          {it.unitPriceCzk.toLocaleString("cs-CZ")} Kč
                        </td>
                        <td className="p-2 text-right text-ink-1 font-mono">
                          {(it.unitPriceCzk * it.quantity).toLocaleString("cs-CZ")} Kč
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-ink-2">Celkem</span>
                <span className="text-2xl text-gold font-light">
                  {order.totalCzk.toLocaleString("cs-CZ")} Kč
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-ink-3">Změnit stav</div>
                <Select value={order.status} onValueChange={handleStatus}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
