// ──────────────────────────────────────────────
// Central mock data store — replaces Prisma/DB
// ──────────────────────────────────────────────

const now = new Date();
const day = (d: number) => new Date(now.getTime() - 86400000 * d).toISOString();
const hour = (h: number) => new Date(now.getTime() - 3600000 * h).toISOString();

// ── Restaurants ──────────────────────────────
export interface MockRestaurant {
  id: string;
  name: string;
  foodType: string;
  province: string;
  district: string;
  status: "ONBOARDED" | "PENDING" | "INACTIVE";
  createdAt: string;
}

export const restaurants: MockRestaurant[] = [
  { id: "rest-001", name: "Pad Thai Palace", foodType: "Thai", province: "Bangkok", district: "Sathorn", status: "ONBOARDED", createdAt: day(60) },
  { id: "rest-002", name: "Som Tam Station", foodType: "Isaan", province: "Bangkok", district: "Sukhumvit", status: "ONBOARDED", createdAt: day(55) },
  { id: "rest-003", name: "Khao Soi Corner", foodType: "Northern Thai", province: "Chiang Mai", district: "Mueang", status: "ONBOARDED", createdAt: day(45) },
  { id: "rest-004", name: "Seafood Bay", foodType: "Seafood", province: "Phuket", district: "Patong", status: "PENDING", createdAt: day(30) },
  { id: "rest-005", name: "Noodle House Express", foodType: "Noodles", province: "Bangkok", district: "Silom", status: "INACTIVE", createdAt: day(20) },
];

// ── Menu Items ───────────────────────────────
export interface MockMenuItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  createdAt: string;
}

const menuCategories = ["Appetizer", "Main", "Soup", "Salad", "Dessert", "Drink", "Side", "Noodle", "Rice", "Special"];
const menuItemNames = [
  ["Spring Rolls", "Pad Thai", "Tom Yum Soup", "Green Papaya Salad", "Mango Sticky Rice", "Thai Iced Tea", "Steamed Rice", "Pad See Ew", "Fried Rice", "Chef Special Platter"],
  ["Som Tam", "Larb Moo", "Sticky Rice", "Isaan Sausage", "Grilled Chicken", "Nam Tok", "Bamboo Soup", "Papaya Pok Pok", "Glass Noodle Salad", "Isaan Platter"],
  ["Khao Soi Gai", "Sai Oua", "Khao Kha Moo", "Nam Prik Ong", "Kanom Jeen", "Northern Curry", "Fried Pork Belly", "Chiang Mai Noodle", "Sticky Rice Set", "Seasonal Special"],
  ["Grilled Prawns", "Steamed Fish", "Crab Curry", "Oyster Omelette", "Fish Cakes", "Squid Salad", "Tom Kha Talay", "Lobster Set", "Seafood Fried Rice", "Ocean Platter"],
  ["Boat Noodle", "Sukhothai Noodle", "Egg Noodle Soup", "Wonton Noodle", "Tom Yum Noodle", "Dry Noodle", "Glass Noodle Soup", "Rad Na", "Bamee Moo Daeng", "Noodle Combo"],
];

export const menuItems: MockMenuItem[] = restaurants.flatMap((r, ri) =>
  menuItemNames[ri].map((name, j) => ({
    id: `mi-${ri + 1}-${j + 1}`,
    restaurantId: r.id,
    name,
    category: menuCategories[j],
    createdAt: r.createdAt,
  }))
);

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

