import { XMLParser } from "fast-xml-parser";
import { logger } from "./logger";

export const PRICE_FEED_URL =
  process.env.PRICE_FEED_URL ??
  "https://xaumanager.cz/api/export/xml?hash=moje-zlato-secret";
export const SPOT_API_URL =
  process.env.SPOT_API_URL ?? "https://xaumanager.cz/api/public/spot";

export interface FeedItem {
  code: string;
  name: string;
  priceVatHaler: number;
  purchasePriceHaler: number;
  amount: number;
  availability: string;
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

let feedCache: { data: Map<string, FeedItem>; ts: number } | null = null;
let spotCache: { data: SpotRaw; ts: number } | null = null;

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchPriceFeed(
  force = false,
): Promise<Map<string, FeedItem>> {
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
  const map = new Map<string, FeedItem>();

  for (const raw of items) {
    const code = String(raw["CODE"] ?? "").trim();
    if (!code) continue;
    const stock = raw["STOCK"] as { AMOUNT?: unknown } | undefined;
    map.set(code, {
      code,
      name: String(raw["NAME"] ?? "").trim(),
      priceVatHaler: toNumber(raw["PRICE_VAT"]),
      purchasePriceHaler: toNumber(raw["PURCHASE_PRICE"]),
      amount: toNumber(stock?.AMOUNT),
      availability: String(raw["AVAILABILITY_IN_STOCK"] ?? "").trim(),
    });
  }

  feedCache = { data: map, ts: Date.now() };
  logger.info({ count: map.size }, "Price feed refreshed");
  return map;
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
