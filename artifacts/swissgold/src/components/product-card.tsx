import { Link } from "wouter";
import { Product, ProductPrice } from "@workspace/api-client-react";
import { useCurrency } from "@/lib/currency-context";

interface ProductCardProps {
  product: Product;
  price?: ProductPrice;
}

export function ProductCard({ product, price }: ProductCardProps) {
  const { format } = useCurrency();
  const imageUrl = product.image || `https://goldspot.cz/obrazky/${product.id}/1.webp`;

  return (
    <Link href={`/detail/${product.id}`}>
      <div className="group flex flex-col h-full bg-bg-2 border border-bg-3 hover:border-gold/50 transition-colors duration-300 relative cursor-pointer">
        <span className="absolute top-3 left-3 z-10 rounded-full bg-gold-3 text-white text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 leading-none">
          Skladem ČR
        </span>
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
          <p className="eyebrow mb-2">Investiční kov</p>
          <h3 className="text-lg font-display mb-auto text-ink-1 group-hover:text-gold transition-colors">{product.name}</h3>

          <div className="mt-6 space-y-1 w-full">
            {price ? (
              <>
                <p className="text-2xl text-gold font-light">{format(price.sellPriceCzk)}</p>
                <p className="text-xs text-ink-3">Výkupní: {format(price.purchaseDisplayCzk)}</p>
              </>
            ) : (
              <p className="text-lg text-ink-3">Cena na dotaz</p>
            )}
          </div>
        </div>
        <div className="px-4 pb-4">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-gold group-hover:text-gold-2 transition-colors">
            Detail
            <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
