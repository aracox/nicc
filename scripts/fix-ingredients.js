const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '..', 'lib', 'mock-data.json');

try {
  const dataRaw = fs.readFileSync(mockDataPath, 'utf8');
  const data = JSON.parse(dataRaw);
  let changed = 0;

  data.standardDishes.forEach(dish => {
    if (!dish.ingredients) return;
    
    dish.ingredients.forEach(ing => {
      // Only process if qty is 1 and unit is "unit" (which usually means it was skipped in parsing)
      if (ing.qty === 1 && ing.unit === "unit") {
        let ingredientName = ing.ingredientName;
        // The regex looks for any leading text, a number (decimal or fraction), and trailing text
        const match = ingredientName.match(/^(.*?)\s*(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*?)$/);
        
        if (match && match[1].trim().length > 0) {
          ing.ingredientName = match[1].trim();
          const numStr = match[2];
          
          if (numStr.includes('/')) {
            const [num, den] = numStr.split('/');
            ing.qty = parseFloat(num) / parseFloat(den);
          } else {
            ing.qty = parseFloat(numStr);
          }
          
          let unit = match[3] ? match[3].trim() : "unit";
          if (unit.trim() === "") unit = "unit";
          ing.unit = unit;
          
          changed++;
        }
      }
    });
  });

  fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2));
  console.log(`Successfully fixed ${changed} ingredients.`);
} catch (error) {
  console.error('Error fixing ingredients:', error);
}
