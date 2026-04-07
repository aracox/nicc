import fs from "fs";
import path from "path";

// ── Types ────────────────────────────────────────

export interface MockFoodCourt {
  id: string;
  name: string;
  createdAt: string;
}

export interface MockRestaurant {
  id: string;
  foodCourtId?: string;
  name: string;
  shopNumber: string;
  customerNo: string;
  actFlag?: string;
  status: "ONBOARDED" | "PENDING" | "INACTIVE";
  createdAt: string;
}

export interface MockMenuItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  price?: number;
  itemCode?: string;
  itemButton?: string;
  actFlag?: string;
  createdAt: string;
}

export interface MockIngredient {
  id: string;
  standardDishId: string;
  ingredientName: string;
  qty: number;
  unit: string;
  createdAt: string;
}

export interface MockStandardDish {
  id: string;
  name: string;
  cuisineType: string;
  createdAt: string;
  _count: { ingredients: number };
  ingredients: MockIngredient[];
}

export interface MockMapping {
  id: string;
  restaurantId: string;
  menuItemId: string;
  standardDishId: string;
  portionMultiplier: number;
  createdAt: string;
  menuItem: { id: string; restaurantId: string; name: string; category: string; createdAt: string };
  standardDish: { id: string; name: string; cuisineType: string; createdAt: string };
}

export interface MockUpload {
  id: string;
  restaurantId: string;
  source: "POS_EXPORT" | "PAPER";
  status: "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileKey: string;
  receivedAt: string;
  processedAt: string | null;
  errorMessage: string | null;
  restaurant: { id: string; name: string };
}

export interface MockInsightReport {
  id: string;
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "PUBLISHED";
  payloadJson: Record<string, unknown>;
  createdAt: string;
  restaurant: { id: string; name: string };
}

export interface MockSellTransaction {
  id: string;
  sysBatch: string;
  shopNumber: string;
  slipNo: string;
  shopName: string;
  itemCode: string;
  itemName: string;
  pricing: number;
  quantity: number;
  total: number;
  date: string;
  time: string;
  dateTime: string;
  createdAt: string;
}

export interface MockRestaurantInventory {
  id: string;
  restaurantId: string;
  ingredientName: string;
  initialStock: number;
  unit: string;
  updatedAt: string;
}

export interface MockData {
  foodCourts: MockFoodCourt[];
  restaurants: MockRestaurant[];
  menuItems: MockMenuItem[];
  standardDishes: MockStandardDish[];
  menuMappings: MockMapping[];
  uploads: MockUpload[];
  insightReports: MockInsightReport[];
  sellTransactions: MockSellTransaction[];
  inventory: MockRestaurantInventory[];
}

// ── File Paths ───────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "lib", "data");
const TX_DIR = path.join(DATA_DIR, "transactions");

/** Read a JSON array from a file, return [] if missing */
function readJsonArray<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T[];
  } catch {
    return [];
  }
}

