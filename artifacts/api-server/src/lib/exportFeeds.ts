import { eq } from "drizzle-orm";
import {
  db,
  productsTable,
  priceOverridesTable,
  type Product,
} from "@workspace/db";
import { fetchPriceFeed, normalizeName, type FeedItem } from "./feeds";
import { computePrice, type ComputedPrice } from "./pricing";
import { getSettings } from "./settings";

export function getShopUrl(): string {
  return (process.env.SHOP_URL ?? "https://swissgold.cz").replace(/\/+$/, "");
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface FeedProduct {
  product: Product;
  price: ComputedPrice;
  feedItem: FeedItem;
}

/**
 * Load active products, match each to the live price feed (by code, then name),
 * and compute its published price. Products without a feed match are skipped so
 * the exported feed never advertises a product with no price.
 */
export async function buildFeedProducts(): Promise<FeedProduct[]> {
  const [feed, settings, products, overrides] = await Promise.all([
    fetchPriceFeed(),
    getSettings(),
    db.select().from(productsTable).where(eq(productsTable.active, true)),
    db.select().from(priceOverridesTable),
  ]);
  const overrideMap = new Map(overrides.map((o) => [o.productId, o]));

  return products
    .map((product) => {
      const feedItem =
        feed.byCode.get(product.id) ??
        feed.byName.get(normalizeName(product.name));
      if (!feedItem) return null;
      const price = computePrice(
        product,
        feedItem,
        settings,
        overrideMap.get(product.id),
      );
      return { product, price, feedItem };
    })
    .filter((p): p is FeedProduct => p !== null);
}

function metalFor(product: Product): string {
  switch (product.category) {
    case "investicni-zlato":
      return "Zlato";
    case "investicni-stribro":
      return "Stříbro";
    case "platina-palladium":
      return product.subcat === "palladium" ? "Palladium" : "Platina";
    case "mince-cnb":
      return product.subcat === "cnb-stribrne" ? "Stříbro" : "Zlato";
    default:
      return "Zlato";
  }
}

/** Heureka category path, pipe-separated (also used by Zboží.cz). */
function categoryPath(product: Product): string {
  const isCoin = product.subcat === "mince";
  switch (product.category) {
    case "investicni-zlato":
      return `Investiční kovy | Zlato | ${isCoin ? "Zlaté mince" : "Zlaté slitky"}`;
    case "investicni-stribro":
      return `Investiční kovy | Stříbro | ${isCoin ? "Stříbrné mince" : "Stříbrné slitky"}`;
    case "platina-palladium":
      return `Investiční kovy | ${product.subcat === "palladium" ? "Palladium" : "Platina"}`;
    case "mince-cnb":
      return "Investiční kovy | Mince ČNB";
    default:
      return "Investiční kovy";
  }
}

function weightLabel(weightGrams: number): string {
  if (weightGrams >= 1000) {
    const kg = weightGrams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(3).replace(/0+$/, "")} kg`;
  }
  if (weightGrams >= 31 && weightGrams <= 32) {
    return `${(weightGrams / 31.1).toFixed(0)} oz`;
  }
  return `${weightGrams} g`;
}

/** A product is offerable if it's in stock locally or available from DE/CH. */
function isAvailable(price: ComputedPrice): boolean {
  return price.inStock || price.availability.toLowerCase().includes("skladem");
}

function productUrl(productId: string): string {
  return `${getShopUrl()}/detail/${encodeURIComponent(productId)}`;
}

function description(product: Product): string {
  return (
    product.description ??
    `${product.name}. Investiční kov osvobozený od DPH.`
  );
}

/**
 * Heureka.cz / Zboží.cz XML feed (identical SHOPITEM format for both).
 */
export function buildHeurekaXml(items: FeedProduct[]): string {
  const body = items
    .map(({ product, price }) => {
      const deliveryDate = price.inStock ? "0" : isAvailable(price) ? "7" : "-1";
      const lines = [
        "  <SHOPITEM>",
        `    <ITEM_ID>${escapeXml(product.id)}</ITEM_ID>`,
        `    <PRODUCTNAME>${escapeXml(product.name)}</PRODUCTNAME>`,
        `    <PRODUCT>${escapeXml(product.name)}</PRODUCT>`,
        `    <DESCRIPTION>${escapeXml(description(product))}</DESCRIPTION>`,
        `    <URL>${escapeXml(productUrl(product.id))}</URL>`,
        `    <IMGURL>${escapeXml(product.image ?? "")}</IMGURL>`,
        `    <PRICE_VAT>${Math.round(price.sellPriceCzk)}</PRICE_VAT>`,
        "    <VAT>0</VAT>",
      ];
      if (product.manufacturer) {
        lines.push(
          `    <MANUFACTURER>${escapeXml(product.manufacturer)}</MANUFACTURER>`,
        );
      }
      lines.push(
        `    <CATEGORYTEXT>${escapeXml(categoryPath(product))}</CATEGORYTEXT>`,
        `    <DELIVERY_DATE>${deliveryDate}</DELIVERY_DATE>`,
        "    <PARAM>",
        "      <PARAM_NAME>Hmotnost</PARAM_NAME>",
        `      <VAL>${escapeXml(weightLabel(product.weightGrams))}</VAL>`,
        "    </PARAM>",
        "    <PARAM>",
        "      <PARAM_NAME>Ryzost</PARAM_NAME>",
        `      <VAL>${escapeXml(product.fineness)}</VAL>`,
        "    </PARAM>",
        "    <PARAM>",
        "      <PARAM_NAME>Materiál</PARAM_NAME>",
        `      <VAL>${escapeXml(metalFor(product))}</VAL>`,
        "    </PARAM>",
      );
      if (product.year) {
        lines.push(
          "    <PARAM>",
          "      <PARAM_NAME>Rok</PARAM_NAME>",
          `      <VAL>${product.year}</VAL>`,
          "    </PARAM>",
        );
      }
      lines.push("  </SHOPITEM>");
      return lines.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>\n<SHOP>\n${body}\n</SHOP>\n`;
}

/**
 * Google Shopping RSS 2.0 feed.
 */
export function buildGoogleXml(items: FeedProduct[]): string {
  const shopUrl = getShopUrl();
  const body = items
    .map(({ product, price }) => {
      const availability = isAvailable(price) ? "in stock" : "out of stock";
      const productType = categoryPath(product).replace(/\s*\|\s*/g, " &gt; ");
      const lines = [
        "    <item>",
        `      <g:id>${escapeXml(product.id)}</g:id>`,
        `      <g:title>${escapeXml(product.name)}</g:title>`,
        `      <g:description>${escapeXml(description(product))}</g:description>`,
        `      <g:link>${escapeXml(productUrl(product.id))}</g:link>`,
        `      <g:image_link>${escapeXml(product.image ?? "")}</g:image_link>`,
        `      <g:price>${Math.round(price.sellPriceCzk)} CZK</g:price>`,
        `      <g:availability>${availability}</g:availability>`,
        "      <g:condition>new</g:condition>",
      ];
      if (product.manufacturer) {
        lines.push(`      <g:brand>${escapeXml(product.manufacturer)}</g:brand>`);
      }
      lines.push(
        `      <g:product_type>${productType}</g:product_type>`,
        "      <g:tax>",
        "        <g:country>CZ</g:country>",
        "        <g:rate>0</g:rate>",
        "        <g:tax_ship>no</g:tax_ship>",
        "      </g:tax>",
        "    </item>",
      );
      return lines.join("\n");
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>SwissGold.cz</title>\n` +
    `    <link>${escapeXml(shopUrl)}</link>\n` +
    `    <description>Investiční drahé kovy</description>\n` +
    `${body}\n` +
    `  </channel>\n` +
    `</rss>\n`
  );
}
