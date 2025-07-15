import { calculateMonthlyDepreciation, DepreciationMethod } from './depreciation';

// Cache for depreciation calculations to improve performance
const depreciationCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface AssetDepreciationParams {
  id: string;
  unitPrice: number;
  sivDate: Date | string; // Single source for depreciation start date
  usefulLifeYears: number;
  residualPercentage?: number;
  depreciationMethod?: DepreciationMethod;
}

interface CachedResult {
  data: any;
  timestamp: number;
}

/**
 * Calculate salvage value from residual percentage
 */
export function calculateSalvageValue(unitPrice: number, residualPercentage: number = 0): number {
  return unitPrice * (residualPercentage / 100);
}

/**
 * Calculate current book value for an asset
 */
export function calculateCurrentBookValue(params: AssetDepreciationParams): number {
  const {
    unitPrice,
    sivDate,
    usefulLifeYears,
    residualPercentage = 0,
    depreciationMethod = 'STRAIGHT_LINE'
  } = params;

  try {
    const salvageValue = calculateSalvageValue(unitPrice, residualPercentage);
    const now = new Date();

    // If depreciation hasn't started yet, return full unit price
    if (new Date(sivDate) > now) {
      return unitPrice;
    }

    const monthlyResults = calculateMonthlyDepreciation({
      unitPrice,
      sivDate: sivDate.toString(),
      usefulLifeYears,
      salvageValue,
      method: depreciationMethod,
    });

    // Find the most recent month that has passed
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Filter to get all months up to current date
    const pastMonths = monthlyResults.filter(result => 
      result.year < currentYear || 
      (result.year === currentYear && result.month <= currentMonth)
    );

    if (pastMonths.length === 0) {
      return unitPrice; // No depreciation yet
    }

    // Return the book value from the most recent month
    const latestMonth = pastMonths[pastMonths.length - 1];
    return Math.max(latestMonth.bookValue, salvageValue);

  } catch (error) {
    console.error('Error calculating current book value:', error);
    return unitPrice; // Fallback to original price
  }
}

/**
 * Calculate book value for a specific month and year
 */
export function calculateBookValueForMonth(
  params: AssetDepreciationParams,
  targetYear: number,
  targetMonth: number
): number {
  const {
    unitPrice,
    sivDate,
    usefulLifeYears,
    residualPercentage = 0,
    depreciationMethod = 'STRAIGHT_LINE'
  } = params;

  try {
    const salvageValue = calculateSalvageValue(unitPrice, residualPercentage);

    const monthlyResults = calculateMonthlyDepreciation({
      unitPrice,
      sivDate: sivDate.toString(),
      usefulLifeYears,
      salvageValue,
      method: depreciationMethod,
    });

    // Find the specific month
    const targetResult = monthlyResults.find(result => 
      result.year === targetYear && result.month === targetMonth
    );

    return targetResult ? targetResult.bookValue : unitPrice;

  } catch (error) {
    console.error('Error calculating book value for month:', error);
    return unitPrice;
  }
}

/**
 * Calculate monthly book values for an entire year with caching
 */
export function calculateYearlyBookValues(
  params: AssetDepreciationParams,
  targetYear: number
): Record<number, number> {
  const cacheKey = `${params.id}-${targetYear}-${params.unitPrice}-${params.usefulLifeYears}`;

  // Check cache first
  const cached = depreciationCache.get(cacheKey) as CachedResult;
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const {
    unitPrice,
    sivDate,
    usefulLifeYears,
    residualPercentage = 0,
    depreciationMethod = 'STRAIGHT_LINE'
  } = params;

  try {
    const salvageValue = calculateSalvageValue(unitPrice, residualPercentage);

    const monthlyResults = calculateMonthlyDepreciation({
      unitPrice,
      sivDate: sivDate.toString(),
      usefulLifeYears,
      salvageValue,
      method: depreciationMethod,
    });

    // Build monthly map for the target year
    const yearlyValues: Record<number, number> = {};
    
    for (let month = 1; month <= 12; month++) {
      const monthResult = monthlyResults.find(result => 
        result.year === targetYear && result.month === month
      );
      yearlyValues[month] = monthResult ? monthResult.bookValue : unitPrice;
    }

    // Cache the result
    depreciationCache.set(cacheKey, {
      data: yearlyValues,
      timestamp: Date.now()
    });

    return yearlyValues;

  } catch (error) {
    console.error('Error calculating yearly book values:', error);
    // Return default values
    const defaultValues: Record<number, number> = {};
    for (let month = 1; month <= 12; month++) {
      defaultValues[month] = unitPrice;
    }
    return defaultValues;
  }
}

/**
 * Calculate depreciation summary for an asset
 */
export function calculateDepreciationSummary(params: AssetDepreciationParams) {
  const {
    unitPrice,
    sivDate,
    usefulLifeYears,
    residualPercentage = 0,
    depreciationMethod = 'STRAIGHT_LINE'
  } = params;

  const salvageValue = calculateSalvageValue(unitPrice, residualPercentage);
  const currentBookValue = calculateCurrentBookValue(params);
  const depreciableAmount = unitPrice - salvageValue;
  const accumulatedDepreciation = unitPrice - currentBookValue;
  const remainingDepreciableAmount = currentBookValue - salvageValue;

  return {
    unitPrice,
    salvageValue,
    depreciableAmount,
    currentBookValue,
    accumulatedDepreciation,
    remainingDepreciableAmount,
    depreciationMethod,
    usefulLifeYears,
    residualPercentage,
    sivDate // Include sivDate in summary for reference
  };
}

/**
 * Clear depreciation cache (useful for testing or when asset data changes)
 */
export function clearDepreciationCache(assetId?: string) {
  if (assetId) {
    // Clear cache entries for specific asset
    for (const key of depreciationCache.keys()) {
      if (key.startsWith(assetId)) {
        depreciationCache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    depreciationCache.clear();
  }
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats() {
  return {
    size: depreciationCache.size,
    keys: Array.from(depreciationCache.keys())
  };
}
