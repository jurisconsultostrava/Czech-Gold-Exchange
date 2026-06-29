import { test, mock } from "node:test";
import assert from "node:assert/strict";
import type { Product, Settings, PriceOverride } from "@workspace/db";
import { normalizeName, type FeedItem, type PriceFeed } from "./feeds";
import { computePrice } from "./pricing";
import { logger } from "./logger";
import {
  buildFeedProducts,
  buildHeurekaXml,
  buildGoogleXml,
  DEFAULT_MIN_MATCH_RATIO,
  EmptyFeedError,
  escapeXml,
  evaluateMatchRate,
  getMinMatchRatio,
  getShopUrl,
  matchFeedProducts,
  type FeedProduct,
  type FeedSources,
} from "./exportFeeds";

/**
 * Regression tests for the price-comparison XML feeds. These lock in the
 * mapping rules that previously broke real listings on Heureka/Zboží/Google:
 *  - a ČNB silver coin must export Materiál=Stříbro (it was once mapped to gold),
 *  - the product link must be the routable /detail/:id shape,
 *  - prices must flow through the feed/override pricing pipeline,
 *  - special characters must be XML-escaped so the feed stays valid XML.
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
  const price = computePrice(product, feedItem, SETTINGS, override);
  return { product, price, feedItem };
}

function valueOfParam(xml: string, paramName: string): string | null {
  const re = new RegExp(
    `<PARAM_NAME>${paramName}</PARAM_NAME>\\s*<VAL>([^<]*)</VAL>`,
  );
  const match = xml.match(re);
  return match ? match[1] : null;
}

test("ČNB silver coin exports Materiál=Stříbro (not gold)", () => {
  const product = makeProduct({
    id: "CNB-AG-1",
    name: "Stříbrná mince ČNB",
    category: "mince-cnb",
    subcat: "cnb-stribrne",
  });
  const xml = buildHeurekaXml([makeFeedProduct(product, makeFeedItem())]);
  assert.equal(valueOfParam(xml, "Materiál"), "Stříbro");
});

test("ČNB gold coin exports Materiál=Zlato", () => {
  const product = makeProduct({
    id: "CNB-AU-1",
    name: "Zlatá mince ČNB",
    category: "mince-cnb",
    subcat: "cnb-zlate",
  });
  const xml = buildHeurekaXml([makeFeedProduct(product, makeFeedItem())]);
  assert.equal(valueOfParam(xml, "Materiál"), "Zlato");
});

test("investment silver exports Materiál=Stříbro", () => {
  const product = makeProduct({
    id: "AG-1",
    category: "investicni-stribro",
    subcat: "slitek",
  });
  const xml = buildHeurekaXml([makeFeedProduct(product, makeFeedItem())]);
  assert.equal(valueOfParam(xml, "Materiál"), "Stříbro");
});

test("platinum/palladium map to the correct Materiál", () => {
  const platinum = makeProduct({
    id: "PT-1",
    category: "platina-palladium",
    subcat: "platina",
  });
  const palladium = makeProduct({
    id: "PD-1",
    category: "platina-palladium",
    subcat: "palladium",
  });
  assert.equal(
    valueOfParam(
      buildHeurekaXml([makeFeedProduct(platinum, makeFeedItem())]),
      "Materiál",
    ),
    "Platina",
  );
  assert.equal(
    valueOfParam(
      buildHeurekaXml([makeFeedProduct(palladium, makeFeedItem())]),
      "Materiál",
    ),
    "Palladium",
  );
});

test("product URL is the routable /detail/:id shape (Heureka)", () => {
  const product = makeProduct({ id: "ABC-123" });
  const xml = buildHeurekaXml([makeFeedProduct(product, makeFeedItem())]);
  const expected = `${getShopUrl()}/detail/ABC-123`;
  assert.match(xml, new RegExp(`<URL>${expected}</URL>`));
});

test("product URL is the routable /detail/:id shape (Google g:link)", () => {
  const product = makeProduct({ id: "ABC-123" });
  const xml = buildGoogleXml([makeFeedProduct(product, makeFeedItem())]);
  const expected = `${getShopUrl()}/detail/ABC-123`;
  assert.match(xml, new RegExp(`<g:link>${expected}</g:link>`));
});

test("product URL encodes ids that contain URL-special characters", () => {
  const product = makeProduct({ id: "A B/C" });
  const xml = buildHeurekaXml([makeFeedProduct(product, makeFeedItem())]);
  assert.match(
    xml,
    new RegExp(`<URL>${getShopUrl()}/detail/${encodeURIComponent("A B/C")}</URL>`),
  );
});

test("price comes from the feed/override pipeline", () => {
  const product = makeProduct({ id: "P-9" });
  // No override: the feed price is published as-is.
  const plain = buildHeurekaXml([
    makeFeedProduct(product, makeFeedItem({ priceVatCzk: 51234 })),
  ]);
  assert.match(plain, /<PRICE_VAT>51234<\/PRICE_VAT>/);

  // Active percentage override adjusts the feed price.
  const override: PriceOverride = {
    productId: "P-9",
    marginCzk: null,
    marginPct: 10,
    active: true,
  };
  const withOverride = buildHeurekaXml([
    makeFeedProduct(product, makeFeedItem({ priceVatCzk: 50000 }), override),
  ]);
  assert.match(withOverride, /<PRICE_VAT>55000<\/PRICE_VAT>/);

  // Google feed reflects the same pipeline price.
  const google = buildGoogleXml([
    makeFeedProduct(product, makeFeedItem({ priceVatCzk: 50000 }), override),
  ]);
  assert.match(google, /<g:price>55000 CZK<\/g:price>/);
});

test("inactive override is ignored (feed price wins)", () => {
  const product = makeProduct({ id: "P-10" });
  const override: PriceOverride = {
    productId: "P-10",
    marginCzk: 9999,
    marginPct: null,
    active: false,
  };
  const xml = buildHeurekaXml([
    makeFeedProduct(product, makeFeedItem({ priceVatCzk: 40000 }), override),
  ]);
  assert.match(xml, /<PRICE_VAT>40000<\/PRICE_VAT>/);
});

test("special characters are XML-escaped in the feed output", () => {
  const product = makeProduct({
    id: "X-1",
    name: 'Zlato "AU" <special> & co.',
    manufacturer: "R&D",
    description: "1 < 2 & 3 > 0",
  });
  const xml = buildHeurekaXml([makeFeedProduct(product, makeFeedItem())]);
  // No raw ampersand/angle brackets leak from product fields.
  assert.ok(
    xml.includes("Zlato &quot;AU&quot; &lt;special&gt; &amp; co."),
    "product name must be escaped",
  );
  assert.ok(xml.includes("<MANUFACTURER>R&amp;D</MANUFACTURER>"));
  assert.ok(xml.includes("1 &lt; 2 &amp; 3 &gt; 0"));
  // The only raw '&' in the document should be part of an entity reference.
  for (const amp of xml.split("&").slice(1)) {
    assert.ok(
      /^(amp|lt|gt|quot|apos);/.test(amp),
      `unescaped & found before: ${amp.slice(0, 20)}`,
    );
  }
});

test("escapeXml escapes all five XML metacharacters", () => {
  assert.equal(
    escapeXml(`& < > " '`),
    "&amp; &lt; &gt; &quot; &apos;",
  );
});

/**
 * Tests for the product↔price-feed join (buildFeedProducts / matchFeedProducts).
 * A silent regression here (wrong match key, an unmatched product slipping
 * through, or an empty feed served as 200) could publish a stale or empty feed
 * to Heureka/Zboží/Google without anyone noticing.
 */

