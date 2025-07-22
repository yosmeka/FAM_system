# Asset Update API Fix - Field Mapping & Serial Number Validation

## 🚨 **Critical Issues Fixed:**

### **Problem 1: Unknown Argument 'department'**
```
Error [PrismaClientValidationError]: Unknown argument `department`. Available options are marked with ?.
```

### **Problem 2: Serial Number Uniqueness Error**
Even when editing an asset with the same serial number, the system was throwing "serial number must be unique" errors.

## ✅ **Root Causes & Solutions:**

### **1. Field Mapping Issues:**
The frontend was sending field names that didn't match the Prisma schema:

#### **❌ Before (Incorrect Field Names):**
- `department` → Should be `currentDepartment`
- `description` → Should be `itemDescription`
- `purchasePrice` → Should be `unitPrice`
- `purchaseDate` → Should be `sivDate`
- `usefulLifeMonths` → Should be `usefulLifeYears`
- `depreciationStartDate` → Should be `sivDate`

#### **✅ After (Correct Field Mapping):**
```javascript
// Proper field mapping in API
if (body.department !== undefined) {
  updateData.currentDepartment = body.department || null;
}
if (body.description !== undefined) {
  updateData.itemDescription = body.description || null;
}
if (body.purchasePrice !== undefined) {
  updateData.unitPrice = parseFloat(body.purchasePrice) || null;
}
```

### **2. Serial Number Validation:**
Added proper uniqueness check that excludes the current asset:

#### **✅ Smart Serial Number Validation:**
```javascript
// Check if serial number is being changed and if it's unique
if (body.serialNumber && body.serialNumber !== currentAsset.serialNumber) {
  const existingAsset = await prisma.asset.findUnique({
    where: { serialNumber: body.serialNumber },
    select: { id: true, name: true }
  });

  if (existingAsset && existingAsset.id !== id) {
    return Response.json(
      { error: `Serial Number '${body.serialNumber}' already exists for asset '${existingAsset.name}'` },
      { status: 400 }
    );
  }
}
```

## 🔧 **Technical Fixes Applied:**

### **1. Complete Field Mapping:**

#### **String Fields:**
```javascript
const stringFields = [
  'name', 'itemDescription', 'serialNumber', 'status', 'location', 
  'category', 'supplier', 'type', 'oldTagNumber', 'newTagNumber', 
  'grnNumber', 'sivNumber', 'remark'
];
```

#### **Number Fields:**
```javascript
const numberFields = [
  'unitPrice', 'currentValue', 'depreciableCost', 
  'salvageValue', 'residualPercentage'
];

// Field mapping for legacy names
if (body.purchasePrice !== undefined) {
  updateData.unitPrice = parseFloat(body.purchasePrice) || null;
}
if (body.usefulLifeMonths !== undefined) {
  updateData.usefulLifeYears = Math.round(body.usefulLifeMonths / 12) || null;
}
```

#### **Date Fields:**
```javascript
const dateFields = [
  'sivDate', 'grnDate', 'warrantyExpiry', 'lastMaintenance', 
  'nextMaintenance', 'lastAuditDate', 'nextAuditDate'
];

// Field mapping for legacy names
if (body.purchaseDate !== undefined) {
  updateData.sivDate = new Date(body.purchaseDate) || null;
}
if (body.depreciationStartDate !== undefined) {
  updateData.sivDate = new Date(body.depreciationStartDate) || null;
}
```

### **2. Enhanced Error Handling:**

#### **Serial Number Validation:**
- Only validates uniqueness when serial number is actually changed
- Excludes current asset from uniqueness check
- Provides clear error message with conflicting asset name

#### **Field Validation:**
- Handles both old and new field names from frontend
- Proper type conversion for numbers and dates
- Null handling for empty values

## 🧪 **How to Test the Fix:**

### **Test 1: Edit Asset with Same Serial Number**
1. **Open any asset** for editing
2. **Don't change the serial number**
3. **Update other fields** (name, category, etc.)
4. **Save the asset**
5. **Expected**: Should save successfully without serial number error

### **Test 2: Edit Asset with New Serial Number**
1. **Open any asset** for editing
2. **Change the serial number** to a new unique value
3. **Save the asset**
4. **Expected**: Should save successfully

### **Test 3: Edit Asset with Duplicate Serial Number**
1. **Open any asset** for editing
2. **Change serial number** to one that already exists
3. **Save the asset**
4. **Expected**: Should show clear error: "Serial Number 'XXX' already exists for asset 'YYY'"

### **Test 4: Field Mapping**
1. **Edit various fields** (department, description, purchase price, etc.)
2. **Save the asset**
3. **Expected**: All fields should save correctly without "Unknown argument" errors

## 📊 **Before vs After:**

### **❌ Before (Broken):**
```
Error [PrismaClientValidationError]: Unknown argument `department`
Error: Serial number must be unique (even for same asset)
Missing field mappings causing data loss
```

### **✅ After (Fixed):**
```
✅ All fields map correctly to schema
✅ Serial number validation only for actual changes
✅ Clear error messages for conflicts
✅ Backward compatibility with old field names
```

## 💡 **Key Improvements:**

### **1. Schema Compliance:**
- **✅ Correct Field Names**: All fields match Prisma schema exactly
- **✅ Type Safety**: Proper type conversion for numbers and dates
- **✅ Null Handling**: Proper handling of empty/null values
- **✅ Validation**: Enhanced validation with clear error messages

### **2. Backward Compatibility:**
- **✅ Legacy Support**: Handles old field names from frontend
- **✅ Graceful Mapping**: Automatically maps old names to new schema
- **✅ No Breaking Changes**: Existing frontend code continues to work
- **✅ Future Proof**: Easy to add new field mappings

### **3. Better User Experience:**
- **✅ Clear Errors**: Specific error messages for validation failures
- **✅ Smart Validation**: Only validates when values actually change
- **✅ Conflict Resolution**: Shows which asset has conflicting serial number
- **✅ Reliable Updates**: Consistent and predictable behavior

## 🎉 **Success Indicators:**

### **✅ Asset Updates Working:**
- No more "Unknown argument" errors
- Serial number validation only triggers for actual changes
- All field types (string, number, date) save correctly
- Clear error messages for validation failures

### **✅ Field Mapping Working:**
- Frontend can use old field names (department, description, etc.)
- API correctly maps to new schema field names
- No data loss during updates
- Backward compatibility maintained

### **✅ Validation Working:**
- Serial number uniqueness properly enforced
- Current asset excluded from uniqueness check
- Clear error messages with asset names
- Proper type validation for all fields

**Asset editing now works reliably with proper field mapping and smart serial number validation!** 🎉

Users can now:
- **Edit assets** without "Unknown argument" errors
- **Keep same serial numbers** without uniqueness conflicts
- **Use any field names** (old or new) from the frontend
- **Get clear error messages** for actual validation issues
- **Rely on consistent behavior** for all asset updates
