# April Month Shifting Issue - Depreciation Expense Display

## 🚨 **Problem Identified:**

**Asset Detail Page (Correct):**
- April 2021 (Month 4): $28.05 depreciation expense ✅
- May 2021 (Month 5): $28.05 depreciation expense ✅

**Asset Report Table (Incorrect):**
- April column: $0 ❌ (should be $28.05)
- May column: Shows value ❌ (probably shifted from April)

## 🔍 **Root Cause Analysis:**

The issue is likely one of these:

### **1. Month Indexing Mismatch:**
- **Depreciation calculation**: Uses 1-based months (1=Jan, 4=Apr)
- **Frontend display**: Might be using 0-based indexing somewhere
- **API mapping**: Could have indexing inconsistency

### **2. Data Structure Mismatch:**
- **API stores**: `yearlyDepreciationExpenses[4] = 28.05` (April)
- **Frontend expects**: Different key format or structure
- **Mapping issue**: Between API response and frontend consumption

### **3. Date Calculation Error:**
- **SIV Date**: Asset starts in April
- **Calculation**: Might be off by one month
- **Display**: Shows in wrong month column

## 🧪 **Debugging Steps Added:**

### **1. API Debugging:**
```javascript
// Added specific April debugging in API
aprilCheck: {
  hasAprilData: !!yearlyDepreciationExpenses[4],
  aprilValue: yearlyDepreciationExpenses[4],
  aprilStringKey: yearlyDepreciationExpenses['4'],
  monthKeys: Object.keys(yearlyDepreciationExpenses),
  monthValues: Object.values(yearlyDepreciationExpenses)
}
```

### **2. Frontend Debugging:**
```javascript
// Added month-by-month mapping debug
monthByMonthMapping: Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  const monthName = new Date(0, i).toLocaleString('default', { month: 'short' });
  const value = asset.bookValuesByMonth[month] || asset.bookValuesByMonth[month.toString()];
  return `${monthName} (${month}): ${value ? '$' + value.toFixed(2) : 'undefined'}`;
})
```

## 🔧 **How to Test the Fix:**

### **Test 1: Check Console Logs**
1. **Open browser developer tools** → Console
2. **Go to Asset Reports**
3. **Apply year filter** (e.g., 2021)
4. **Look for debug logs**:
   ```
   🔍 API Debug: Asset [id] monthly calculation
   🔍 CSV Export Debug: Asset [id] monthly depreciation expenses
   ```

### **Test 2: Verify API Data**
Look for these in the console logs:
```javascript
aprilCheck: {
  hasAprilData: true,           // Should be true if April has data
  aprilValue: 28.05,           // Should show the correct expense
  aprilStringKey: 28.05,       // Should match aprilValue
  monthKeys: ['4', '5', '6'...], // Should include '4' for April
}
```

### **Test 3: Verify Frontend Mapping**
Look for this in the console logs:
```javascript
monthByMonthMapping: [
  "Jan (1): undefined",
  "Feb (2): undefined", 
  "Mar (3): undefined",
  "Apr (4): $28.05",     // Should show April value here
  "May (5): $28.05",     // Should show May value here
  ...
]
```

### **Test 4: Check Asset Detail vs Report**
1. **Go to asset detail page** → Depreciation tab
2. **Note April depreciation expense** (e.g., $28.05)
3. **Go to asset reports** → Apply 2021 year filter
4. **Check April column** → Should match detail page

## 🎯 **Expected Debug Output:**

### **If Working Correctly:**
```
API Debug: Asset [id] monthly calculation: {
  aprilCheck: {
    hasAprilData: true,
    aprilValue: 28.05,
    aprilStringKey: 28.05,
    monthKeys: ['4', '5', '6', '7', '8', '9', '10', '11', '12']
  }
}

Frontend Debug: {
  monthByMonthMapping: [
    "Jan (1): undefined",
    "Feb (2): undefined", 
    "Mar (3): undefined",
    "Apr (4): $28.05",
    "May (5): $28.05",
    ...
  ]
}
```

### **If Broken (Current Issue):**
```
API Debug: Asset [id] monthly calculation: {
  aprilCheck: {
    hasAprilData: true,
    aprilValue: 28.05,        // API has correct data
    monthKeys: ['4', '5', ...]
  }
}

Frontend Debug: {
  monthByMonthMapping: [
    "Apr (4): undefined",     // Frontend not finding April data
    "May (5): $28.05",       // May showing April's value
    ...
  ]
}
```

## 🔧 **Potential Fixes:**

### **Fix 1: Key Type Consistency**
Ensure both API and frontend use same key types:
```javascript
// API: Store as both number and string keys
yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
yearlyDepreciationExpenses[result.month.toString()] = result.depreciationExpense;

// Frontend: Check both key types
const monthValue = asset.bookValuesByMonth[month] || asset.bookValuesByMonth[month.toString()];
```

### **Fix 2: Month Index Verification**
Verify depreciation calculation returns correct months:
```javascript
// In depreciation.ts, ensure:
const month = date.getMonth() + 1; // 1-based month (1=Jan, 4=Apr)
```

### **Fix 3: Data Flow Verification**
Ensure API response structure matches frontend expectations:
```javascript
// API should return:
{
  bookValuesByMonth: {
    "4": 28.05,  // April
    "5": 28.05,  // May
    ...
  }
}
```

## 📊 **Test Scenarios:**

### **Scenario 1: April Start Date**
- **Asset**: Starts depreciation April 1, 2021
- **Expected**: April column shows $28.05
- **Current**: April shows $0, May shows $28.05

### **Scenario 2: Mid-Month Start**
- **Asset**: Starts depreciation April 15, 2021
- **Expected**: April shows prorated amount
- **Test**: Verify proration calculation

### **Scenario 3: Different Years**
- **Asset**: Starts 2020, view 2021 data
- **Expected**: All 12 months show expenses
- **Test**: Verify year filtering works

## 🎯 **Success Criteria:**

### **✅ Correct Display:**
- April column shows April's depreciation expense
- May column shows May's depreciation expense
- No month shifting or offset issues

### **✅ Data Consistency:**
- Asset detail page matches asset report table
- Same depreciation expenses in both places
- Correct month-to-value mapping

### **✅ Debug Verification:**
- Console logs show correct API data
- Frontend receives and processes data correctly
- Month mapping works for all 12 months

**Run the test with debugging enabled to identify the exact cause of the month shifting issue!** 🔍

The debug output will show whether the problem is:
1. **API calculation** (wrong month numbers)
2. **API mapping** (wrong key storage)
3. **Frontend processing** (wrong key lookup)
4. **Data structure** (format mismatch)
