import { Router, type IRouter } from "express";
import multer from "multer";
import { XMLParser } from "fast-xml-parser";
import { db, productsTable } from "@workspace/db";
import type { InsertProduct } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.use(requireAdmin);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);

  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}

const CSV_COLUMNS = [
  "id",
  "name",
  "manufacturer",
  "weightGrams",
  "fineness",
  "category",
  "subcat",
  "year",
  "featured",
  "active",
  "image",
  "description",
  "sortOrder",
] as const;

router.get("/export/xml", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable);

  const items = products
    .map(
      (p) => `  <PRODUCT>
    <ID>${escapeXml(p.id)}</ID>
    <NAME>${escapeXml(p.name)}</NAME>
    <MANUFACTURER>${escapeXml(p.manufacturer ?? "")}</MANUFACTURER>
    <WEIGHT_GRAMS>${p.weightGrams}</WEIGHT_GRAMS>
    <FINENESS>${escapeXml(p.fineness)}</FINENESS>
    <CATEGORY>${escapeXml(p.category)}</CATEGORY>
    <SUBCAT>${escapeXml(p.subcat)}</SUBCAT>
    <YEAR>${p.year ?? ""}</YEAR>
    <FEATURED>${p.featured}</FEATURED>
    <ACTIVE>${p.active}</ACTIVE>
    <IMAGE>${escapeXml(p.image ?? "")}</IMAGE>
    <DESCRIPTION>${escapeXml(p.description ?? "")}</DESCRIPTION>
    <SORT_ORDER>${p.sortOrder}</SORT_ORDER>
  </PRODUCT>`,
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<PRODUCTS>\n${items}\n</PRODUCTS>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="products.xml"',
  );

  res.send(xml);
});

router.get("/export/csv", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable);

  const header = CSV_COLUMNS.join(",");

  const rows = products.map((p) =>
    CSV_COLUMNS.map((column) =>
      csvCell(p[column as keyof typeof p]),
    ).join(","),
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="products.csv"',
  );

  res.send("\uFEFF" + csv);
});

function toBool(value: unknown): boolean {
  return (
    value === true ||
    value === "true" ||
    value === "TRUE" ||
    value === "1" ||
    value === 1
  );
}

