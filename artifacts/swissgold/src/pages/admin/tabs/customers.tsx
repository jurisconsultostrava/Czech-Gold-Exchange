import { useState } from "react";
import {
  useAdminListCustomers,
  useAdminGetCustomer,
  getAdminGetCustomerQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "—";
}

export default function AdminCustomers() {
  const { data: customers } = useAdminListCustomers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = useAdminGetCustomer(selectedId ?? "", {
    query: {
      enabled: !!selectedId,
      queryKey: getAdminGetCustomerQueryKey(selectedId ?? ""),
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-display text-ink-1 mb-6">Zákazníci</h2>

      <div className="border border-bg-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-3 text-ink-3 uppercase text-xs tracking-wider">
              <th className="text-left p-3">Jméno</th>
              <th className="text-left p-3">E-mail</th>
              <th className="text-left p-3">Telefon</th>
              <th className="text-right p-3">Objednávky</th>
              <th className="text-right p-3">Útrata</th>
              <th className="text-right p-3">Výkupy</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.id} className="border-b border-bg-3 hover:bg-bg-2">
                <td className="p-3 text-ink-1">
                  {fullName(c.firstName, c.lastName)}
                </td>
                <td className="p-3 text-ink-2">{c.email}</td>
                <td className="p-3 text-ink-3">{c.phone || "—"}</td>
                <td className="p-3 text-right text-ink-2 font-mono">
                  {c.orderCount}
                </td>
                <td className="p-3 text-right text-ink-1 font-mono">
                  {c.totalSpentCzk.toLocaleString("cs-CZ")} Kč
                </td>
                <td className="p-3 text-right text-ink-2 font-mono">
                  {c.buybackCount}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    className="border-gold text-gold hover:bg-gold/10 rounded-none h-8 px-3 text-xs"
                    onClick={() => setSelectedId(c.id)}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
            ))}
            {customers && customers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-ink-3">
                  Zatím žádní zákazníci.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="bg-bg-1 border-bg-3 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail
                ? fullName(detail.customer.firstName, detail.customer.lastName)
                : "Zákazník"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-ink-3">E-mail</div>
                  <div className="text-ink-1">{detail.customer.email}</div>
                </div>
                <div>
                  <div className="text-ink-3">Telefon</div>
                  <div className="text-ink-1">{detail.customer.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-ink-3">Adresa</div>
                  <div className="text-ink-1">
                    {[
                      detail.customer.address,
                      detail.customer.city,
                      detail.customer.zip,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-ink-3">Registrace</div>
                  <div className="text-ink-1">
                    {new Date(detail.customer.createdAt).toLocaleDateString(
                      "cs-CZ",
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-wider text-ink-3 mb-2">
                  Objednávky ({detail.orders.length})
                </h3>
                {detail.orders.length === 0 ? (
                  <p className="text-ink-3 text-sm">Žádné objednávky.</p>
                ) : (
                  <div className="border border-bg-3 divide-y divide-bg-3">
                    {detail.orders.map((o) => (
                      <div
                        key={o.id}
                        className="flex justify-between items-center p-3 text-sm"
                      >
                        <span className="font-mono text-ink-2">
                          {o.orderNumber}
                        </span>
                        <span className="text-ink-3">
                          {new Date(o.createdAt).toLocaleDateString("cs-CZ")}
                        </span>
                        <span className="text-ink-1 font-mono">
                          {o.totalCzk.toLocaleString("cs-CZ")} Kč
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-wider text-ink-3 mb-2">
                  Výkupy ({detail.buybacks.length})
                </h3>
                {detail.buybacks.length === 0 ? (
                  <p className="text-ink-3 text-sm">Žádné žádosti o výkup.</p>
                ) : (
                  <div className="border border-bg-3 divide-y divide-bg-3">
                    {detail.buybacks.map((b) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-center p-3 text-sm"
                      >
                        <span className="font-mono text-ink-2">
                          {b.requestNumber}
                        </span>
                        <span className="text-ink-3">
                          {new Date(b.createdAt).toLocaleDateString("cs-CZ")}
                        </span>
                        <span className="text-ink-1 font-mono">
                          {b.estimatedCzk != null
                            ? `${b.estimatedCzk.toLocaleString("cs-CZ")} Kč`
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