const dishSeed = [
  { name: "Pad Thai (Standard)", cuisineType: "Thai", ingredients: [{ ingredientName: "Rice Noodle", qty: 200, unit: "g" }, { ingredientName: "Shrimp", qty: 100, unit: "g" }, { ingredientName: "Tamarind Paste", qty: 30, unit: "ml" }, { ingredientName: "Palm Sugar", qty: 20, unit: "g" }] },
  { name: "Tom Yum Goong (Standard)", cuisineType: "Thai", ingredients: [{ ingredientName: "Shrimp", qty: 150, unit: "g" }, { ingredientName: "Lemongrass", qty: 2, unit: "stalk" }, { ingredientName: "Galangal", qty: 30, unit: "g" }, { ingredientName: "Lime Juice", qty: 30, unit: "ml" }] },
  { name: "Som Tam (Standard)", cuisineType: "Isaan", ingredients: [{ ingredientName: "Green Papaya", qty: 200, unit: "g" }, { ingredientName: "Cherry Tomato", qty: 50, unit: "g" }, { ingredientName: "Dried Shrimp", qty: 20, unit: "g" }, { ingredientName: "Fish Sauce", qty: 20, unit: "ml" }] },
  { name: "Khao Soi (Standard)", cuisineType: "Northern Thai", ingredients: [{ ingredientName: "Egg Noodle", qty: 200, unit: "g" }, { ingredientName: "Coconut Milk", qty: 200, unit: "ml" }, { ingredientName: "Curry Paste", qty: 50, unit: "g" }, { ingredientName: "Chicken Thigh", qty: 150, unit: "g" }] },
  { name: "Larb Moo (Standard)", cuisineType: "Isaan", ingredients: [{ ingredientName: "Ground Pork", qty: 200, unit: "g" }, { ingredientName: "Roasted Rice Powder", qty: 20, unit: "g" }, { ingredientName: "Shallot", qty: 30, unit: "g" }, { ingredientName: "Mint Leaves", qty: 10, unit: "g" }] },
  { name: "Green Curry (Standard)", cuisineType: "Thai", ingredients: [{ ingredientName: "Chicken Breast", qty: 200, unit: "g" }, { ingredientName: "Coconut Milk", qty: 250, unit: "ml" }, { ingredientName: "Green Curry Paste", qty: 50, unit: "g" }, { ingredientName: "Thai Basil", qty: 15, unit: "g" }] },
  { name: "Grilled Prawns (Standard)", cuisineType: "Seafood", ingredients: [{ ingredientName: "Tiger Prawn", qty: 300, unit: "g" }, { ingredientName: "Garlic", qty: 20, unit: "g" }, { ingredientName: "Butter", qty: 30, unit: "g" }, { ingredientName: "Coriander", qty: 10, unit: "g" }] },
  { name: "Boat Noodle (Standard)", cuisineType: "Noodle", ingredients: [{ ingredientName: "Rice Noodle", qty: 150, unit: "g" }, { ingredientName: "Pork Blood", qty: 30, unit: "ml" }, { ingredientName: "Pork Slice", qty: 80, unit: "g" }, { ingredientName: "Bean Sprout", qty: 50, unit: "g" }] },
  { name: "Mango Sticky Rice (Standard)", cuisineType: "Thai Dessert", ingredients: [{ ingredientName: "Sticky Rice", qty: 150, unit: "g" }, { ingredientName: "Coconut Cream", qty: 100, unit: "ml" }, { ingredientName: "Ripe Mango", qty: 200, unit: "g" }, { ingredientName: "Sugar", qty: 30, unit: "g" }] },
  { name: "Thai Iced Tea (Standard)", cuisineType: "Beverage", ingredients: [{ ingredientName: "Thai Tea Mix", qty: 30, unit: "g" }, { ingredientName: "Condensed Milk", qty: 40, unit: "ml" }, { ingredientName: "Evaporated Milk", qty: 30, unit: "ml" }, { ingredientName: "Sugar", qty: 20, unit: "g" }] },
];

export const standardDishes: MockStandardDish[] = dishSeed.map((d, i) => {
  const dishId = `dish-${String(i + 1).padStart(3, "0")}`;
  const ings = d.ingredients.map((ing, j) => ({
    id: `ing-${i + 1}-${j + 1}`,
    standardDishId: dishId,
    ingredientName: ing.ingredientName,
    qty: ing.qty,
    unit: ing.unit,
    createdAt: day(50),
  }));
  return {
    id: dishId,
    name: d.name,
    cuisineType: d.cuisineType,
    createdAt: day(50),
    _count: { ingredients: ings.length },
    ingredients: ings,
  };
});

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

const mappingSeed = [
  { ri: 0, mi: 1, di: 0, portion: 1.0 },
  { ri: 0, mi: 2, di: 1, portion: 1.0 },
  { ri: 0, mi: 4, di: 8, portion: 1.0 },
  { ri: 1, mi: 0, di: 2, portion: 1.0 },
  { ri: 1, mi: 1, di: 4, portion: 1.0 },
  { ri: 2, mi: 0, di: 3, portion: 1.5 },
  { ri: 3, mi: 0, di: 6, portion: 2.0 },
  { ri: 4, mi: 0, di: 7, portion: 1.0 },
];

// Set of mapped menu item IDs
const mappedMenuItemIds = new Set(
  mappingSeed.map((m) => menuItems[m.ri * 10 + m.mi].id)
);

export const menuMappings: MockMapping[] = mappingSeed.map((m, idx) => {
  const mi = menuItems[m.ri * 10 + m.mi];
  const dish = standardDishes[m.di];
  return {
    id: `map-${String(idx + 1).padStart(3, "0")}`,
    restaurantId: restaurants[m.ri].id,
    menuItemId: mi.id,
    standardDishId: dish.id,
    portionMultiplier: m.portion,
    createdAt: day(40),
    menuItem: { id: mi.id, restaurantId: mi.restaurantId, name: mi.name, category: mi.category, createdAt: mi.createdAt },
    standardDish: { id: dish.id, name: dish.name, cuisineType: dish.cuisineType, createdAt: dish.createdAt },
  };
});

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

