// Clean version of asset reports API - fixes all syntax errors
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

export const GET = withRole(['MANAGER', 'USER', 'AUDITOR'], async function GET(req) {
  try {
    const url = new URL(req.url);
    const now = new Date();

    // Parse filter parameters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const category = url.searchParams.get('category');
    const currentDepartment = url.searchParams.get('currentDepartment');
    const location = url.searchParams.get('location');
    const status = url.searchParams.get('status');
    const minValue = url.searchParams.get('minValue') ? parseFloat(url.searchParams.get('minValue')) : null;
    const maxValue = url.searchParams.get('maxValue') ? parseFloat(url.searchParams.get('maxValue')) : null;
    const depreciationMethod = url.searchParams.get('depreciationMethod');
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')) : null;
    const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')) : null;

    // Depreciation-specific filters
    const depreciationStatus = url.searchParams.get('depreciationStatus');
    const minBookValue = url.searchParams.get('minBookValue') ? parseFloat(url.searchParams.get('minBookValue')) : null;
    const maxBookValue = url.searchParams.get('maxBookValue') ? parseFloat(url.searchParams.get('maxBookValue')) : null;
    const minDepreciationRate = url.searchParams.get('minDepreciationRate') ? parseFloat(url.searchParams.get('minDepreciationRate')) : null;
    const maxDepreciationRate = url.searchParams.get('maxDepreciationRate') ? parseFloat(url.searchParams.get('maxDepreciationRate')) : null;
    const assetAge = url.searchParams.get('assetAge');
    const usefulLifeRange = url.searchParams.get('usefulLifeRange');
    const sivDateFrom = url.searchParams.get('sivDateFrom');
    const sivDateTo = url.searchParams.get('sivDateTo');
    const depreciationEndingSoon = url.searchParams.get('depreciationEndingSoon') === 'true';
    const residualPercentageRange = url.searchParams.get('residualPercentageRange');

    console.log('🔍 API Debug: Received query parameters:', {
      startDate, endDate, category, currentDepartment, location, status, minValue, maxValue, depreciationMethod, year, month
    });

    // Build where clause for filtering
    const whereClause = {};

    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereClause.createdAt = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (currentDepartment && currentDepartment !== 'all') {
      whereClause.currentDepartment = currentDepartment;
    }

    if (location && location !== 'all') {
      whereClause.location = location;
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (minValue !== null || maxValue !== null) {
      whereClause.currentValue = {};
      if (minValue !== null) {
        whereClause.currentValue.gte = minValue;
      }
      if (maxValue !== null) {
        whereClause.currentValue.lte = maxValue;
      }
    }

    if (depreciationMethod && depreciationMethod !== 'all') {
      whereClause.depreciationMethod = depreciationMethod;
    }

    // Depreciation-specific database filters
    if (usefulLifeRange && usefulLifeRange !== 'all') {
      const ranges = {
        '1-3': { gte: 1, lte: 3 },
        '3-5': { gte: 3, lte: 5 },
        '5-10': { gte: 5, lte: 10 },
        '10+': { gte: 10 }
      };
      if (ranges[usefulLifeRange]) {
        whereClause.usefulLifeYears = ranges[usefulLifeRange];
      }
    }

    if (residualPercentageRange && residualPercentageRange !== 'all') {
      const ranges = {
        '0-5': { gte: 0, lte: 5 },
        '5-10': { gte: 5, lte: 10 },
        '10-20': { gte: 10, lte: 20 },
        '20+': { gte: 20 }
      };
      if (ranges[residualPercentageRange]) {
        whereClause.residualPercentage = ranges[residualPercentageRange];
      }
    }

    if (sivDateFrom || sivDateTo) {
      whereClause.sivDate = {};
      if (sivDateFrom) {
        whereClause.sivDate.gte = new Date(sivDateFrom);
      }
      if (sivDateTo) {
        const endDate = new Date(sivDateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.sivDate.lte = endDate;
      }
    }

    console.log('🔍 API Debug: Where clause built:', JSON.stringify(whereClause, null, 2));

    // Fetch ALL assets (no limit) - user wants complete data
    console.log('🔍 API Debug: Fetching all assets without limit for complete reporting');

    let assets = await prisma.asset.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      include: {
        linkedTo: {
          include: {
            toAsset: {
              select: {
                id: true,
                name: true,
                serialNumber: true,
                category: true
              }
            }
          }
        },
        linkedFrom: {
          include: {
            fromAsset: {
              select: {
                id: true,
                name: true,
                serialNumber: true,
                category: true
              }
            }
          }
        }
      }
    });

    console.log(`🔍 API Debug: Found ${assets.length} assets before post-processing filters`);

    // Add circuit breaker for very large datasets
    const MAX_CALCULATION_ASSETS = 2000; // Limit calculations to prevent hanging
    let assetsToCalculate = assets;

    if (assets.length > MAX_CALCULATION_ASSETS) {
      console.log(`🔍 API Debug: Large dataset detected (${assets.length} assets). Limiting calculations to ${MAX_CALCULATION_ASSETS} assets to prevent timeout.`);
      assetsToCalculate = assets.slice(0, MAX_CALCULATION_ASSETS);
    }

    // Calculate book values using the correct depreciation utility (restored original logic)
    let bookValueMap = {};
    let accumulatedDepreciationMap = {};
    let bookValueByDepartment = [];
    let bookValueByCategory = [];
    let bookValuesByAsset = {};

    console.log('🔍 API Debug: Calculating book values for', assetsToCalculate.length, 'assets');

    if (year && month) {
      console.log('🔍 API Debug: Calculating book values for specific month:', year, month);

      // Calculate book values for specific month/year using the correct depreciation utility
      const bookValues = [];
      let processedAssets = 0;

      // Add timeout protection to prevent hanging
      const startTime = Date.now();
      const TIMEOUT_MS = 30000; // 30 seconds timeout

      for (const asset of assetsToCalculate) {
        try {
          // Check for timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            console.log(`🔍 API Debug: Timeout reached after processing ${processedAssets} assets. Stopping calculations.`);
            break;
          }

          processedAssets++;
          if (processedAssets % 50 === 0) { // Reduced logging frequency
            console.log(`🔍 API Debug: Processed ${processedAssets}/${assetsToCalculate.length} assets`);
          }

          const depreciableCost = asset.depreciableCost || asset.unitPrice;
          const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
          const usefulLifeYears = asset.usefulLifeYears || 5;
          const method = asset.depreciationMethod || 'STRAIGHT_LINE';
          const sivDate = asset.sivDate; // Single source for depreciation start date

          if (depreciableCost && depreciableCost > 0 && sivDate) {
            // Ensure sivDate is properly formatted
            const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

            // Use the correct depreciation calculation from utils/depreciation.ts with timeout protection
            let monthlyResults;
            try {
              const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

              // Add individual calculation timeout
              const calcStartTime = Date.now();
              monthlyResults = calculateMonthlyDepreciation({
                unitPrice: depreciableCost,
                sivDate: sivDateString,
                usefulLifeYears: usefulLifeYears,
                salvageValue: salvageValue,
                method: method,
              });

              const calcDuration = Date.now() - calcStartTime;
              if (calcDuration > 1000) { // Log slow calculations
                console.log(`🔍 API Debug: Slow calculation for asset ${asset.id}: ${calcDuration}ms`);
              }

            } catch (calcError) {
              console.error(`🔍 API Debug: Depreciation calculation failed for asset ${asset.id}:`, calcError.message);
              continue; // Skip this asset
            }

            // Determine book value and accumulated depreciation for the specific year and month
            let bookValue = null;
            let accumulatedDepreciation = null;

            if (monthlyResults && monthlyResults.length > 0) {
              // Find the exact match for the requested year and month
              const targetResult = monthlyResults.find(result =>
                result.year === year && result.month === month
              );

              if (targetResult) {
                bookValue = targetResult.bookValue;
                accumulatedDepreciation = targetResult.accumulatedDepreciation;
                console.log(`🔍 API Debug: Found values for ${year}-${month}: Book Value $${bookValue.toFixed(2)}, Accumulated Depreciation $${accumulatedDepreciation.toFixed(2)}`);
              } else {
                console.log(`🔍 API Debug: No values found for ${year}-${month} for asset ${asset.id}`);
                // Show available results for debugging
                const availableResults = monthlyResults.slice(0, 5).map(r => `${r.year}-${r.month}: BV $${r.bookValue.toFixed(2)}, AD $${r.accumulatedDepreciation.toFixed(2)}`);
                console.log(`  - Available results (first 5): ${availableResults.join(', ')}`);
              }
            }

            if (bookValue !== null && accumulatedDepreciation !== null) {
              bookValues.push({
                assetId: asset.id,
                bookValue,
                accumulatedDepreciation
              });
            }
          }
        } catch (error) {
          console.error('🔍 API Debug: Error calculating book value for asset', asset.id, ':', error.message);
        }
      }

      bookValueMap = Object.fromEntries(bookValues.map(bv => [bv.assetId, bv.bookValue]));

      // Create accumulated depreciation map for the selected month
      accumulatedDepreciationMap = Object.fromEntries(bookValues.map(bv => [bv.assetId, bv.accumulatedDepreciation]));

      // Aggregate book value by department
      const assetIdToDepartment = Object.fromEntries(assetsToCalculate.map(a => [a.id, a.currentDepartment || 'Unassigned']));
      const departmentTotals = {};
      for (const bv of bookValues) {
        const dept = assetIdToDepartment[bv.assetId] || 'Unassigned';
        departmentTotals[dept] = (departmentTotals[dept] || 0) + (bv.bookValue || 0);
      }
      bookValueByDepartment = Object.entries(departmentTotals).map(([department, totalBookValue]) => ({ department, totalBookValue }));

      // Aggregate book value by category
      const assetIdToCategory = Object.fromEntries(assetsToCalculate.map(a => [a.id, a.category || 'Uncategorized']));
      const categoryTotals = {};
      for (const bv of bookValues) {
        const cat = assetIdToCategory[bv.assetId] || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (bv.bookValue || 0);
      }
      bookValueByCategory = Object.entries(categoryTotals).map(([category, totalBookValue]) => ({ category, totalBookValue }));
    } else if (year && !month) {
      // Calculate all monthly book values for the selected year using our optimized utility
      console.log('🔍 API Debug: Calculating monthly book values for year:', year);

      let processedAssets = 0;
      const startTime = Date.now();
      const TIMEOUT_MS = 45000; // 45 seconds timeout for monthly calculations

      for (const asset of assetsToCalculate) {
        try {
          // Check for timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            console.log(`🔍 API Debug: Monthly calculation timeout reached after processing ${processedAssets} assets. Stopping.`);
            break;
          }

          processedAssets++;
          if (processedAssets % 25 === 0) { // Reduced frequency for monthly calculations
            console.log(`🔍 API Debug: Processed ${processedAssets}/${assetsToCalculate.length} assets for monthly calculations`);
          }

          const depreciableCost = asset.depreciableCost || asset.unitPrice;
          const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
          const usefulLifeYears = asset.usefulLifeYears || 5;
          const method = asset.depreciationMethod || 'STRAIGHT_LINE';
          const sivDate = asset.sivDate;

          if (depreciableCost && depreciableCost > 0 && sivDate) {
            const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

            try {
              const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

              // Add individual calculation timeout
              const calcStartTime = Date.now();
              const monthlyResults = calculateMonthlyDepreciation({
                unitPrice: depreciableCost,
                sivDate: sivDateString,
                usefulLifeYears: usefulLifeYears,
                salvageValue: salvageValue,
                method: method,
              });

              const calcDuration = Date.now() - calcStartTime;
              if (calcDuration > 2000) { // Log very slow calculations
                console.log(`🔍 API Debug: Very slow monthly calculation for asset ${asset.id}: ${calcDuration}ms`);
              }

              // Extract book values for the specific year
              const yearlyBookValues = {};
              monthlyResults.forEach(result => {
                if (result.year === year) {
                  yearlyBookValues[result.month] = result.bookValue;
                }
              });

              if (Object.keys(yearlyBookValues).length > 0) {
                bookValuesByAsset[asset.id] = yearlyBookValues;
              }
            } catch (calcError) {
              console.error(`🔍 API Debug: Monthly calculation failed for asset ${asset.id}:`, calcError.message);
            }
          }
        } catch (error) {
          console.error('🔍 API Debug: Error in monthly calculation for asset', asset.id, ':', error.message);
        }
      }

      console.log(`🔍 API Debug: Calculated monthly book values for ${Object.keys(bookValuesByAsset).length} assets`);
    }

    // Apply post-processing filters
    let filteredAssets = assets;
    
    if (depreciationStatus || assetAge || minBookValue || maxBookValue || minDepreciationRate || maxDepreciationRate || depreciationEndingSoon) {
      console.log('🔍 API Debug: Applying post-processing filters...');
      
      filteredAssets = assets.filter(asset => {
        const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
        const unitPrice = asset.unitPrice || 0;
        const currentValue = asset.currentValue || 0;
        
        // Calculate asset age in years
        const assetAgeYears = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
        
        // Apply asset age filter
        if (assetAge) {
          const ageRanges = {
            '0-1': [0, 1],
            '1-3': [1, 3],
            '3-5': [3, 5],
            '5+': [5, Infinity]
          };
          const [minAge, maxAge] = ageRanges[assetAge] || [0, Infinity];
          if (assetAgeYears < minAge || assetAgeYears > maxAge) {
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`🔍 API Debug: Filtered from ${assets.length} to ${filteredAssets.length} assets`);
    }

    // Calculate statistics
    const totalAssetsCount = filteredAssets.length;
    const activeAssets = filteredAssets.filter(asset => asset.status === 'ACTIVE').length;
    const totalPurchaseValue = filteredAssets.reduce((sum, asset) => sum + (asset.unitPrice || 0), 0);
    const totalCurrentValue = filteredAssets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
    const totalDepreciation = totalPurchaseValue - totalCurrentValue;

    // Calculate total book value and monthly totals
    let totalBookValue = 0;
    let monthlyBookValueTotals = {};

    if (year && month) {
      totalBookValue = Object.values(bookValueMap).reduce((sum, value) => sum + (value || 0), 0);
    } else if (year && !month) {
      // Calculate monthly totals for all 12 months
      console.log(`🔍 API Debug: Calculating monthly totals for ${year} with ${filteredAssets.length} filtered assets`);

      for (let m = 1; m <= 12; m++) {
        monthlyBookValueTotals[m] = 0;
        Object.values(bookValuesByAsset).forEach(assetMonthlyData => {
          if (assetMonthlyData && assetMonthlyData[m]) {
            monthlyBookValueTotals[m] += assetMonthlyData[m];
          }
        });
      }

      // Use average of monthly totals for overall total
      const monthlyTotals = Object.values(monthlyBookValueTotals);
      totalBookValue = monthlyTotals.length > 0 ? monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length : 0;

      console.log(`🔍 API Debug: Monthly totals calculated:`, monthlyBookValueTotals);
    } else {
      totalBookValue = totalCurrentValue; // Use current value as book value
    }

    // Get filter options - return simple string arrays as expected by frontend
    const filterOptions = {
      categories: [...new Set(assets.map(asset => asset.category).filter(Boolean))],
      departments: [...new Set(assets.map(asset => asset.currentDepartment).filter(Boolean))],
      locations: [...new Set(assets.map(asset => asset.location).filter(Boolean))],
      depreciationMethods: [...new Set(assets.map(asset => asset.depreciationMethod).filter(Boolean))],
      assetAge: [
        { value: '0-1', label: '0-1 Years' },
        { value: '1-3', label: '1-3 Years' },
        { value: '3-5', label: '3-5 Years' },
        { value: '5+', label: '5+ Years' }
      ],
      usefulLifeRange: [
        { value: '1-3', label: '1-3 Years' },
        { value: '3-5', label: '3-5 Years' },
        { value: '5-10', label: '5-10 Years' },
        { value: '10+', label: '10+ Years' }
      ],
      residualPercentageRange: [
        { value: '0-5', label: '0-5%' },
        { value: '5-10', label: '5-10%' },
        { value: '10-20', label: '10-20%' },
        { value: '20+', label: '20%+' }
      ]
    };

    // Create category and status distributions for charts
    const categoryMap = {};
    const statusMap = {};

    filteredAssets.forEach(asset => {
      // Category distribution
      const category = asset.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { category, count: 0, value: 0 };
      }
      categoryMap[category].count++;
      categoryMap[category].value += asset.currentValue || 0;

      // Status distribution
      const status = asset.status || 'UNKNOWN';
      if (!statusMap[status]) {
        statusMap[status] = { status, count: 0 };
      }
      statusMap[status].count++;
    });

    const byCategory = Object.values(categoryMap);
    const statusDistribution = Object.values(statusMap);

    // Format assets for response
    const formattedAssets = filteredAssets.map(asset => {
      const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
      const assetAgeYears = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
      const depreciationRate = asset.unitPrice > 0 ? ((asset.unitPrice - (asset.currentValue || 0)) / asset.unitPrice) * 100 : 0;

      return {
        ...asset,
        age: parseFloat(assetAgeYears.toFixed(1)),
        depreciationRate: parseFloat(depreciationRate.toFixed(1)),
        calculatedSalvageValue: asset.salvageValue || (asset.residualPercentage ? ((asset.unitPrice || 0) * asset.residualPercentage / 100) : 0),
        // Add calculated salvage value if not already present
        calculatedSalvageValue: asset.salvageValue || (asset.residualPercentage ? ((asset.unitPrice || 0) * asset.residualPercentage / 100) : 0),
        // Calculate current book value (as of today) when no year/month filter
        ...(!year && !month ? {
          currentBookValue: (() => {
            try {
              const sivDate = asset.sivDate;
              const unitPrice = asset.unitPrice || 0;
              const usefulLifeYears = asset.usefulLifeYears || 5;
              const residualPercentage = asset.residualPercentage || 0;
              const salvageValue = asset.salvageValue || (unitPrice * residualPercentage / 100);

              if (!sivDate || unitPrice <= 0) {
                return unitPrice; // Return original price if no depreciation data
              }

              // Calculate current book value using depreciation utility
              const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

              const depreciationInput = {
                unitPrice,
                sivDate: sivDate.toISOString().split('T')[0],
                usefulLifeYears,
                salvageValue,
                method: asset.depreciationMethod || 'STRAIGHT_LINE',
                residualPercentage
              };

              const monthlyResults = calculateMonthlyDepreciation(depreciationInput);

              // Find the most recent month's book value (up to current date)
              const currentDate = now;
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth() + 1;

              // Find the latest applicable book value
              let latestBookValue = unitPrice;
              for (const result of monthlyResults) {
                if (result.year < currentYear || (result.year === currentYear && result.month <= currentMonth)) {
                  latestBookValue = result.bookValue;
                } else {
                  break; // Don't use future months
                }
              }

              return latestBookValue;
            } catch (error) {
              console.warn('Error calculating current book value for asset', asset.id, ':', error.message);
              return asset.currentValue || asset.unitPrice || 0;
            }
          })()
        } : {}),
        // Add book value for specific month when year and month are selected
        ...(year && month ? {
          bookValue: bookValueMap[asset.id] ?? null,
          accumulatedDepreciation: accumulatedDepreciationMap[asset.id] ?? null
        } : {}),
        // Add monthly book values when only year is selected
        ...(year && !month ? { bookValuesByMonth: bookValuesByAsset[asset.id] || {} } : {})
      };
    });

    const formattedData = {
      stats: {
        totalAssets: totalAssetsCount,
        activeAssets,
        totalPurchaseValue,
        totalValue: totalCurrentValue,
        totalBookValue,
        totalDepreciation,
        averageAssetAge: totalAssetsCount > 0 ? filteredAssets.reduce((sum, asset) => {
          const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
          const age = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
          return sum + age;
        }, 0) / totalAssetsCount : 0,
        utilizationRate: activeAssets > 0 ? (activeAssets / totalAssetsCount) * 100 : 0,
        totalROI: totalPurchaseValue > 0 ? ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100 : 0,
        ...(year && !month ? { monthlyBookValueTotals } : {})
      },
      assets: formattedAssets,
      byCategory,
      statusDistribution,
      linkedAssets: [], // Empty for now, can be populated later if needed
      totalAssets: totalAssetsCount,
      filterOptions
    };

    return Response.json(formattedData);

  } catch (error) {
    console.error('Error fetching asset reports:', error);
    return Response.json(
      { error: 'Failed to fetch asset reports' },
      { status: 500 }
    );
  }
});