/** Write a JSON array to a file */
function writeJsonArray(filePath: string, data: unknown[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ── Transaction helpers ──────────────────────────

/** Derive the YYYY-MM bucket from a transaction's dateTime or createdAt */
function txMonth(tx: MockSellTransaction): string {
  const dt = tx.dateTime || tx.createdAt || "";
  const m = dt.slice(0, 7);
  return m || "unknown";
}

/** Load all monthly transaction files and merge into a flat array */
function loadTransactions(): MockSellTransaction[] {
  if (!fs.existsSync(TX_DIR)) return [];
  const files = fs.readdirSync(TX_DIR).filter((f) => f.startsWith("sell-transactions-") && f.endsWith(".json"));
  const all: MockSellTransaction[] = [];
  for (const file of files) {
    const arr = readJsonArray<MockSellTransaction>(path.join(TX_DIR, file));
    for (const tx of arr) all.push(tx);
  }
  return all;
}

/** Max records per file — keeps each JSON comfortably under 100 MB */
const MAX_RECORDS_PER_FILE = 80_000;

/** Save transactions, grouping into per-month files (chunked if large) */
function saveTransactions(transactions: MockSellTransaction[]): void {
  if (!fs.existsSync(TX_DIR)) {
    fs.mkdirSync(TX_DIR, { recursive: true });
  }

  // Group by month bucket (derived from dateTime/createdAt)
  const byMonth: Record<string, MockSellTransaction[]> = {};
  for (const tx of transactions) {
    const m = txMonth(tx);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(tx);
  }

  // Delete ALL existing transaction files before rewriting to avoid stale chunks
  if (fs.existsSync(TX_DIR)) {
    for (const f of fs.readdirSync(TX_DIR)) {
      if (f.startsWith("sell-transactions-") && f.endsWith(".json")) {
        fs.unlinkSync(path.join(TX_DIR, f));
      }
    }
  }

  // Write each month — split into chunks if too large
  for (const [month, txs] of Object.entries(byMonth)) {
    if (txs.length <= MAX_RECORDS_PER_FILE) {
      // Single file for this month
      writeJsonArray(path.join(TX_DIR, `sell-transactions-${month}.json`), txs);
    } else {
      // Split into part files: sell-transactions-YYYY-MM-P1.json, P2.json, …
      const parts = Math.ceil(txs.length / MAX_RECORDS_PER_FILE);
      for (let p = 0; p < parts; p++) {
        const chunk = txs.slice(p * MAX_RECORDS_PER_FILE, (p + 1) * MAX_RECORDS_PER_FILE);
        writeJsonArray(path.join(TX_DIR, `sell-transactions-${month}-P${p + 1}.json`), chunk);
      }
    }
  }
}

// ── Store Helper ─────────────────────────────────


/**
 * Singleton Pattern for In-Memory State Sync
 * This ensures all API routes share the same reference in dev mode.
 */
const globalForMock = globalThis as unknown as {
  mockData?: MockData;
};

export const getMockData = (): MockData => {
  // In dev, always read from disk to allow manual edits and process sync
  if (process.env.NODE_ENV !== "production" || !globalForMock.mockData) {
    if (!fs.existsSync(DATA_DIR)) {
      // No split files yet — return empty state
      globalForMock.mockData = {
        foodCourts: [],
        restaurants: [],
        menuItems: [],
        standardDishes: [],
        menuMappings: [],
        uploads: [],
        insightReports: [],
        sellTransactions: [],
        inventory: [],
      };
    } else {
      globalForMock.mockData = {
        foodCourts:     readJsonArray<MockFoodCourt>(path.join(DATA_DIR, "food-courts.json")),
        restaurants:    readJsonArray<MockRestaurant>(path.join(DATA_DIR, "restaurants.json")),
        menuItems:      readJsonArray<MockMenuItem>(path.join(DATA_DIR, "menu-items.json")),
        standardDishes: readJsonArray<MockStandardDish>(path.join(DATA_DIR, "standard-dishes.json")),
        menuMappings:   readJsonArray<MockMapping>(path.join(DATA_DIR, "menu-mappings.json")),
        uploads:        readJsonArray<MockUpload>(path.join(DATA_DIR, "uploads.json")),
        insightReports: readJsonArray<MockInsightReport>(path.join(DATA_DIR, "insight-reports.json")),
        inventory:      readJsonArray<MockRestaurantInventory>(path.join(DATA_DIR, "inventory.json")),
        sellTransactions: loadTransactions(),
      };
    }
  }
  return globalForMock.mockData!;
};

export const saveMockData = (data: MockData) => {
  globalForMock.mockData = data;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Write each master data section to its own file
  writeJsonArray(path.join(DATA_DIR, "food-courts.json"),     data.foodCourts);
  writeJsonArray(path.join(DATA_DIR, "restaurants.json"),     data.restaurants);
  writeJsonArray(path.join(DATA_DIR, "menu-items.json"),      data.menuItems);
  writeJsonArray(path.join(DATA_DIR, "standard-dishes.json"), data.standardDishes);
  writeJsonArray(path.join(DATA_DIR, "menu-mappings.json"),   data.menuMappings);
  writeJsonArray(path.join(DATA_DIR, "uploads.json"),         data.uploads);
  writeJsonArray(path.join(DATA_DIR, "insight-reports.json"), data.insightReports);
  writeJsonArray(path.join(DATA_DIR, "inventory.json"),       data.inventory);

  // Write transactions split by month
  saveTransactions(data.sellTransactions);
};

// ── Legacy Exports (for minimal breakage) ─────
// Note: These will be static snapshots if used directly. 
// Routes should switch to getMockData().
export const foodCourts = getMockData().foodCourts;
export const restaurants = getMockData().restaurants;
export const menuItems = getMockData().menuItems;
export const standardDishes = getMockData().standardDishes;
export const menuMappings = getMockData().menuMappings;
export const uploads = getMockData().uploads;
export const insightReports = getMockData().insightReports;
export const sellTransactions = getMockData().sellTransactions;
export const unmappedMenuItems: any[] = [];
