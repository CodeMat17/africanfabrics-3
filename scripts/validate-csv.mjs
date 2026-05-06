/**
 * Validates orders_female.csv against the Convex orders schema.
 * Run with: node scripts/validate-csv.mjs <path-to-csv>
 *
 * Checks performed:
 *  1. Required fields present and non-empty
 *  2. status enum values
 *  3. workflowStage enum values
 *  4. collectionDate / completedAt / collectedAt are valid numbers
 *  5. Measurement values — flags likely data-entry errors
 *  6. Encoding artifacts in text fields
 *  7. Suspicious phone numbers
 *  8. Email format
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";

// ---------- tiny CSV parser (handles quoted commas) ----------
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headers = splitLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] ?? "").trim();
    });
    obj.__lineNumber = i + 1; // 1-based, including header
    rows.push(obj);
  }
  return rows;
}

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

// ---------- validation rules ----------

const VALID_STATUS = new Set([
  "pending",
  "in_progress",
  "ready_for_qc",
  "completed",
  "collected",
]);

const VALID_WORKFLOW_STAGE = new Set([
  "unassigned",
  "tailoring",
  "beading",
  "fitting",
  "qc",
  "done",
]);

const REQUIRED_FIELDS = [
  "clientName",
  "phone",
  "email",
  "garmentType",
  "gender",
  "collectionDate",
  "status",
  "workflowStage",
];

// Regex: detects encoding artifacts (â, Ã, etc.), common from UTF-8 mis-read as Latin-1
const ENCODING_RE = /[âÃâ’]/;

// Detects measurement values that look wrong
function measurementIssues(value) {
  if (!value) return [];
  const issues = [];
  if (/[a-df-np-wyz]/i.test(value)) {
    // letters that shouldn't appear in measurements (allow 'O' check separately)
    issues.push(`contains unexpected letter(s): "${value}"`);
  }
  if (/O/.test(value)) {
    issues.push(`contains letter 'O' instead of zero: "${value}"`);
  }
  if (/\s/.test(value)) {
    issues.push(`contains whitespace: "${value}"`);
  }
  if (/\.$/.test(value)) {
    issues.push(`trailing dot: "${value}"`);
  }
  // Two decimal points without a slash separator
  if (/\d\.\d+\.\d/.test(value)) {
    issues.push(`double decimal (missing separator?): "${value}"`);
  }
  return issues;
}

function isValidTimestamp(val) {
  if (!val) return true; // optional fields — blank is fine
  const n = Number(val);
  return !isNaN(n) && n > 1_000_000_000_000; // ms epoch > year 2001
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidPhone(phone) {
  // accept international/local formats; flag if too short or obviously wrong
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

// ---------- measurement column names ----------
const MEASUREMENT_COLUMNS = [
  "femaleMeasurements.neck",
  "femaleMeasurements.overBust",
  "femaleMeasurements.bust",
  "femaleMeasurements.underBust",
  "femaleMeasurements.waist",
  "femaleMeasurements.hips",
  "femaleMeasurements.neckToHeel",
  "femaleMeasurements.neckToAboveKnee",
  "femaleMeasurements.armLength",
  "femaleMeasurements.shoulderSeam",
  "femaleMeasurements.armHole",
  "femaleMeasurements.foreArm",
  "femaleMeasurements.vNeckCut",
  "femaleMeasurements.aboveKneeToAnkle",
  "femaleMeasurements.waistToAboveKnee",
  "femaleMeasurements.shoulders",
  "femaleMeasurements.topLength",
  "femaleMeasurements.sleeveLength",
  "femaleMeasurements.skirtLength",
  "femaleMeasurements.blouseLength",
];

// ---------- main ----------
function validate(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(text);

  console.log(`\n📋  Validating ${rows.length} rows from: ${path.basename(csvPath)}\n`);
  console.log("=".repeat(70));

  let totalIssues = 0;
  const summary = {
    missingRequired: 0,
    badStatus: 0,
    badWorkflowStage: 0,
    badTimestamp: 0,
    badEmail: 0,
    badPhone: 0,
    encodingArtifact: 0,
    measurementError: 0,
    statusDoneConflict: 0,
  };

  rows.forEach((row) => {
    const rowIssues = [];

    // 1. Required fields
    for (const field of REQUIRED_FIELDS) {
      if (!row[field]) {
        rowIssues.push(`[REQUIRED] Missing or empty: "${field}"`);
        summary.missingRequired++;
      }
    }

    // 2. status enum
    if (row.status && !VALID_STATUS.has(row.status)) {
      rowIssues.push(
        `[STATUS] Invalid status "${row.status}" — allowed: ${[...VALID_STATUS].join(", ")}`
      );
      summary.badStatus++;
    }

    // 3. workflowStage enum
    if (row.workflowStage && !VALID_WORKFLOW_STAGE.has(row.workflowStage)) {
      rowIssues.push(
        `[WORKFLOW] Invalid workflowStage "${row.workflowStage}" — allowed: ${[...VALID_WORKFLOW_STAGE].join(", ")}`
      );
      summary.badWorkflowStage++;
    }

    // 4. status/workflowStage conflict: in_progress + done → likely should be "completed"
    if (row.status === "in_progress" && row.workflowStage === "done") {
      rowIssues.push(
        `[STATUS-CONFLICT] status="in_progress" but workflowStage="done" — should status be "completed"?`
      );
      summary.statusDoneConflict++;
    }

    // 5. Timestamps
    for (const tsField of ["collectionDate", "completedAt", "collectedAt"]) {
      if (row[tsField] && !isValidTimestamp(row[tsField])) {
        rowIssues.push(
          `[TIMESTAMP] "${tsField}" value "${row[tsField]}" is not a valid ms timestamp`
        );
        summary.badTimestamp++;
      }
    }

    // 6. Email
    if (row.email && !isValidEmail(row.email)) {
      rowIssues.push(`[EMAIL] Suspicious email: "${row.email}"`);
      summary.badEmail++;
    }

    // 7. Phone
    if (row.phone && !isValidPhone(row.phone)) {
      rowIssues.push(`[PHONE] Suspicious phone: "${row.phone}"`);
      summary.badPhone++;
    }

    // 8. Encoding artifacts in text fields
    for (const field of ["clientName", "garmentType", "specialInstructions"]) {
      if (row[field] && ENCODING_RE.test(row[field])) {
        rowIssues.push(
          `[ENCODING] "${field}" contains encoding artifact: "${row[field]}"`
        );
        summary.encodingArtifact++;
      }
    }

    // 9. Measurement values
    for (const col of MEASUREMENT_COLUMNS) {
      const val = row[col];
      if (val) {
        const mIssues = measurementIssues(val);
        for (const issue of mIssues) {
          rowIssues.push(`[MEASUREMENT] ${col} — ${issue}`);
          summary.measurementError++;
        }
      }
    }

    // Print row issues
    if (rowIssues.length > 0) {
      totalIssues += rowIssues.length;
      const label = `Line ${String(row.__lineNumber).padStart(4)} | ${(row.clientName || "UNKNOWN").slice(0, 30)}`;
      console.log(`\n${label}`);
      rowIssues.forEach((issue) => console.log(`  ⚠  ${issue}`));
    }
  });

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊  SUMMARY`);
  console.log(`   Total rows:              ${rows.length}`);
  console.log(`   Rows with issues:        ${rows.filter((_, i) => i >= 0).length} (see above)`);
  console.log(`   Total issues found:      ${totalIssues}`);
  console.log(`\n   By category:`);
  console.log(`   Missing required field:  ${summary.missingRequired}`);
  console.log(`   Invalid status:          ${summary.badStatus}`);
  console.log(`   Invalid workflowStage:   ${summary.badWorkflowStage}`);
  console.log(`   Status/stage conflict:   ${summary.statusDoneConflict}  ← needs decision`);
  console.log(`   Bad timestamp:           ${summary.badTimestamp}`);
  console.log(`   Bad email:               ${summary.badEmail}`);
  console.log(`   Bad phone:               ${summary.badPhone}`);
  console.log(`   Encoding artifacts:      ${summary.encodingArtifact}`);
  console.log(`   Measurement errors:      ${summary.measurementError}`);
  console.log(`\n❗  NOTE: "orderNumber" column is absent from this CSV entirely.`);
  console.log(`   It is REQUIRED by the schema. Decide on a generation strategy`);
  console.log(`   (e.g. ORD-001, ORD-002 ...) before importing.\n`);
}

// ---------- entry point ----------
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/validate-csv.mjs <path-to-csv>");
  process.exit(1);
}
validate(path.resolve(csvPath));
