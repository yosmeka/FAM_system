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
  targetYears?: number[]; // optional: only calculate for specific years (performance optimization)
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
  // Start with depreciable amount instead of full unit price
  let currentBookValue = depreciableAmount;

  for (let year = 0; year < usefulLifeYears; year++) {
    accumulatedDepreciation += annualDepreciation;
    currentBookValue -= annualDepreciation;
    results.push({
      year: purchaseYear + year,
      depreciationExpense: annualDepreciation,
      accumulatedDepreciation,
      bookValue: Math.max(currentBookValue, 0) // Book value should not go below 0
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
  const depreciableAmount = unitPrice - salvageValue;
  const rate = depreciationRate / 100;

  const results: DepreciationResult[] = [];
  // Start with depreciable amount instead of full unit price
  let bookValue = depreciableAmount;
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLifeYears; year++) {
    if (bookValue <= 0) {
      results.push({
        year: purchaseYear + year,
        depreciationExpense: 0,
        accumulatedDepreciation,
        bookValue: 0
      });
      break;
    }
    let depreciationExpense = rate * bookValue;
    // If this is the last year or would go below 0, adjust so book value = 0
    if (year === usefulLifeYears - 1 || bookValue - depreciationExpense < 0) {
      depreciationExpense = bookValue;
    }
    accumulatedDepreciation += depreciationExpense;
    bookValue -= depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: Math.max(bookValue, 0)
    });
    if (bookValue <= 0) break;
  }
  return results;
}

/**
 * Calculate depreciation using double declining balance method
 */
