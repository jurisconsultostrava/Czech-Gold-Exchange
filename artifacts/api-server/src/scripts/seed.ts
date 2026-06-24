import {
  db,
  productsTable,
  contentBlocksTable,
  settingsTable,
} from "@workspace/db";
import type { InsertProduct } from "@workspace/db";
import { fetchPriceFeed } from "../lib/feeds";

const OZ_GRAMS = 31.1035;

function detectMetal(name: string): {
  metal: "gold" | "silver" | "platinum" | "palladium";
  category: string;
} {
  const n = name.toLowerCase();
  if (n.includes("palladium"))
    return { metal: "palladium", category: "platina-palladium" };
  if (n.includes("platinum"))
    return { metal: "platinum", category: "platina-palladium" };
  if (n.includes("silver"))
    return { metal: "silver", category: "investicni-stribro" };
  return { metal: "gold", category: "investicni-zlato" };
}

function detectKind(name: string): { subcat: string; kindCz: string } {
  const n = name.toLowerCase();
  if (n.includes("combibar") || n.includes("combicoin"))
    return { subcat: "slitky", kindCz: "Slitek" };
  if (n.includes("bar")) return { subcat: "slitky", kindCz: "Slitek" };
  if (n.includes("round")) return { subcat: "mince", kindCz: "Medaile" };
  if (n.includes("coin")) return { subcat: "mince", kindCz: "Mince" };
  return { subcat: "ostatni", kindCz: "Produkt" };
}

function detectWeightGrams(name: string): number {
  const combi = name.match(/(\d+)\s*x\s*([\d/.]+)\s*(g|oz)/i);
  if (combi) {
    const count = Number(combi[1]);
    const unitVal = parseFraction(combi[2]);
    const grams = combi[3].toLowerCase() === "oz" ? unitVal * OZ_GRAMS : unitVal;
    return round3(count * grams);
  }
  const kilo = name.match(/(\d+(?:[.,]\d+)?)\s*kilo/i);
  if (kilo) return round3(Number(kilo[1].replace(",", ".")) * 1000);
  const oz = name.match(/([\d/]+)\s*oz/i);
  if (oz) return round3(parseFraction(oz[1]) * OZ_GRAMS);
  const grams = name.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  if (grams) return round3(Number(grams[1].replace(",", ".")));
  return 0;
}

function parseFraction(s: string): number {
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : 0;
  }
  return Number(s.replace(",", "."));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const KNOWN_MAKERS = [
  "Argor-Heraeus",
  "Argor Heraeus",
  "Valcambi",
  "PAMP",
  "Perth Mint",
  "Royal Mint",
  "Umicore",
  "Metalor",
  "Heraeus",
  "Rand Refinery",
  "Nadir Metal Rafineri",
  "Royal Australia Mint",
  "Royal Canadian Mint",
];

function detectManufacturer(name: string): string | null {
  const parts = name.split("|").map((p) => p.trim());
  for (const part of parts.slice(1)) {
    const maker = KNOWN_MAKERS.find((m) =>
      part.toLowerCase().includes(m.toLowerCase()),
    );
    if (maker) return maker;
  }
  const inline = KNOWN_MAKERS.find((m) =>
    name.toLowerCase().includes(m.toLowerCase()),
  );
  return inline ?? null;
}

function detectYear(name: string): number | null {
  const m = name.match(/\b(19\d{2}|20\d{2})\b/);
  if (m) {
    const y = Number(m[1]);
    if (y >= 1960 && y <= 2030) return y;
  }
  return null;
}