function makeFeed(items: FeedItem[]): PriceFeed {
  const byCode = new Map<string, FeedItem>();
  const byName = new Map<string, FeedItem>();
  for (const item of items) {
    if (item.code) byCode.set(item.code, item);
    if (item.name) byName.set(normalizeName(item.name), item);
  }
  return { byCode, byName };
}

function stubSources(over: Partial<FeedSources>): FeedSources {
  return {
    fetchPriceFeed: async () => makeFeed([]),
    getSettings: async () => SETTINGS,
    loadActiveProducts: async () => [],
    loadOverrides: async () => [],
    ...over,
  };
}

test("matchFeedProducts matches by CODE first", () => {
  const product = makeProduct({ id: "CODE-1", name: "Anything" });
  // Same code, but a different name so a name match could not succeed.
  const feed = makeFeed([
    makeFeedItem({ code: "CODE-1", name: "Totally Different", priceVatCzk: 12345 }),
  ]);
  const matched = matchFeedProducts([product], feed, SETTINGS, []);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].feedItem.priceVatCzk, 12345);
});

test("matchFeedProducts falls back to normalized NAME when CODE misses", () => {
  const product = makeProduct({ id: "NO-CODE-MATCH", name: "Zlatý Slitek 1 Oz" });
  // Feed item has a non-matching code but a name that normalizes to the same
  // (diacritics stripped, lowercased, whitespace collapsed).
  const feed = makeFeed([
    makeFeedItem({ code: "OTHER", name: "zlaty  slitek   1 oz", priceVatCzk: 67890 }),
  ]);
  const matched = matchFeedProducts([product], feed, SETTINGS, []);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].feedItem.priceVatCzk, 67890);
});

