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

  const initialCount = data.standardDishes.length;
  
  // Filter out any dishes that contain "วิธีทำ"
  data.standardDishes = data.standardDishes.filter(dish => !dish.name.includes("วิธีทำ"));

  const finalCount = data.standardDishes.length;
  
  if (initialCount !== finalCount) {
    fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Cleaned up ${initialCount - finalCount} recipes containing "วิธีทำ".`);
  } else {
    console.log('No recipes to clean up.');
  }
} else {
  console.log('mock-data.json not found, nothing to clean.');
}