const METAL_CZ: Record<string, string> = {
  gold: "Zlatý",
  silver: "Stříbrný",
  platinum: "Platinový",
  palladium: "Palladiový",
};

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${round3(grams / 1000)} kg`;
  return `${grams} g`;
}

function buildCzechName(
  englishName: string,
  metal: string,
  kindCz: string,
  grams: number,
): string {
  const cleaned = englishName
    .replace(/\s*\|\s*/g, " ")
    .replace(/Gold|Silver|Platinum|Palladium/gi, "")
    .replace(/\s+Bar\b/gi, "")
    .replace(/\s+Coin\b/gi, "")
    .replace(/Kilo/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const adj = METAL_CZ[metal] ?? "";
  const w = formatWeight(grams);
  const tail = cleaned.replace(/^[\d/.,x\s]+(oz|g)?\b/i, "").trim();
  const base = `${kindCz} ${adj.toLowerCase()} ${w}`.replace(/\s+/g, " ").trim();
  return tail ? `${base} – ${tail}` : base;
}

function fineness(metal: string): string {
  switch (metal) {
    case "gold":
      return "999.9";
    case "silver":
      return "999";
    case "platinum":
    case "palladium":
      return "999.5";
    default:
      return "999.9";
  }
}

const CONTENT_DEFAULTS: Record<string, string> = {
  hero_headline: "Investiční drahé kovy s jistotou",
  hero_subtitle:
    "Zlaté a stříbrné slitky a mince certifikované LBMA. Garantovaný výkup, férové ceny odvozené od spotu.",
  pillar_1_title: "Certifikováno LBMA",
  pillar_1_text:
    "Veškeré slitky pocházejí od rafinerií akreditovaných London Bullion Market Association.",
  pillar_2_title: "Garantovaný výkup",
  pillar_2_text:
    "Vaše investice u nás kdykoliv vykoupíme zpět za aktuální tržní cenu.",
  pillar_3_title: "Osvobozeno od DPH",
  pillar_3_text:
    "Investiční zlato je dle zákona osvobozeno od daně z přidané hodnoty.",
  story_headline: "Tradice a důvěra od roku 2009",
  story_text_1:
    "SwissGold je rodinná společnost specializující se na obchod s investičními drahými kovy.",
  story_text_2:
    "Spolupracujeme s nejvýznamnějšími světovými rafineriemi a mincovnami.",
  fact_1_number: "15+",
  fact_1_label: "let na trhu",
  fact_2_number: "20 000+",
  fact_2_label: "spokojených klientů",
  fact_3_number: "215",
  fact_3_label: "produktů skladem",
  fact_4_number: "100 %",
  fact_4_label: "certifikováno LBMA",
  about_pricing_title: "Jak tvoříme ceny",
  about_pricing_text:
    "Ceny odvozujeme od aktuálního spotu na světových trzích a transparentní přirážky.",
  about_lbma_title: "Certifikace LBMA",
  about_lbma_text:
    "London Bullion Market Association je celosvětovým standardem kvality pro drahé kovy.",
  buyback_headline: "Vykupujeme vaše drahé kovy",
  buyback_subtitle:
    "Spočítejte si orientační výkupní cenu a odešlete nezávaznou žádost.",
  footer_legal:
    "SWISS GOLD s.r.o., IČO 12345678, Praha. Investiční zlato je osvobozeno od DPH.",
  footer_copyright: "© 2026 SwissGold.cz — Všechna práva vyhrazena.",
};

async function seed(): Promise<void> {
  const feed = await fetchPriceFeed(true);
  const entries = [...feed.values()];
  console.log(`Fetched ${entries.length} feed items`);

  const featuredCount = Math.min(6, entries.length);
  const featuredIdx = new Set<number>();
  while (featuredIdx.size < featuredCount) {
    featuredIdx.add(Math.floor(Math.random() * entries.length));
  }

  const products: InsertProduct[] = entries.map((item, i) => {
    const { metal, category } = detectMetal(item.name);
    const { subcat, kindCz } = detectKind(item.name);
    const grams = detectWeightGrams(item.name);
    const manufacturer = detectManufacturer(item.name);
    const year = detectYear(item.name);
    const name = buildCzechName(item.name, metal, kindCz, grams);
    return {
      id: item.code,
      name,
      manufacturer,
      weightGrams: grams,
      fineness: fineness(metal),
      category,
      subcat,
      year,
      featured: featuredIdx.has(i),
      active: true,
      image: `https://goldspot.cz/obrazky/${item.code}/1.webp`,
      description: `${name}. Originál: ${item.name}.`,
      sortOrder: i,
    };
  });

  for (const p of products) {
    await db
      .insert(productsTable)
      .values(p)
      .onConflictDoUpdate({
        target: productsTable.id,
        set: {
          name: p.name,
          manufacturer: p.manufacturer,
          weightGrams: p.weightGrams,
          fineness: p.fineness,
          category: p.category,
          subcat: p.subcat,
          year: p.year,
          image: p.image,
          description: p.description,
          sortOrder: p.sortOrder,
        },
      });
  }
  console.log(`Upserted ${products.length} products`);

  for (const [key, value] of Object.entries(CONTENT_DEFAULTS)) {
    await db
      .insert(contentBlocksTable)
      .values({ key, value })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${Object.keys(CONTENT_DEFAULTS).length} content blocks`);

  await db.insert(settingsTable).values({ id: 1 }).onConflictDoNothing();
  console.log("Settings ensured");
}

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
