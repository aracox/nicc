const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function toIso(date, time) {
  if (!date || !time) return new Date().toISOString();

  const parts = date.split('/');
  if (parts.length !== 3) return new Date().toISOString();

  const mm = parts[0].padStart(2, '0');
  const dd = parts[1].padStart(2, '0');
  const yyyy = parts[2];

  const raw = `${yyyy}-${mm}-${dd}T${time}`;
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

async function main() {
  const root = process.cwd();
  const csvPath = path.join(root, 'data', 'Lotus’s Bangna–Trad SalesTransaction.csv');
  const jsonPath = path.join(root, 'lib', 'mock-data.json');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`mock-data.json not found: ${jsonPath}`);
  }

  const mockData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  let row = 0;
  let imported = 0;
  let skipped = 0;
  const sellTransactions = [];

  for await (const line of rl) {
    if (!line || !line.trim()) continue;
    row += 1;

    if (!headers) {
      headers = parseCsvLine(line).map((h) => h.trim().replace(/^"|"$/g, ''));
      continue;
    }

    const cols = parseCsvLine(line);
    if (cols.length < headers.length) {
      skipped += 1;
      continue;
    }

    const rec = {};
    for (let i = 0; i < headers.length; i += 1) {
      rec[headers[i]] = (cols[i] ?? '').trim().replace(/^"|"$/g, '');
    }

    const sysBatch = rec.SYS_BATCH || 'BATCH-UNKNOWN';
    const shopNumber = rec.SHOP_ID || '';
    const slipNo = rec.SLIP_NO || '';
    const shopName = rec.SHOP_NAMES || '';
    const itemCode = rec.ITEM_CODE || '';
    const itemName = rec.ITEM_NAMES || '';
    const date = rec.DATE || '';
    const time = rec.TIME || '';

    if (!shopNumber || !slipNo || !date || !time) {
      skipped += 1;
      continue;
    }

    const pricing = Number((rec.PRICING || '0').replace(/,/g, '')) || 0;
    const quantity = Number((rec.QUANTITY || '0').replace(/,/g, '')) || 0;
    const total = Number((rec.TOTALS || '0').replace(/,/g, '')) || 0;

    const tx = {
      id: crypto.randomUUID(),
      sysBatch,
      shopNumber,
      slipNo,
      shopName,
      itemCode,
      itemName,
      pricing,
      quantity,
      total,
      date,
      time,
      dateTime: toIso(date, time),
      createdAt: new Date().toISOString(),
    };

    sellTransactions.push(tx);
    imported += 1;
  }

  mockData.sellTransactions = sellTransactions;
  fs.writeFileSync(jsonPath, JSON.stringify(mockData, null, 2));

  const byShop = new Map();
  for (const tx of sellTransactions) {
    byShop.set(tx.shopNumber, (byShop.get(tx.shopNumber) || 0) + 1);
  }

  console.log(JSON.stringify({
    file: path.basename(csvPath),
    totalRowsRead: row - 1,
    imported,
    skipped,
    distinctShopCount: byShop.size,
    shop803207Count: byShop.get('803207') || 0,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
