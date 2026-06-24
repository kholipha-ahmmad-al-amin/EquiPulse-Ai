// Industry baseline models to solve the Cold-Start Data Problem.
// These heuristical weights provide the predictive AI with a starting point 
// before enough local transactions have occurred to train a custom model.

export type IndustryCategory = 'grocery' | 'pharmacy' | 'electronics' | 'hardware' | 'fashion' | 'others';

export interface BaselineModel {
  category: IndustryCategory;
  // Seasonality multiplier based on day of week (0 = Sunday, 6 = Saturday)
  dayOfWeekMultipliers: number[]; 
  // Estimated days until a typical fast-moving item runs out of stock
  fastMovingRestockDays: number;
  // Estimated days until a typical slow-moving item runs out of stock
  slowMovingRestockDays: number;
  // Standard profit margin percentage expectation
  expectedMarginPct: number;
}

export const baselineModels: Record<IndustryCategory, BaselineModel> = {
  grocery: {
    category: 'grocery',
    // Groceries typically peak on Fridays and Saturdays in Bangladesh
    dayOfWeekMultipliers: [1.1, 0.9, 0.9, 0.9, 1.0, 1.3, 1.2], 
    fastMovingRestockDays: 3,
    slowMovingRestockDays: 14,
    expectedMarginPct: 15,
  },
  pharmacy: {
    category: 'pharmacy',
    // Pharmacies are relatively stable, slight bump on weekends
    dayOfWeekMultipliers: [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.1],
    fastMovingRestockDays: 7,
    slowMovingRestockDays: 30,
    expectedMarginPct: 20,
  },
  electronics: {
    category: 'electronics',
    // High peaks on weekends
    dayOfWeekMultipliers: [1.0, 0.8, 0.8, 0.8, 0.9, 1.4, 1.4],
    fastMovingRestockDays: 14,
    slowMovingRestockDays: 60,
    expectedMarginPct: 25,
  },
  hardware: {
    category: 'hardware',
    // Construction/hardware often active mid-week to prepare for work
    dayOfWeekMultipliers: [1.1, 1.1, 1.1, 1.0, 0.9, 0.8, 0.9],
    fastMovingRestockDays: 30,
    slowMovingRestockDays: 90,
    expectedMarginPct: 30,
  },
  fashion: {
    category: 'fashion',
    // Heavy weekend peaks
    dayOfWeekMultipliers: [1.0, 0.7, 0.7, 0.8, 1.0, 1.5, 1.4],
    fastMovingRestockDays: 14,
    slowMovingRestockDays: 45,
    expectedMarginPct: 40,
  },
  others: {
    category: 'others',
    dayOfWeekMultipliers: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    fastMovingRestockDays: 14,
    slowMovingRestockDays: 30,
    expectedMarginPct: 20,
  }
};

/**
 * Returns the baseline model for a given category.
 * Handles fallback and mapping from standard string values.
 */
export function getBaselineModel(categoryString: string | undefined): BaselineModel {
  if (!categoryString) return baselineModels.others;
  
  const lowerCat = categoryString.toLowerCase();
  if (lowerCat.includes('grocery')) return baselineModels.grocery;
  if (lowerCat.includes('pharmacy') || lowerCat.includes('medicine')) return baselineModels.pharmacy;
  if (lowerCat.includes('electronic')) return baselineModels.electronics;
  if (lowerCat.includes('hardware') || lowerCat.includes('tool')) return baselineModels.hardware;
  if (lowerCat.includes('fashion') || lowerCat.includes('garment')) return baselineModels.fashion;
  
  return baselineModels.others;
}