export function calculateDoubleDecliningBalanceDepreciation(input: DepreciationInput): DepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const purchaseYear = new Date(sivDate).getFullYear();
  const depreciableAmount = unitPrice - salvageValue;
  const rate = 2 / usefulLifeYears;

  const results: DepreciationResult[] = [];
  // Start with depreciable amount instead of full unit price
  let bookValue = depreciableAmount;
  let accumulatedDepreciation = 0;

  for (let year = 0; year < usefulLifeYears; year++) {
    if (bookValue <= 0) {
      results.push({
        year: purchaseYear + year,
        depreciationExpense: 0,
        accumulatedDepreciation,
        bookValue: 0
      });
      break;
    }
    let depreciationExpense = rate * bookValue;
    // If this is the last year or would go below 0, adjust so book value = 0
    if (year === usefulLifeYears - 1 || bookValue - depreciationExpense < 0) {
      depreciationExpense = bookValue;
    }
    accumulatedDepreciation += depreciationExpense;
    bookValue -= depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: Math.max(bookValue, 0)
    });
    if (bookValue <= 0) break;
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
  // Start with depreciable amount instead of full unit price
  let currentBookValue = depreciableAmount;

  for (let year = 0; year < usefulLifeYears; year++) {
    // Calculate the fraction for this year (e.g., for year 1 of 5: 5/15, year 2: 4/15, etc.)
    const fraction = (usefulLifeYears - year) / sumOfYears;
    const depreciationExpense = depreciableAmount * fraction;

    accumulatedDepreciation += depreciationExpense;
    currentBookValue -= depreciationExpense;
    results.push({
      year: purchaseYear + year,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue: Math.max(currentBookValue, 0) // Book value should not go below 0
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
      bookValue: Math.max(depreciableAmount - cappedAccumulatedDepreciation, 0) // Start from depreciable amount
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

export interface MonthlyDepreciationResult {
  year: number;
  month: number; // 1-12
  depreciationExpense: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

function addMonths(date: Date, months: number): Date {
  const startYear = date.getFullYear();
  const startMonth = date.getMonth(); // 0-based
  const startDay = date.getDate();

  // Calculate target year and month
  const totalMonths = startMonth + months;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;

  // Create new date with target year/month, keeping original day
  const result = new Date(targetYear, targetMonth, startDay);

  // Handle day overflow (e.g., Jan 31 + 1 month should be Feb 28, not Mar 3)
  if (result.getMonth() !== targetMonth) {
    // Day overflowed, set to last day of the target month
    result.setDate(0);
  }

  return result;
}

function getDaysInMonth(year: number, month: number): number {
  // month: 1-12
  return new Date(year, month, 0).getDate();
}

function calculateStraightLineMonthly(input: DepreciationInput): MonthlyDepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const start = new Date(sivDate);
  const usefulLifeMonths = usefulLifeYears * 12;
  const depreciableAmount = unitPrice - salvageValue;
  const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

  const results: MonthlyDepreciationResult[] = [];
  let accumulatedDepreciation = 0;
  // Start with depreciable amount instead of full unit price
  let currentBookValue = depreciableAmount;

  // Generate exactly one result per month for the useful life period
  for (let m = 0; m < usefulLifeMonths; m++) {
    const date = addMonths(start, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based month

    let depreciationExpense = monthlyDepreciation;

    // Prorate for first month if asset wasn't acquired on the 1st
    if (m === 0 && start.getDate() > 1) {
      const daysInMonth = getDaysInMonth(year, month);
      const daysUsed = daysInMonth - (start.getDate() - 1);
      depreciationExpense = monthlyDepreciation * daysUsed / daysInMonth;
    }

    // Adjust last month to ensure book value equals zero (since we start from depreciable amount)
    if (m === usefulLifeMonths - 1) {
      depreciationExpense = currentBookValue; // Depreciate remaining amount
    }

    accumulatedDepreciation += depreciationExpense;
    currentBookValue -= depreciationExpense;
    const bookValue = Math.max(currentBookValue, 0); // Book value should not go below 0

    // Removed debug logging for performance

    results.push({
      year,
      month,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue,
    });
  }

  // Add post-useful-life results (asset is fully depreciated, book value = salvage value)
  // Generate results for only 3 years after useful life ends (reduced from 20 years for performance)
  const endOfUsefulLife = addMonths(start, usefulLifeMonths);
  const finalAccumulatedDepreciation = depreciableAmount; // Total depreciable amount

  for (let m = 0; m < 36; m++) { // 3 years * 12 months = 36 months (reduced from 240)
    const date = addMonths(endOfUsefulLife, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    results.push({
      year,
      month,
      depreciationExpense: 0, // No more depreciation after useful life
      accumulatedDepreciation: finalAccumulatedDepreciation,
      bookValue: salvageValue, // Book value remains at salvage value
    });
  }

  return results;
}

function calculateDecliningBalanceMonthly(input: DepreciationInput): MonthlyDepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue, depreciationRate = 20 } = input;
  const start = new Date(sivDate);
  const usefulLifeMonths = usefulLifeYears * 12;
  const depreciableAmount = unitPrice - salvageValue;
  const rate = depreciationRate / 100;
  const monthlyRate = 1 - Math.pow(1 - rate, 1 / 12); // Convert annual rate to monthly

  const results: MonthlyDepreciationResult[] = [];
  // Start with depreciable amount instead of full unit price
  let bookValue = depreciableAmount;
  let accumulatedDepreciation = 0;

  for (let m = 0; m < usefulLifeMonths; m++) {
    const date = addMonths(start, m);
    let depreciationExpense = monthlyRate * bookValue;
    if (m === usefulLifeMonths - 1 || bookValue - depreciationExpense < 0) {
      depreciationExpense = bookValue; // Depreciate remaining amount
    }
    if (m === 0) {
      // Prorate for first month
      const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth() + 1);
      const startDay = start.getDate();
      depreciationExpense = depreciationExpense * (daysInMonth - (startDay - 1)) / daysInMonth;
    }
    // If this is the last month, adjust so book value = 0
    if (m === usefulLifeMonths - 1) {
      depreciationExpense = bookValue;
    }
    accumulatedDepreciation += depreciationExpense;
    bookValue -= depreciationExpense;
    if (m === usefulLifeMonths - 1) {
      bookValue = 0; // End at 0 since we started from depreciable amount
    }
    results.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue,
    });
    if (bookValue <= salvageValue) break;
  }

  // Add post-useful-life results (asset is fully depreciated, book value = salvage value)
  const endOfUsefulLife = addMonths(start, usefulLifeMonths);
  const finalAccumulatedDepreciation = unitPrice - salvageValue;

  for (let m = 0; m < 36; m++) { // 3 years * 12 months = 36 months (reduced from 240)
    const date = addMonths(endOfUsefulLife, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    results.push({
      year,
      month,
      depreciationExpense: 0, // No more depreciation after useful life
      accumulatedDepreciation: finalAccumulatedDepreciation,
      bookValue: salvageValue, // Book value remains at salvage value
    });
  }

  return results;
}

function calculateDoubleDecliningBalanceMonthly(input: DepreciationInput): MonthlyDepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const start = new Date(sivDate);
  const usefulLifeMonths = usefulLifeYears * 12;
  const depreciableAmount = unitPrice - salvageValue;
  const annualRate = 2 / usefulLifeYears;
  const monthlyRate = 1 - Math.pow(1 - annualRate, 1 / 12);

  const results: MonthlyDepreciationResult[] = [];
  // Start with depreciable amount instead of full unit price
  let bookValue = depreciableAmount;
  let accumulatedDepreciation = 0;

  for (let m = 0; m < usefulLifeMonths; m++) {
    const date = addMonths(start, m);
    let depreciationExpense = monthlyRate * bookValue;
    if (m === usefulLifeMonths - 1 || bookValue - depreciationExpense < 0) {
      depreciationExpense = bookValue; // Depreciate remaining amount
    }
    if (m === 0) {
      // Prorate for first month
      const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth() + 1);
      const startDay = start.getDate();
      depreciationExpense = depreciationExpense * (daysInMonth - (startDay - 1)) / daysInMonth;
    }
    // If this is the last month, adjust so book value = 0
    if (m === usefulLifeMonths - 1) {
      depreciationExpense = bookValue;
    }
    accumulatedDepreciation += depreciationExpense;
    bookValue -= depreciationExpense;
    if (m === usefulLifeMonths - 1) {
      bookValue = 0; // End at 0 since we started from depreciable amount
    }
    results.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue,
    });
    if (bookValue <= salvageValue) break;
  }

  // Add post-useful-life results (asset is fully depreciated, book value = salvage value)
  const endOfUsefulLife = addMonths(start, usefulLifeMonths);
  const finalAccumulatedDepreciation = unitPrice - salvageValue;

  for (let m = 0; m < 36; m++) { // 3 years * 12 months = 36 months (reduced from 240)
    const date = addMonths(endOfUsefulLife, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    results.push({
      year,
      month,
      depreciationExpense: 0, // No more depreciation after useful life
      accumulatedDepreciation: finalAccumulatedDepreciation,
      bookValue: salvageValue, // Book value remains at salvage value
    });
  }

  return results;
}

