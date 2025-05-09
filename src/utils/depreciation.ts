export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';

export interface DepreciationResult {
  year: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface CapitalImprovement {
  id: string;
  description: string;
  improvementDate: string;
  cost: number;
  usefulLifeMonths?: number | null;
  depreciationMethod?: string | null;
  notes?: string | null;
}

export interface DepreciationInput {
  purchasePrice: number;
  purchaseDate: string;
  usefulLife: number; // in years
  salvageValue: number;
  method: DepreciationMethod;
  depreciationRate?: number; // for declining balance method
  totalUnits?: number; // for units of activity method
  unitsPerYear?: number[]; // for units of activity method - estimated usage per year
  calculateAsGroup?: boolean; // whether to calculate as a group with linked assets
  linkedAssets?: LinkedAssetForDepreciation[]; // linked assets for group calculation
  capitalImprovements?: CapitalImprovement[]; // capital improvements that increase the asset value
}

export interface LinkedAssetForDepreciation {
  id: string;
  purchasePrice: number;
  purchaseDate: string;
  salvageValue?: number;
  depreciableCost?: number;
}

/**
 * Calculate depreciation using straight line method
 */
export function calculateStraightLineDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { purchasePrice, purchaseDate, usefulLife, salvageValue } = input;
  const purchaseYear = new Date(purchaseDate).getFullYear();
  const depreciableAmount = purchasePrice - salvageValue;
  const annualDepreciation = depreciableAmount / usefulLife;

  const results: DepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLife; year++) {
    accumulatedDepreciation += annualDepreciation;
    results.push({
      year: purchaseYear + year,
      depreciationExpense: annualDepreciation,
      accumulatedDepreciation,
      bookValue: purchasePrice - accumulatedDepreciation
    });
  }

  return results;
}

/**
 * Calculate depreciation using declining balance method
 */
export function calculateDecliningBalanceDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { purchasePrice, purchaseDate, usefulLife, salvageValue, depreciationRate = 20 } = input;
  const purchaseYear = new Date(purchaseDate).getFullYear();
  const rate = depreciationRate / 100;

  const results: DepreciationResult[] = [];
  let bookValue = purchasePrice;
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLife; year++) {
    const depreciationExpense = bookValue * rate;
    accumulatedDepreciation += depreciationExpense;
    bookValue = Math.max(purchasePrice - accumulatedDepreciation, salvageValue);

    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue
    });
  }

  return results;
}

/**
 * Calculate depreciation using Sum of Years Digits method
 */
export function calculateSumOfYearsDigitsDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { purchasePrice, purchaseDate, usefulLife, salvageValue } = input;
  const purchaseYear = new Date(purchaseDate).getFullYear();
  const depreciableAmount = purchasePrice - salvageValue;

  // Calculate sum of years digits (e.g., for 5 years: 5+4+3+2+1 = 15)
  const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;

  const results: DepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLife; year++) {
    // Calculate the fraction for this year (e.g., for year 1 of 5: 5/15, year 2: 4/15, etc.)
    const fraction = (usefulLife - year) / sumOfYears;
    const depreciationExpense = depreciableAmount * fraction;

    accumulatedDepreciation += depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: purchasePrice - accumulatedDepreciation
    });
  }

  return results;
}

/**
 * Calculate depreciation using Units of Activity method
 */
export function calculateUnitsOfActivityDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { purchasePrice, purchaseDate, usefulLife, salvageValue, totalUnits, unitsPerYear } = input;

  if (!totalUnits || !unitsPerYear || unitsPerYear.length === 0) {
    throw new Error('Total units and units per year are required for Units of Activity method');
  }

  const purchaseYear = new Date(purchaseDate).getFullYear();
  const depreciableAmount = purchasePrice - salvageValue;
  const depreciationPerUnit = depreciableAmount / totalUnits;

  const results: DepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  // Make sure we have enough years of unit estimates
  const actualUnitsPerYear = [...unitsPerYear];
  while (actualUnitsPerYear.length < usefulLife) {
    // If not enough years provided, use the last year's estimate for remaining years
    actualUnitsPerYear.push(actualUnitsPerYear[actualUnitsPerYear.length - 1]);
  }

  for (let year = 0; year < usefulLife; year++) {
    const unitsThisYear = actualUnitsPerYear[year];
    const depreciationExpense = depreciationPerUnit * unitsThisYear;

    accumulatedDepreciation += depreciationExpense;

    // Ensure we don't depreciate below salvage value
    const cappedAccumulatedDepreciation = Math.min(accumulatedDepreciation, depreciableAmount);

    results.push({
      year: purchaseYear + year,
      depreciationExpense: year === 0 ? depreciationExpense :
                          (cappedAccumulatedDepreciation === depreciableAmount ?
                           depreciableAmount - results[year-1].accumulatedDepreciation :
                           depreciationExpense),
      accumulatedDepreciation: cappedAccumulatedDepreciation,
      bookValue: purchasePrice - cappedAccumulatedDepreciation
    });

    // Stop if we've fully depreciated the asset
    if (cappedAccumulatedDepreciation >= depreciableAmount) {
      break;
    }
  }

  return results;
}

