import {
  db,
  productsTable,
  contentBlocksTable,
  settingsTable,
} from "@workspace/db";
import type { InsertProduct } from "@workspace/db";
import { fetchPriceFeed } from "../lib/feeds";

type Metal = "gold" | "silver" | "platinum" | "palladium";
type Kind = "mince" | "slitek";

const METAL_ADJ: Record<Metal, { masc: string; fem: string }> = {
  gold: { masc: "zlatý", fem: "zlatá" },
  silver: { masc: "stříbrný", fem: "stříbrná" },
  platinum: { masc: "platinový", fem: "platinová" },
  palladium: { masc: "palladiový", fem: "palladiová" },
};

const COIN_SERIES = [
  "Maple Leaf",
  "Krugerrand",
  "Britannia",
  "Philharmonic",
  "Kangaroo",
  "Buffalo",
  "Eagle",
  "Panda",
  "Libertad",
  "Ark",
  "Elephant",
  "Lunar",
  "Koala",
  "Kookaburra",
  "Emu",
  "Platypus",
  "Dragon",
  "Tudor",
  "Queen's Beast",
  "St George",
  "Angel",
  "Bond",
  "Star Wars",
  "Bitcoin",
];

const MANUFACTURERS: { canonical: string; terms: string[] }[] = [
  { canonical: "Argor-Heraeus", terms: ["Argor-Heraeus", "Argor Heraeus"] },
  { canonical: "Valcambi", terms: ["Valcambi"] },
  { canonical: "PAMP Suisse", terms: ["PAMP"] },
  { canonical: "Royal Canadian Mint", terms: ["Royal Canadian Mint"] },
  { canonical: "Royal Mint", terms: ["Royal Mint"] },
  { canonical: "Perth Mint", terms: ["Perth Mint"] },
  {
    canonical: "Münze Österreich",
    terms: ["Münze Österreich", "Vienna Philharmonic"],
  },
  {
    canonical: "South African Mint",
    terms: ["South African Mint", "Krugerrand"],
  },
  {
    canonical: "U.S. Mint",
    terms: ["U.S. Mint", "American Eagle", "American Buffalo"],
  },
  { canonical: "Umicore", terms: ["Umicore"] },
  { canonical: "Metalor", terms: ["Metalor"] },
  { canonical: "Heraeus", terms: ["Heraeus"] },
];

function detectMetal(name: string): Metal {
  const n = name.toLowerCase();
  if (n.includes("silver")) return "silver";
  if (n.includes("platinum")) return "platinum";
  if (n.includes("palladium")) return "palladium";
  return "gold";
}

function detectSeries(name: string): string | null {
  const n = name.toLowerCase();
  return COIN_SERIES.find((s) => n.includes(s.toLowerCase())) ?? null;
}

function detectKind(name: string, series: string | null): Kind {
  const n = name.toLowerCase();
  if (n.includes("coin") || n.includes("round") || series) return "mince";
  return "slitek";
}

function detectManufacturer(name: string): string | null {
  const n = name.toLowerCase();
  for (const m of MANUFACTURERS) {
    if (m.terms.some((t) => n.includes(t.toLowerCase()))) return m.canonical;
  }
  return null;
}

function parseFraction(s: string): number {
  if (s.includes("/")) {
    const [a, b] = s.split("/").map((x) => Number(x));
    return b ? a / b : 0;
  }
  return Number(s.replace(",", "."));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const OZ_WEIGHTS: Record<string, number> = {
  "1": 31.1,
  "1/2": 15.55,
  "1/4": 7.78,
  "1/10": 3.11,
};

function detectWeight(name: string): { grams: number; label: string } {
  const combi = name.match(/(\d+)\s*x\s*([\d/.,]+)\s*(g|oz)/i);
  if (combi) {
    const count = Number(combi[1]);
    const unit = combi[2];
    const isOz = combi[3].toLowerCase() === "oz";
    const unitGrams = isOz
      ? (OZ_WEIGHTS[unit] ?? round3(parseFraction(unit) * 31.1))
      : parseFraction(unit);
    return {
      grams: round3(count * unitGrams),
      label: `${count}× ${unit} ${isOz ? "oz" : "g"}`,
    };
  }

  if (/\b1\s*kilo\b/i.test(name) || /\b1000\s*g\b/i.test(name)) {
    return { grams: 1000, label: "1 kg" };
  }

  const oz = name.match(/(\d+\/\d+|\d+(?:[.,]\d+)?)\s*oz/i);
  if (oz) {
    const token = oz[1];
    const grams = OZ_WEIGHTS[token] ?? round3(parseFraction(token) * 31.1);
    return { grams, label: `${token} oz` };
  }

  const grams = name.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  if (grams) {
    const n = round3(Number(grams[1].replace(",", ".")));
    return { grams: n, label: `${n} g` };
  }

  return { grams: 0, label: "" };
}

function detectCategory(
  name: string,
  metal: Metal,
  kind: Kind,
): { category: string; subcat: string } {
  const n = name.toLowerCase();
  if (metal === "platinum")
    return { category: "platina-palladium", subcat: "platina" };
  if (metal === "palladium")
    return { category: "platina-palladium", subcat: "palladium" };
  if (n.includes("čnb") || n.includes("czech national bank")) {
    return {
      category: "mince-cnb",
      subcat: metal === "silver" ? "cnb-stribrne" : "cnb-zlate",
    };
  }
  if (metal === "silver") {
    return {
      category: "investicni-stribro",
      subcat: kind === "mince" ? "mince" : "slitky",
    };
  }
  return {
    category: "investicni-zlato",
    subcat: kind === "mince" ? "mince" : "slitky",
  };
}

function detectYear(name: string): number | null {
  const m = name.match(/\b(19\d{2}|20\d{2})\b/);
  if (m) {
    const y = Number(m[1]);
    if (y >= 1960 && y <= 2030) return y;
  }
  return null;
}

function fineness(metal: Metal): string {
  switch (metal) {
    case "gold":
      return "999.9";
    case "silver":
      return "999";
    case "platinum":
    case "palladium":
      return "999.5";
  }
}

function buildCzechName(opts: {
  metal: Metal;
  kind: Kind;
  manufacturer: string | null;
  series: string | null;
  year: number | null;
  weightLabel: string;
}): string {
  const { metal, kind, manufacturer, series, year, weightLabel } = opts;
  const adj =
    kind === "slitek" ? METAL_ADJ[metal].masc : METAL_ADJ[metal].fem;
  const parts =
    kind === "slitek"
      ? [manufacturer, adj, "slitek", weightLabel, series]
      : [
          manufacturer,
          adj,
          "mince",
          series,
          year ? String(year) : null,
          weightLabel,
        ];
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
    const metal = detectMetal(item.name);
    const series = detectSeries(item.name);
    const kind = detectKind(item.name, series);
    const { grams, label } = detectWeight(item.name);
    const manufacturer = detectManufacturer(item.name);
    const year = detectYear(item.name);
    const { category, subcat } = detectCategory(item.name, metal, kind);
    const name = buildCzechName({
      metal,
      kind,
      manufacturer,
      series,
      year,
      weightLabel: label,
    });
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
  console.log(`${products.length} products imported successfully`);

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

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
