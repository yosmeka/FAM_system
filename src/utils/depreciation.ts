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
  notes?: string | null;
  // usefulLifeMonths and depreciationMethod are no longer used for capital improvements
  // as they simply increase the asset value without their own depreciation parameters
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

  // If we don't have capital improvements, use the standard calculation
  if (!hasCapitalImprovements) {
    // Create a new input with aggregated values (without capital improvements)
    const groupInput: DepreciationInput = {
      ...input,
      purchasePrice: totalDepreciableCost, // Use the aggregated depreciable cost for calculation
      purchaseDate: earliestPurchaseDate.toISOString(),
      salvageValue: totalSalvageValue,
      // Keep the same depreciation method, useful life, etc.
    };

    console.log("Calculating depreciation with aggregated values (no capital improvements):", {
      totalPurchasePrice,
      totalDepreciableCost,
      totalSalvageValue,
      earliestPurchaseDate: earliestPurchaseDate.toISOString(),
      linkedAssetsCount: input.linkedAssets?.length || 0
    });

    // Calculate depreciation with the aggregated values
    return calculateDepreciation(groupInput);
  }

  // If we have capital improvements, use the time-based calculation
  console.log("Calculating time-based depreciation with capital improvements:", {
    baseAssetCost: totalDepreciableCost,
    improvementsCount: capitalImprovements.length,
    method: input.method
  });

  return calculateTimeBasedDepreciationWithImprovements({
    baseAsset: {
      purchasePrice: totalDepreciableCost,
      purchaseDate: earliestPurchaseDate.toISOString(),
      salvageValue: totalSalvageValue,
      usefulLife: input.usefulLife,
      method: input.method,
      depreciationRate: input.depreciationRate
    },
    capitalImprovements: capitalImprovements
  });
}

/**
 * Interface for time-based depreciation calculation with capital improvements
 */
interface TimeBasedDepreciationInput {
  baseAsset: {
    purchasePrice: number;
    purchaseDate: string;
    salvageValue: number;
    usefulLife: number;
    method: DepreciationMethod;
    depreciationRate?: number;
  };
  capitalImprovements: CapitalImprovement[];
}

/**
 * Calculate depreciation with time-based capital improvements
 * This function handles the case where improvements are added at different points in time
 */
export function calculateTimeBasedDepreciationWithImprovements(
  input: TimeBasedDepreciationInput
): DepreciationResult[] {
  const { baseAsset, capitalImprovements } = input;

  // Start with the base asset's purchase date
  const startYear = new Date(baseAsset.purchaseDate).getFullYear();

  // Find the last year we need to calculate (base asset useful life + latest improvement)
  const baseAssetEndYear = startYear + baseAsset.usefulLife;

  // Find the latest year from capital improvements
  // Since improvements now use the base asset's useful life, we just add that to the improvement year
  const latestImprovementYear = capitalImprovements.length > 0
    ? Math.max(...capitalImprovements.map(imp => {
        const improvementYear = new Date(imp.improvementDate).getFullYear();
        // Always use the base asset's useful life for improvements
        return improvementYear + baseAsset.usefulLife;
      }))
    : 0;

  // Use the later of the two end years
  const endYear = Math.max(baseAssetEndYear, latestImprovementYear);

  console.log("Time-based depreciation calculation:", {
    startYear,
    baseAssetEndYear,
    latestImprovementYear,
    endYear
  });

  // Calculate base asset depreciation
  const baseAssetDepreciation = calculateDepreciation({
    purchasePrice: baseAsset.purchasePrice,
    purchaseDate: baseAsset.purchaseDate,
    usefulLife: baseAsset.usefulLife,
    salvageValue: baseAsset.salvageValue,
    method: baseAsset.method,
    depreciationRate: baseAsset.depreciationRate
  });

  // For simplified capital improvements, we'll just add the improvement cost to the asset value
  // and use the asset's depreciation parameters for all improvements
  const improvementDepreciations = capitalImprovements.map(improvement => {
    // Always use the base asset's useful life and depreciation method
    const usefulLife = baseAsset.usefulLife;
    const method = baseAsset.method;

    // No separate salvage value for improvements - they're treated as part of the asset
    const salvageValue = 0;

    return {
      improvement,
      depreciation: calculateDepreciation({
        purchasePrice: improvement.cost,
        purchaseDate: improvement.improvementDate,
        usefulLife,
        salvageValue,
        method,
        depreciationRate: baseAsset.depreciationRate
      })
    };
  });

  // Combine all depreciation results by year
  const yearlyResults: DepreciationResult[] = [];

  for (let year = startYear; year <= endYear; year++) {
    // Find base asset depreciation for this year
    const baseAssetYearResult = baseAssetDepreciation.find(r => r.year === year);

    // Find improvement depreciations for this year
    const improvementYearResults = improvementDepreciations
      .map(({ depreciation }) => {
        return depreciation.find(r => r.year === year);
      })
      .filter(Boolean) as DepreciationResult[];

    // Calculate combined values for this year
    let depreciationExpense = 0;
    let accumulatedDepreciation = 0;
    let bookValue = 0;

    // Add base asset values if available for this year
    if (baseAssetYearResult) {
      depreciationExpense += baseAssetYearResult.depreciationExpense;
      accumulatedDepreciation += baseAssetYearResult.accumulatedDepreciation;
      bookValue += baseAssetYearResult.bookValue;
    } else if (year > baseAssetEndYear) {
      // If we're past the base asset's useful life, use the salvage value
      bookValue += baseAsset.salvageValue;
      accumulatedDepreciation += baseAsset.purchasePrice - baseAsset.salvageValue;
    } else {
      // If we're before the base asset's start year, use the purchase price
      bookValue += baseAsset.purchasePrice;
    }

    // Add improvement values
    improvementYearResults.forEach(result => {
      depreciationExpense += result.depreciationExpense;
      accumulatedDepreciation += result.accumulatedDepreciation;
      bookValue += result.bookValue;
    });

    // Add improvements that haven't started depreciating yet
    capitalImprovements.forEach(improvement => {
      const improvementYear = new Date(improvement.improvementDate).getFullYear();
      if (year < improvementYear) {
        // If the improvement hasn't been made yet in this year, add its full cost
        bookValue += improvement.cost;
      }
    });

    // Add the combined result for this year
    yearlyResults.push({
      year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue
    });
  }

  return yearlyResults;
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