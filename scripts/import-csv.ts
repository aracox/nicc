import fs from 'fs';
import path from 'path';

async function importCsv() {
  const filePath = path.join(process.cwd(), 'data', 'Lotus’s Bangna–Trad (5032).csv');
  const fileName = path.basename(filePath, '.csv');
  const foodCourtName = fileName;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',');

  // Check headers: เลขร้านค้า,ชื่อร้านค้า,หมายเลขลูกค้า
  // Note: There might be a BOM or different encoding, but we'll assume standard for now.
  
  const restaurants = [];
  const now = new Date().toISOString();

  // Create Food Court
  const foodCourt = {
    id: 'fc-001',
    name: foodCourtName,
    createdAt: now
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 2) continue;

    // Handle quoted names if any (complex split)
    let shopNo, shopName, customerNo;
    if (lines[i].includes('"')) {
       // Simple regex for quoted CSV if needed, but let's try to be robust
       const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
       if (matches) {
          shopNo = matches[0].replace(/"/g, '');
          shopName = matches[1].replace(/"/g, '');
          customerNo = matches[2]?.replace(/"/g, '') || '';
       }
    } else {
       shopNo = cols[0];
       shopName = cols[1];
       customerNo = cols[2] || '';
    }

    restaurants.push({
      id: `rest-${String(i).padStart(3, '0')}`,
      foodCourtId: foodCourt.id,
      name: shopName,
      shopNumber: shopNo,
      customerNo: customerNo,
      status: 'ONBOARDED' as const,
      createdAt: now
    });
  }

  // Generate mock-data.ts content
  const mockDataContent = `// ──────────────────────────────────────────────
// Central mock data store — generated from CSV
// ──────────────────────────────────────────────

const now = new Date();
const day = (d: number) => new Date(now.getTime() - 86400000 * d).toISOString();
const hour = (h: number) => new Date(now.getTime() - 3600000 * h).toISOString();

// ── Food Courts ──────────────────────────────
export interface MockFoodCourt {
  id: string;
  name: string;
  createdAt: string;
}

export const foodCourts: MockFoodCourt[] = [
  ${JSON.stringify(foodCourt, null, 2)}
];

// ── Restaurants ──────────────────────────────
export interface MockRestaurant {
  id: string;
  foodCourtId?: string;
  name: string;
  shopNumber: string;
  customerNo: string;
  status: "ONBOARDED" | "PENDING" | "INACTIVE";
  createdAt: string;
}

export const restaurants: MockRestaurant[] = ${JSON.stringify(restaurants, null, 2)};

// ── Menu Items ───────────────────────────────
export interface MockMenuItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  createdAt: string;
}

export const menuItems: MockMenuItem[] = [];

// ── Standard Dishes + Ingredients ────────────
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

export const standardDishes: MockStandardDish[] = [];

// ── Menu-Dish Mappings ───────────────────────
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

export const menuMappings: MockMapping[] = [];

// ── Uploads ──────────────────────────────────
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

export const uploads: MockUpload[] = [];

// ── Insight Reports ──────────────────────────
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

export const insightReports: MockInsightReport[] = [];

// ── Helper: unmapped menu items ──────────────
export const unmappedMenuItems = [];
`;

  fs.writeFileSync(path.join(process.cwd(), 'lib', 'mock-data.ts'), mockDataContent);
  console.log('Successfully imported CSV and updated mock-data.ts');
}

importCsv().catch(console.error);
