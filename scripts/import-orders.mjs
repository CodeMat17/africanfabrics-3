/**
 * Cleans orders_female.csv and imports it into Convex via bulkImport.
 *
 * Usage:
 *   node scripts/import-orders.mjs <path-to-csv>
 *
 * Requires CONVEX_URL in .env.local (or set it in your environment).
 *
 * What it does:
 *   - Fixes encoding artifacts (â → ')
 *   - Maps status="in_progress" + workflowStage="done" → status="completed"
 *   - Converts float timestamps to integers
 *   - Strips empty measurement fields
 *   - Reconstructs the nested femaleMeasurements object from flat CSV columns
 *   - Calls importOrders:bulkImport in batches of 50
 */

import fs from "fs";
import path from "path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// ---------- env ----------
function getConvexUrl() {
  // Try .env.local then environment
  for (const envFile of [".env.local", ".env"]) {
    try {
      const text = fs.readFileSync(envFile, "utf8");
      const match = text.match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/);
      if (match) return match[1].trim();
    } catch {}
  }
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}

// ---------- CSV parser ----------
function splitLine(line) {
  const result = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headers = splitLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] ?? "").trim();
    });
    obj.__line = i + 1;
    rows.push(obj);
  }
  return rows;
}

// ---------- cleaning ----------

// Fix broken apostrophes from UTF-8 / Latin-1 mismatch
function fixEncoding(str) {
  return str
    .replace(/â/g, "'")
    .replace(/Ã©/g, "é")
    .replace(/â/g, "'")
    .trim();
}

function toIntTimestamp(val) {
  if (!val) return undefined;
  const n = parseFloat(val);
  if (isNaN(n)) return undefined;
  return Math.floor(n);
}

function cleanMeasurement(val) {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "0") return undefined;
  return trimmed;
}

const FEMALE_MEASUREMENT_MAP = {
  "femaleMeasurements.neck": "neck",
  "femaleMeasurements.overBust": "overBust",
  "femaleMeasurements.bust": "bust",
  "femaleMeasurements.underBust": "underBust",
  "femaleMeasurements.waist": "waist",
  "femaleMeasurements.hips": "hips",
  "femaleMeasurements.neckToHeel": "neckToHeel",
  "femaleMeasurements.neckToAboveKnee": "neckToAboveKnee",
  "femaleMeasurements.armLength": "armLength",
  "femaleMeasurements.shoulderSeam": "shoulderSeam",
  "femaleMeasurements.armHole": "armHole",
  "femaleMeasurements.foreArm": "foreArm",
  "femaleMeasurements.vNeckCut": "vNeckCut",
  "femaleMeasurements.aboveKneeToAnkle": "aboveKneeToAnkle",
  "femaleMeasurements.waistToAboveKnee": "waistToAboveKnee",
  "femaleMeasurements.shoulders": "shoulders",
  "femaleMeasurements.topLength": "topLength",
  "femaleMeasurements.sleeveLength": "sleeveLength",
  "femaleMeasurements.skirtLength": "skirtLength",
  "femaleMeasurements.blouseLength": "blouseLength",
};

const MALE_MEASUREMENT_MAP = {
  "maleMeasurements.chest": "chest",
  "maleMeasurements.chestAtAmpits": "chestAtAmpits",
  "maleMeasurements.waist": "waist",
  "maleMeasurements.hips": "hips",
  "maleMeasurements.shoulder": "shoulder",
  "maleMeasurements.sleeveLength": "sleeveLength",
  "maleMeasurements.topLength": "topLength",
  "maleMeasurements.trouserWaist": "trouserWaist",
  "maleMeasurements.trouserLength": "trouserLength",
  "maleMeasurements.thigh": "thigh",
  "maleMeasurements.calf": "calf",
  "maleMeasurements.forehead": "forehead",
  "maleMeasurements.forearm": "forearm",
  "maleMeasurements.wrist": "wrist",
  "maleMeasurements.torsoCircum": "torsoCircum",
  "maleMeasurements.pantsLength": "pantsLength",
  "maleMeasurements.thighAtCrotch": "thighAtCrotch",
  "maleMeasurements.midThigh": "midThigh",
  "maleMeasurements.knee": "knee",
  "maleMeasurements.belowKnee": "belowKnee",
  "maleMeasurements.ankle": "ankle",
  "maleMeasurements.biceps": "biceps",
  "maleMeasurements.elbow": "elbow",
  "maleMeasurements.shoulders": "shoulders",
  "maleMeasurements.neck": "neck",
};

