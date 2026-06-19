#!/usr/bin/env node
// One-time bootstrap importer (run locally, not in CI).
// Parses Site assets/250928 Website Projects.rtf, copies+resizes
// Projekt Bilder/NN_xxx into site/src/assets/work/NN_slug, and emits
// site/src/data/projects.data.ts (everything except images).
// Usage: node scripts/import-projects.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "..");
const RTF_PATH = path.join(REPO_ROOT, "Site assets/250928 Website Projects.rtf");
const IMAGES_ROOT = path.join(REPO_ROOT, "Projekt Bilder");
const ASSETS_OUT = path.join(SITE_ROOT, "src/assets/work");
const DATA_OUT = path.join(SITE_ROOT, "src/data/projects.data.ts");

const CATEGORY_MAP = {
  "TV SHOW": "BROADCAST",
  "LIVE MUSIC": "CONCERTS",
  EVENT: "EVENTS",
  CORPORATE: "CORPORATE",
  THEATER: "THEATER",
  CEREMONY: "CEREMONY",
};

const ACRONYMS = new Set([
  "TV", "BMW", "VW", "GM", "FIFA", "AC/DC", "VKB", "BSH", "CES", "IFA", "ORF",
  "LX", "ID4", "GTX", "BC", "FC", "U17", "PWR", "LOL", "ID.4", "MCC", "ÖVB",
  "GEM", "D3", "NYE", "HK", "BFP24",
]);
const LOWER_WORDS = new Set(["of", "the", "in", "at", "and", "der", "des", "du", "nie", "drauf", "ist", "das"]);

function smartTitleCase(s) {
  let isFirstWord = true;
  return s
    .toLowerCase()
    .split(/(\s+|–|-)/)
    .map((tok) => {
      if (/^\s+$/.test(tok) || tok === "–" || tok === "-") return tok;
      const upper = tok.toUpperCase();
      const isFirst = isFirstWord;
      isFirstWord = false;
      if (ACRONYMS.has(upper)) return upper;
      if (!isFirst && LOWER_WORDS.has(tok)) return tok;
      // capitalise the word but not a letter right after an apostrophe: king's -> King's
      return tok.replace(/^([a-zà-ÿ])/, (m) => m.toUpperCase());
    })
    .join("");
}

