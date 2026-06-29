import { test } from "node:test";
import assert from "node:assert/strict";
import type { Product, Settings, PriceOverride } from "@workspace/db";
import type { FeedItem } from "./feeds";
import { computePrice } from "./pricing";
import {
  buildHeurekaXml,
  buildGoogleXml,
  escapeXml,
  getShopUrl,
  type FeedProduct,
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