function toNumOrNull(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function toText(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function detectManufacturer(name: string): string | null {
  const manufacturers = [
    "Argor-Heraeus",
    "Argor Heraeus",
    "Valcambi",
    "PAMP Fortuna",
    "PAMP Suisse",
    "PAMP",
    "Umicore",
    "Royal Mint",
    "Perth Mint",
  ];

  const found = manufacturers.find((manufacturer) =>
    name.toLowerCase().includes(manufacturer.toLowerCase()),
  );

  if (!found) {
    return null;
  }

  if (found === "Argor Heraeus") {
    return "Argor-Heraeus";
  }

  if (found === "PAMP Fortuna" || found === "PAMP Suisse") {
    return "PAMP";
  }

  return found;
}

function mapStoneXCategory(
  metal: unknown,
  category: unknown,
): { category: string; subcat: string } {
  const metalValue = String(metal ?? category ?? "")
    .trim()
    .toLowerCase();

  switch (metalValue) {
    case "gold":
      return {
        category: "investicni-zlato",
        subcat: "slitek",
      };

    case "silver":
      return {
        category: "investicni-stribro",
        subcat: "slitek",
      };

    case "platinum":
      return {
        category: "platina-palladium",
        subcat: "platina",
      };

    case "palladium":
      return {
        category: "platina-palladium",
        subcat: "palladium",
      };

    default:
      return {
        category: "ostatni",
        subcat: "ostatni",
      };
  }
}

function mapInternalXmlProducts(parsed: unknown): Partial<InsertProduct>[] {
  const document = parsed as {
    PRODUCTS?: {
      PRODUCT?: Record<string, unknown> | Array<Record<string, unknown>>;
    };
  };

  const products = normalizeArray(document.PRODUCTS?.PRODUCT);

  return products.map((product) => ({
    id: product["ID"],
    name: product["NAME"],
    manufacturer: product["MANUFACTURER"],
    weightGrams: product["WEIGHT_GRAMS"],
    fineness: product["FINENESS"],
    category: product["CATEGORY"],
    subcat: product["SUBCAT"],
    year: product["YEAR"],
    featured: product["FEATURED"],
    active: product["ACTIVE"],
    image: product["IMAGE"],
    description: product["DESCRIPTION"],
    sortOrder: product["SORT_ORDER"],
  })) as Partial<InsertProduct>[];
}

function mapStoneXXmlProducts(parsed: unknown): Partial<InsertProduct>[] {
  const document = parsed as {
    scrape?: {
      products?: {
        product?:
          | Record<string, unknown>
          | Array<Record<string, unknown>>;
      };
    };
  };

  const products = normalizeArray(
    document.scrape?.products?.product,
  );

  return products.map((product, index) => {
    const name = String(product["name"] ?? "").trim();

    const productNumber = String(
      product["product_number"] ?? "",
    ).trim();

    const mappedCategory = mapStoneXCategory(
      product["metal"],
      product["category"],
    );

    const descriptionParts = [
      toText(product["availability"])
        ? `Dostupnost dodavatele: ${toText(product["availability"])}`
        : null,
      toText(product["vendor"])
        ? `Dodavatel: ${toText(product["vendor"])}`
        : null,
      toText(product["url"])
        ? `Zdroj: ${toText(product["url"])}`
        : null,
      toText(product["price"])
        ? `Nákupní cena ve feedu: ${toText(product["price"])} ${toText(product["currency"]) ?? ""}`.trim()
        : null,
    ].filter(Boolean);

    return {
      id: productNumber,
      name,
      manufacturer: detectManufacturer(name),
      weightGrams: product["weight_g"],
      fineness: "999.9",
      category: mappedCategory.category,
      subcat: mappedCategory.subcat,
      year: null,
      featured: false,
      active: true,
      image:
        product["image_url"] ??
        product["image_url_2x"] ??
        null,
      description:
        descriptionParts.length > 0
          ? descriptionParts.join("\n")
          : null,
      sortOrder: index,
    };
  });
}

function detectAndMapXml(parsed: unknown): Partial<InsertProduct>[] {
  const document = parsed as {
    PRODUCTS?: unknown;
    scrape?: unknown;
  };

  if (document.PRODUCTS) {
    return mapInternalXmlProducts(parsed);
  }

  if (document.scrape) {
    return mapStoneXXmlProducts(parsed);
  }

  return [];
}

async function upsertProducts(
  rows: Partial<InsertProduct>[],
): Promise<number> {
  let count = 0;

  for (const row of rows) {
    if (!row.id || !row.name) {
      continue;
    }

    const values: InsertProduct = {
      id: String(row.id).trim(),
      name: String(row.name).trim(),
      manufacturer: row.manufacturer
        ? String(row.manufacturer).trim()
        : null,
      weightGrams: Number(row.weightGrams ?? 0),
      fineness: row.fineness
        ? String(row.fineness).trim()
        : "999.9",
      category: String(row.category ?? "ostatni").trim(),
      subcat: String(row.subcat ?? "ostatni").trim(),
      year: toNumOrNull(row.year),
      featured: toBool(row.featured),
      active: row.active == null ? true : toBool(row.active),
      image: row.image ? String(row.image).trim() : null,
      description: row.description
        ? String(row.description).trim()
        : null,
      sortOrder: Number(row.sortOrder ?? 0),
    };

    if (!Number.isFinite(values.weightGrams)) {
      values.weightGrams = 0;
    }

    if (!Number.isFinite(values.sortOrder)) {
      values.sortOrder = 0;
    }

    await db
      .insert(productsTable)
      .values(values)
      .onConflictDoUpdate({
        target: productsTable.id,
        set: {
          name: values.name,
          manufacturer: values.manufacturer,
          weightGrams: values.weightGrams,
          fineness: values.fineness,
          category: values.category,
          subcat: values.subcat,
          year: values.year,
          featured: values.featured,
          active: values.active,
          image: values.image,
          description: values.description,
          sortOrder: values.sortOrder,
          updatedAt: new Date(),
        },
      });

    count++;
  }

  return count;
}

router.post(
  "/import/xml",
  upload.single("file"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: "Soubor chybí",
        });
        return;
      }

      const xmlText = req.file.buffer.toString("utf-8");

      const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
        parseTagValue: true,
        parseAttributeValue: true,
      });

      const parsed = parser.parse(xmlText);

      const rows = detectAndMapXml(parsed);

      if (rows.length === 0) {
        res.status(400).json({
          error: "XML neobsahuje podporovanou strukturu produktů",
          supportedFormats: [
            "PRODUCTS > PRODUCT",
            "scrape > products > product",
          ],
        });
        return;
      }

      const imported = await upsertProducts(rows);

      res.json({
        imported,
        detected: rows.length,
        format:
          (parsed as { scrape?: unknown }).scrape
            ? "stonex-scrape"
            : "internal-products",
      });
    } catch (error) {
      console.error("XML import failed:", error);

      res.status(500).json({
        error: "XML se nepodařilo zpracovat",
        detail:
          error instanceof Error
            ? error.message
            : "Neznámá chyba",
      });
    }
  },
);

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const character = line[index];

      if (inQuotes) {
        if (character === '"') {
          if (line[index + 1] === '"') {
            current += '"';
            index++;
          } else {
            inQuotes = false;
          }
        } else {
          current += character;
        }
      } else if (character === '"') {
        inQuotes = true;
      } else if (character === ",") {
        cells.push(current);
        current = "";
      } else {
        current += character;
      }
    }

    cells.push(current);

    return cells;
  };

  const headers = parseLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = cells[index] ?? "";
    });

    return row;
  });
}

router.post(
  "/import/csv",
  upload.single("file"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: "Soubor chybí",
        });
        return;
      }

      const rows = parseCsv(
        req.file.buffer.toString("utf-8"),
      ) as Partial<InsertProduct>[];

      const imported = await upsertProducts(rows);

      res.json({
        imported,
        detected: rows.length,
      });
    } catch (error) {
      console.error("CSV import failed:", error);

      res.status(500).json({
        error: "CSV se nepodařilo zpracovat",
        detail:
          error instanceof Error
            ? error.message
            : "Neznámá chyba",
      });
    }
  },
);

export default router;
