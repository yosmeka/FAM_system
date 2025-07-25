# Yearly Accumulated Depreciation Column - New Feature

## 🎯 **New Functionality:**
Added a **Yearly Accumulated Depreciation** column that shows the **sum of all monthly depreciation expenses** for the selected Ethiopian budget year.

## 🔧 **What's New:**

### **✅ New Column Added:**
- **Column Name**: "Yearly Accumulated Depreciation (2024/2025)"
- **Position**: First column (before monthly columns)
- **Calculation**: Sum of all 12 monthly depreciation expenses
- **Format**: Currency format with proper formatting

### **✅ Column Order:**
```
1. Yearly Accumulated Depreciation (2024/2025)
2. Jul 2024 Depreciation Expense
3. Aug 2024 Depreciation Expense
4. Sep 2024 Depreciation Expense
...
13. Jun 2025 Depreciation Expense
```

## 🧪 **How to Test:**

### **Step 1: Access the New Column**
1. **Go to Asset Reports**
2. **Enter budget year**: Type "2024/2025" in Budget Year field
3. **Look for new column**: "Yearly Accumulated Depreciation (2024/2025)"
4. **Position**: Should be the first column after basic asset info

### **Step 2: Test Your Asset Example**
1. **Find asset registered 3/30/2024**
2. **For 2024/2025 budget year**:
   ```
   Monthly values:
   Jul 2024: $1,155.00
   Aug 2024: $1,155.00
   Sep 2024: $1,155.00
   Oct 2024: $1,155.00
   Nov 2024: $1,155.00
   Dec 2024: $1,155.00
   Jan 2025: $1,155.00
   Feb 2025: $1,155.00
   Mar 2025: $1,155.00
   Apr 2025: $1,155.00
   May 2025: $1,155.00
   Jun 2025: $1,155.00
   
   Yearly Total: $13,860.00 (12 × $1,155.00)
   ```

### **Step 3: Test Different Budget Years**
1. **Test "2023/2024" budget year**:
   ```
   Monthly values:
   Jul 2023 - Feb 2024: $0 (not registered)
   Mar 2024: $74.52 (prorated)
   Apr 2024: $1,155.00
   May 2024: $1,155.00
   Jun 2024: $1,155.00
   
   Yearly Total: $3,539.52 ($74.52 + $1,155.00 × 3)
   ```

### **Step 4: Test Export Functions**
1. **Export to Excel**:
   - **Expected**: Yearly column appears first
   - **Header**: "Yearly Accumulated Depreciation (2024/2025)"
   - **Data**: Correct totals for each asset

2. **Export to CSV**:
   - **Expected**: Same yearly column and data
   - **Format**: Consistent with table display

## 📊 **Calculation Logic:**

### **Ethiopian Budget Year Sum:**
```javascript
// For budget year 2024/2025, sum these months:
Jul 2024 + Aug 2024 + Sep 2024 + Oct 2024 + Nov 2024 + Dec 2024 +
Jan 2025 + Feb 2025 + Mar 2025 + Apr 2025 + May 2025 + Jun 2025
```

### **Implementation:**
```javascript
// Calculate total for Ethiopian budget year (July to June)
let total = 0;
for (let i = 0; i < 12; i++) {
  const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
  const monthValue = item.bookValuesByMonth[budgetMonth];
  if (monthValue !== undefined && monthValue !== null && !isNaN(Number(monthValue))) {
    total += Number(monthValue);
  }
}
```

## 🎯 **Business Benefits:**

### **1. Quick Overview:**
- **At-a-glance**: See total depreciation for the budget year
- **Easy comparison**: Compare yearly totals across assets
- **Budget planning**: Understand total depreciation impact

### **2. Financial Analysis:**
- **Budget compliance**: Track against budget allocations
- **Variance analysis**: Compare actual vs planned depreciation
- **Reporting**: Single number for budget year depreciation

### **3. Audit Support:**
- **Verification**: Easy to verify monthly totals
- **Documentation**: Clear yearly depreciation amounts
- **Compliance**: Supports Ethiopian budget year reporting

## 📊 **Expected Results:**

### **For Asset Registered 3/30/2024:**

#### **2023/2024 Budget Year:**
```
Yearly Accumulated Depreciation: $3,539.52
Monthly breakdown:
- Jul 2023 - Feb 2024: $0 each
- Mar 2024: $74.52
- Apr 2024: $1,155.00
- May 2024: $1,155.00
- Jun 2024: $1,155.00
Total: $0×9 + $74.52 + $1,155×3 = $3,539.52
```

#### **2024/2025 Budget Year:**
```
Yearly Accumulated Depreciation: $13,860.00
Monthly breakdown:
- Jul 2024 - Jun 2025: $1,155.00 each
Total: $1,155×12 = $13,860.00
```

#### **2025/2026 Budget Year:**
```
Yearly Accumulated Depreciation: $13,860.00
Monthly breakdown:
- Jul 2025 - Jun 2026: $1,155.00 each (if still depreciating)
Total: $1,155×12 = $13,860.00
```

## 🔧 **Technical Features:**

### **✅ Smart Calculation:**
- **Handles missing data**: Skips undefined/null values
- **Number validation**: Ensures valid numeric values
- **Zero handling**: Shows "—" for zero totals

### **✅ Proper Formatting:**
- **Currency format**: $13,860.00 with commas
- **Consistent display**: Matches monthly column formatting
- **Export compatibility**: Works in Excel and CSV

### **✅ Ethiopian Budget Year Logic:**
- **July to June**: Correctly sums Ethiopian budget year
- **Cross-year data**: Handles data from two calendar years
- **Flexible input**: Works with any budget year format

## 🔍 **Debug Information:**

### **Console Output:**
```
🔍 Yearly Depreciation Debug: Asset 123 Budget Year 2024/2025
  Jul 2024: $1,155.00
  Aug 2024: $1,155.00
  ...
  Jun 2025: $1,155.00
  Yearly Total: $13,860.00
```

### **Verification Steps:**
1. **Check monthly values**: Ensure all 12 months have correct data
2. **Verify sum**: Manual calculation should match yearly total
3. **Cross-reference**: Compare with individual monthly columns

## ✅ **Success Criteria:**

### **✅ Column Display:**
- Yearly column appears first (before monthly columns)
- Header shows correct budget year format
- Data shows correct currency formatting

### **✅ Calculation Accuracy:**
- Sum equals total of all 12 monthly values
- Handles partial year data correctly
- Shows "—" for assets with no depreciation

### **✅ Export Consistency:**
- Excel export includes yearly column
- CSV export includes yearly column
- All exports show same calculated values

### **✅ User Experience:**
- Easy to spot yearly totals at a glance
- Consistent with Ethiopian budget year format
- Professional financial reporting display

**The Yearly Accumulated Depreciation column provides a quick overview of total depreciation for each asset in the selected Ethiopian budget year!** 🇪🇹

This feature:
- **Simplifies analysis**: One number shows total budget year depreciation
- **Supports planning**: Easy comparison of yearly depreciation costs
- **Enhances reporting**: Professional Ethiopian budget year summaries
- **Maintains accuracy**: Precise calculation of monthly totals
