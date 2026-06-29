import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { Product, Settings, PriceOverride } from "@workspace/db";
import type { FeedItem } from "../lib/feeds";
import { computePrice } from "../lib/pricing";
import type { FeedProduct } from "../lib/exportFeeds";

/**
 * End-to-end integration test for the live price-comparison feed endpoints.
 * Unlike the unit tests (which call the XML builders directly), this boots the
 * real Express app and makes real HTTP requests, so it exercises the actual
 * routing, response headers, and full-document serialization that portals see.
 *
 * The only thing stubbed out is `buildFeedProducts` — the function that pulls
 * products from the database and the live price feed over the network. Stubbing
 * just that one function keeps the test deterministic and offline while still
 * running the genuine route handlers, the real XML builders, and the real
 * Content-Type / Cache-Control headers.
 */

const SETTINGS: Settings = {
  id: 1,
  eurToCzk: 25,
  globalMarginCzk: 300,
  marginInvestZlato: 300,
  marginInvestStribro: 200,
  marginPlatinaPalladium: 400,
  marginMinceCnb: 500,
  buybackSpreadPct: 0,
  deferredDiscountPct: 9,
  bulkTier1Qty: 2,
  bulkTier1DiscountPct: 0.05,
  bulkTier2Qty: 5,
  bulkTier2DiscountPct: 0.1,
  bulkTier3Qty: 10,
  bulkTier3DiscountPct: 0.2,
};

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "P-1",
    name: "Test Product",
    manufacturer: null,
    weightGrams: 31.1,
    fineness: "999.9",
    category: "investicni-zlato",
    subcat: "slitek",
    year: null,
    featured: false,
    active: true,
    image: null,
    description: null,
    sortOrder: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

function makeFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    code: "P-1",
    name: "Test Product",
    priceVatCzk: 50000,
    purchasePriceCzk: 48000,
    amount: 5,
    availability: "Skladem",
    ...overrides,
  };
}

function makeFeedProduct(
  product: Product,
  feedItem: FeedItem,
  override?: PriceOverride,
): FeedProduct {
  return {
    product,
    price: computePrice(product, feedItem, SETTINGS, override),
    feedItem,
  };
}

// A representative spread: gold bar, a ČNB silver coin (with manufacturer +
// year + special chars to exercise escaping), and an out-of-stock platinum bar.
const FIXTURE: FeedProduct[] = [
  makeFeedProduct(
    makeProduct({
      id: "AU-BAR-1",
      name: "Zlatý slitek 1 oz",
      manufacturer: "Argor-Heraeus",
      image: "https://swissgold.cz/img/au-bar-1.jpg",
      description: 'Slitek "1 oz" <ryzí> & investiční',
    }),
    makeFeedItem({ code: "AU-BAR-1", priceVatCzk: 51234, amount: 3 }),
  ),
  makeFeedProduct(
    makeProduct({
      id: "CNB-AG-1",
      name: "Stříbrná mince ČNB",
      category: "mince-cnb",
      subcat: "cnb-stribrne",
      weightGrams: 31.1,
      fineness: "999",
      manufacturer: "ČNB",
      year: 2024,
    }),
    makeFeedItem({ code: "CNB-AG-1", priceVatCzk: 2500, amount: 10 }),
  ),
  makeFeedProduct(
    makeProduct({
      id: "PT-BAR-1",
      name: "Platinový slitek 50 g",
      category: "platina-palladium",
      subcat: "platina",
      weightGrams: 50,
      fineness: "999.5",
    }),
    makeFeedItem({
      code: "PT-BAR-1",
      priceVatCzk: 45000,
      amount: 0,
      availability: "Není skladem",
    }),
  ),
];

let server: Server;
let baseUrl: string;

