# Database Migration Instructions

## Issue Fixed
The asset reports page was failing because the code was trying to select `depreciationStartDate` field that we removed from the schema but the database still had the column.

## Code Changes Made
✅ **All code references to `depreciationStartDate` have been removed:**
- Asset reports API (`src/app/api/reports/assets/route.js`)
- Asset creation API (`src/app/api/assets/route.ts`)
- Asset depreciation API (`src/app/api/assets/[id]/depreciation/route.ts`)
- Asset form component (`src/components/AssetForm.tsx`)
- Capital improvement form (`src/components/CapitalImprovementForm.tsx`)
- Debug scripts (`scripts/debug-depreciation-errors.js`)
- Calculation utilities (`src/utils/assetCalculations.ts`)

## Database Migration Required

To complete the fix, you need to run the database migration to remove the `depreciationStartDate` column:

### Option 1: Generate and Run Migration (Recommended)
```bash
# Generate a new migration
npx prisma migrate dev --name remove_depreciation_start_date

# This will:
# 1. Compare your schema.prisma with the database
# 2. Generate SQL to remove the depreciationStartDate column
# 3. Apply the migration to your database
```

### Option 2: Manual SQL (if needed)
If the automatic migration doesn't work, you can run this SQL manually:

```sql
-- Remove the depreciationStartDate column from Asset table
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "depreciationStartDate";
```

### Option 3: Reset Database (Development Only)
If you're in development and can afford to lose data:

```bash
# Reset the database and apply all migrations
npx prisma migrate reset

# Then push the current schema
npx prisma db push
```

## Verification

After running the migration, test the asset reports page:

1. **Navigate to**: `/reports/assets`
2. **Expected**: Page loads without errors
3. **Test filters**: Try year-only and year+month filters
4. **Verify book values**: Check that monthly columns show data

## Test Script

Run the test script to verify everything works:

```bash
node test-asset-reports-fix.js
```

This will test:
- ✅ Basic API calls work
- ✅ Year filtering shows 12 monthly columns
- ✅ Year+month filtering shows single column
- ✅ Advanced filtering works
- ✅ Book value calculations use sivDate only

## Summary

The issue was caused by:
1. **Schema updated** to remove `depreciationStartDate`
2. **Code updated** to use only `sivDate`
3. **Database not migrated** - still had the old column

After running the migration, the asset reports page should work perfectly with the simplified depreciation logic using only `sivDate` as the depreciation start date.
