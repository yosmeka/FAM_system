# Ethiopian Budget Year Implementation

## 🎯 **New Functionality:**
Implemented **Ethiopian budget year** support where the budget year runs from **July to June** instead of the standard January to December calendar year.

**Ethiopian Budget Year Structure:**
- **2023/2024 Budget Year**: July 2023 → June 2024
- **2024/2025 Budget Year**: July 2024 → June 2025
- **2025/2026 Budget Year**: July 2025 → June 2026

## 📊 **Example with Asset Registered 3/30/2024:**

### **2023/2024 Budget Year Filter:**
| Column | Month | Calendar | Depreciation Expense |
|--------|-------|----------|---------------------|
| 1 | Jul | Jul 2023 | $0 (not registered) |
| 2 | Aug | Aug 2023 | $0 (not registered) |
| 3 | Sep | Sep 2023 | $0 (not registered) |
| 4 | Oct | Oct 2023 | $0 (not registered) |
| 5 | Nov | Nov 2023 | $0 (not registered) |
| 6 | Dec | Dec 2023 | $0 (not registered) |
| 7 | Jan | Jan 2024 | $0 (not registered) |
| 8 | Feb | Feb 2024 | $0 (not registered) |
| 9 | Mar | Mar 2024 | $74.52 (prorated) |
| 10 | Apr | Apr 2024 | $1,155.00 |
| 11 | May | May 2024 | $1,155.00 |
| 12 | Jun | Jun 2024 | $1,155.00 |

### **2024/2025 Budget Year Filter:**
| Column | Month | Calendar | Depreciation Expense |
|--------|-------|----------|---------------------|
| 1 | Jul | Jul 2024 | $1,155.00 |
| 2 | Aug | Aug 2024 | $1,155.00 |
| 3 | Sep | Sep 2024 | $1,155.00 |
| 4 | Oct | Oct 2024 | $1,155.00 |
| 5 | Nov | Nov 2024 | $1,155.00 |
| 6 | Dec | Dec 2024 | $1,155.00 |
| 7 | Jan | Jan 2025 | $1,155.00 |
| 8 | Feb | Feb 2025 | $1,155.00 |
| 9 | Mar | Mar 2025 | $1,155.00 |
| 10 | Apr | Apr 2025 | $1,155.00 |
| 11 | May | May 2025 | $1,155.00 |
| 12 | Jun | Jun 2025 | $1,155.00 |

## 🔧 **Implementation Details:**

### **1. Year Filter Options Updated:**
```javascript
// Before: 2024, 2025, 2026
// After: 2024/2025, 2025/2026, 2026/2027
const budgetYearLabel = `${budgetStartYear}/${budgetStartYear + 1}`;
```

### **2. Column Headers Updated:**
```javascript
// Ethiopian budget year starts from July (month 7)
const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
const budgetYear = budgetMonth >= 7 ? currentFilters.year : parseInt(currentFilters.year) + 1;
const monthName = new Date(0, budgetMonth - 1).toLocaleString('default', { month: 'short' });
return `${monthName} ${budgetYear} Depreciation Expense`;
```

**Column Order:**
- Column 1: Jul 2024
- Column 2: Aug 2024
- ...
- Column 6: Dec 2024
- Column 7: Jan 2025
- ...
- Column 12: Jun 2025

### **3. Data Mapping Updated:**
```javascript
// Map data to Ethiopian budget year columns
for (let i = 0; i < 12; i++) {
  const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
  const budgetYear = budgetMonth >= 7 ? currentFilters.year : parseInt(currentFilters.year) + 1;
  const monthValue = asset.bookValuesByMonth[budgetMonth];
  baseRow.push(monthValue);
}
```

### **4. API Updated for Ethiopian Budget Year:**
```javascript
// Extract depreciation expenses for Ethiopian budget year (July to June)
monthlyResults.forEach(result => {
  // Ethiopian budget year: July of 'year' to June of 'year+1'
  const isInBudgetYear = (result.year === year && result.month >= 7) || 
                        (result.year === year + 1 && result.month <= 6);
  
  if (isInBudgetYear) {
    yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
  }
});
```

## 🧪 **How to Test:**

### **Test 1: Year Filter Options**
1. **Go to Asset Reports**
2. **Check year filter dropdown**
3. **Expected**: Shows 2024/2025, 2025/2026, etc. instead of 2024, 2025

