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

  let cleanedCount = 0;
  
  // Clean up recipe names
  data.standardDishes.forEach(dish => {
    const newName = dish.name.replace(/\s*\(.*?\)/g, "").replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu, "").replace(/["“”]/g, "").trim();
    if (dish.name !== newName) {
      dish.name = newName;
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Cleaned up ${cleanedCount} recipe names by removing emojis/quotes.`);
  } else {
    console.log('No recipe names needed cleaning.');
  }
} else {
  console.log('mock-data.json not found, nothing to clean.');
}
