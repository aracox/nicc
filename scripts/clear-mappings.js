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

  const prevLen = data.menuMappings.length;
  data.menuMappings = [];

  fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Cleared ${prevLen} mappings.`);
} else {
  console.log('mock-data.json not found.');
}