function buildMeasurements(row, map) {
  const m = {};
  for (const [csvCol, schemaField] of Object.entries(map)) {
    const val = cleanMeasurement(row[csvCol]);
    if (val) m[schemaField] = val;
  }
  return Object.keys(m).length > 0 ? m : undefined;
}

function buildFemaleMeasurements(row) {
  return buildMeasurements(row, FEMALE_MEASUREMENT_MAP);
}

function buildMaleMeasurements(row) {
  return buildMeasurements(row, MALE_MEASUREMENT_MAP);
}

function mapStatus(status, workflowStage) {
  // Historical data: completed work was left as "in_progress" with workflowStage="done"
  if (status === "in_progress" && workflowStage === "done") return "completed";
  return status;
}

function cleanRow(row, lineNum) {
  const warnings = [];

  const clientName = fixEncoding(row.clientName || "");
  const garmentType = fixEncoding(row.garmentType || "");
  const phone = (row.phone || "").trim();
  const email = (row.email || "").trim();
  const gender = (row.gender || "female").trim();
  const specialInstructions = row.specialInstructions
    ? fixEncoding(row.specialInstructions)
    : undefined;

  const collectionDate = toIntTimestamp(row.collectionDate);
  if (!collectionDate) {
    warnings.push(`Line ${lineNum}: invalid collectionDate "${row.collectionDate}" — skipping row`);
    return { order: null, warnings };
  }

  const rawStatus = (row.status || "pending").trim();
  const workflowStage = (row.workflowStage || "unassigned").trim();
  const status = mapStatus(rawStatus, workflowStage);

  const completedAt = toIntTimestamp(row.completedAt);
  const collectedAt = toIntTimestamp(row.collectedAt);

  const femaleMeasurements = buildFemaleMeasurements(row);
  const maleMeasurements = buildMaleMeasurements(row);

  const order = {
    clientName,
    phone,
    email,
    garmentType,
    gender,
    collectionDate,
    status,
    workflowStage,
    ...(specialInstructions ? { specialInstructions } : {}),
    ...(femaleMeasurements ? { femaleMeasurements } : {}),
    ...(maleMeasurements ? { maleMeasurements } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(collectedAt ? { collectedAt } : {}),
  };

  return { order, warnings };
}

// ---------- import ----------
async function importCSV(csvPath) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    console.error(
      "❌  NEXT_PUBLIC_CONVEX_URL not found. Set it in .env.local or your environment."
    );
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(text);
  console.log(`\n📋  Read ${rows.length} rows from ${path.basename(csvPath)}`);

  const orders = [];
  const allWarnings = [];

  for (const row of rows) {
    const { order, warnings } = cleanRow(row, row.__line);
    allWarnings.push(...warnings);
    if (order) orders.push(order);
  }

  if (allWarnings.length > 0) {
    console.log(`\n⚠️  Warnings during cleaning:`);
    allWarnings.forEach((w) => console.log(`  ${w}`));
  }

  console.log(`\n✅  ${orders.length} rows ready for import (${rows.length - orders.length} skipped)`);

  // Batch in groups of 50 to stay within Convex limits
  const BATCH = 50;
  let totalInserted = 0;

  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH);
    process.stdout.write(
      `  Importing batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(orders.length / BATCH)} (rows ${i + 1}–${Math.min(i + BATCH, orders.length)})...`
    );
    try {
      const result = await client.mutation(api.importOrders.bulkImport, {
        rows: batch,
      });
      totalInserted += result.inserted;
      console.log(` ✓ ${result.inserted} inserted`);
    } catch (err) {
      console.log(` ✗ FAILED`);
      console.error(`    Error: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n🎉  Done! ${totalInserted} orders imported.\n`);
}

// ---------- entry ----------
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/import-orders.mjs <path-to-csv>");
  process.exit(1);
}

importCSV(path.resolve(csvPath)).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