test("matchFeedProducts drops products with no feed match", () => {
  const matched = makeProduct({ id: "HAS-PRICE", name: "Has Price" });
  const orphan = makeProduct({ id: "NO-PRICE", name: "No Price" });
  const feed = makeFeed([makeFeedItem({ code: "HAS-PRICE", name: "Has Price" })]);
  const result = matchFeedProducts([matched, orphan], feed, SETTINGS, []);
  assert.equal(result.length, 1);
  assert.equal(result[0].product.id, "HAS-PRICE");
});

test("matchFeedProducts applies an active price override on join", () => {
  const product = makeProduct({ id: "OV-1", name: "Override Me" });
  const feed = makeFeed([
    makeFeedItem({ code: "OV-1", name: "Override Me", priceVatCzk: 50000 }),
  ]);
  const override: PriceOverride = {
    productId: "OV-1",
    marginCzk: null,
    marginPct: 10,
    active: true,
  };
  const result = matchFeedProducts([product], feed, SETTINGS, [override]);
  assert.equal(result.length, 1);
  assert.equal(Math.round(result[0].price.sellPriceCzk), 55000);
});

test("buildFeedProducts passes the matched count to the XML builders", async () => {
  const products = [
    makeProduct({ id: "A", name: "A" }),
    makeProduct({ id: "B", name: "B" }),
    makeProduct({ id: "C-unmatched", name: "C" }),
  ];
  const feed = makeFeed([
    makeFeedItem({ code: "A", name: "A" }),
    makeFeedItem({ code: "B", name: "B" }),
  ]);
  const items = await buildFeedProducts(
    stubSources({
      fetchPriceFeed: async () => feed,
      loadActiveProducts: async () => products,
    }),
  );
  assert.equal(items.length, 2);
  // The XML builders receive exactly the matched products — one SHOPITEM each.
  const xml = buildHeurekaXml(items);
  assert.equal(xml.match(/<SHOPITEM>/g)?.length, 2);
});

test("buildFeedProducts throws EmptyFeedError when zero products match", async () => {
  // Active products exist, but none of them appear in the live price feed.
  const sources = stubSources({
    loadActiveProducts: async () => [makeProduct({ id: "X", name: "X" })],
    fetchPriceFeed: async () => makeFeed([]),
  });
  await assert.rejects(buildFeedProducts(sources), EmptyFeedError);
});

test("buildFeedProducts throws EmptyFeedError when there are no active products", async () => {
  await assert.rejects(buildFeedProducts(stubSources({})), EmptyFeedError);
});

test("feed routes serve an error (not an empty document) on EmptyFeedError", async () => {
  // The route handlers wrap buildFeedProducts in try/catch and respond 502.
  // Simulate that contract: an EmptyFeedError must never reach an XML builder.
  let xmlBuilt = false;
  let status = 200;
  try {
    const items = await buildFeedProducts(stubSources({}));
    xmlBuilt = true;
    buildHeurekaXml(items);
  } catch (err) {
    assert.ok(err instanceof EmptyFeedError);
    status = 502;
  }
  assert.equal(xmlBuilt, false, "no XML must be produced for an empty feed");
  assert.equal(status, 502);
});

/**
 * Tests for the degraded-match-rate guard. The EmptyFeedError guard only fires
 * on a *total* miss; a subtler regression (a feed format change that drops half
 * the matches) would still publish a partial feed as a healthy 200, quietly
 * delisting many products. evaluateMatchRate flags that degraded state so
 * buildFeedProducts can warn about it.
 */

