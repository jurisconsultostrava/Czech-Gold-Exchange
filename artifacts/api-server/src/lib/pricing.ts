import type { FeedItem } from "./feeds";
import type { Product, Settings, PriceOverride } from "@workspace/db";

export interface ComputedPrice {
  id: string;
  basePriceCzk: number;
  purchasePriceCzk: number;
  sellPriceCzk: number;
  sellPriceEur: number;
  purchaseDisplayCzk: number;
  inStock: boolean;
  availability: string;
}

function categoryMargin(category: string, settings: Settings): number {
  switch (category) {
    case "investicni-zlato":
      return settings.marginInvestZlato;
    case "investicni-stribro":
      return settings.marginInvestStribro;
    case "platina-palladium":
      return settings.marginPlatinaPalladium;
    case "mince-cnb":
      return settings.marginMinceCnb;
    default:
      return settings.globalMarginCzk;
  }
}

function mapAvailability(item: FeedItem): string {
  if (item.amount > 0) return "Skladem ČR";
  if (item.availability && item.availability.toLowerCase().includes("skladem"))
    return "Skladem DE/CH";
  if (item.availability) return item.availability;
  return "Nedostupné";
}

export function computePrice(
  product: Product,
  item: FeedItem,
  settings: Settings,
  override: PriceOverride | undefined,
): ComputedPrice {
  const basePriceCzk = item.priceVatHaler / 100;
  const purchasePriceCzk = item.purchasePriceHaler / 100;

  let sellPriceCzk: number;
  if (override && override.active) {
    if (override.marginPct != null) {
      sellPriceCzk = basePriceCzk * (1 + override.marginPct / 100);
    } else if (override.marginCzk != null) {
      sellPriceCzk = basePriceCzk + override.marginCzk;
    } else {
      sellPriceCzk = basePriceCzk + categoryMargin(product.category, settings);
    }
  } else {
    sellPriceCzk = basePriceCzk + categoryMargin(product.category, settings);
  }

  sellPriceCzk = Math.round(sellPriceCzk);
  const purchaseDisplayCzk = Math.round(
    purchasePriceCzk * (1 - settings.buybackSpreadPct / 100),
  );
  const sellPriceEur =
    settings.eurToCzk > 0
      ? Math.round((sellPriceCzk / settings.eurToCzk) * 100) / 100
      : 0;

  return {
    id: product.id,
    basePriceCzk,
    purchasePriceCzk,
    sellPriceCzk,
    sellPriceEur,
    purchaseDisplayCzk,
    inStock: item.amount > 0,
    availability: mapAvailability(item),
  };
}
