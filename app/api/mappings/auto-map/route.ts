import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockMapping } from "@/lib/mock-data";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Basic character/word intersection similarity
 */
function calculateSimilarity(str1: string, str2: string): number {
  const clean1 = str1.trim().replace(/\s+/g, "");
  const clean2 = str2.trim().replace(/\s+/g, "");
  
  if (clean1 === clean2) return 1.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.85;

  // character bigram similarity
  function getBigrams(str: string) {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  }

  const bg1 = getBigrams(clean1);
  const bg2 = getBigrams(clean2);
  if (bg1.size === 0 || bg2.size === 0) return 0;
  
  let intersection = 0;
  for (const bg of Array.from(bg1)) {
    if (bg2.has(bg)) intersection++;
  }
  
  const union = bg1.size + bg2.size - intersection;
  return intersection / union;
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = getMockData();
    let newMappingCount = 0;

    // Distinct unmapped menu names
    const mappedMenuIds = new Set(data.menuMappings.map(m => m.menuItemId));
    const unmappedItems = data.menuItems.filter(m => !mappedMenuIds.has(m.id));
    
    // Group by exact name to process once per distinct name
    const distinctUnmappedNames = new Set(unmappedItems.map(m => m.name));

    for (const menuName of Array.from(distinctUnmappedNames)) {
      let bestMatch: { id: string, name: string, score: number } | null = null;
      
      for (const dish of data.standardDishes) {
        const score = calculateSimilarity(menuName, dish.name);
        if (score > 0.75) { // Stricter threshold for acceptable match
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { id: dish.id, name: dish.name, score };
          }
        }
      }

      if (bestMatch) {
         // Auto-map all unmapped items that share this name
         const matchingItems = unmappedItems.filter(m => m.name === menuName);
         for (const item of matchingItems) {
           const newMapping: MockMapping = {
             id: randomUUID(),
             restaurantId: item.restaurantId,
             menuItemId: item.id,
             standardDishId: bestMatch.id,
             portionMultiplier: 1,
             createdAt: new Date().toISOString(),
             menuItem: {
               id: item.id,
               restaurantId: item.restaurantId,
               name: item.name,
               category: item.category,
               createdAt: item.createdAt
             },
             standardDish: {
               id: bestMatch.id,
               name: bestMatch.name,
               cuisineType: "Thai",
               createdAt: new Date().toISOString()
             }
           };
           data.menuMappings.push(newMapping);
           mappedMenuIds.add(item.id); // mark as mapped for the loop
           newMappingCount++;
         }
      }
    }

    if (newMappingCount > 0) {
      saveMockData(data);
    }

    return NextResponse.json({ success: true, count: newMappingCount });
  } catch (error) {
    console.error("POST /api/mappings/auto-map error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
