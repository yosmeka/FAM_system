/**
 * Format a number as currency (USD)
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., $1,234.56)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format a date string to a localized date string
 * @param dateString - The date string to format
 * @returns Formatted date string (e.g., 1/1/2023)
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format a number with commas for thousands
 * @param value - The number to format
 * @returns Formatted number string (e.g., 1,234)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a percentage value
 * @param value - The decimal value to format as percentage
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., 12.34%)
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
