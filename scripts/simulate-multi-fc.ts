import fs from 'fs';
import path from 'path';

function simulateMultiFoodCourt() {
  const filePath = path.join(process.cwd(), 'lib', 'mock-data.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract current restaurants and food courts
  // This is a bit fragile if manual regex, but since I generated it, I know the format.
  
  const now = new Date().toISOString();
  const fc2 = {
    id: 'fc-002',
    name: "Lotus's HQ",
    createdAt: now
  };

  // We'll use a simpler approach: just append the new data to the arrays in the file
  // Or better, let's just regenerate the whole file with two food courts
  
  // I'll grab the current restaurants and duplicate them
  // Since I have the file content, I can parse the JSON part or just use the existing script logic.
  
  // Let's reuse the import logic but with two iterations
}

// Actually, I'll just rewrite mock-data.ts directly with the new entries.
// I'll read the current restaurants out of the file first.
const mockPath = path.join(process.cwd(), 'lib', 'mock-data.ts');
const currentContent = fs.readFileSync(mockPath, 'utf8');

// Find the restaurants array string
const restaurantsMatch = currentContent.match(/export const restaurants: MockRestaurant\[\] = (\[[\s\S]*?\]);/);
if (!restaurantsMatch) {
  console.error("Could not find restaurants array in mock-data.ts");
  process.exit(1);
}

const currentRestaurants = JSON.parse(restaurantsMatch[1]);
const duplicatedRestaurants = currentRestaurants.map((r: any, i: number) => ({
  ...r,
  id: `rest-hq-${String(i + 1).padStart(3, '0')}`,
  foodCourtId: 'fc-002',
  status: i % 3 === 0 ? 'PENDING' : 'ONBOARDED' // Mix it up for UX review
}));

const allRestaurants = [...currentRestaurants, ...duplicatedRestaurants];

const foodCourts = [
  {
    id: "fc-001",
    name: "Lotus’s Bangna–Trad (5032)",
    createdAt: "2026-03-20T19:09:04.353Z"
  },
  {
    id: "fc-002",
    name: "Lotus's HQ",
    createdAt: new Date().toISOString()
  }
];

const newContent = currentContent
  .replace(/export const foodCourts: MockFoodCourt\[\] = \[[\s\S]*?\];/, `export const foodCourts: MockFoodCourt[] = ${JSON.stringify(foodCourts, null, 2)};`)
  .replace(/export const restaurants: MockRestaurant\[\] = \[[\s\S]*?\];/, `export const restaurants: MockRestaurant[] = ${JSON.stringify(allRestaurants, null, 2)};`);

fs.writeFileSync(mockPath, newContent);
console.log("Successfully simulated multiple food courts.");
