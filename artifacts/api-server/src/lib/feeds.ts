import { XMLParser } from "fast-xml-parser";
import { logger } from "./logger";

export const PRICE_FEED_URL =
  process.env.PRICE_FEED_URL ??
  "https://feeds.mergado.com/meister-shoptet-univerzalni-cz-ecced3c2ba9a75f24b1a62e84323594a.xml";
export const PRODUCT_FEED_URL =
  process.env.PRODUCT_FEED_URL ??
  "https://xaumanager.cz/api/export/meistergold?hash=moje-zlato-secret";
export const SPOT_API_URL =
  process.env.SPOT_API_URL ?? "https://xaumanager.cz/api/public/spot";

export interface FeedItem {
  code: string;
  name: string;
  priceVatCzk: number;
  purchasePriceCzk: number;
  amount: number;
  availability: string;
}

export interface ProductFeedItem {
  id: string;
  name: string;
  image: string | null;
  categoryText: string;
  material: string;
  weightGrams: number;
  fineness: string;
  deliveryDate: number;
}

export interface SpotEntryRaw {
  metal: string;
  pricePerGramCzk: number;
  pricePerOzCzk: number;
}

export interface SpotRaw {
  spots: SpotEntryRaw[];
  eurCzk: number | null;
  ts: string;
}

const CACHE_TTL_MS = 60_000;

/**
 * Parsed price feed indexed two ways so a product can be matched by its code
 * (`product.id === CODE`) first, then by name as a fallback.
 */
export interface PriceFeed {
  byCode: Map<string, FeedItem>;
  byName: Map<string, FeedItem>;
}

let feedCache: { data: PriceFeed; ts: number } | null = null;
let spotCache: { data: SpotRaw; ts: number } | null = null;

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize a product/feed name for fallback matching: strip diacritics,
 * lowercase, and collapse whitespace so "1 oz  Gold Bar" === "1 Oz Gold Bar".
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchPriceFeed(force = false): Promise<PriceFeed> {
  if (!force && feedCache && Date.now() - feedCache.ts < CACHE_TTL_MS) {
    return feedCache.data;
  }

  const res = await fetch(PRICE_FEED_URL);
  if (!res.ok) {
    throw new Error(`Price feed responded ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml) as {
    SHOP?: { SHOPITEM?: unknown };
  };

  const items = asArray(parsed.SHOP?.SHOPITEM) as Array<Record<string, unknown>>;
  const byCode = new Map<string, FeedItem>();
  const byName = new Map<string, FeedItem>();

  for (const raw of items) {
    const code = String(raw["CODE"] ?? "").trim();
    const name = String(raw["NAME"] ?? "").trim();
    if (!code && !name) continue;
    const stock = raw["STOCK"] as { AMOUNT?: unknown } | undefined;
    // The feed quotes the final retail price in whole CZK; use it as-is.
    const item: FeedItem = {
      code,
      name,
      priceVatCzk: toNumber(raw["PRICE_VAT"]),
      purchasePriceCzk: toNumber(raw["PURCHASE_PRICE"]),
      amount: toNumber(stock?.AMOUNT),
      availability: String(raw["AVAILABILITY_IN_STOCK"] ?? "").trim(),
    };
    if (code) byCode.set(code, item);
    if (name) byName.set(normalizeName(name), item);
  }

  const data: PriceFeed = { byCode, byName };
  feedCache = { data, ts: Date.now() };
  logger.info(
    { codes: byCode.size, names: byName.size },
    "Price feed refreshed",
  );
  return data;
}

interface RawParam {
  PARAM_NAME?: unknown;
  VAL?: unknown;
}

function getParam(params: RawParam[], name: string): string {
  const hit = params.find(
    (p) => String(p.PARAM_NAME ?? "").trim().toLowerCase() === name.toLowerCase(),
  );
  return hit ? String(hit.VAL ?? "").trim() : "";
}

export async function fetchProductFeed(): Promise<ProductFeedItem[]> {
  const res = await fetch(PRODUCT_FEED_URL);
  if (!res.ok) {
    throw new Error(`Product feed responded ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml) as {
    SHOP?: { SHOPITEM?: unknown };
  };

  const items = asArray(parsed.SHOP?.SHOPITEM) as Array<Record<string, unknown>>;
  const products: ProductFeedItem[] = [];

  for (const raw of items) {
    const id = String(raw["ITEM_ID"] ?? "").trim();
    if (!id) continue;
    const params = asArray(raw["PARAM"]) as RawParam[];
    const weightStr = getParam(params, "Hmotnost").replace(/[^\d.,]/g, "");
    const weightGrams = Math.round(Number(weightStr.replace(",", ".")) * 1000) / 1000;
    if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
      logger.warn(
        { id, hmotnost: getParam(params, "Hmotnost") },
        "Product feed item has missing or invalid weight",
      );
    }
    const image = asArray(raw["IMGURL"])[0];
    products.push({
      id,
      name: String(raw["PRODUCTNAME"] ?? "").trim(),
      image: image ? String(image).trim() : null,
      categoryText: String(raw["CATEGORYTEXT"] ?? "").trim(),
      material: getParam(params, "Material"),
      weightGrams: Number.isFinite(weightGrams) ? weightGrams : 0,
      fineness: getParam(params, "Ryzost") || "999.9",
      deliveryDate: toNumber(raw["DELIVERY_DATE"]),
    });
  }

  logger.info({ count: products.length }, "Product feed fetched");
  return products;
}

export async function fetchSpot(force = false): Promise<SpotRaw> {
  if (!force && spotCache && Date.now() - spotCache.ts < CACHE_TTL_MS) {
    return spotCache.data;
  }

  const res = await fetch(SPOT_API_URL);
  if (!res.ok) {
    throw new Error(`Spot feed responded ${res.status}`);
  }
  const json = (await res.json()) as {
    spots?: Array<Record<string, unknown>>;
    eur_czk?: number | null;
    ts?: number | string;
  };

  const spots: SpotEntryRaw[] = (json.spots ?? []).map((s) => ({
    metal: String(s["metal"] ?? ""),
    pricePerGramCzk: toNumber(s["price_per_gram_czk"]),
    pricePerOzCzk: toNumber(s["price_per_oz_czk"]),
  }));

  const data: SpotRaw = {
    spots,
    eurCzk: json.eur_czk == null ? null : toNumber(json.eur_czk),
    ts: String(json.ts ?? Date.now()),
  };

  spotCache = { data, ts: Date.now() };
  return data;
}
