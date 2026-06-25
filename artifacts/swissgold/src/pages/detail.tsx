import { useState } from "react";
import { useRoute } from "wouter";
import {
  useGetProduct,
  getGetProductQueryKey,
  useGetPrices,
  getGetPricesQueryKey,
  useGetPublicSettings,
  getGetPublicSettingsQueryKey,
} from "@workspace/api-client-react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useToast } from "@/hooks/use-toast";

export default function Detail() {
  const [, params] = useRoute("/detail/:id");
  const { format } = useCurrency();
  const productId = params?.id || "";

  const { data: product } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: prices } = useGetPrices({
    query: { refetchInterval: 60000, queryKey: getGetPricesQueryKey() },
  });
  const { data: publicSettings } = useGetPublicSettings({
    query: { queryKey: getGetPublicSettingsQueryKey() },
  });

  const { addToCart } = useCart();
  const { toast } = useToast();

  const [qty, setQty] = useState(1);
  const [deferredQty, setDeferredQty] = useState(1);

  if (!product) return <div className="p-24 text-center">Načítání...</div>;

  const price = prices?.find((p) => p.id === product.id);
  const imageUrl =
    product.image || `https://goldspot.cz/obrazky/${product.id}/1.webp`;

  const deferredPct = publicSettings?.deferredDiscountPct ?? 9;
  const deferredUnitCzk = price
    ? Math.round(price.sellPriceCzk * (1 - deferredPct / 100))
    : null;

  const handleAdd = () => {
    addToCart(product, qty);
    toast({
      title: "Přidáno do košíku",
      description: `${qty}x ${product.name}`,
    });
  };

  const handleDeferredAdd = () => {
    addToCart(product, deferredQty);
    toast({
      title: "Přidáno do košíku",
      description: `${deferredQty}x ${product.name} (terminované dodání)`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div>
          <div className="aspect-square bg-bg-2 border border-bg-3 p-8 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">
            {product.manufacturer || "Výrobce neuveden"}
          </p>
          <h1 className="text-3xl lg:text-4xl font-display text-ink-1 mb-6">
            {product.name}
          </h1>

          <div className="py-6 border-y border-bg-3 mb-8">
            {price ? (
              <div>
                <div className="text-4xl text-gold font-light mb-2">
                  {format(price.sellPriceCzk)}
                </div>
                <div className="text-ink-2">
                  Výkupní cena: {format(price.purchaseDisplayCzk)}
                </div>
              </div>
            ) : (
              <div className="text-xl text-ink-2">Cena na dotaz</div>
            )}
          </div>

          {price && deferredUnitCzk != null && (
            <div
              className="mb-8"
              style={{
                background: "rgba(192,155,75,0.85)",
                borderRadius: 16,
                padding: 20,
                color: "#000",
              }}
            >
              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-5 h-5" strokeWidth={2} />
                <span>Zvýhodněná cena s terminovaným dodáním</span>
              </div>
              <p
                className="text-sm mt-1"
                style={{ color: "rgba(0,0,0,0.7)" }}
              >
                Odložené dodání za 12 měsíců
              </p>

              <div className="flex items-center gap-3 mt-3">
                <span style={{ fontSize: "1.8rem", fontWeight: 600 }}>
                  {format(deferredUnitCzk)}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "rgba(0,0,0,0.7)" }}>
                Osvobozeno od DPH
              </p>

              <div className="flex gap-3 mt-4">
                <div
                  className="flex items-stretch"
                  style={{
                    background: "rgba(0,0,0,0.12)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Snížit množství"
                    className="px-3 text-xl leading-none hover:bg-black/10"
                    onClick={() =>
                      setDeferredQty((q) => Math.max(1, q - 1))
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={deferredQty}
                    onChange={(e) =>
                      setDeferredQty(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-12 text-center bg-transparent font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ color: "#000" }}
                  />
                  <button
                    type="button"
                    aria-label="Zvýšit množství"
                    className="px-3 text-xl leading-none hover:bg-black/10"
                    onClick={() => setDeferredQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDeferredAdd}
                  className="flex-1 font-semibold tracking-wide h-11"
                  style={{
                    background: "#000",
                    color: "#C09B4B",
                    borderRadius: 8,
                  }}
                >
                  KOUPIT
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-8 items-center">
            <div className="flex border border-bg-3 h-12">
              <button
                className="px-4 hover:bg-bg-3 text-xl"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                -
              </button>
              <div className="flex items-center justify-center w-12 font-mono">
                {qty}
              </div>
              <button
                className="px-4 hover:bg-bg-3 text-xl"
                onClick={() => setQty(qty + 1)}
              >
                +
              </button>
            </div>
            <Button
              onClick={handleAdd}
              className="flex-1 bg-gold text-bg-0 hover:bg-gold-2 h-12 rounded-none text-lg"
            >
              Do košíku
            </Button>
          </div>

          <div className="space-y-4 text-sm text-ink-2">
            <div className="flex justify-between border-b border-bg-3 pb-2">
              <span>Hmotnost</span>
              <span className="text-ink-1">{product.weightGrams} g</span>
            </div>
            <div className="flex justify-between border-b border-bg-3 pb-2">
              <span>Ryzost</span>
              <span className="text-ink-1">{product.fineness}</span>
            </div>
            <div className="flex justify-between border-b border-bg-3 pb-2">
              <span>Kategorie</span>
              <span className="text-ink-1">{product.category}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