export const uploads: MockUpload[] = [
  { id: "upl-001", restaurantId: "rest-001", source: "POS_EXPORT", status: "COMPLETED", fileKey: "uploads/2024/01/padthai-palace-jan.csv", receivedAt: day(5), processedAt: day(4), errorMessage: null, restaurant: { id: "rest-001", name: "Pad Thai Palace" } },
  { id: "upl-002", restaurantId: "rest-001", source: "POS_EXPORT", status: "COMPLETED", fileKey: "uploads/2024/02/padthai-palace-feb.csv", receivedAt: day(2), processedAt: day(1), errorMessage: null, restaurant: { id: "rest-001", name: "Pad Thai Palace" } },
  { id: "upl-003", restaurantId: "rest-002", source: "PAPER", status: "COMPLETED", fileKey: "uploads/2024/01/somtam-station-jan.pdf", receivedAt: day(4), processedAt: day(3), errorMessage: null, restaurant: { id: "rest-002", name: "Som Tam Station" } },
  { id: "upl-004", restaurantId: "rest-002", source: "POS_EXPORT", status: "PROCESSING", fileKey: "uploads/2024/02/somtam-station-feb.csv", receivedAt: hour(1), processedAt: null, errorMessage: null, restaurant: { id: "rest-002", name: "Som Tam Station" } },
  { id: "upl-005", restaurantId: "rest-003", source: "POS_EXPORT", status: "RECEIVED", fileKey: "uploads/2024/02/khaosoi-corner-feb.csv", receivedAt: now.toISOString(), processedAt: null, errorMessage: null, restaurant: { id: "rest-003", name: "Khao Soi Corner" } },
  { id: "upl-006", restaurantId: "rest-003", source: "PAPER", status: "FAILED", fileKey: "uploads/2024/01/khaosoi-corner-jan.pdf", receivedAt: day(6), processedAt: day(5), errorMessage: "OCR failed: image quality too low on page 3", restaurant: { id: "rest-003", name: "Khao Soi Corner" } },
  { id: "upl-007", restaurantId: "rest-004", source: "POS_EXPORT", status: "RECEIVED", fileKey: "uploads/2024/02/seafood-bay-feb.csv", receivedAt: now.toISOString(), processedAt: null, errorMessage: null, restaurant: { id: "rest-004", name: "Seafood Bay" } },
  { id: "upl-008", restaurantId: "rest-004", source: "PAPER", status: "FAILED", fileKey: "uploads/2024/01/seafood-bay-jan.pdf", receivedAt: day(3), processedAt: day(2), errorMessage: "File format not supported: .tiff", restaurant: { id: "rest-004", name: "Seafood Bay" } },
];

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

export const insightReports: MockInsightReport[] = [
  { id: "rpt-001", restaurantId: "rest-001", periodStart: "2024-01-01T00:00:00Z", periodEnd: "2024-01-31T23:59:59Z", status: "PUBLISHED", payloadJson: { topDish: "Pad Thai", totalOrders: 1520, avgOrderValue: 185, growthPct: 12.3 }, createdAt: day(15), restaurant: { id: "rest-001", name: "Pad Thai Palace" } },
  { id: "rpt-002", restaurantId: "rest-001", periodStart: "2024-02-01T00:00:00Z", periodEnd: "2024-02-29T23:59:59Z", status: "DRAFT", payloadJson: { topDish: "Pad Thai", totalOrders: 1380, avgOrderValue: 192, growthPct: -9.2 }, createdAt: day(5), restaurant: { id: "rest-001", name: "Pad Thai Palace" } },
  { id: "rpt-003", restaurantId: "rest-002", periodStart: "2024-01-01T00:00:00Z", periodEnd: "2024-01-31T23:59:59Z", status: "PUBLISHED", payloadJson: { topDish: "Som Tam", totalOrders: 980, avgOrderValue: 120, growthPct: 8.5 }, createdAt: day(14), restaurant: { id: "rest-002", name: "Som Tam Station" } },
  { id: "rpt-004", restaurantId: "rest-003", periodStart: "2024-01-01T00:00:00Z", periodEnd: "2024-01-31T23:59:59Z", status: "DRAFT", payloadJson: { topDish: "Khao Soi Gai", totalOrders: 640, avgOrderValue: 165, growthPct: 15.0 }, createdAt: day(13), restaurant: { id: "rest-003", name: "Khao Soi Corner" } },
  { id: "rpt-005", restaurantId: "rest-004", periodStart: "2024-01-01T00:00:00Z", periodEnd: "2024-01-31T23:59:59Z", status: "DRAFT", payloadJson: { topDish: "Grilled Prawns", totalOrders: 450, avgOrderValue: 350, growthPct: 3.2 }, createdAt: day(10), restaurant: { id: "rest-004", name: "Seafood Bay" } },
];

// ── Helper: unmapped menu items ──────────────
export const unmappedMenuItems = menuItems
  .filter((mi) => !mappedMenuItemIds.has(mi.id))
  .map((mi) => ({
    ...mi,
    restaurant: {
      id: restaurants.find((r) => r.id === mi.restaurantId)!.id,
      name: restaurants.find((r) => r.id === mi.restaurantId)!.name,
    },
  }));