function calculateSumOfYearsDigitsMonthly(input: DepreciationInput): MonthlyDepreciationResult[] {
  const { unitPrice, sivDate, usefulLifeYears, salvageValue } = input;
  const start = new Date(sivDate);
  const usefulLifeMonths = usefulLifeYears * 12;
  const depreciableAmount = unitPrice - salvageValue;
  const sumOfMonths = (usefulLifeMonths * (usefulLifeMonths + 1)) / 2;

  const results: MonthlyDepreciationResult[] = [];
  let accumulatedDepreciation = 0;

  for (let m = 0; m < usefulLifeMonths; m++) {
    const date = addMonths(start, m);
    const fraction = (usefulLifeMonths - m) / sumOfMonths;
    let depreciationExpense = depreciableAmount * fraction;
    if (m === 0) {
      // Prorate for first month
      const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth() + 1);
      const startDay = start.getDate();
      depreciationExpense = depreciationExpense * (daysInMonth - (startDay - 1)) / daysInMonth;
    }
    // If this is the last month, adjust so book value = 0
    if (m === usefulLifeMonths - 1) {
      depreciationExpense = depreciableAmount - accumulatedDepreciation;
    }
    accumulatedDepreciation += depreciationExpense;
    let bookValue = depreciableAmount - accumulatedDepreciation;
    if (m === usefulLifeMonths - 1) {
      bookValue = 0; // End at 0 since we started from depreciable amount
    }
    results.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      depreciationExpense,
      accumulatedDepreciation,
      bookValue,
    });
  }

  // Add post-useful-life results (asset is fully depreciated, book value = salvage value)
  const endOfUsefulLife = addMonths(start, usefulLifeMonths);
  const finalAccumulatedDepreciation = depreciableAmount;

  for (let m = 0; m < 36; m++) { // 3 years * 12 months = 36 months (reduced from 240)
    const date = addMonths(endOfUsefulLife, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    results.push({
      year,
      month,
      depreciationExpense: 0, // No more depreciation after useful life
      accumulatedDepreciation: finalAccumulatedDepreciation,
      bookValue: salvageValue, // Book value remains at salvage value
    });
  }

  return results;
}

