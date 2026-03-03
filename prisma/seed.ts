import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.menuDishMapping.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.insightReport.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.standardDish.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  // 1. Admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@nicc.local",
      name: "NICC Admin",
      role: "ADMIN",
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 2. Restaurants
  const restaurantData = [
    { name: "Pad Thai Palace", foodType: "Thai", province: "Bangkok", district: "Sathorn", status: "ONBOARDED" as const },
    { name: "Som Tam Station", foodType: "Isaan", province: "Bangkok", district: "Sukhumvit", status: "ONBOARDED" as const },
    { name: "Khao Soi Corner", foodType: "Northern Thai", province: "Chiang Mai", district: "Mueang", status: "ONBOARDED" as const },
    { name: "Seafood Bay", foodType: "Seafood", province: "Phuket", district: "Patong", status: "PENDING" as const },
    { name: "Noodle House Express", foodType: "Noodles", province: "Bangkok", district: "Silom", status: "INACTIVE" as const },
  ];

  const restaurants = await Promise.all(
    restaurantData.map((r) => prisma.restaurant.create({ data: r }))
  );
  console.log(`Created ${restaurants.length} restaurants`);

  // 3. Menu items (10 per restaurant)
  const menuCategories = ["Appetizer", "Main", "Soup", "Salad", "Dessert", "Drink", "Side", "Noodle", "Rice", "Special"];
  const menuItemNames = [
    ["Spring Rolls", "Pad Thai", "Tom Yum Soup", "Green Papaya Salad", "Mango Sticky Rice", "Thai Iced Tea", "Steamed Rice", "Pad See Ew", "Fried Rice", "Chef Special Platter"],
    ["Som Tam", "Larb Moo", "Sticky Rice", "Isaan Sausage", "Grilled Chicken", "Nam Tok", "Bamboo Soup", "Papaya Pok Pok", "Glass Noodle Salad", "Isaan Platter"],
    ["Khao Soi Gai", "Sai Oua", "Khao Kha Moo", "Nam Prik Ong", "Kanom Jeen", "Northern Curry", "Fried Pork Belly", "Chiang Mai Noodle", "Sticky Rice Set", "Seasonal Special"],
    ["Grilled Prawns", "Steamed Fish", "Crab Curry", "Oyster Omelette", "Fish Cakes", "Squid Salad", "Tom Kha Talay", "Lobster Set", "Seafood Fried Rice", "Ocean Platter"],
    ["Boat Noodle", "Sukhothai Noodle", "Egg Noodle Soup", "Wonton Noodle", "Tom Yum Noodle", "Dry Noodle", "Glass Noodle Soup", "Rad Na", "Bamee Moo Daeng", "Noodle Combo"],
  ];

  const allMenuItems = [];
  for (let i = 0; i < restaurants.length; i++) {
    for (let j = 0; j < 10; j++) {
      const item = await prisma.menuItem.create({
        data: {
          restaurantId: restaurants[i].id,
          name: menuItemNames[i][j],
          category: menuCategories[j],
        },
      });
      allMenuItems.push(item);
    }
  }
  console.log(`Created ${allMenuItems.length} menu items`);

  // 4. Standard dishes with recipe ingredients
  const standardDishData = [
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

  const standardDishes = [];
  for (const dish of standardDishData) {
    const created = await prisma.standardDish.create({
      data: {
        name: dish.name,
        cuisineType: dish.cuisineType,
        ingredients: {
          create: dish.ingredients,
        },
      },
    });
    standardDishes.push(created);
  }
  console.log(`Created ${standardDishes.length} standard dishes with ingredients`);

  // 5. Menu-dish mappings (map some menu items to standard dishes)
  const mappings = [
    { restaurantIdx: 0, menuItemIdx: 1, dishIdx: 0, portion: 1.0 },
    { restaurantIdx: 0, menuItemIdx: 2, dishIdx: 1, portion: 1.0 },
    { restaurantIdx: 0, menuItemIdx: 4, dishIdx: 8, portion: 1.0 },
    { restaurantIdx: 1, menuItemIdx: 0, dishIdx: 2, portion: 1.0 },
    { restaurantIdx: 1, menuItemIdx: 1, dishIdx: 4, portion: 1.0 },
    { restaurantIdx: 2, menuItemIdx: 0, dishIdx: 3, portion: 1.5 },
    { restaurantIdx: 3, menuItemIdx: 0, dishIdx: 6, portion: 2.0 },
    { restaurantIdx: 4, menuItemIdx: 0, dishIdx: 7, portion: 1.0 },
  ];

  for (const m of mappings) {
    const restaurant = restaurants[m.restaurantIdx];
    const menuItem = allMenuItems[m.restaurantIdx * 10 + m.menuItemIdx];
    const dish = standardDishes[m.dishIdx];
    await prisma.menuDishMapping.create({
      data: {
        restaurantId: restaurant.id,
        menuItemId: menuItem.id,
        standardDishId: dish.id,
        portionMultiplier: m.portion,
      },
    });
  }
  console.log(`Created ${mappings.length} menu-dish mappings`);

  // 6. Uploads
  const now = new Date();
  const uploadData = [
    { restaurantId: restaurants[0].id, source: "POS_EXPORT" as const, status: "COMPLETED" as const, fileKey: "uploads/2024/01/padthai-palace-jan.csv", receivedAt: new Date(now.getTime() - 86400000 * 5), processedAt: new Date(now.getTime() - 86400000 * 4) },
    { restaurantId: restaurants[0].id, source: "POS_EXPORT" as const, status: "COMPLETED" as const, fileKey: "uploads/2024/02/padthai-palace-feb.csv", receivedAt: new Date(now.getTime() - 86400000 * 2), processedAt: new Date(now.getTime() - 86400000 * 1) },
    { restaurantId: restaurants[1].id, source: "PAPER" as const, status: "COMPLETED" as const, fileKey: "uploads/2024/01/somtam-station-jan.pdf", receivedAt: new Date(now.getTime() - 86400000 * 4), processedAt: new Date(now.getTime() - 86400000 * 3) },
    { restaurantId: restaurants[1].id, source: "POS_EXPORT" as const, status: "PROCESSING" as const, fileKey: "uploads/2024/02/somtam-station-feb.csv", receivedAt: new Date(now.getTime() - 3600000) },
    { restaurantId: restaurants[2].id, source: "POS_EXPORT" as const, status: "RECEIVED" as const, fileKey: "uploads/2024/02/khaosoi-corner-feb.csv", receivedAt: now },
    { restaurantId: restaurants[2].id, source: "PAPER" as const, status: "FAILED" as const, fileKey: "uploads/2024/01/khaosoi-corner-jan.pdf", receivedAt: new Date(now.getTime() - 86400000 * 6), processedAt: new Date(now.getTime() - 86400000 * 5), errorMessage: "OCR failed: image quality too low on page 3" },
    { restaurantId: restaurants[3].id, source: "POS_EXPORT" as const, status: "RECEIVED" as const, fileKey: "uploads/2024/02/seafood-bay-feb.csv", receivedAt: now },
    { restaurantId: restaurants[3].id, source: "PAPER" as const, status: "FAILED" as const, fileKey: "uploads/2024/01/seafood-bay-jan.pdf", receivedAt: new Date(now.getTime() - 86400000 * 3), processedAt: new Date(now.getTime() - 86400000 * 2), errorMessage: "File format not supported: .tiff" },
  ];

  for (const u of uploadData) {
    await prisma.upload.create({ data: u });
  }
  console.log(`Created ${uploadData.length} uploads`);

  // 7. Insight reports
  const reportData = [
    {
      restaurantId: restaurants[0].id,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
      status: "PUBLISHED" as const,
      payloadJson: { topDish: "Pad Thai", totalOrders: 1520, avgOrderValue: 185, growthPct: 12.3 },
    },
    {
      restaurantId: restaurants[0].id,
      periodStart: new Date("2024-02-01"),
      periodEnd: new Date("2024-02-29"),
      status: "DRAFT" as const,
      payloadJson: { topDish: "Pad Thai", totalOrders: 1380, avgOrderValue: 192, growthPct: -9.2 },
    },
    {
      restaurantId: restaurants[1].id,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
      status: "PUBLISHED" as const,
      payloadJson: { topDish: "Som Tam", totalOrders: 980, avgOrderValue: 120, growthPct: 8.5 },
    },
    {
      restaurantId: restaurants[2].id,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
      status: "DRAFT" as const,
      payloadJson: { topDish: "Khao Soi Gai", totalOrders: 640, avgOrderValue: 165, growthPct: 15.0 },
    },
    {
      restaurantId: restaurants[3].id,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
      status: "DRAFT" as const,
      payloadJson: { topDish: "Grilled Prawns", totalOrders: 450, avgOrderValue: 350, growthPct: 3.2 },
    },
  ];

  for (const r of reportData) {
    await prisma.insightReport.create({ data: r });
  }
  console.log(`Created ${reportData.length} insight reports`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
