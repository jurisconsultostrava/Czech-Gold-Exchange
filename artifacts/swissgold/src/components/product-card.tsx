import { Link } from "wouter";
import { Product, ProductPrice } from "@workspace/api-client-react";
import { Button } from "./ui/button";

interface ProductCardProps {
  product: Product;
  price?: ProductPrice;
}

export function ProductCard({ product, price }: ProductCardProps) {
  const imageUrl = product.image || `https://goldspot.cz/obrazky/${product.id}/1.webp`;

  return (
    <Link href={`/detail/${product.id}`}>
      <div className="group flex flex-col h-full bg-bg-2 border border-bg-3 hover:border-gold/50 transition-colors duration-300 relative cursor-pointer">
        <div className="p-4 flex-1 flex flex-col items-center text-center">
          <div className="w-full aspect-square relative mb-6">
            <img 
              src={imageUrl} 
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCBmaWxsPSIjMTExIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+';
              }}
            />
          </div>
          <p className="eyebrow mb-2">{product.manufacturer || 'Neznámý'}</p>
          <h3 className="text-lg font-display mb-auto text-ink-1 group-hover:text-gold transition-colors">{product.name}</h3>
          
          <div className="mt-6 space-y-1 w-full">
            {price ? (
              <>
                <p className="text-2xl text-gold font-light">{price.sellPriceCzk.toLocaleString("cs-CZ")} Kč</p>
                <p className="text-xs text-ink-3">Výkupní: {price.purchaseDisplayCzk.toLocaleString("cs-CZ")} Kč</p>
              </>
            ) : (
              <p className="text-lg text-ink-3">Cena na dotaz</p>
            )}
          </div>
        </div>
        <div className="p-4 pt-0">
          <Button className="w-full bg-bg-3 text-ink-1 hover:bg-gold hover:text-bg-0 transition-colors" variant="outline">
            Zobrazit detail
          </Button>
        </div>
      </div>
    </Link>
  );
}
