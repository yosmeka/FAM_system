export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'DOUBLE_DECLINING' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';

export interface DepreciationResult {
  year: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface DepreciationInput {
  unitPrice: number;
  sivDate: string;
  usefulLifeYears: number; // in years
  salvageValue: number;
  method: DepreciationMethod;
  depreciationRate?: number; // for declining balance method
  totalUnits?: number; // for units of activity method
  unitsPerYear?: number[]; // for units of activity method - estimated usage per year
}

/**
 * Calculate depreciation using straight line method
 */
export function calculateStraightLineDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const purchaseYear = new Date(sivDate).getFullYear();
  const depreciableAmount = unitPrice - salvageValue;
  const annualDepreciation = depreciableAmount / usefulLifeYears;

  const results: DepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLifeYears; year++) {
    accumulatedDepreciation += annualDepreciation;
    results.push({
      year: purchaseYear + year,
      depreciationExpense: annualDepreciation,
      accumulatedDepreciation,
      bookValue: unitPrice - accumulatedDepreciation
    });
  }

  return results;
}

/**
 * Calculate depreciation using declining balance method
 */
export function calculateDecliningBalanceDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue, depreciationRate = 20 } = input;
  const purchaseYear = new Date(sivDate).getFullYear();
  const rate = depreciationRate / 100;

  const results: DepreciationResult[] = [];
  let bookValue = unitPrice;
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLifeYears; year++) {
    if (bookValue <= salvageValue) {
      results.push({
        year: purchaseYear + year,
        depreciationExpense: 0,
        accumulatedDepreciation,
        bookValue: salvageValue
      });
      break;
    }
    let depreciationExpense = rate * bookValue;
    // If this is the last year or would go below salvage value, adjust so book value = salvage value
    if (year === usefulLifeYears - 1 || bookValue - depreciationExpense < salvageValue) {
      depreciationExpense = bookValue - salvageValue;
    }
    accumulatedDepreciation += depreciationExpense;
    bookValue -= depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: bookValue
    });
    if (bookValue <= salvageValue) break;
  }
  return results;
}

/**
 * Calculate depreciation using double declining balance method
 */
export function calculateDoubleDecliningBalanceDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const purchaseYear = new Date(sivDate).getFullYear();
  const rate = 2 / usefulLifeYears;

  const results: DepreciationResult[] = [];
  let bookValue = unitPrice;
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLifeYears; year++) {
    if (bookValue <= salvageValue) {
      results.push({
        year: purchaseYear + year,
        depreciationExpense: 0,
        accumulatedDepreciation,
        bookValue: salvageValue
      });
      break;
    }
    let depreciationExpense = rate * bookValue;
    // If this is the last year or would go below salvage value, adjust so book value = salvage value
    if (year === usefulLifeYears - 1 || bookValue - depreciationExpense < salvageValue) {
      depreciationExpense = bookValue - salvageValue;
    }
    accumulatedDepreciation += depreciationExpense;
    bookValue -= depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: bookValue
    });
    if (bookValue <= salvageValue) break;
  }
  return results;
}

/**
 * Calculate depreciation using Sum of Years Digits method
 */
export function calculateSumOfYearsDigitsDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const purchaseYear = new Date(sivDate).getFullYear();
  const depreciableAmount = unitPrice - salvageValue;

  // Calculate sum of years digits (e.g., for 5 years: 5+4+3+2+1 = 15)
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;

  const results: DepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLifeYears; year++) {
    // Calculate the fraction for this year (e.g., for year 1 of 5: 5/15, year 2: 4/15, etc.)
    const fraction = (usefulLifeYears - year) / sumOfYears;
    const depreciationExpense = depreciableAmount * fraction;

    accumulatedDepreciation += depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: unitPrice - accumulatedDepreciation
    });
  }

  return results;
}

/**
 * Calculate depreciation using Units of Activity method
 */
export function calculateUnitsOfActivityDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue, totalUnits, unitsPerYear } = input;

  if (!totalUnits || !unitsPerYear || unitsPerYear.length === 0) {
    throw new Error('Total units and units per year are required for Units of Activity method');
  }

  const purchaseYear = new Date(sivDate).getFullYear();
  const depreciableAmount = unitPrice - salvageValue;
  const depreciationPerUnit = depreciableAmount / totalUnits;

  const results: DepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  // Make sure we have enough years of unit estimates
  const actualUnitsPerYear = [...unitsPerYear];
  while (actualUnitsPerYear.length < usefulLifeYears) {
    // If not enough years provided, use the last year's estimate for remaining years
    actualUnitsPerYear.push(actualUnitsPerYear[actualUnitsPerYear.length - 1]);
  }

  for (let year = 0; year < usefulLifeYears; year++) {
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
      bookValue: unitPrice - cappedAccumulatedDepreciation
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
  if (!input.unitPrice || input.unitPrice <= 0) {
    throw new Error('Purchase price must be greater than zero');
  }

  if (input.salvageValue < 0 || input.salvageValue >= input.unitPrice) {
    throw new Error('Salvage value must be non-negative and less than purchase price');
  }

  if (!input.usefulLifeYears || input.usefulLifeYears <= 0) {
    throw new Error('Useful life must be greater than zero');
  }

  // Select the appropriate calculation method
  switch (input.method) {
    case 'STRAIGHT_LINE':
      return calculateStraightLineDepreciation(input);
    case 'DECLINING_BALANCE':
      return calculateDecliningBalanceDepreciation(input);
    case 'DOUBLE_DECLINING':
      return calculateDoubleDecliningBalanceDepreciation(input);
    case 'SUM_OF_YEARS_DIGITS':
      return calculateSumOfYearsDigitsDepreciation(input);
    case 'UNITS_OF_ACTIVITY':
      return calculateUnitsOfActivityDepreciation(input);
    default:
      throw new Error(`Unsupported depreciation method: ${input.method}`);
  }
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