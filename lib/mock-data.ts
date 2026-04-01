import fs from "fs";
import path from "path";

// ── Types ────────────────────────────────────

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
  transactionId: string;
  shopNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  dateTime: string;
  createdAt: string;
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
}

// ── Store Helper ─────────────────────────────

const JSON_PATH = path.join(process.cwd(), "lib", "mock-data.json");

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
    if (fs.existsSync(JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
      if (!data.sellTransactions) data.sellTransactions = [];
      globalForMock.mockData = data;
    } else {
      // Fallback/Initial state
      globalForMock.mockData = {
        foodCourts: [],
        restaurants: [],
        menuItems: [],
        standardDishes: [],
        menuMappings: [],
        uploads: [],
        insightReports: [],
        sellTransactions: [],
      };
    }
  }
  return globalForMock.mockData!;
};

export const saveMockData = (data: MockData) => {
  globalForMock.mockData = data;
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
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
