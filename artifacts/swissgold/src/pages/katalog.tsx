import { useSearch, useLocation } from "wouter";
import { useListProducts, useGetPrices, getGetPricesQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";

export default function Katalog() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const category = new URLSearchParams(search).get("category") || "";

  const setCategory = (c: string) =>
    setLocation(c ? `/katalog?category=${encodeURIComponent(c)}` : "/katalog");

  const { data: products } = useListProducts(category ? { category } : undefined);
  const { data: prices } = useGetPrices({
    query: { refetchInterval: 60000, queryKey: getGetPricesQueryKey() },
  });

  const categories = ["Zlato", "Stříbro", "Platina", "Palladium"];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-display mb-4">Katalog produktů</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          <button
            onClick={() => setCategory("")}
            className={`px-4 py-2 text-sm uppercase tracking-widest border ${!category ? 'border-gold text-gold' : 'border-bg-3 text-ink-2'} hover:border-gold hover:text-gold transition-colors`}
          >
            Vše
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 text-sm uppercase tracking-widest border ${category === c ? 'border-gold text-gold' : 'border-bg-3 text-ink-2'} hover:border-gold hover:text-gold transition-colors`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            price={prices?.find((p) => p.id === product.id)}
          />
        ))}
      </div>
    </div>
  );
}
