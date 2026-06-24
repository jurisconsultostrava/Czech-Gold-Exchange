import { Router, type IRouter } from "express";
import multer from "multer";
import { XMLParser } from "fast-xml-parser";
import { db, productsTable } from "@workspace/db";
import type { InsertProduct } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAdmin);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
    <SORT_ORDER>${p.sortOrder}</SORT_ORDER>
  </PRODUCT>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<PRODUCTS>\n${items}\n</PRODUCTS>\n`;
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
    CSV_COLUMNS.map((c) => csvCell(p[c as keyof typeof p])).join(","),
  );
  const csv = [header, ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="products.csv"',
  );
  res.send("\uFEFF" + csv);
});

function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === 1;
}

function toNumOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function upsertProducts(rows: Partial<InsertProduct>[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.name) continue;
    const values: InsertProduct = {
      id: String(r.id),
      name: String(r.name),
      manufacturer: r.manufacturer ? String(r.manufacturer) : null,
      weightGrams: Number(r.weightGrams ?? 0),
      fineness: r.fineness ? String(r.fineness) : "999.9",
      category: String(r.category ?? "ostatni"),
      subcat: String(r.subcat ?? "ostatni"),
      year: toNumOrNull(r.year),
      featured: toBool(r.featured),
      active: r.active == null ? true : toBool(r.active),
      image: r.image ? String(r.image) : null,
      description: r.description ? String(r.description) : null,
      sortOrder: Number(r.sortOrder ?? 0),
    };
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
    if (!req.file) {
      res.status(400).json({ error: "Soubor chybí" });
      return;
    }
    const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
    const parsed = parser.parse(req.file.buffer.toString("utf-8")) as {
      PRODUCTS?: { PRODUCT?: unknown };
    };
    const raw = parsed.PRODUCTS?.PRODUCT;
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Array<
      Record<string, unknown>
    >;
    const rows = list.map((p) => ({
      id: p["ID"],
      name: p["NAME"],
      manufacturer: p["MANUFACTURER"],
      weightGrams: p["WEIGHT_GRAMS"],
      fineness: p["FINENESS"],
      category: p["CATEGORY"],
      subcat: p["SUBCAT"],
      year: p["YEAR"],
      featured: p["FEATURED"],
      active: p["ACTIVE"],
      image: p["IMAGE"],
      description: p["DESCRIPTION"],
      sortOrder: p["SORT_ORDER"],
    })) as Partial<InsertProduct>[];
    const imported = await upsertProducts(rows);
    res.json({ imported });
  },
);

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  };
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = cells[i] ?? "";
    });
    return row;
  });
}

router.post(
  "/import/csv",
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Soubor chybí" });
      return;
    }
    const rows = parseCsv(
      req.file.buffer.toString("utf-8"),
    ) as Partial<InsertProduct>[];
    const imported = await upsertProducts(rows);
    res.json({ imported });
  },
);

export default router;