function calculateUnitsOfActivityMonthly(input: DepreciationInput): MonthlyDepreciationResult[] {
  // For simplicity, spread each year's units evenly across 12 months
  const { unitPrice, sivDate, usefulLifeYears, salvageValue, totalUnits, unitsPerYear } = input;
  if (!totalUnits || !unitsPerYear || unitsPerYear.length === 0) {
    throw new Error('Total units and units per year are required for Units of Activity method');
  }
  const start = new Date(sivDate);
  const usefulLifeMonths = usefulLifeYears * 12;
  const depreciableAmount = unitPrice - salvageValue;
  const depreciationPerUnit = depreciableAmount / totalUnits;
  const results: MonthlyDepreciationResult[] = [];
  let accumulatedDepreciation = 0;
  // Expand unitsPerYear to months
  const unitsPerMonth: number[] = [];
  for (let y = 0; y < usefulLifeYears; y++) {
    const unitsThisYear = unitsPerYear[y] || unitsPerYear[unitsPerYear.length - 1];
    for (let m = 0; m < 12; m++) {
      unitsPerMonth.push(unitsThisYear / 12);
    }
  }
  for (let m = 0; m < usefulLifeMonths; m++) {
    const date = addMonths(start, m);
    const unitsThisMonth = unitsPerMonth[m];
    let depreciationExpense = depreciationPerUnit * unitsThisMonth;
    if (m === 0) {
      // Prorate for first month
      const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth() + 1);
      const startDay = start.getDate();
      depreciationExpense = depreciationExpense * (daysInMonth - (startDay - 1)) / daysInMonth;
    }
    // If this is the last month, adjust so book value = 0
    if (m === usefulLifeMonths - 1) {
      depreciationExpense = depreciableAmount - accumulatedDepreciation;
    }
    accumulatedDepreciation += depreciationExpense;
    let cappedAccumulatedDepreciation = Math.min(accumulatedDepreciation, depreciableAmount);
    let bookValue = depreciableAmount - cappedAccumulatedDepreciation;
    if (m === usefulLifeMonths - 1) {
      bookValue = 0; // End at 0 since we started from depreciable amount
    }
    results.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      depreciationExpense: m === 0 ? depreciationExpense :
        (cappedAccumulatedDepreciation === depreciableAmount ?
          depreciableAmount - results[m - 1].accumulatedDepreciation :
          depreciationExpense),
      accumulatedDepreciation: cappedAccumulatedDepreciation,
      bookValue,
    });
    if (cappedAccumulatedDepreciation >= depreciableAmount) break;
  }

  // Add post-useful-life results (asset is fully depreciated, book value = salvage value)
  const endOfUsefulLife = addMonths(start, usefulLifeMonths);
  const finalAccumulatedDepreciation = depreciableAmount;

  for (let m = 0; m < 36; m++) { // 3 years * 12 months = 36 months (reduced from 240)
    const date = addMonths(endOfUsefulLife, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    results.push({
      year,
      month,
      depreciationExpense: 0, // No more depreciation after useful life
      accumulatedDepreciation: finalAccumulatedDepreciation,
      bookValue: salvageValue, // Book value remains at salvage value
    });
  }

  return results;
}

function validateMonthlyResults(results: MonthlyDepreciationResult[]): MonthlyDepreciationResult[] {
  // Check for duplicate year-month combinations
  const seen = new Set<string>();
  const validated: MonthlyDepreciationResult[] = [];

  for (const result of results) {
    const key = `${result.year}-${result.month}`;
    if (seen.has(key)) {
      console.warn(`⚠️ Duplicate month found: ${key}, skipping duplicate`);
      continue;
    }
    seen.add(key);
    validated.push(result);
  }

  return validated;
}

export function calculateMonthlyDepreciation(input: DepreciationInput): MonthlyDepreciationResult[] {
  if (!input.unitPrice || input.unitPrice <= 0) {
    throw new Error('Purchase price must be greater than zero');
  }
  if (input.salvageValue < 0 || input.salvageValue >= input.unitPrice) {
    throw new Error('Salvage value must be non-negative and less than purchase price');
  }
  if (!input.usefulLifeYears || input.usefulLifeYears <= 0) {
    throw new Error('Useful life must be greater than zero');
  }

  let results: MonthlyDepreciationResult[];

  switch (input.method) {
    case 'STRAIGHT_LINE':
      results = calculateStraightLineMonthly(input);
      break;
    case 'DECLINING_BALANCE':
      results = calculateDecliningBalanceMonthly(input);
      break;
    case 'DOUBLE_DECLINING':
      results = calculateDoubleDecliningBalanceMonthly(input);
      break;
    case 'SUM_OF_YEARS_DIGITS':
      results = calculateSumOfYearsDigitsMonthly(input);
      break;
    case 'UNITS_OF_ACTIVITY':
      results = calculateUnitsOfActivityMonthly(input);
      break;
    default:
      throw new Error(`Unsupported depreciation method: ${input.method}`);
  }

  // Validate and remove any duplicates
  return validateMonthlyResults(results);
}