### **Test 2: Column Headers**
1. **Apply year filter**: 2024/2025
2. **Check column headers**
3. **Expected**: 
   - First column: "Jul 2024 Depreciation Expense"
   - Last column: "Jun 2025 Depreciation Expense"

### **Test 3: Data Mapping with Your Asset**
1. **Filter by 2023/2024**
2. **Find asset registered 3/30/2024**
3. **Expected**:
   - Jul 2023 - Feb 2024 columns: $0
   - Mar 2024 column: $74.52
   - Apr-Jun 2024 columns: $1,155.00

### **Test 4: Data Mapping Next Budget Year**
1. **Filter by 2024/2025**
2. **Same asset**
3. **Expected**:
   - Jul 2024 - Jun 2025 columns: All show $1,155.00

## 📊 **Debug Output to Look For:**

### **Header Debug:**
```
🔍 Ethiopian Header Debug: Index 0 -> Budget Month 7 (Jul) Year 2024
🔍 Ethiopian Header Debug: Index 1 -> Budget Month 8 (Aug) Year 2024
🔍 Ethiopian Header Debug: Index 6 -> Budget Month 1 (Jan) Year 2025
🔍 Ethiopian Header Debug: Index 11 -> Budget Month 6 (Jun) Year 2025
```

### **Data Debug:**
```
🔍 Ethiopian Data Debug: Asset 123 Column 0 -> Budget Month 7 (Jul) Year 2024 -> Value: 1155.00
🔍 Ethiopian Data Debug: Asset 123 Column 6 -> Budget Month 1 (Jan) Year 2025 -> Value: 1155.00
```

### **API Debug:**
```
🔍 Ethiopian Main Calc: Asset 123 Budget Year 2024/2025 - Calendar 2024 Month 7: $1155.00
🔍 Ethiopian Main Calc: Asset 123 Budget Year 2024/2025 - Calendar 2025 Month 1: $1155.00
```

## 🎯 **Expected Results:**

### **✅ Year Filter:**
- Dropdown shows: 2024/2025, 2025/2026, 2026/2027
- User selects: 2024/2025

### **✅ Column Headers:**
```
Jul 2024 | Aug 2024 | Sep 2024 | Oct 2024 | Nov 2024 | Dec 2024 |
Jan 2025 | Feb 2025 | Mar 2025 | Apr 2025 | May 2025 | Jun 2025
```

### **✅ Data Mapping:**
- **2023/2024 filter**: Shows Mar-Jun 2024 data in last 4 columns
- **2024/2025 filter**: Shows Jul 2024-Jun 2025 data across all 12 columns
- **2025/2026 filter**: Shows Jul 2025-Jun 2026 data across all 12 columns

## 🔧 **Key Features:**

### **1. Automatic Year Calculation:**
- **July-December**: Uses the selected year (e.g., 2024)
- **January-June**: Uses the next year (e.g., 2025)

### **2. Correct Data Retrieval:**
- **API fetches**: Data from both calendar years
- **Frontend maps**: Data to correct budget year columns
- **Headers show**: Correct month and year combinations

### **3. Backward Compatibility:**
- **Depreciation calculation**: Unchanged
- **Database storage**: Unchanged
- **Only display**: Modified for Ethiopian budget year

## 🎯 **Business Benefits:**

### **1. Accurate Budget Planning:**
- **Aligns with Ethiopian fiscal year**: July to June
- **Better financial reporting**: Matches government budget cycles
- **Improved planning**: Assets tracked by budget year

### **2. Compliance:**
- **Government reporting**: Matches official budget year
- **Audit requirements**: Aligns with Ethiopian accounting standards
- **Financial statements**: Consistent with budget year

### **3. User Experience:**
- **Familiar format**: Users see expected budget year format
- **Clear columns**: July to June order matches expectations
- **Accurate data**: Correct depreciation expenses by budget year

**The asset reports now support Ethiopian budget year (July to June) with correct column headers and data mapping!** 🇪🇹

This provides:
- **Ethiopian budget year support** (July to June)
- **Correct column ordering** (Jul, Aug, ..., Dec, Jan, ..., Jun)
- **Accurate data mapping** across calendar year boundaries
- **Professional budget year display** (2024/2025 format)
