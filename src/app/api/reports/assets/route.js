// Clean version of asset reports API - fixes all syntax errors
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { calculateMonthlyDepreciation } from '@/utils/depreciation';

export const GET = withRole(['MANAGER', 'USER', 'AUDITOR'], async function GET(req) {
  // Add overall timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('API request timeout after 60 seconds')), 60000);
  });

  const apiPromise = (async () => {
    try {
      console.log('🔍 API Debug: Asset reports request received');
      const url = new URL(req.url);
      console.log('🔍 API Debug: Request URL:', req.url);
      console.log('🔍 API Debug: Search params:', Object.fromEntries(url.searchParams.entries()));
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
    // Parse Ethiopian budget year format (e.g., "2024/2025" or just "2024")
    const yearParam = url.searchParams.get('year');
    let year = null;
    if (yearParam) {
      if (yearParam.includes('/')) {
        // Ethiopian budget year format: "2024/2025" -> use 2024 as the start year
        const startYear = yearParam.split('/')[0];
        year = parseInt(startYear);
        console.log(`🔍 API Debug: Parsed Ethiopian budget year "${yearParam}" -> start year ${year}`);
      } else {
        // Regular year format: "2024" -> use as is
        year = parseInt(yearParam);
        console.log(`🔍 API Debug: Parsed regular year "${yearParam}" -> ${year}`);
      }
    }
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
    console.log('🔍 API Debug: About to query database...');

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

    console.log(`🔍 API Debug: Database query completed successfully`);
    console.log(`🔍 API Debug: Found ${assets.length} assets before post-processing filters`);

    // Add circuit breaker for very large datasets
    // For specific month queries (year && month), allow all assets since it's a targeted calculation
    // For year-only queries, limit to prevent timeout on monthly expense calculations
    const MAX_CALCULATION_ASSETS = (year && month) ? assets.length : 5000;
    let assetsToCalculate = assets;
    let calculationLimited = false;

    if (assets.length > MAX_CALCULATION_ASSETS) {
      console.log(`🔍 API Debug: Large dataset detected (${assets.length} assets). Limiting calculations to ${MAX_CALCULATION_ASSETS} assets to prevent timeout.`);
      assetsToCalculate = assets.slice(0, MAX_CALCULATION_ASSETS);
      calculationLimited = true;
    }

    // Calculate book values using the correct depreciation utility (restored original logic)
    let bookValueMap = {};
    let accumulatedDepreciationMap = {};
    let bookValueByDepartment = [];
    let bookValueByCategory = [];
    let bookValuesByAsset = {};

    console.log('🔍 API Debug: Calculating book values for', assetsToCalculate.length, 'assets');

    // Add caching to prevent repeated calculations
    const calculationCache = new Map();

    if (year && month) {
      console.log('🔍 API Debug: Calculating book values for specific month:', year, month);

      // Calculate book values for specific month/year using the correct depreciation utility
      const bookValues = [];
      let processedAssets = 0;

      // Add timeout protection to prevent hanging
      const startTime = Date.now();
      const TIMEOUT_MS = 60000; // 60 seconds timeout for large datasets

      for (const asset of assetsToCalculate) {
        try {
          // Check for timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            console.log(`🔍 API Debug: Timeout reached after processing ${processedAssets} assets. Stopping calculations.`);
            break;
          }

          processedAssets++;
          // Progress logging removed for performance

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
              // Module import moved to top of file for performance

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
              // Removed debug logging for performance

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
      console.log('🔍 API Debug: Assets to calculate monthly values for:', assetsToCalculate.length);
      console.log('🔍 API Debug: Sample asset SIV dates:', assetsToCalculate.slice(0, 5).map(a => `${a.id}: ${a.sivDate}`));

      let processedAssets = 0;
      const startTime = Date.now();
      const TIMEOUT_MS = 120000; // 2 minutes timeout for monthly calculations (increased)

      console.log(`🔍 API Debug: Starting monthly calculation for ${assetsToCalculate.length} assets`);

      for (const asset of assetsToCalculate) {
        try {
          // Check for timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            console.log(`🔍 API Debug: Monthly calculation timeout reached after processing ${processedAssets} assets. Stopping.`);
            break;
          }

          processedAssets++;
          // Progress logging removed for performance

          const depreciableCost = asset.depreciableCost || asset.unitPrice;
          const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
          const usefulLifeYears = asset.usefulLifeYears || 5;
          const method = asset.depreciationMethod || 'STRAIGHT_LINE';
          const sivDate = asset.sivDate;

          if (depreciableCost && depreciableCost > 0 && sivDate) {
            const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

            try {
              // Module import moved to top of file for performance

              // Add individual calculation timeout
              const calcStartTime = Date.now();

              // Create cache key for this asset's depreciation parameters
              const cacheKey = `${depreciableCost}-${sivDateString}-${usefulLifeYears}-${salvageValue}-${method}`;

              let monthlyResults;
              if (calculationCache.has(cacheKey)) {
                // Use cached result
                monthlyResults = calculationCache.get(cacheKey);
              } else {
                // Calculate and cache result
                monthlyResults = calculateMonthlyDepreciation({
                  unitPrice: depreciableCost,
                  sivDate: sivDateString,
                  usefulLifeYears: usefulLifeYears,
                  salvageValue: salvageValue,
                  method: method,
                });
                calculationCache.set(cacheKey, monthlyResults);
              }

              const calcDuration = Date.now() - calcStartTime;
              // Removed debug logging for performance

              // Extract depreciation expenses for Ethiopian budget year (July to June)
              const yearlyDepreciationExpenses = {};
              monthlyResults.forEach(result => {
                // Ethiopian budget year: July of 'year' to June of 'year+1'
                const isInBudgetYear = (result.year === year && result.month >= 7) ||
                                      (result.year === year + 1 && result.month <= 6);

                if (isInBudgetYear) {
                  yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
                  // Debug Ethiopian budget year mapping
                  // Removed debug logging for performance
                }
              });

              // Debug: Log monthly calculation results for first few assets
              // Removed debug logging for performance

              if (Object.keys(yearlyDepreciationExpenses).length > 0) {
                bookValuesByAsset[asset.id] = yearlyDepreciationExpenses;
              } else {
                console.log(`🔍 API Debug: No yearly depreciation expenses found for asset ${asset.id} for year ${year}`);
              }
            } catch (calcError) {
              console.error(`🔍 API Debug: Monthly calculation failed for asset ${asset.id}:`, calcError.message);
            }
          }
        } catch (error) {
          console.error('🔍 API Debug: Error in monthly calculation for asset', asset.id, ':', error.message);
        }
      }

      console.log(`🔍 API Debug: Calculated monthly depreciation expenses for ${Object.keys(bookValuesByAsset).length} assets`);
      console.log(`🔍 API Debug: Calculation limited: ${calculationLimited}, Total assets: ${assetsToCalculate.length}`);

      // Debug: Show sample monthly data and check for systematic first month issues
      if (Object.keys(bookValuesByAsset).length > 0) {
        const sampleAssetId = Object.keys(bookValuesByAsset)[0];
        const sampleData = bookValuesByAsset[sampleAssetId];
        console.log(`🔍 API Debug: Sample monthly depreciation expenses for asset ${sampleAssetId}:`, sampleData);
        console.log(`🔍 API Debug: Sample monthly data keys:`, Object.keys(sampleData));
        console.log(`🔍 API Debug: Sample depreciation expenses - Month 1: $${sampleData[1]?.toFixed(2) || 'N/A'}, Month 6: $${sampleData[6]?.toFixed(2) || 'N/A'}, Month 12: $${sampleData[12]?.toFixed(2) || 'N/A'}`);

        // Check for systematic first month issues across all assets
        let assetsWithFirstMonth = 0;
        let assetsWithoutFirstMonth = 0;
        let firstMonthStats = {};

        Object.keys(bookValuesByAsset).forEach(assetId => {
          const assetData = bookValuesByAsset[assetId];
          const months = Object.keys(assetData).map(Number).sort((a, b) => a - b);
          const firstMonth = months[0];

          if (firstMonth && assetData[firstMonth] > 0) {
            assetsWithFirstMonth++;
            firstMonthStats[firstMonth] = (firstMonthStats[firstMonth] || 0) + 1;
          } else {
            assetsWithoutFirstMonth++;
          }
        });

        console.log(`🔍 API Debug: First Month Analysis:`, {
          totalAssets: Object.keys(bookValuesByAsset).length,
          assetsWithFirstMonth,
          assetsWithoutFirstMonth,
          firstMonthDistribution: firstMonthStats
        });
      } else {
        console.log(`🔍 API Debug: No monthly depreciation expenses calculated - this will cause empty export columns`);
      }
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
              // Module import moved to top of file for performance

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
          bookValue: (() => {
            // First try to use the calculated value from bookValueMap
            if (bookValueMap[asset.id] !== undefined) {
              return bookValueMap[asset.id];
            }

            // Fallback calculation if asset wasn't included in main calculation (due to timeout, etc.)
            try {
              const depreciableCost = asset.depreciableCost || asset.unitPrice;
              const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
              const usefulLifeYears = asset.usefulLifeYears || 5;
              const method = asset.depreciationMethod || 'STRAIGHT_LINE';
              const sivDate = asset.sivDate;

              if (!sivDate || !depreciableCost || depreciableCost <= 0) {
                return null;
              }

              const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

              const monthlyResults = calculateMonthlyDepreciation({
                unitPrice: depreciableCost,
                sivDate: sivDateString,
                usefulLifeYears: usefulLifeYears,
                salvageValue: salvageValue,
                method: method,
              });

              const targetResult = monthlyResults.find(result =>
                result.year === year && result.month === month
              );

              return targetResult ? targetResult.bookValue : null;
            } catch (error) {
              console.error('Fallback book value calculation failed for asset', asset.id, ':', error.message);
              return null;
            }
          })(),
          accumulatedDepreciation: (() => {
            // First try to use the calculated value from accumulatedDepreciationMap
            if (accumulatedDepreciationMap[asset.id] !== undefined) {
              return accumulatedDepreciationMap[asset.id];
            }

            // Fallback calculation if asset wasn't included in main calculation
            try {
              const depreciableCost = asset.depreciableCost || asset.unitPrice;
              const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
              const usefulLifeYears = asset.usefulLifeYears || 5;
              const method = asset.depreciationMethod || 'STRAIGHT_LINE';
              const sivDate = asset.sivDate;

              if (!sivDate || !depreciableCost || depreciableCost <= 0) {
                return null;
              }

              const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

              const monthlyResults = calculateMonthlyDepreciation({
                unitPrice: depreciableCost,
                sivDate: sivDateString,
                usefulLifeYears: usefulLifeYears,
                salvageValue: salvageValue,
                method: method,
              });

              const targetResult = monthlyResults.find(result =>
                result.year === year && result.month === month
              );

              return targetResult ? targetResult.accumulatedDepreciation : null;
            } catch (error) {
              console.error('Fallback accumulated depreciation calculation failed for asset', asset.id, ':', error.message);
              return null;
            }
          })()
        } : {}),
        // Add book value for Ethiopian budget year end when only year is selected
        ...(year && !month ? {
          bookValue: (() => {
            try {
              const depreciableCost = asset.depreciableCost || asset.unitPrice;
              const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
              const usefulLifeYears = asset.usefulLifeYears || 5;
              const method = asset.depreciationMethod || 'STRAIGHT_LINE';
              const sivDate = asset.sivDate;

              if (!sivDate || !depreciableCost || depreciableCost <= 0) {
                return depreciableCost || 0;
              }

              const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

              const monthlyResults = calculateMonthlyDepreciation({
                unitPrice: depreciableCost,
                sivDate: sivDateString,
                usefulLifeYears: usefulLifeYears,
                salvageValue: salvageValue,
                method: method,
              });

              // Find book value at the end of Ethiopian budget year (June of year+1)
              const endOfBudgetYear = monthlyResults.find(result =>
                result.year === year + 1 && result.month === 6
              );

              return endOfBudgetYear ? endOfBudgetYear.bookValue : (depreciableCost || 0);
            } catch (error) {
              console.error('Error calculating budget year end book value for asset', asset.id, ':', error.message);
              return asset.currentValue || asset.unitPrice || 0;
            }
          })()
        } : {}),
        // Add monthly depreciation expenses when only year is selected
        ...(year && !month ? {
          depreciationExpensesByMonth: (() => {
            // If we have calculated data, use it
            if (bookValuesByAsset[asset.id]) {
              return bookValuesByAsset[asset.id];
            }

            // If calculation was limited and this asset wasn't included, provide fallback
            if (calculationLimited && !bookValuesByAsset[asset.id]) {
              // Removed debug logging for performance

              // Simple fallback calculation for depreciation expenses (not book values)
              const unitPrice = asset.unitPrice || 0;
              const usefulLifeYears = asset.usefulLifeYears || 5;
              const residualPercentage = asset.residualPercentage || 0;
              const sivDate = asset.sivDate;

              if (unitPrice > 0 && sivDate) {
                const fallbackValues = {};
                const residualValue = unitPrice * residualPercentage / 100;
                const depreciableAmount = unitPrice - residualValue;
                const monthlyDepreciationExpense = depreciableAmount / (usefulLifeYears * 12);

                // Ethiopian budget year fallback: July to June
                for (let m = 1; m <= 12; m++) {
                  const sivDateObj = new Date(sivDate);
                  const sivYear = sivDateObj.getFullYear();
                  const sivMonth = sivDateObj.getMonth() + 1; // 1-based month

                  // Determine which calendar year this budget month belongs to
                  const calendarYear = m >= 7 ? year : year + 1;

                  // Check if this month is within the depreciation period
                  if (calendarYear > sivYear || (calendarYear === sivYear && m >= sivMonth)) {
                    // Calculate months from start of depreciation
                    const monthsFromStart = (calendarYear - sivYear) * 12 + (m - sivMonth);
                    const totalUsefulLifeMonths = usefulLifeYears * 12;

                    if (monthsFromStart < totalUsefulLifeMonths) {
                      let monthlyExpense = monthlyDepreciationExpense;

                      // Prorate first month if asset wasn't acquired on the 1st
                      if (calendarYear === sivYear && m === sivMonth && sivDateObj.getDate() > 1) {
                        const daysInMonth = new Date(calendarYear, m, 0).getDate();
                        const daysUsed = daysInMonth - (sivDateObj.getDate() - 1);
                        monthlyExpense = monthlyDepreciationExpense * daysUsed / daysInMonth;
                        // Removed debug logging for performance
                      }

                      fallbackValues[m] = monthlyExpense;
                      // Removed debug logging for performance
                    } else {
                      // Asset is fully depreciated, no more expense
                      fallbackValues[m] = 0;
                    }
                  } else {
                    // Depreciation hasn't started yet
                    fallbackValues[m] = 0;
                  }
                }

                return fallbackValues;
              }
            }

            return {};
          })(),
          // Debug info
          _debug_hasMonthlyDepreciationData: !!bookValuesByAsset[asset.id],
          _debug_monthlyDepreciationDataKeys: bookValuesByAsset[asset.id] ? Object.keys(bookValuesByAsset[asset.id]) : [],
          _debug_usedDepreciationFallback: calculationLimited && !bookValuesByAsset[asset.id] && asset.unitPrice > 0 && asset.sivDate
        } : {})
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

    console.log('🔍 API Debug: Formatted data prepared successfully');
    console.log('🔍 API Debug: Response stats:', {
      assetsCount: formattedData.assets?.length || 0,
      statsPresent: !!formattedData.stats,
      filterOptionsPresent: !!formattedData.filterOptions
    });
    console.log('🔍 API Debug: Sending response...');

    return Response.json(formattedData);

    } catch (error) {
      console.error('❌ API Error: Asset reports failed:', error);
      console.error('❌ API Error: Stack trace:', error.stack);
      console.error('❌ API Error: Request URL:', req.url);

      // Return detailed error for debugging
      return Response.json(
        {
          error: 'Failed to fetch asset reports',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  })();

  try {
    return await Promise.race([apiPromise, timeoutPromise]);
  } catch (error) {
    console.error('❌ API Timeout or Error:', error.message);
    return Response.json(
      { error: 'API request failed or timed out', message: error.message },
      { status: 500 }
    );
  }
});