/**
 * Calculate depreciation based on the specified method
 */
export function calculateDepreciation(input: DepreciationInput): DepreciationResult[] {
  // Validate input
  if (!input.purchasePrice || input.purchasePrice <= 0) {
    throw new Error('Purchase price must be greater than zero');
  }

  if (input.salvageValue < 0 || input.salvageValue >= input.purchasePrice) {
    throw new Error('Salvage value must be non-negative and less than purchase price');
  }

  if (!input.usefulLife || input.usefulLife <= 0) {
    throw new Error('Useful life must be greater than zero');
  }

  // Select the appropriate calculation method
  switch (input.method) {
    case 'STRAIGHT_LINE':
      return calculateStraightLineDepreciation(input);
    case 'DECLINING_BALANCE':
      return calculateDecliningBalanceDepreciation(input);
    case 'SUM_OF_YEARS_DIGITS':
      return calculateSumOfYearsDigitsDepreciation(input);
    case 'UNITS_OF_ACTIVITY':
      return calculateUnitsOfActivityDepreciation(input);
    default:
      throw new Error(`Unsupported depreciation method: ${input.method}`);
  }
}

/**
 * Calculate group depreciation by aggregating values from parent and child assets
 */
export function calculateGroupDepreciation(input: DepreciationInput): DepreciationResult[] {
  console.log("calculateGroupDepreciation called with:", {
    calculateAsGroup: input.calculateAsGroup,
    linkedAssetsCount: input.linkedAssets?.length || 0,
    capitalImprovementsCount: input.capitalImprovements?.length || 0,
    purchasePrice: input.purchasePrice,
    salvageValue: input.salvageValue,
    method: input.method
  });

  // Check if we have capital improvements
  const hasCapitalImprovements = input.capitalImprovements && input.capitalImprovements.length > 0;

  // If not calculating as group and no capital improvements, just use regular calculation
  if ((!input.calculateAsGroup || !input.linkedAssets || input.linkedAssets.length === 0) && !hasCapitalImprovements) {
    console.log("Not calculating as group and no capital improvements - using regular calculation");
    return calculateDepreciation(input);
  }

  // Calculate total purchase price and weighted average purchase date
  let totalPurchasePrice = input.purchasePrice;
  let totalDepreciableCost = input.purchasePrice; // Use purchase price as depreciable cost if not specified
  let totalSalvageValue = input.salvageValue;
  let earliestPurchaseDate = new Date(input.purchaseDate);

  // Add values from linked assets if calculating as group
  if (input.calculateAsGroup && input.linkedAssets && input.linkedAssets.length > 0) {
    input.linkedAssets.forEach(asset => {
      totalPurchasePrice += asset.purchasePrice;

      // Use asset's depreciable cost if available, otherwise use purchase price
      const assetDepreciableCost = asset.depreciableCost !== undefined ?
        asset.depreciableCost :
        asset.purchasePrice;

      totalDepreciableCost += assetDepreciableCost;

      // Use asset's salvage value if available, otherwise estimate as 10% of purchase price
      const assetSalvageValue = asset.salvageValue !== undefined ?
        asset.salvageValue :
        asset.purchasePrice * 0.1;

      totalSalvageValue += assetSalvageValue;

      // Track earliest purchase date for depreciation start
      const assetPurchaseDate = new Date(asset.purchaseDate);
      if (assetPurchaseDate < earliestPurchaseDate) {
        earliestPurchaseDate = assetPurchaseDate;
      }
    });
  }

  // We'll handle capital improvements differently - we won't add them to the initial cost
  // Instead, we'll track them separately to apply them at the correct dates
  const capitalImprovements = hasCapitalImprovements ?
    [...(input.capitalImprovements || [])].sort((a, b) =>
      new Date(a.improvementDate).getTime() - new Date(b.improvementDate).getTime()
    ) : [];

  // Create a new input with aggregated values
  const groupInput: DepreciationInput = {
    ...input,
    purchasePrice: totalDepreciableCost, // Use the aggregated depreciable cost for calculation
    purchaseDate: earliestPurchaseDate.toISOString(),
    salvageValue: totalSalvageValue,
    // Keep the same depreciation method, useful life, etc.
  };

  console.log("Calculating depreciation with aggregated values:", {
    totalPurchasePrice,
    totalDepreciableCost,
    totalSalvageValue,
    earliestPurchaseDate: earliestPurchaseDate.toISOString(),
    linkedAssetsCount: input.linkedAssets?.length || 0,
    capitalImprovementsCount: input.capitalImprovements?.length || 0
  });

  // Calculate depreciation with the aggregated values
  return calculateDepreciation(groupInput);
}

/**
 * Generate chart data from depreciation results
 */
export function generateChartData(results: DepreciationResult[]): Array<{year: number, value: number}> {
  return results.map(result => ({
    year: result.year,
    value: result.bookValue
  }));
}