test("evaluateMatchRate flags a partial match below the threshold", () => {
  // 4 of 10 active products matched (40%) is below the 50% default.
  const rate = evaluateMatchRate(10, 4, 0.5);
  assert.equal(rate.degraded, true);
  assert.equal(rate.ratio, 0.4);
  assert.equal(rate.activeCount, 10);
  assert.equal(rate.matchedCount, 4);
  assert.equal(rate.threshold, 0.5);
});

test("evaluateMatchRate does not flag a healthy match rate", () => {
  assert.equal(evaluateMatchRate(10, 9, 0.5).degraded, false);
  // Exactly at the threshold is acceptable (not below it).
  assert.equal(evaluateMatchRate(10, 5, 0.5).degraded, false);
});

test("evaluateMatchRate never flags a total miss or an empty catalog", () => {
  // Zero matches is EmptyFeedError's job, not a degraded warning.
  assert.equal(evaluateMatchRate(10, 0, 0.5).degraded, false);
  // No active products is not a feed regression.
  assert.equal(evaluateMatchRate(0, 0, 0.5).degraded, false);
});

test("getMinMatchRatio defaults and honors a valid FEED_MIN_MATCH_RATIO", () => {
  const original = process.env.FEED_MIN_MATCH_RATIO;
  try {
    delete process.env.FEED_MIN_MATCH_RATIO;
    assert.equal(getMinMatchRatio(), DEFAULT_MIN_MATCH_RATIO);

    process.env.FEED_MIN_MATCH_RATIO = "0.8";
    assert.equal(getMinMatchRatio(), 0.8);

    // Disabling the guard is allowed.
    process.env.FEED_MIN_MATCH_RATIO = "0";
    assert.equal(getMinMatchRatio(), 0);

    // Invalid / out-of-range values fall back to the default.
    process.env.FEED_MIN_MATCH_RATIO = "nope";
    assert.equal(getMinMatchRatio(), DEFAULT_MIN_MATCH_RATIO);
    process.env.FEED_MIN_MATCH_RATIO = "1.5";
    assert.equal(getMinMatchRatio(), DEFAULT_MIN_MATCH_RATIO);
  } finally {
    if (original === undefined) delete process.env.FEED_MIN_MATCH_RATIO;
    else process.env.FEED_MIN_MATCH_RATIO = original;
  }
});

test("buildFeedProducts warns when the matched ratio falls below the threshold", async () => {
  // 1 of 4 active products matches (25%) — a degraded feed that still serves.
  const products = [
    makeProduct({ id: "A", name: "A" }),
    makeProduct({ id: "B-miss", name: "B" }),
    makeProduct({ id: "C-miss", name: "C" }),
    makeProduct({ id: "D-miss", name: "D" }),
  ];
  const feed = makeFeed([makeFeedItem({ code: "A", name: "A" })]);
  const warn = mock.method(logger, "warn", () => {});
  try {
    const items = await buildFeedProducts(
      stubSources({
        fetchPriceFeed: async () => feed,
        loadActiveProducts: async () => products,
      }),
    );
    // The feed is still served (partial), not thrown away.
    assert.equal(items.length, 1);
    assert.equal(warn.mock.callCount(), 1);
    const [meta] = warn.mock.calls[0].arguments as [Record<string, number>];
    assert.equal(meta.activeCount, 4);
    assert.equal(meta.matchedCount, 1);
    assert.equal(meta.ratio, 0.25);
  } finally {
    warn.mock.restore();
  }
});

test("buildFeedProducts does not warn when the matched ratio is healthy", async () => {
  const products = [
    makeProduct({ id: "A", name: "A" }),
    makeProduct({ id: "B", name: "B" }),
    makeProduct({ id: "C-miss", name: "C" }),
  ];
  const feed = makeFeed([
    makeFeedItem({ code: "A", name: "A" }),
    makeFeedItem({ code: "B", name: "B" }),
  ]);
  const warn = mock.method(logger, "warn", () => {});
  try {
    const items = await buildFeedProducts(
      stubSources({
        fetchPriceFeed: async () => feed,
        loadActiveProducts: async () => products,
      }),
    );
    assert.equal(items.length, 2);
    assert.equal(warn.mock.callCount(), 0);
  } finally {
    warn.mock.restore();
  }
});
