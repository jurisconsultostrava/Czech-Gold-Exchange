import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useGetPrices,
  getGetPricesQueryKey,
  useCreateOrder,
  type OrderItemInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/lib/customer-auth";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

const DELIVERY_OPTIONS = [
  { value: "personal", label: "Osobní převzetí Praha" },
  { value: "zasilkovna", label: "Zásilkovna" },
  { value: "ppl", label: "PPL" },
];

const PAYMENT_OPTIONS = [
  { value: "bank_transfer", label: "Bankovní převod" },
  { value: "cod", label: "Dobírka (do 30 000 Kč)" },
  { value: "installments", label: "Rozložená platba 12×" },
];

export default function Kosik() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const { data: prices } = useGetPrices({
    query: { refetchInterval: 60000, queryKey: getGetPricesQueryKey() },
  });
  const { toast } = useToast();
  const { customer } = useCustomerAuth();
  const createOrder = useCreateOrder();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!customer || prefilled) return;
    const fullName = [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(" ");
    setName((v) => v || fullName);
    setEmail((v) => v || customer.email);
    setPhone((v) => v || customer.phone || "");
    setAddress((v) => v || customer.address || "");
    setCity((v) => v || customer.city || "");
    setZip((v) => v || customer.zip || "");
    setPrefilled(true);
  }, [customer, prefilled]);
  const [delivery, setDelivery] = useState("personal");
  const [payment, setPayment] = useState("bank_transfer");
  const [vs] = useState(() => String(Math.floor(1000000 + Math.random() * 9000000)));
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);

  const lines = useMemo(() => {
    return items.map((item) => {
      const price = prices?.find((p) => p.id === item.product.id);
      const unitPriceCzk = price?.sellPriceCzk ?? 0;
      const unitPriceEur = price?.sellPriceEur ?? 0;
      return {
        item,
        unitPriceCzk,
        unitPriceEur,
        lineCzk: unitPriceCzk * item.quantity,
        lineEur: unitPriceEur * item.quantity,
      };
    });
  }, [items, prices]);

  const totalCzk = lines.reduce((acc, l) => acc + l.lineCzk, 0);
  const totalEur = lines.reduce((acc, l) => acc + l.lineEur, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const orderItems: OrderItemInput[] = lines.map((l) => ({
      productId: l.item.product.id,
      productName: l.item.product.name,
      weightGrams: l.item.product.weightGrams,
      quantity: l.item.quantity,
      unitPriceCzk: l.unitPriceCzk,
      unitPriceEur: l.unitPriceEur,
    }));

    createOrder.mutate(
      {
        data: {
          customerName: name,
          customerEmail: email,
          customerPhone: phone || null,
          customerAddress: address || null,
          customerCity: city || null,
          customerZip: zip || null,
          paymentMethod: payment,
          deliveryMethod: delivery,
          currency: "CZK",
          totalCzk,
          totalEur,
          items: orderItems,
        },
      },
      {
        onSuccess: (order) => {
          setCompletedOrderNumber(order.orderNumber);
          clearCart();
        },
        onError: () => {
          toast({
            title: "Chyba",
            description: "Objednávku se nepodařilo odeslat. Zkuste to prosím znovu.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (completedOrderNumber) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-2xl">
        <p className="eyebrow mb-4">Děkujeme za objednávku</p>
        <h1 className="text-4xl font-display text-ink-1 mb-6">Objednávka přijata</h1>
        <p className="text-ink-2 mb-2">Vaše číslo objednávky je:</p>
        <p className="text-3xl text-gold font-mono mb-8">{completedOrderNumber}</p>
        <p className="text-ink-2 mb-10">
          Na uvedený e-mail vám zašleme potvrzení a platební údaje. Děkujeme za důvěru.
        </p>
        <Link href="/katalog">
          <Button className="bg-gold text-bg-0 hover:bg-gold-2 h-12 px-8 rounded-none">
            Pokračovat v nákupu
          </Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <ShoppingCart className="w-16 h-16 mx-auto mb-6 text-ink-3" />
        <h1 className="text-3xl font-display text-ink-1 mb-4">Váš košík je prázdný</h1>
        <p className="text-ink-2 mb-10">Prohlédněte si naši nabídku investičních kovů.</p>
        <Link href="/katalog">
          <Button className="bg-gold text-bg-0 hover:bg-gold-2 h-12 px-8 rounded-none">
            Přejít do katalogu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-display text-ink-1 mb-12">Nákupní košík</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart items + form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="border border-bg-3">
            {lines.map((l) => {
              const imageUrl =
                l.item.product.image ||
                `https://goldspot.cz/obrazky/${l.item.product.id}/1.webp`;
              return (
                <div
                  key={l.item.product.id}
                  className="flex items-center gap-4 p-4 border-b border-bg-3 last:border-b-0"
                >
                  <div className="w-20 h-20 bg-bg-2 border border-bg-3 flex items-center justify-center shrink-0">
                    <img
                      src={imageUrl}
                      alt={l.item.product.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/detail/${l.item.product.id}`}
                      className="text-ink-1 hover:text-gold transition-colors block truncate"
                    >
                      {l.item.product.name}
                    </Link>
                    <p className="text-sm text-ink-3">
                      {l.unitPriceCzk.toLocaleString("cs-CZ")} Kč / ks
                    </p>
                  </div>
                  <div className="flex border border-bg-3 h-10">
                    <button
                      type="button"
                      className="px-3 hover:bg-bg-3"
                      onClick={() =>
                        updateQuantity(l.item.product.id, l.item.quantity - 1)
                      }
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="flex items-center justify-center w-10 font-mono text-sm">
                      {l.item.quantity}
                    </div>
                    <button
                      type="button"
                      className="px-3 hover:bg-bg-3"
                      onClick={() =>
                        updateQuantity(l.item.product.id, l.item.quantity + 1)
                      }
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-32 text-right text-ink-1 font-mono hidden sm:block">
                    {l.lineCzk.toLocaleString("cs-CZ")} Kč
                  </div>
                  <button
                    type="button"
                    className="text-ink-3 hover:text-red-400 transition-colors"
                    onClick={() => removeFromCart(l.item.product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Checkout form */}
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-display text-ink-1">Doručovací údaje</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Jméno a příjmení *</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Ulice a číslo</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Město</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">PSČ</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="bg-bg-2 border-bg-3 rounded-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Způsob doručení</Label>
                <Select value={delivery} onValueChange={setDelivery}>
                  <SelectTrigger className="bg-bg-2 border-bg-3 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Způsob platby</Label>
                <Select value={payment} onValueChange={setPayment}>
                  <SelectTrigger className="bg-bg-2 border-bg-3 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {payment === "bank_transfer" && (
              <div className="border border-gold/30 bg-gold/5 p-6 flex flex-col items-center text-center">
                <p className="eyebrow mb-4">QR platba</p>
                <img
                  src={`https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=123456789&bankCode=0800&amount=${Math.round(
                    totalCzk
                  )}&currency=CZK&vs=${vs}`}
                  alt="QR platba"
                  className="w-48 h-48 bg-white p-2"
                />
                <p className="text-sm text-ink-2 mt-4">
                  Variabilní symbol: <span className="font-mono text-ink-1">{vs}</span>
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="border border-bg-3 bg-bg-2 p-6 sticky top-24 space-y-4">
            <h2 className="text-xl font-display text-ink-1">Souhrn objednávky</h2>
            <div className="space-y-2 text-sm border-y border-bg-3 py-4">
              <div className="flex justify-between text-ink-2">
                <span>Mezisoučet</span>
                <span className="text-ink-1 font-mono">
                  {totalCzk.toLocaleString("cs-CZ")} Kč
                </span>
              </div>
              <div className="flex justify-between text-ink-3">
                <span>Orientačně v EUR</span>
                <span className="font-mono">
                  {totalEur.toLocaleString("cs-CZ", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-2">Celkem</span>
              <span className="text-2xl text-gold font-light">
                {totalCzk.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
            <Button
              type="submit"
              form="checkout-form"
              disabled={createOrder.isPending}
              className="w-full bg-gold text-bg-0 hover:bg-gold-2 h-12 rounded-none text-base"
            >
              {createOrder.isPending ? "Odesílám..." : "Odeslat objednávku"}
            </Button>
            <p className="text-xs text-ink-3 text-center">
              Investiční kovy jsou osvobozeny od DPH.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