before(async () => {
  // Replace the DB + network-backed loader with a deterministic fixture while
  // keeping every other export (the real XML builders) intact.
  const real = await import("../lib/exportFeeds");
  mock.module("../lib/exportFeeds", {
    namedExports: {
      ...real,
      buildFeedProducts: async () => FIXTURE,
    },
  });

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  mock.reset();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

async function getFeed(path: string): Promise<{
  status: number;
  contentType: string | null;
  cacheControl: string | null;
  body: string;
}> {
  const res = await fetch(`${baseUrl}${path}`);
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    cacheControl: res.headers.get("cache-control"),
    body: await res.text(),
  };
}

function assertWellFormedXml(body: string): void {
  const result = XMLValidator.validate(body);
  assert.equal(
    result,
    true,
    `expected well-formed XML, got: ${JSON.stringify(result)}`,
  );
}

test("GET /api/feed/heureka returns valid SHOPITEM XML with correct headers", async () => {
  const { status, contentType, cacheControl, body } =
    await getFeed("/api/feed/heureka");

  assert.equal(status, 200);
  assert.match(contentType ?? "", /application\/xml/);
  assert.match(contentType ?? "", /charset=utf-8/);
  assert.match(cacheControl ?? "", /max-age=3600/);
  assertWellFormedXml(body);

  const parsed = new XMLParser().parse(body);
  assert.ok(parsed.SHOP, "root element must be <SHOP>");
  const items = Array.isArray(parsed.SHOP.SHOPITEM)
    ? parsed.SHOP.SHOPITEM
    : [parsed.SHOP.SHOPITEM];
  assert.equal(items.length, FIXTURE.length);
  assert.deepEqual(
    items.map((i: { ITEM_ID: string }) => String(i.ITEM_ID)).sort(),
    ["AU-BAR-1", "CNB-AG-1", "PT-BAR-1"],
  );
});

test("GET /api/feed/zbozi returns the identical SHOPITEM structure as Heureka", async () => {
  const heureka = await getFeed("/api/feed/heureka");
  const zbozi = await getFeed("/api/feed/zbozi");

  assert.equal(zbozi.status, 200);
  assert.match(zbozi.contentType ?? "", /application\/xml/);
  assert.match(zbozi.cacheControl ?? "", /max-age=3600/);
  assertWellFormedXml(zbozi.body);

  // Zboží.cz uses the exact same SHOPITEM format as Heureka.
  assert.equal(zbozi.body, heureka.body);
});

test("GET /api/feed/google returns valid RSS with the g: namespace", async () => {
  const { status, contentType, cacheControl, body } =
    await getFeed("/api/feed/google");

  assert.equal(status, 200);
  assert.match(contentType ?? "", /application\/xml/);
  assert.match(cacheControl ?? "", /max-age=3600/);
  assertWellFormedXml(body);

  // Namespace declaration must be present for Google Shopping.
  assert.match(body, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);

  const parsed = new XMLParser({ ignoreAttributes: false }).parse(body);
  assert.ok(parsed.rss, "root element must be <rss>");
  assert.equal(parsed.rss["@_version"], "2.0");
  const channel = parsed.rss.channel;
  assert.ok(channel, "<rss> must contain a <channel>");
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  assert.equal(items.length, FIXTURE.length);
  // g:-prefixed elements survive parsing (namespace prefix retained).
  for (const item of items) {
    assert.ok("g:id" in item, "each <item> must carry a <g:id>");
    assert.ok("g:price" in item, "each <item> must carry a <g:price>");
    assert.match(String(item["g:price"]), /CZK$/);
  }
});

test("special characters in product data stay XML-escaped over HTTP", async () => {
  const { body } = await getFeed("/api/feed/heureka");
  // The fixture deliberately contains &, <, > and quotes; the served document
  // must still validate and must not leak a raw, non-entity ampersand.
  assertWellFormedXml(body);
  for (const amp of body.split("&").slice(1)) {
    assert.ok(
      /^(amp|lt|gt|quot|apos);/.test(amp),
      `unescaped & found before: ${amp.slice(0, 20)}`,
    );
  }
});
