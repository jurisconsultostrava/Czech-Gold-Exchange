import { useListFeaturedProducts, useGetPrices, getGetPricesQueryKey, useGetContent } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroBg from "@/assets/hero-bg.png";

export default function Home() {
  const { data: featured } = useListFeaturedProducts();
  const { data: prices } = useGetPrices({
    query: { refetchInterval: 60000, queryKey: getGetPricesQueryKey() },
  });
  const { data: content } = useGetContent();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center border-b border-bg-3 overflow-hidden">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-right z-0"
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-bg-0 via-bg-0/90 to-bg-0/30" />
        <div className="container mx-auto px-4 z-10">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Specialisté na investování do zlata</p>
            <h1 className="mb-6 font-display text-ink-1">
              Investiční zlato <br />
              <span className="text-gold">a vzácné kovy</span>
            </h1>
            <p className="text-lg text-ink-2 max-w-xl mb-10">
              {content?.["home_hero_subtitle"] || "Diskrétní a bezpečný nákup slitků a mincí s garancí zpětného výkupu."}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/katalog">
                <Button className="bg-gold text-bg-0 hover:bg-gold-2 px-8 h-12 text-base">
                  Naše nabídka
                </Button>
              </Link>
              <Link href="/vykup">
                <Button variant="outline" className="border-gold text-gold hover:bg-gold/10 px-8 h-12 text-base">
                  Výkup zlata
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-bg-1">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="eyebrow mb-2">Vybrané produkty</p>
              <h2 className="text-3xl font-display text-ink-1">Doporučujeme k investici</h2>
            </div>
            <Link href="/katalog" className="text-sm font-medium text-gold hover:text-gold-2 uppercase tracking-widest hidden sm:block">
              Celá nabídka &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featured?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                price={prices?.find((p) => p.id === product.id)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
