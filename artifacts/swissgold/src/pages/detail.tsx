import { useState } from "react";
import { useRoute } from "wouter";
import { useGetProduct, useGetPrices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

export default function Detail() {
  const [, params] = useRoute("/detail/:id");
  const productId = params?.id || "";
  
  const { data: product } = useGetProduct(productId, { query: { enabled: !!productId }});
  const { data: prices } = useGetPrices({ query: { refetchInterval: 60000 } });
  
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const [qty, setQty] = useState(1);

  if (!product) return <div className="p-24 text-center">Načítání...</div>;

  const price = prices?.find(p => p.id === product.id);
  const imageUrl = product.image || `https://goldspot.cz/obrazky/${product.id}/1.webp`;

  const handleAdd = () => {
    addToCart(product, qty);
    toast({
      title: "Přidáno do košíku",
      description: `${qty}x ${product.name}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div>
          <div className="aspect-square bg-bg-2 border border-bg-3 p-8 flex items-center justify-center">
             <img src={imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
          </div>
        </div>
        
        <div>
          <p className="eyebrow mb-2">{product.manufacturer || 'Výrobce neuveden'}</p>
          <h1 className="text-3xl lg:text-4xl font-display text-ink-1 mb-6">{product.name}</h1>
          
          <div className="py-6 border-y border-bg-3 mb-8">
             {price ? (
               <div>
                 <div className="text-4xl text-gold font-light mb-2">{price.sellPriceCzk.toLocaleString("cs-CZ")} Kč</div>
                 <div className="text-ink-2">Výkupní cena: {price.purchaseDisplayCzk.toLocaleString("cs-CZ")} Kč</div>
               </div>
             ) : (
               <div className="text-xl text-ink-2">Cena na dotaz</div>
             )}
          </div>
          
          <div className="flex gap-4 mb-8 items-center">
            <div className="flex border border-bg-3 h-12">
              <button className="px-4 hover:bg-bg-3 text-xl" onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
              <div className="flex items-center justify-center w-12 font-mono">{qty}</div>
              <button className="px-4 hover:bg-bg-3 text-xl" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <Button onClick={handleAdd} className="flex-1 bg-gold text-bg-0 hover:bg-gold-2 h-12 rounded-none text-lg">
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
