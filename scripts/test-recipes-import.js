const fs = require("fs");
const path = require("path");

async function main() {
  const filePath = "/Users/itsaretboonsong/mydev/POS/collector/data/wongnai_recipes.json";
  const jsonText = fs.readFileSync(filePath, "utf8");

  console.log("Sending POST to /api/recipes/import-json...");
  
  const res = await fetch("http://localhost:3000/api/recipes/import-json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "nicc_session=active",
    },
    body: JSON.stringify({ jsonText }),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

main().catch(console.error);
