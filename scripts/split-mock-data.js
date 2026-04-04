#!/usr/bin/env node
/**
 * split-mock-data.js
 *
 * Splits the monolithic lib/mock-data.json into:
 *   lib/data/food-courts.json
 *   lib/data/restaurants.json
 *   lib/data/menu-items.json
 *   lib/data/standard-dishes.json
 *   lib/data/menu-mappings.json
 *   lib/data/uploads.json
 *   lib/data/insight-reports.json
 *   lib/data/transactions/sell-transactions-YYYY-MM.json  (one per month)
 *
 * Run once from project root:
 *   node scripts/split-mock-data.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "lib", "mock-data.json");
const DATA_DIR = path.join(ROOT, "lib", "data");
const TX_DIR = path.join(DATA_DIR, "transactions");

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created dir: ${path.relative(ROOT, dir)}`);
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  const stat = fs.statSync(filePath);
  const kb = (stat.size / 1024).toFixed(1);
  console.log(`  ✔  ${path.relative(ROOT, filePath)}  (${kb} KB)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("\n📂 Reading mock-data.json …");
if (!fs.existsSync(SRC)) {
  console.error(`  ✘ Not found: ${SRC}`);
  process.exit(1);
}

const raw = fs.readFileSync(SRC, "utf8");
console.log(`  File size: ${(raw.length / 1024 / 1024).toFixed(1)} MB`);

const data = JSON.parse(raw);

ensureDir(DATA_DIR);
ensureDir(TX_DIR);

// ── Write master data files ───────────────────────────────────────────────────

console.log("\n📄 Writing master data files …");

const masterSections = [
  ["food-courts.json",     data.foodCourts     ?? []],
  ["restaurants.json",     data.restaurants    ?? []],
  ["menu-items.json",      data.menuItems      ?? []],
  ["standard-dishes.json", data.standardDishes ?? []],
  ["menu-mappings.json",   data.menuMappings   ?? []],
  ["uploads.json",         data.uploads        ?? []],
  ["insight-reports.json", data.insightReports ?? []],
];

for (const [filename, arr] of masterSections) {
  writeJson(path.join(DATA_DIR, filename), arr);
}

// ── Write transaction files (one per YYYY-MM) ─────────────────────────────────

console.log("\n💳 Splitting sell transactions by month …");

const transactions = data.sellTransactions ?? [];
console.log(`  Total transactions: ${transactions.length.toLocaleString()}`);

// Group by YYYY-MM derived from dateTime (fall back to createdAt)
const byMonth = {};
for (const tx of transactions) {
  const dt = tx.dateTime || tx.createdAt || "";
  const month = dt.slice(0, 7); // "YYYY-MM"
  const key = month || "unknown";
  if (!byMonth[key]) byMonth[key] = [];
  byMonth[key].push(tx);
}

const months = Object.keys(byMonth).sort();
for (const month of months) {
  const filename = `sell-transactions-${month}.json`;
  writeJson(path.join(TX_DIR, filename), byMonth[month]);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("\n✅ Done!");
console.log(`   Master data files : ${masterSections.length}`);
console.log(`   Transaction files : ${months.length}  (${months[0]} → ${months[months.length - 1]})`);
console.log(`\n⚠️  Next steps:`);
console.log(`   1. Verify files look correct under lib/data/`);
console.log(`   2. lib/mock-data.json and lib/data/transactions/ are gitignored — safe to skip committing`);
console.log(`   3. Commit lib/data/*.json (master data) to git\n`);
