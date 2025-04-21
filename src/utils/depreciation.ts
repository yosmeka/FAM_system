export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE';

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
 * Calculate depreciation based on the specified method
 */
export function calculateDepreciation(input: DepreciationInput): DepreciationResult[] {
  if (input.method === 'STRAIGHT_LINE') {
    return calculateStraightLineDepreciation(input);
  } else {
    return calculateDecliningBalanceDepreciation(input);
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