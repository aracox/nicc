const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '..', 'lib', 'mock-data.json');

try {
  const dataRaw = fs.readFileSync(mockDataPath, 'utf8');
  const data = JSON.parse(dataRaw);
  
  const dishGroups = new Map();

  // Group by name
  data.standardDishes.forEach(dish => {
    if (!dishGroups.has(dish.name)) {
      dishGroups.set(dish.name, []);
    }
    dishGroups.get(dish.name).push(dish);
  });

  let removedCount = 0;
  let updatedMappingsCount = 0;
  const originalDishCount = data.standardDishes.length;
  
  const uniqueStandardDishes = [];

  // Identify primary vs duplicates, then process
  dishGroups.forEach((group, name) => {
    // Keep the first one as primary
    const primaryDish = group[0];
    uniqueStandardDishes.push(primaryDish);
    
    // Process duplicates if any
    if (group.length > 1) {
      const duplicateIds = group.slice(1).map(d => d.id);
      removedCount += duplicateIds.length;
      
      // Fix any Mappings that point to a duplicate ID
      data.menuMappings.forEach(mapping => {
        if (duplicateIds.includes(mapping.standardDishId)) {
          mapping.standardDishId = primaryDish.id;
          mapping.standardDish = {
            id: primaryDish.id,
            name: primaryDish.name,
            cuisineType: primaryDish.cuisineType,
            createdAt: primaryDish.createdAt
          };
          updatedMappingsCount++;
        }
      });
    }
  });

  // Overwrite dishes array with unique only
  data.standardDishes = uniqueStandardDishes;

  fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2));
  console.log(`Original total dishes: ${originalDishCount}`);
  console.log(`Successfully merged duplicates. Removed ${removedCount} duplicated dishes.`);
  console.log(`Updated ${updatedMappingsCount} menu mappings to point to primary dishes.`);
  console.log(`Final total dishes: ${data.standardDishes.length}`);
} catch (error) {
  console.error('Error deduplicating recipes:', error);
}
