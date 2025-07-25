# Column-Data Alignment Test - Month Shifting Fix

## 🚨 **Problem:**
The depreciation expense columns are showing the wrong values - each month shows the next month's value.

**Example:**
- **June column** should show June's depreciation expense ($12.38)
- **June column** actually shows July's depreciation expense ($61.88)

## 🔧 **Enhanced Debugging Added:**

### **1. Header Generation Debug:**
```javascript
🔍 Header Debug: Index 0 -> Month 1 (Jan)
🔍 Header Debug: Index 1 -> Month 2 (Feb)
🔍 Header Debug: Index 5 -> Month 6 (Jun)  // Column position 5 = June header
🔍 Header Debug: Index 6 -> Month 7 (Jul)  // Column position 6 = July header
```

### **2. Data Mapping Debug:**
```javascript
🔍 Data Debug: Asset 123 Month 1 (Jan) -> Value: undefined
🔍 Data Debug: Asset 123 Month 6 (Jun) -> Value: 12.38    // Data for month 6
🔍 Data Debug: Asset 123 Month 7 (Jul) -> Value: 61.88    // Data for month 7
```

## 🧪 **How to Test:**

### **Step 1: Apply Year Filter**
1. **Go to Asset Reports**
2. **Apply year filter** (e.g., 2025)
3. **Open browser console** (F12 → Console)

### **Step 2: Check Header-Data Alignment**
Look for these debug messages:

#### **Header Generation:**
```
🔍 Header Debug: Index 5 -> Month 6 (Jun)
🔍 Header Debug: Index 6 -> Month 7 (Jul)
```

#### **Data Mapping:**
```
🔍 Data Debug: Asset 123 Month 6 (Jun) -> Value: 12.38
🔍 Data Debug: Asset 123 Month 7 (Jul) -> Value: 61.88
```

### **Step 3: Verify Column Alignment**
Check if:
- **Column position 5** (June header) gets **data for month 6** (12.38) ✅
- **Column position 6** (July header) gets **data for month 7** (61.88) ✅

## 🎯 **Potential Issues:**

### **Issue 1: Header-Data Index Mismatch**
**If headers use 0-based indexing but data uses 1-based:**
- Header position 5 = June
- Data lookup month 6 = June
- **Result**: Should be aligned ✅

### **Issue 2: Data Array Building Issue**
**If data is pushed in wrong order:**
```javascript
// Wrong order - each position gets next month's data
baseRow.push(monthValue[month + 1]); // ❌ Off by one
```

### **Issue 3: API Data Storage Issue**
**If API stores data with wrong month keys:**
```javascript
// API stores June data with July key
yearlyDepreciationExpenses[7] = juneExpense; // ❌ Wrong key
```

## 🔧 **Expected Debug Output:**

### **✅ Correct Alignment:**
```
🔍 Header Debug: Index 5 -> Month 6 (Jun)
🔍 Data Debug: Asset 123 Month 6 (Jun) -> Value: 12.38
// June column shows 12.38 ✅

🔍 Header Debug: Index 6 -> Month 7 (Jul)  
🔍 Data Debug: Asset 123 Month 7 (Jul) -> Value: 61.88
// July column shows 61.88 ✅
```

### **❌ Misalignment (Current Issue):**
```
🔍 Header Debug: Index 5 -> Month 6 (Jun)
🔍 Data Debug: Asset 123 Month 6 (Jun) -> Value: 12.38
// But June column shows 61.88 ❌ (July's value)

🔍 Header Debug: Index 6 -> Month 7 (Jul)
🔍 Data Debug: Asset 123 Month 7 (Jul) -> Value: 61.88  
// July column shows next month's value ❌
```

## 🔧 **Potential Fixes:**

### **Fix 1: If Data Array Building is Wrong**
```javascript
// Ensure data is pushed in correct order
for (let month = 1; month <= 12; month++) {
  const monthValue = asset.bookValuesByMonth[month];
  baseRow.push(monthValue); // Push month 1 data to position 0, month 2 to position 1, etc.
}
```

### **Fix 2: If Header Generation is Wrong**
```javascript
// Ensure headers match data order
Array.from({ length: 12 }, (_, i) => {
  const month = i + 1; // Position 0 = Month 1, Position 5 = Month 6
  return `${monthName} ${year} Depreciation Expense`;
})
```

### **Fix 3: If API Storage is Wrong**
```javascript
// Ensure API stores data with correct month keys
monthlyResults.forEach(result => {
  if (result.year === year) {
    // Store June data with key 6, July data with key 7
    yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
  }
});
```

## 📊 **Test Matrix:**

| Column Position | Header Month | Data Month | Expected Value | Actual Value | Status |
|----------------|--------------|------------|----------------|--------------|---------|
| 0 | Jan | 1 | undefined | undefined | ✅ |
| 5 | Jun | 6 | $12.38 | $61.88 | ❌ |
| 6 | Jul | 7 | $61.88 | next month | ❌ |

## 🎯 **Action Plan:**

1. **Run the test** with year filter applied
2. **Check the debug output** for header-data alignment
3. **Identify the mismatch** between column positions and data values
4. **Apply the specific fix** based on where the misalignment occurs

**The enhanced debugging will show us exactly how the headers and data are being aligned!** 🔍

This will reveal whether the issue is in:
- **Header generation** (wrong column labels)
- **Data building** (wrong value order)
- **API storage** (wrong month keys)
- **Array indexing** (off-by-one errors)

## 🎯 **Quick Fix Test:**

If the debug shows correct data but wrong column display, try this manual fix:

```javascript
// Test fix: Adjust data mapping by one position
for (let month = 1; month <= 12; month++) {
  const monthValue = asset.bookValuesByMonth[month];
  // Try different indexing to see if it fixes the shift
  baseRow.push(monthValue);
}
```

**Run the test and share the header-data debug output to pinpoint the exact misalignment!**
