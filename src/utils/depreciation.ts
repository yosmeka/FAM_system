export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';

export interface DepreciationResult {
  year: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  bookValue: number;
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
 * Generate chart data from depreciation results
 */
export function generateChartData(results: DepreciationResult[]): Array<{year: number, value: number}> {
  return results.map(result => ({
    year: result.year,
    value: result.bookValue
  }));
}