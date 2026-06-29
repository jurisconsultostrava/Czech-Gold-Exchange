import { useSearch, useLocation } from "wouter";
import {
  useListProducts,
  useGetPrices,
  getGetPricesQueryKey,
} from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import catalogHero from "../assets/catalog-hero-mountains.png";

interface CategoryTab {
  label: string;
  /** URL-friendly slug used in `?category=` (empty for "Vše"). */
  slug: string;
  category: string | null;
  subcat: string | null;
}

const CATEGORY_TABS: CategoryTab[] = [
  { label: "Vše", slug: "", category: null, subcat: null },
  { label: "Zlato", slug: "Zlato", category: "investicni-zlato", subcat: null },
  {
    label: "Stříbro",
    slug: "Stribro",
    category: "investicni-stribro",
    subcat: null,
  },
  {
    label: "Platina",
    slug: "Platina",
    category: "platina-palladium",
    subcat: "platina",
  },
  {
    label: "Palladium",
    slug: "Palladium",
    category: "platina-palladium",
    subcat: "palladium",
  },
];

export default function Katalog() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const slug = new URLSearchParams(search).get("category") || "";

  const activeTab =
    CATEGORY_TABS.find((t) => t.slug === slug) ?? CATEGORY_TABS[0];

  const setTab = (tab: CategoryTab) =>
    setLocation(
      tab.slug ? `/katalog?category=${encodeURIComponent(tab.slug)}` : "/katalog",
    );

  const params =
    activeTab.category === null
      ? undefined
      : {
          category: activeTab.category,
          ...(activeTab.subcat ? { subcat: activeTab.subcat } : {}),
        };

  const { data: products } = useListProducts(params);
  const { data: prices } = useGetPrices({
    query: { refetchInterval: 60000, queryKey: getGetPricesQueryKey() },
  });

  return (
    <div>
      <section className="relative border-b border-bg-3 overflow-hidden min-h-[42vh] flex items-center">
        <img
          src={catalogHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-bg-0/30 via-bg-0/30 to-bg-0" />
        <div className="relative z-[2] container mx-auto px-4 py-16 w-full">
          <h1 className="text-4xl md:text-5xl font-display mb-4 max-w-3xl">
            ZLATO, KTERÉMU SVĚT VĚŘÍ 733 LET
          </h1>
          <p className="text-ink-2 max-w-2xl mb-8 leading-relaxed">
            Od roku 1291 je švýcarské zlato synonymem pro důvěru, stabilitu a
            zachování hodnoty. Přinášíme Vám tuto tradici přímo, s certifikací
            LBMA Good Delivery, zárukou globální likvidity a transparentního
            původu bez kompromisů.
          </p>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {CATEGORY_TABS.map((tab) => {
              const isActive = tab.slug === activeTab.slug;
              return (
                <button
                  key={tab.label}
                  onClick={() => setTab(tab)}
                  className={`px-4 py-2 text-sm uppercase tracking-widest border whitespace-nowrap ${
                    isActive
                      ? "border-gold text-gold"
                      : "border-bg-3 text-ink-2"
                  } hover:border-gold hover:text-gold transition-colors`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
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
    </div>
  );
}