function cleanSlugPart(s) {
  return s
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function slugify(title, used) {
  let base = title
    .toLowerCase()
    .replace(/['’]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let slug = base;
  let i = 2;
  while (used.has(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  used.add(slug);
  return slug;
}

function extractYear(text) {
  const m = text.match(/\b(19|20)\d{2}\s*[–-]\s*(19|20)\d{2}\b|\b(19|20)\d{2}\b/);
  return m ? m[0].replace(/\s+/g, "") : "";
}

function stripYearAndSeparators(text, year) {
  let out = text;
  if (year) {
    const pattern = new RegExp(year.replace(/[–-]/g, "[–-]"), "g");
    out = out.replace(pattern, "");
  }
  return out
    .replace(/^[\s.,–-]+|[\s.,–-]+$/g, "")
    .replace(/[\s.,–-]*—[\s.,–-]*/g, " — ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseCreditLine(line) {
  let role, value;
  if (line.includes(":")) {
    const idx = line.indexOf(":");
    role = line.slice(0, idx);
    value = line.slice(idx + 1);
  } else if (line.includes("|")) {
    const idx = line.indexOf("|");
    role = line.slice(0, idx);
    value = line.slice(idx + 1);
  } else {
    // fallback separators: en-dash " – ", a double-space gap, or an ALL-CAPS
    // role butted straight up against a Title Case name with a single space.
    // Only trust these when the right-hand side reads like a proper name
    // (mixed case), so we don't swallow ALL-CAPS year/location lines like
    // "2024 – ACROSS GERMANY".
    let m = line.match(/^(.+?)\s[–-]\s(.+)$/);
    if (!m) m = line.match(/^([A-Z][A-Z &/.]+?)\s{2,}(.+)$/);
    if (!m) m = line.match(/^([A-Z][A-Z0-9&/]*(?:\s[A-Z][A-Z0-9&/]*)*)\s([A-ZÀ-Ö][a-zà-ÿ].*)$/);
    if (!m) return null;
    const [, candRole, candValue] = m;
    if (/^\d/.test(candRole.trim()) || !/[a-z]/.test(candValue)) return null;
    role = candRole;
    value = candValue;
  }
  role = role.replace(/\|+/g, "/").replace(/\s{2,}/g, " ").trim();
  value = value.trim();
  if (!role || !value) return null;
  const ROLE_ACRONYMS = new Set(["LX", "TV", "FOH", "SFX", "D3", "CEO", "AV", "IT", "PR", "VIP", "CAD"]);
  const ROLE_LOWER = new Set(["of", "and", "the", "a", "&"]);
  const rawWords = role.split(/\s+/);
  role = rawWords
    .map((w, i) => {
      const isRoman = /^[IVX]+$/i.test(w) && w.length <= 3;
      if (isRoman || ROLE_ACRONYMS.has(w.toUpperCase())) return w.toUpperCase();
      const lw = w.toLowerCase();
      if (i > 0 && ROLE_LOWER.has(lw)) return lw;
      return lw[0] ? lw[0].toUpperCase() + lw.slice(1) : lw;
    })
    .join(" ");
  // de-handle instagram-style names
  let name = value;
  if (/^@[\w.]+$/.test(name)) {
    name = name
      .slice(1)
      .split(/[._]/)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  }
  return { role, name };
}

function parseBlock(raw) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // last line = slug line
  const slugLineIdx = lines.findIndex((l) => /^(folder name:\s*)?\d{2}_/.test(l));
  if (slugLineIdx === -1) return null;
  const slugLine = lines[slugLineIdx];
  const slugMatch = slugLine.match(/(\d{2})_([^\s]+(?:\s[^\s]+)*?)(?:\s+\d+\s+images?)?$/);
  if (!slugMatch) return null;
  const nn = slugMatch[1];
  const diskSlugRaw = slugLine
    .replace(/^folder name:\s*/i, "")
    .replace(/\s+\d+\s+images?$/i, "")
    .trim();

  const body = lines.slice(0, slugLineIdx);
  const catIdx = body.findIndex((l) => /^CATEGORY\s*:/i.test(l));
  const categoryRaw = catIdx === -1 ? "" : body[catIdx].replace(/^CATEGORY\s*:\s*/i, "").trim();
  const rest = body.filter((_, i) => i !== catIdx);

  // classify every remaining line as credit (has a recognised separator) or
  // plain text (title/location), independent of its position relative to CATEGORY
  const credits = [];
  const plainLines = [];
  for (const line of rest) {
    if (/^folder name:/i.test(line)) continue;
    if (/^a\s+@/i.test(line)) continue; // freeform attribution note, not a credit
    const credit = parseCreditLine(line);
    if (credit) credits.push(credit);
    else plainLines.push(line);
  }

  // title = first plain line that isn't a bare year/date
  const isYearOnly = (l) => /^\d{4}([–-]\d{4})?\.?,?$/.test(l);
  const titleLine = plainLines.find((l) => !isYearOnly(l)) || plainLines[0] || diskSlugRaw;
  const locationLines = plainLines.filter((l) => l !== titleLine && !isYearOnly(l));

  const allLocText = locationLines.join(" — ");
  const year = extractYear(titleLine) || extractYear(allLocText);
  const locationRaw = stripYearAndSeparators(allLocText, year);
  const location = locationRaw ? smartTitleCase(locationRaw.toLowerCase()) : "";
  const title = smartTitleCase(titleLine.replace(/\s+/g, " ").trim());
  const category = CATEGORY_MAP[categoryRaw.toUpperCase()] || "EVENTS";

  return { nn, diskSlugRaw, title, year, location, category, credits };
}

function draftDescription(rec) {
  const scope = rec.credits.find((c) => /scope/i.test(c.role))?.name;
  const ldName = rec.credits.find((c) => /lighting design/i.test(c.role))?.name;
  const client = rec.credits.find((c) => /client/i.test(c.role))?.name;
  const catWord = {
    BROADCAST: "broadcast production",
    CONCERTS: "live music production",
    CORPORATE: "corporate event",
    THEATER: "theater production",
    EVENTS: "event",
    CEREMONY: "ceremony",
  }[rec.category];
  const where = rec.location ? ` in ${rec.location}` : "";
  const clientPart = client ? ` for ${client}` : "";
  if (scope) {
    return `${scope}${clientPart} on this ${catWord}${where}.`.replace(/\s+/g, " ").trim();
  }
  const lead = ldName ? `Lighting design by ${ldName}` : "Lighting design";
  return `${lead}${clientPart} on this ${catWord}${where}.`.replace(/\s+/g, " ").trim();
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}

function main() {
  const fullTxt = execSync(`textutil -convert txt -stdout "${RTF_PATH}"`, { maxBuffer: 1024 * 1024 * 10 }).toString("utf8");
  // drop the leading category-legend block ("ALL PROJECTS / BROADCAST / ...")
  // that precedes the first real project entry
  const firstTitleIdx = fullTxt.indexOf("KING'S CUP");
  const txt = firstTitleIdx === -1 ? fullTxt : fullTxt.slice(firstTitleIdx);
  const blocks = txt.split(/-{20,}\s*/);
  const records = [];
  for (const b of blocks) {
    const rec = parseBlock(b);
    if (rec) records.push(rec);
  }
  records.sort((a, b) => Number(b.nn) - Number(a.nn));
  console.log(`Parsed ${records.length} records`);

  const diskFolders = fs
    .readdirSync(IMAGES_ROOT)
    .filter((f) => /^\d{2}_/.test(f) && fs.statSync(path.join(IMAGES_ROOT, f)).isDirectory());

  const usedSlugs = new Set();
  fs.mkdirSync(ASSETS_OUT, { recursive: true });

  const dataRecords = [];
  for (const rec of records) {
    const diskFolder = diskFolders.find((f) => f.startsWith(rec.nn + "_"));
    if (!diskFolder) {
      console.warn(`!! no image folder for ${rec.nn} (${rec.title})`);
      continue;
    }
    const assetFolder = cleanSlugPart(diskFolder);
    const outDir = path.join(ASSETS_OUT, assetFolder);
    fs.mkdirSync(outDir, { recursive: true });

    const srcDir = path.join(IMAGES_ROOT, diskFolder);
    const files = fs
      .readdirSync(srcDir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith("."));

    for (const f of files) {
      const outName = f.toLowerCase().replace(/\.jpeg$/, ".jpg");
      const outPath = path.join(outDir, outName);
      const inPath = path.join(srcDir, f);
      if (fs.existsSync(outPath)) continue;
      execSync(`sips -Z 2048 "${inPath}" --out "${outPath}"`, { stdio: "pipe" });
    }

    const slug = slugify(rec.title, usedSlugs);
    dataRecords.push({
      order: Number(rec.nn),
      slug,
      assetFolder,
      title: rec.title,
      year: rec.year,
      location: rec.location,
      category: rec.category,
      description: draftDescription(rec),
      credits: rec.credits,
    });
  }

  const tsLines = [];
  tsLines.push("/**");
  tsLines.push(" * Project text data — everything except images.");
  tsLines.push(" * Generated by scripts/import-projects.mjs, then hand-edited.");
  tsLines.push(" *");
  tsLines.push(" * To add a future project:");
  tsLines.push(" *  1. Drop an image folder into src/assets/work/NN_slug/ (main.jpg = cover,");
  tsLines.push(" *     numbered files = gallery order).");
  tsLines.push(" *  2. Append an entry here with the matching assetFolder.");
  tsLines.push(" *  3. Push — the site picks up the images via import.meta.glob automatically.");
  tsLines.push(" */");
  tsLines.push('import type { Category } from "./projects";');
  tsLines.push("");
  tsLines.push("export interface ProjectData {");
  tsLines.push("  order: number;");
  tsLines.push("  slug: string;");
  tsLines.push("  assetFolder: string;");
  tsLines.push("  title: string;");
  tsLines.push("  year: string;");
  tsLines.push("  location: string;");
  tsLines.push("  category: Category;");
  tsLines.push("  description: string;");
  tsLines.push("  credits: { role: string; name: string }[];");
  tsLines.push("}");
  tsLines.push("");
  tsLines.push("export const projectsData: ProjectData[] = [");
  for (const d of dataRecords) {
    tsLines.push("  {");
    tsLines.push(`    order: ${d.order},`);
    tsLines.push(`    slug: ${JSON.stringify(d.slug)},`);
    tsLines.push(`    assetFolder: ${JSON.stringify(d.assetFolder)},`);
    tsLines.push(`    title: ${JSON.stringify(d.title)},`);
    tsLines.push(`    year: ${JSON.stringify(d.year)},`);
    tsLines.push(`    location: ${JSON.stringify(d.location)},`);
    tsLines.push(`    category: ${JSON.stringify(d.category)},`);
    tsLines.push(`    description: ${JSON.stringify(d.description)},`);
    tsLines.push(`    credits: [${d.credits.map((c) => `{ role: ${JSON.stringify(c.role)}, name: ${JSON.stringify(c.name)} }`).join(", ")}],`);
    tsLines.push("  },");
  }
  tsLines.push("];");
  tsLines.push("");

  fs.writeFileSync(DATA_OUT, tsLines.join("\n"));
  console.log(`Wrote ${dataRecords.length} records to ${DATA_OUT}`);
}

main();
