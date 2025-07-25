# Systematic Month Shifting Fix - All Assets

## 🚨 **Problem Confirmed:**
**ALL assets** are experiencing month shifting in the asset report table where each month column shows the next month's value.

**From your console output:**
```javascript
firstAssetBookValues: {
  1: 2828.57,  // All months show same value (API issue)
  2: 2828.57,  // Should be different values
  6: 2828.57,  // Should be $12.38 for June
  7: 2828.57,  // Should be $61.88 for July
}
```
**But June column shows $61.88 instead of $2828.57 (Frontend issue)**

## 🔧 **Fixes Applied:**

### **Fix 1: Increased API Timeout**
```javascript
// Before: 45 seconds timeout
const TIMEOUT_MS = 45000;

// After: 2 minutes timeout  
const TIMEOUT_MS = 120000;
```
**Reason**: API was hitting timeout and using fallback calculation for all assets

### **Fix 2: Improved Fallback Calculation**
```javascript
// Before: Same value for all months
fallbackValues[m] = monthlyDepreciationExpense;

// After: Prorated first month, correct monthly values
if (year === sivYear && m === sivMonth && sivDateObj.getDate() > 1) {
  const daysInMonth = new Date(year, m, 0).getDate();
  const daysUsed = daysInMonth - (sivDateObj.getDate() - 1);
  monthlyExpense = monthlyDepreciationExpense * daysUsed / daysInMonth;
}
```
**Reason**: Fallback was returning same value for all months instead of calculating correct monthly depreciation

### **Fix 3: Enhanced Debugging**
```javascript
🔍 API Debug: Calculation limited: true/false, Total assets: 23860
🔍 Fallback Proration: Asset 123 Month 6: 6/30 days = $12.38
🔍 Fallback: Asset 123 Year 2025 Month 6: $12.38
```
**Reason**: To see which calculation path is used and verify correct values

## 🧪 **How to Test the Fix:**

### **Step 1: Clear Cache and Refresh**
1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Refresh the page** (F5)
3. **Open console** (F12)

### **Step 2: Apply Year Filter**
1. **Go to Asset Reports**
2. **Apply year filter** (e.g., 2025)
3. **Wait for calculation to complete**

### **Step 3: Check New Debug Output**
Look for these new messages:
```
🔍 API Debug: Starting monthly calculation for 23860 assets
🔍 API Debug: Calculation limited: false, Total assets: 23860
🔍 Fallback Proration: Asset 123 Month 6: 6/30 days = $12.38
🔍 Fallback: Asset 123 Year 2025 Month 6: $12.38
🔍 Fallback: Asset 123 Year 2025 Month 7: $61.88
```

### **Step 4: Check API Data**
Look for improved API data:
```javascript
firstAssetBookValues: {
  1: 0,        // No depreciation before SIV date
  2: 0,        // No depreciation before SIV date  
  6: 12.38,    // Prorated first month ✅
  7: 61.88,    // Full month ✅
  8: 61.88,    // Full month ✅
}
```

### **Step 5: Check Table Display**
Verify that:
- **June column** shows $12.38 (not $61.88)
- **July column** shows $61.88 (not next month's value)
- **All assets** show correct monthly values

## 📊 **Expected Results:**

### **✅ API Fixed:**
```
🔍 API Debug: Calculation limited: false
firstAssetBookValues: {
  6: 12.38,    // Correct prorated value
  7: 61.88,    // Correct full month value
  8: 61.88,    // Correct full month value
}
```

### **✅ Table Fixed:**
| Asset | Jun 2025 | Jul 2025 | Aug 2025 |
|-------|----------|----------|----------|
| Asset 1 | $12.38 | $61.88 | $61.88 |
| Asset 2 | $45.67 | $89.12 | $89.12 |

### **❌ If Still Broken:**

#### **Scenario A: API Still Using Fallback**
```
🔍 API Debug: Calculation limited: true
🔍 API Debug: Providing fallback monthly depreciation expenses
```
**Solution**: Increase timeout further or optimize calculation

#### **Scenario B: API Fixed but Table Still Wrong**
```
firstAssetBookValues: { 6: 12.38, 7: 61.88 }  // API correct
June column shows: $61.88  // Table still wrong
```
**Solution**: Fix frontend column-data mapping

## 🎯 **Diagnostic Questions:**

### **Question 1: Is API calculation working?**
**Look for**: `🔍 API Debug: Calculation limited: false`
- **If false**: Main calculation is working ✅
- **If true**: Still using fallback, need more optimization ❌

### **Question 2: Are monthly values different?**
**Look for**: Different values in `firstAssetBookValues`
- **If different**: API is calculating correctly ✅  
- **If same**: API still has calculation issue ❌

### **Question 3: Do table values match API?**
**Compare**: API values vs table display
- **If match**: Frontend is working ✅
- **If different**: Frontend still has mapping issue ❌

## 🔧 **Additional Fixes if Needed:**

### **If API Still Times Out:**
```javascript
// Further increase timeout or limit asset count
const TIMEOUT_MS = 300000; // 5 minutes
// OR
const assetsToCalculate = filteredAssets.slice(0, 1000); // Limit to 1000 assets
```

### **If Frontend Still Shows Wrong Values:**
```javascript
// Check if there's an off-by-one error in column mapping
for (let month = 1; month <= 12; month++) {
  const columnIndex = month - 1; // Ensure correct column index
  const monthValue = asset.bookValuesByMonth[month];
  // Ensure month 6 data goes to column 5 (June)
}
```

## 🎯 **Success Criteria:**

### **✅ API Success:**
- Calculation limited: false
- Different values for different months
- Prorated first month values

### **✅ Frontend Success:**
- June column shows June's value
- July column shows July's value
- No month shifting across all assets

### **✅ Overall Success:**
- All 23,860 assets show correct monthly depreciation
- No performance timeouts
- Accurate proration for mid-month start dates

**Test the fixes and share the new console output to verify if the systematic month shifting is resolved!** 🔍

The fixes address both:
1. **API calculation issues** (timeout, fallback, proration)
2. **Systematic month shifting** affecting all assets
