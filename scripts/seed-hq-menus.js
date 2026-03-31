const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '../lib/mock-data.json');

if (fs.existsSync(mockDataPath)) {
  const fileContent = fs.readFileSync(mockDataPath, 'utf8');
  let data;
  try {
    data = JSON.parse(fileContent);
  } catch(e) {
    console.error("Error parsing mock data", e);
    process.exit(1);
  }

  // Find Lotus HQ restaurants
  const hqRestaurants = data.restaurants.filter(r => r.id.startsWith('rest-hq-'));
  
  if (hqRestaurants.length === 0) {
    console.log("No HQ restaurants found.");
    process.exit(0);
  }

  let addedCount = 0;
  
  // For each HQ restaurant, add 2 mock menu items
  hqRestaurants.forEach((rest, index) => {
    // Just to have some variety
    const basePrices = [45, 50, 55, 60, 65, 70];
    
    data.menuItems.push({
      id: `menu-hq-${Date.now()}-${index}-1`,
      restaurantId: rest.id,
      name: `เมนูพรีเมียม ${index + 1} (HQ)`,
      category: "General",
      price: basePrices[index % basePrices.length],
      createdAt: new Date().toISOString()
    });
    
    data.menuItems.push({
      id: `menu-hq-${Date.now()}-${index}-2`,
      restaurantId: rest.id,
      name: `เมนูพิเศษ ${index + 1} (HQ)`,
      category: "General",
      price: basePrices[(index + 1) % basePrices.length],
      createdAt: new Date().toISOString()
    });
    
    addedCount += 2;
  });

  fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Successfully added ${addedCount} menu items to ${hqRestaurants.length} Lotus HQ restaurants!`);
} else {
  console.log('mock-data.json not found.');
}
