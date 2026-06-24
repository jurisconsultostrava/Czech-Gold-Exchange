import { useMemo, useState } from "react";
import {
  useGetContent,
  useListProducts,
  useGetPrices,
  getGetPricesQueryKey,
  useCreateBuyback,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Vykup() {
  const { data: content } = useGetContent();
  const { data: products } = useListProducts();
  const { data: prices } = useGetPrices({
    query: { refetchInterval: 60000, queryKey: getGetPricesQueryKey() },
  });
  const createBuyback = useCreateBuyback();
  const { toast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [calcQty, setCalcQty] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [completedNumber, setCompletedNumber] = useState<string | null>(null);

  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const selectedPrice = prices?.find((p) => p.id === selectedProductId);

  const estimatedCzk = useMemo(() => {
    if (!selectedPrice) return 0;
    return selectedPrice.purchaseDisplayCzk * calcQty;
  }, [selectedPrice, calcQty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const description = [
      selectedProduct ? `${calcQty}× ${selectedProduct.name}` : null,
      note || null,
    ]
      .filter(Boolean)
      .join(" — ");

    createBuyback.mutate(
      {
        data: {
          customerName: name,
          customerEmail: email,
          customerPhone: phone || null,
          itemDescription: description || null,
          estimatedCzk: estimatedCzk > 0 ? estimatedCzk : null,
        },
      },
      {
        onSuccess: (buyback) => {
          setCompletedNumber(buyback.requestNumber);
        },
        onError: () => {
          toast({
            title: "Chyba",
            description: "Žádost se nepodařilo odeslat. Zkuste to prosím znovu.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (completedNumber) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-2xl">
        <p className="eyebrow mb-4">Děkujeme</p>
        <h1 className="text-4xl font-display text-ink-1 mb-6">Žádost o výkup přijata</h1>
        <p className="text-ink-2 mb-2">Číslo vaší žádosti je:</p>
        <p className="text-3xl text-gold font-mono mb-8">{completedNumber}</p>
        <p className="text-ink-2">
          Ozveme se vám co nejdříve s konkrétní nabídkou na výkup.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mb-16">
        <p className="eyebrow mb-2">Výkup drahých kovů</p>
        <h1 className="text-4xl font-display text-ink-1 mb-6">
          {content?.["buyback_headline"] || "Vykoupíme vaše investiční kovy"}
        </h1>
        <p className="text-lg text-ink-2">
          {content?.["buyback_subtitle"] ||
            "Nabízíme férové a transparentní výkupní ceny odvozené od aktuálního spotu."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Calculator */}
        <div className="border border-bg-3 bg-bg-2 p-8 space-y-6">
          <h2 className="text-2xl font-display text-ink-1">Orientační kalkulačka</h2>
          <div className="space-y-2">
            <Label>Produkt</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="bg-bg-1 border-bg-3 rounded-none">
                <SelectValue placeholder="Vyberte produkt" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calcQty">Množství (ks)</Label>
            <div className="flex border border-bg-3 h-12 w-fit">
              <button
                type="button"
                className="px-4 hover:bg-bg-3 text-xl"
                onClick={() => setCalcQty(Math.max(1, calcQty - 1))}
              >
                -
              </button>
              <div className="flex items-center justify-center w-16 font-mono">
                {calcQty}
              </div>
              <button
                type="button"
                className="px-4 hover:bg-bg-3 text-xl"
                onClick={() => setCalcQty(calcQty + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="border-t border-bg-3 pt-6">
            <p className="text-ink-2 mb-2">Odhadovaná výkupní cena</p>
            <p className="text-4xl text-gold font-light">
              {estimatedCzk.toLocaleString("cs-CZ")} Kč
            </p>
            {!selectedProduct && (
              <p className="text-sm text-ink-3 mt-2">
                Vyberte produkt pro výpočet odhadu.
              </p>
            )}
          </div>
        </div>

        {/* Request form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-display text-ink-1">Žádost o výkup</h2>
          <div className="space-y-2">
            <Label htmlFor="bname">Jméno a příjmení *</Label>
            <Input
              id="bname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemail">E-mail *</Label>
            <Input
              id="bemail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bphone">Telefon</Label>
            <Input
              id="bphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bnote">Poznámka</Label>
            <Textarea
              id="bnote"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Popište kovy, které chcete prodat..."
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          {estimatedCzk > 0 && (
            <p className="text-sm text-ink-2">
              Odhadovaná cena:{" "}
              <span className="text-gold font-mono">
                {estimatedCzk.toLocaleString("cs-CZ")} Kč
              </span>
            </p>
          )}
          <Button
            type="submit"
            disabled={createBuyback.isPending}
            className="w-full bg-gold text-bg-0 hover:bg-gold-2 h-12 rounded-none text-base"
          >
            {createBuyback.isPending ? "Odesílám..." : "Odeslat žádost o výkup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
