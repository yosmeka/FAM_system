# Month Shifting Issue - Specific Case Analysis

## 🚨 **Problem Identified:**
**Month shifting in asset report table** - depreciation expenses are showing in the wrong month columns.

**Specific Example:**
- **Asset SIV Date**: 6/25/2025
- **Correct Calculation**: Month 6 = $12.38, Month 7 = $61.88, Month 8 = $61.88, etc.
- **Report Table Display**: Month 6 column shows $61.88 (Month 7's value) ❌

**This means values are shifted by one month** - each month shows the next month's value.

## 🔧 **Enhanced Debugging Added:**

### **1. Depreciation Calculation Debug:**
```javascript
// Added specific debugging for 6/25/2025 case
🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=6, Expense=$12.38
🔍 Depreciation Debug: m=1, Date=2025-07-25, Year=2025, Month=7, Expense=$61.88
🔍 Depreciation Debug: m=2, Date=2025-08-25, Year=2025, Month=8, Expense=$61.88
```

### **2. API Mapping Debug:**
```javascript
// Shows what month keys are stored
🔍 Main Calc: Asset [id] Year 2025 Month 6: $12.38
🔍 Main Calc: Asset [id] Year 2025 Month 7: $61.88
```

### **3. Frontend Lookup Debug:**
```javascript
// Shows what values are found for each month
monthByMonthMapping: [
  "Jun (6): $12.38",    // Should show this
  "Jul (7): $61.88",    // Should show this
  ...
]
```

## 🧪 **How to Test:**

### **Step 1: Create Test Asset**
1. **Create an asset** with SIV date 6/25/2025
2. **Set depreciation parameters** to match your example
3. **Go to Asset Detail** → Verify depreciation schedule shows:
   - June 2025: $12.38
   - July 2025: $61.88

### **Step 2: Check Asset Reports**
1. **Go to Asset Reports**
2. **Apply year filter**: 2025
3. **Open browser console** (F12 → Console)
4. **Look for debug messages**

### **Step 3: Analyze Debug Output**
Look for these specific patterns:

#### **Pattern A: Calculation Issue**
```
🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=7, Expense=$12.38  // Wrong month!
🔍 Depreciation Debug: m=1, Date=2025-07-25, Year=2025, Month=8, Expense=$61.88  // Wrong month!
```
**Problem**: Depreciation calculation returns wrong month numbers
**Fix**: Issue in `addMonths` function or month calculation

#### **Pattern B: API Storage Issue**
```
🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=6, Expense=$12.38  // Correct
🔍 Main Calc: Asset [id] Year 2025 Month 7: $12.38  // Wrong storage!
```
**Problem**: API stores data with wrong month keys
**Fix**: Issue in API mapping logic

#### **Pattern C: Frontend Lookup Issue**
```
🔍 Main Calc: Asset [id] Year 2025 Month 6: $12.38  // Correct storage
monthByMonthMapping: ["Jun (6): $61.88", ...]  // Wrong lookup!
```
**Problem**: Frontend looks up wrong month values
**Fix**: Issue in frontend month iteration or key lookup

## 🔧 **Potential Fixes:**

### **Fix 1: addMonths Function Issue**
```javascript
// If addMonths returns wrong dates
function addMonths(date: Date, months: number): Date {
  // Ensure we're adding months correctly
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
```

### **Fix 2: Month Calculation Off-by-One**
```javascript
// If month calculation is wrong
const month = date.getMonth() + 1; // Ensure 1-based month
// Verify: June = 6, July = 7, etc.
```

### **Fix 3: API Key Storage Issue**
```javascript
// If API stores with wrong keys
monthlyResults.forEach(result => {
  if (result.year === year) {
    // Ensure month key is correct
    console.log(`Storing Month ${result.month}: $${result.depreciationExpense}`);
    yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
  }
});
```

### **Fix 4: Frontend Lookup Issue**
```javascript
// If frontend looks up wrong keys
for (let month = 1; month <= 12; month++) {
  const monthValue = asset.bookValuesByMonth?.[month];
  console.log(`Looking up Month ${month}: ${monthValue}`);
  // Ensure month 6 gets value for key 6, not key 7
}
```

## 📊 **Expected Debug Output:**

### **✅ Working Correctly:**
```
🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=6, Expense=$12.38
🔍 Depreciation Debug: m=1, Date=2025-07-25, Year=2025, Month=7, Expense=$61.88
🔍 Main Calc: Asset [id] Year 2025 Month 6: $12.38
🔍 Main Calc: Asset [id] Year 2025 Month 7: $61.88
monthByMonthMapping: ["Jun (6): $12.38", "Jul (7): $61.88", ...]
```

### **❌ Current Issue (Month Shifting):**
```
// One of these patterns will show the issue:

// Pattern A: Calculation returns wrong months
🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=7, Expense=$12.38

// Pattern B: API stores with wrong keys  
🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=6, Expense=$12.38
🔍 Main Calc: Asset [id] Year 2025 Month 7: $12.38

// Pattern C: Frontend looks up wrong values
🔍 Main Calc: Asset [id] Year 2025 Month 6: $12.38
monthByMonthMapping: ["Jun (6): $61.88", ...]
```

## 🎯 **Diagnostic Questions:**

### **Question 1: Does depreciation calculation return correct months?**
**Look for**: `🔍 Depreciation Debug: m=0, Date=2025-06-25, Year=2025, Month=6`
- **If Month=6**: Calculation is correct ✅
- **If Month=7**: Calculation is off by one ❌

### **Question 2: Does API store data with correct keys?**
**Look for**: `🔍 Main Calc: Asset [id] Year 2025 Month 6: $12.38`
- **If Month 6 = $12.38**: API storage is correct ✅
- **If Month 6 = $61.88**: API storage is wrong ❌

### **Question 3: Does frontend lookup correct values?**
**Look for**: `monthByMonthMapping: ["Jun (6): $12.38", ...]`
- **If Jun shows $12.38**: Frontend lookup is correct ✅
- **If Jun shows $61.88**: Frontend lookup is wrong ❌

## 🎯 **Action Plan:**

1. **Test with your specific asset** (SIV date 6/25/2025)
2. **Check the debug output** to identify which pattern matches
3. **Apply the corresponding fix** based on the diagnosis
4. **Verify the fix** resolves the month shifting for all assets

**The enhanced debugging will show us exactly where the month shifting occurs in the data flow!** 🔍

This will pinpoint whether the issue is in:
- **Calculation** (wrong month numbers generated)
- **Storage** (wrong month keys stored)
- **Lookup** (wrong month values retrieved)
- **Display** (wrong month columns shown)
