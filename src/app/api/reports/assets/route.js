//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDepreciation, calculateMonthlyDepreciation } from '@/utils/depreciation';
// Using the correct depreciation calculation from utils/depreciation.ts

// GET /api/reports/assets
import { withRole } from '@/middleware/rbac';

export const GET = withRole([ 'MANAGER', 'USER','AUDITOR'], async function GET(req) {
  try {
    const url = new URL(req.url);
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Parse query parameters for advanced filtering
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const category = url.searchParams.get('category');
    const currentDepartment = url.searchParams.get('currentDepartment'); // Fixed parameter name
    const location = url.searchParams.get('location');
    const status = url.searchParams.get('status');
    const minValue = url.searchParams.get('minValue');
    const maxValue = url.searchParams.get('maxValue');
    const depreciationMethod = url.searchParams.get('depreciationMethod');
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')) : null;
    const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')) : null;

    // Depreciation-focused filters
    const depreciationStatus = url.searchParams.get('depreciationStatus'); // 'active', 'fully_depreciated', 'not_started'
    const minBookValue = url.searchParams.get('minBookValue') ? parseFloat(url.searchParams.get('minBookValue')) : null;
    const maxBookValue = url.searchParams.get('maxBookValue') ? parseFloat(url.searchParams.get('maxBookValue')) : null;
    const minDepreciationRate = url.searchParams.get('minDepreciationRate') ? parseFloat(url.searchParams.get('minDepreciationRate')) : null;
    const maxDepreciationRate = url.searchParams.get('maxDepreciationRate') ? parseFloat(url.searchParams.get('maxDepreciationRate')) : null;
    const assetAge = url.searchParams.get('assetAge'); // '0-1', '1-3', '3-5', '5+'
    const usefulLifeRange = url.searchParams.get('usefulLifeRange'); // '1-3', '3-5', '5-10', '10+'
    const sivDateFrom = url.searchParams.get('sivDateFrom');
    const sivDateTo = url.searchParams.get('sivDateTo');
    const depreciationEndingSoon = url.searchParams.get('depreciationEndingSoon') === 'true'; // assets ending depreciation in next 12 months
    const residualPercentageRange = url.searchParams.get('residualPercentageRange'); // '0-5', '5-10', '10-20', '20+'

    // Parse pagination parameters
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 25;
    const offset = (page - 1) * limit;

    // Debug logging
    console.log('🔍 API Debug: Received query parameters:', {
      startDate, endDate, category, currentDepartment, location, status, minValue, maxValue, depreciationMethod, year, month, page, limit, offset
    });

    // Build where clause for filtering
    const whereClause = {};

    // Debug: Log all received parameters
    console.log('🔍 API Debug: All received parameters:', {
      startDate, endDate, category, currentDepartment, location, status, minValue, maxValue,
      depreciationMethod, year, month, depreciationStatus, minBookValue, maxBookValue,
      minDepreciationRate, maxDepreciationRate, assetAge, usefulLifeRange, sivDateFrom,
      sivDateTo, depreciationEndingSoon, residualPercentageRange
    });

    if (startDate && endDate) {
      // Ensure end date includes the full day
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Set to end of day

      whereClause.sivDate = {
        gte: startDateTime,
        lte: endDateTime
      };
      console.log('🔍 API Debug: Date filter applied:', {
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      });
    } else if (startDate) {
      // Only start date provided
      whereClause.sivDate = {
        gte: new Date(startDate)
      };
      console.log('🔍 API Debug: Start date filter applied:', new Date(startDate).toISOString());
    } else if (endDate) {
      // Only end date provided
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereClause.sivDate = {
        lte: endDateTime
      };
      console.log('🔍 API Debug: End date filter applied:', endDateTime.toISOString());
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

    if (minValue || maxValue) {
      whereClause.currentValue = {};

      if (minValue) {
        const minVal = parseFloat(minValue);
        if (!isNaN(minVal) && minVal >= 0) {
          whereClause.currentValue.gte = minVal;
          console.log('🔍 API Debug: Min value filter applied:', minVal);
        }
      }

      if (maxValue) {
        const maxVal = parseFloat(maxValue);
        if (!isNaN(maxVal) && maxVal >= 0) {
          whereClause.currentValue.lte = maxVal;
          console.log('🔍 API Debug: Max value filter applied:', maxVal);
        }
      }

      // If no valid values were set, remove the currentValue filter
      if (Object.keys(whereClause.currentValue).length === 0) {
        delete whereClause.currentValue;
      }
    }

    if (depreciationMethod && depreciationMethod !== 'all') {
      whereClause.depreciationMethod = depreciationMethod;
    }

    // Depreciation-specific filters
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

    // Debug: Log the where clause
    console.log('🔍 API Debug: Where clause built:', JSON.stringify(whereClause, null, 2));

    // Additional debugging for each filter
    console.log('🔍 API Debug: Filter analysis:');
    console.log('  - Date range:', startDate && endDate ? `${startDate} to ${endDate}` : 'Not applied');
    console.log('  - Category:', category !== 'all' ? category : 'All categories');
    console.log('  - Department:', currentDepartment !== 'all' ? currentDepartment : 'All departments');
    console.log('  - Location:', location !== 'all' ? location : 'All locations');
    console.log('  - Status:', status !== 'all' ? status : 'All statuses');
    console.log('  - Value range:', (minValue || maxValue) ? `${minValue || '0'} to ${maxValue || '∞'}` : 'Not applied');
    console.log('  - Depreciation method:', depreciationMethod !== 'all' ? depreciationMethod : 'All methods');

    // Get total and active asset counts with filters
    const totalAssets = await prisma.asset.count({ where: whereClause });
    const activeAssets = await prisma.asset.count({
      where: { ...whereClause, status: 'ACTIVE' }
    });

    console.log('🔍 API Debug: Asset counts - Total:', totalAssets, 'Active:', activeAssets);

    // Assets by category with filters
    const assetsByCategory = await prisma.asset.groupBy({
      by: ['category', 'status'],
      where: whereClause,
      _count: { id: true },
      _sum: { currentValue: true }
    });

    // Assets by department with filters
    const assetsByDepartment = await prisma.asset.groupBy({
      by: ['currentDepartment', 'status'],
      where: whereClause,
      _count: { id: true },
      _sum: { currentValue: true }
    });

    // Asset status distribution with filters
    const statusDistribution = await prisma.asset.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true }
    });

    // Get total count for pagination
    const totalAssetsCount = await prisma.asset.count({
      where: whereClause
    });

    // Enhanced depreciation data calculation and detailed asset list with pagination
    let assets = await prisma.asset.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        itemDescription: true,
        serialNumber: true,
        oldTagNumber: true,
        newTagNumber: true,
        grnNumber: true,
        grnDate: true,
        unitPrice: true,
        sivNumber: true,
        sivDate: true,
        currentDepartment: true,
        remark: true,
        usefulLifeYears: true,
        residualPercentage: true,
        currentValue: true,
        status: true,
        location: true,
        category: true,
        type: true,
        supplier: true,
        warrantyExpiry: true,
        depreciableCost: true,
        salvageValue: true,
        depreciationMethod: true,
        // depreciationStartDate removed - using sivDate only
        createdAt: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      skip: offset,
      take: limit
    });

    // Calculate book values for all assets for the selected year/month using on-the-fly calculations
    let bookValueMap = {};
    let bookValueByDepartment = [];
    let bookValueByCategory = [];
    let bookValuesByAsset = {};

    console.log('🔍 API Debug: Calculating book values for', assets.length, 'assets');

    if (year && month) {
      console.log('🔍 API Debug: Calculating book values for specific month:', year, month);

      // Calculate book values for specific month/year using the correct depreciation utility
      const bookValues = [];
      for (const asset of assets) {
        try {
          const depreciableCost = asset.depreciableCost || asset.unitPrice;
          const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
          const usefulLifeYears = asset.usefulLifeYears || 5;
          const method = asset.depreciationMethod || 'STRAIGHT_LINE';
          const sivDate = asset.sivDate; // Single source for depreciation start date

          if (depreciableCost && depreciableCost > 0 && sivDate) {
            // Ensure sivDate is properly formatted
            const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

            console.log(`🔍 API Debug: Preparing calculation for asset ${asset.id}`);
            console.log(`  - depreciableCost: ${depreciableCost}`);
            console.log(`  - salvageValue: ${salvageValue}`);
            console.log(`  - usefulLifeYears: ${usefulLifeYears}`);
            console.log(`  - method: ${method}`);
            console.log(`  - sivDate: ${sivDate} -> ${sivDateString}`);

            // Use the correct depreciation calculation from utils/depreciation.ts
            const monthlyResults = calculateMonthlyDepreciation({
              unitPrice: depreciableCost,
              sivDate: sivDateString,
              usefulLifeYears: usefulLifeYears,
              salvageValue: salvageValue,
              method: method,
            });

            // Determine book value for the specific year and month with proper blank handling
            const sivDateObj = new Date(sivDateString);
            const sivYear = sivDateObj.getFullYear();
            const sivMonth = sivDateObj.getMonth() + 1; // 1-based month

            // Calculate when useful life ends
            const usefulLifeMonths = usefulLifeYears * 12;
            const endDate = new Date(sivDateObj);
            endDate.setMonth(endDate.getMonth() + usefulLifeMonths);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1; // 1-based month

            console.log(`🔍 API Debug: Asset ${asset.id} (${asset.name || 'Unknown'})`);
            console.log(`  - Unit Price: $${depreciableCost}`);
            console.log(`  - Salvage Value: $${salvageValue}`);
            console.log(`  - SIV Date: ${sivDate} (${sivYear}-${sivMonth})`);
            console.log(`  - Target: ${year}-${month}`);
            console.log(`  - End Date: ${endYear}-${endMonth}`);
            console.log(`  - Monthly results count: ${monthlyResults.length}`);

            let bookValue = null;

            if (year < sivYear || (year === sivYear && month < sivMonth)) {
              // Before asset was put in service - no book value (will be null)
              console.log(`  - Target month is before SIV date - no book value`);
            } else if (year > endYear || (year === endYear && month >= endMonth)) {
              // After useful life ends - show salvage value
              bookValue = salvageValue;
              console.log(`  - Target month is after useful life - salvage value $${salvageValue.toFixed(2)}`);
            } else {
              // During useful life - find calculated book value
              const targetResult = monthlyResults.find(result =>
                result.year === year && result.month === month
              );
              if (targetResult) {
                bookValue = targetResult.bookValue;
                console.log(`  - Book Value for ${year}-${month}: $${targetResult.bookValue.toFixed(2)}`);
              } else {
                console.log(`  - No calculation result found for ${year}-${month}`);
                // Show available results for debugging
                const availableResults = monthlyResults.slice(0, 5).map(r => `${r.year}-${r.month}: $${r.bookValue.toFixed(2)}`);
                console.log(`  - Available results (first 5): ${availableResults.join(', ')}`);
              }
            }

            if (bookValue !== null) {
              bookValues.push({ assetId: asset.id, bookValue });
            }
          }
        } catch (error) {
          console.error('🔍 API Debug: Error calculating book value for asset', asset.id, ':', error.message);
        }
      }

      bookValueMap = Object.fromEntries(bookValues.map(bv => [bv.assetId, bv.bookValue]));

      // Aggregate book value by department
      const assetIdToDepartment = Object.fromEntries(assets.map(a => [a.id, a.currentDepartment || 'Unassigned']));
      const departmentTotals = {};
      for (const bv of bookValues) {
        const dept = assetIdToDepartment[bv.assetId] || 'Unassigned';
        departmentTotals[dept] = (departmentTotals[dept] || 0) + (bv.bookValue || 0);
      }
      bookValueByDepartment = Object.entries(departmentTotals).map(([department, totalBookValue]) => ({ department, totalBookValue }));

      // Aggregate book value by category
      const assetIdToCategory = Object.fromEntries(assets.map(a => [a.id, a.category || 'Uncategorized']));
      const categoryTotals = {};
      for (const bv of bookValues) {
        const cat = assetIdToCategory[bv.assetId] || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (bv.bookValue || 0);
      }
      bookValueByCategory = Object.entries(categoryTotals).map(([category, totalBookValue]) => ({ category, totalBookValue }));
    } else if (year && !month) {
      // Calculate all monthly book values for the selected year using our optimized utility
      console.log('🔍 API Debug: Calculating monthly book values for year:', year);

      for (const asset of assets) {
        try {
          const depreciableCost = asset.depreciableCost || asset.unitPrice;
          const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
          const usefulLifeYears = asset.usefulLifeYears || 5;
          const method = asset.depreciationMethod || 'STRAIGHT_LINE';
          const sivDate = asset.sivDate; // Single source for depreciation start date

          if (depreciableCost && depreciableCost > 0 && sivDate) {
            // Ensure sivDate is properly formatted
            const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

            // Use the correct depreciation calculation from utils/depreciation.ts
            const monthlyResults = calculateMonthlyDepreciation({
              unitPrice: depreciableCost,
              sivDate: sivDateString,
              usefulLifeYears: usefulLifeYears,
              salvageValue: salvageValue,
              method: method,
            });

            // Build monthly book values for the target year with proper blank handling
            const yearlyValues = {};
            const sivDateObj = new Date(sivDateString);
            const sivYear = sivDateObj.getFullYear();
            const sivMonth = sivDateObj.getMonth() + 1; // 1-based month

            // Calculate when useful life ends
            const usefulLifeMonths = usefulLifeYears * 12;
            const endDate = new Date(sivDateObj);
            endDate.setMonth(endDate.getMonth() + usefulLifeMonths);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1; // 1-based month

            console.log(`🔍 API Debug: Asset ${asset.id} (${asset.name || 'Unknown'}) - Year ${year}`);
            console.log(`  - Unit Price: $${depreciableCost}`);
            console.log(`  - Salvage Value: $${salvageValue}`);
            console.log(`  - SIV Date: ${sivDate} (${sivYear}-${sivMonth})`);
            console.log(`  - Useful Life: ${usefulLifeYears} years (${usefulLifeMonths} months)`);
            console.log(`  - End Date: ${endYear}-${endMonth}`);
            console.log(`  - Total monthly results: ${monthlyResults.length}`);

            // For each month of the target year, determine the book value
            for (let month = 1; month <= 12; month++) {
              if (year < sivYear || (year === sivYear && month < sivMonth)) {
                // Before asset was put in service - leave blank (undefined)
                console.log(`  - Month ${month}: Before SIV date - blank`);
              } else if (year > endYear || (year === endYear && month >= endMonth)) {
                // After useful life ends - show salvage value
                yearlyValues[month] = salvageValue;
                console.log(`  - Month ${month}: After useful life - salvage value $${salvageValue.toFixed(2)}`);
              } else {
                // During useful life - find calculated book value
                const monthResult = monthlyResults.find(result =>
                  result.year === year && result.month === month
                );
                if (monthResult) {
                  yearlyValues[month] = monthResult.bookValue;
                  console.log(`  - Month ${month}: Active depreciation - $${monthResult.bookValue.toFixed(2)}`);
                } else {
                  console.log(`  - Month ${month}: No calculation result found - blank`);
                }
              }
            }

            bookValuesByAsset[asset.id] = yearlyValues;
          }
        } catch (error) {
          console.error('🔍 API Debug: Error calculating yearly book values for asset', asset.id, ':', error.message);
        }
      }

      console.log('🔍 API Debug: Calculated yearly book values for', Object.keys(bookValuesByAsset).length, 'assets');
    }

    // Apply depreciation-specific post-processing filters
    let filteredAssets = assets;

    if (depreciationStatus || assetAge || minBookValue || maxBookValue || minDepreciationRate || maxDepreciationRate || depreciationEndingSoon) {
      console.log('🔍 API Debug: Applying depreciation-specific filters...');

      filteredAssets = assets.filter(asset => {
        const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
        const unitPrice = asset.unitPrice || 0;
        const currentValue = asset.currentValue || 0;
        const usefulLifeYears = asset.usefulLifeYears || 5;
        const residualPercentage = asset.residualPercentage || 0;

        // Calculate current book value for filtering
        let currentBookValue = currentValue;
        if (year && month && bookValueMap[asset.id] !== undefined) {
          currentBookValue = bookValueMap[asset.id];
        } else if (sivDate && unitPrice > 0) {
          // Calculate current book value on-the-fly for filtering
          try {
            const salvageValue = asset.salvageValue || (unitPrice * residualPercentage / 100);
            const monthsElapsed = sivDate ? Math.max(0, (now.getFullYear() - sivDate.getFullYear()) * 12 + (now.getMonth() - sivDate.getMonth())) : 0;
            const totalMonths = usefulLifeYears * 12;
            const depreciableAmount = unitPrice - salvageValue;
            const monthlyDepreciation = depreciableAmount / totalMonths;
            const accumulatedDepreciation = Math.min(monthlyDepreciation * monthsElapsed, depreciableAmount);
            currentBookValue = Math.max(unitPrice - accumulatedDepreciation, salvageValue);
          } catch (error) {
            console.warn('Error calculating book value for filtering:', error.message);
          }
        }

        // Calculate asset age in years
        const assetAgeYears = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;

        // Calculate depreciation rate
        const depreciationRate = unitPrice > 0 ? ((unitPrice - currentBookValue) / unitPrice) * 100 : 0;

        // Apply depreciation status filter
        if (depreciationStatus) {
          if (depreciationStatus === 'not_started' && sivDate && sivDate > now) {
            // Asset not yet in service
          } else if (depreciationStatus === 'active' && sivDate && sivDate <= now && assetAgeYears < usefulLifeYears) {
            // Asset actively depreciating
          } else if (depreciationStatus === 'fully_depreciated' && assetAgeYears >= usefulLifeYears) {
            // Asset fully depreciated
          } else {
            return false;
          }
        }

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

        // Apply book value range filter
        if (minBookValue !== null && currentBookValue < minBookValue) {
          return false;
        }
        if (maxBookValue !== null && currentBookValue > maxBookValue) {
          return false;
        }

        // Apply depreciation rate filter
        if (minDepreciationRate !== null && depreciationRate < minDepreciationRate) {
          return false;
        }
        if (maxDepreciationRate !== null && depreciationRate > maxDepreciationRate) {
          return false;
        }

        // Apply depreciation ending soon filter
        if (depreciationEndingSoon && sivDate) {
          const endDate = new Date(sivDate);
          endDate.setFullYear(endDate.getFullYear() + usefulLifeYears);
          const monthsUntilEnd = Math.max(0, (endDate - now) / (1000 * 60 * 60 * 24 * 30));
          if (monthsUntilEnd > 12) {
            return false;
          }
        }

        return true;
      });

      console.log(`🔍 API Debug: Filtered from ${assets.length} to ${filteredAssets.length} assets`);
    }

    // Update assets reference for the rest of the processing
    assets = filteredAssets;

    // Calculate actual depreciation data for each asset
    const monthlyDepreciation = new Map();

    for (const asset of assets) {
      try {
        const depreciableCost = asset.depreciableCost || asset.unitPrice;
        const salvageValue = asset.salvageValue || 0;
        const usefulLifeYears = asset.usefulLifeYears || 5;
        const method = asset.depreciationMethod || 'STRAIGHT_LINE';
        const startDate = asset.sivDate; // Single source for depreciation start

        // Skip assets with invalid or zero unit price
        if (!depreciableCost || depreciableCost <= 0) {
          console.warn(`Skipping depreciation calculation for asset ${asset.id} (${asset.name}): Invalid unit price (${depreciableCost})`);
          continue;
        }

        // Skip assets without valid start date
        if (!startDate) {
          console.warn(`Skipping depreciation calculation for asset ${asset.id} (${asset.name}): No valid start date`);
          continue;
        }

        // Additional validation
        if (salvageValue < 0 || salvageValue >= depreciableCost) {
          console.warn(`Skipping depreciation calculation for asset ${asset.id} (${asset.name}): Invalid salvage value (${salvageValue}) vs unit price (${depreciableCost})`);
          continue;
        }

        const depreciationResults = calculateDepreciation({
          unitPrice: depreciableCost,
          sivDate: startDate.toISOString(),
          usefulLifeYears: usefulLifeYears,
          salvageValue: salvageValue,
          method: method,
        });

        // Group by month for the last 12 months
        depreciationResults.forEach(result => {
          const resultDate = new Date(result.year, 0, 1); // January 1st of the year
          if (resultDate >= twelveMonthsAgo && resultDate <= now) {
            const monthKey = `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyDepreciation.has(monthKey)) {
              monthlyDepreciation.set(monthKey, {
                month: monthKey,
                totalValue: 0,
                totalDepreciation: 0,
                assetCount: 0
              });
            }

            const monthData = monthlyDepreciation.get(monthKey);
            monthData.totalValue += result.bookValue;
            monthData.totalDepreciation += result.depreciationExpense;
            monthData.assetCount += 1;
          }
        });
      } catch (e) {
        console.error(`Error calculating depreciation for asset ${asset.id} (${asset.name || 'Unknown'}):`, {
          error: e.message,
          unitPrice: asset.unitPrice,
          depreciableCost: asset.depreciableCost || asset.unitPrice,
          salvageValue: asset.salvageValue || 0,
          usefulLifeYears: asset.usefulLifeYears || 5,
          startDate: asset.sivDate
        });
        // Continue processing other assets instead of crashing
        continue;
      }
    }

    // Convert map to array and sort by month
    const sortedDepreciationData = Array.from(monthlyDepreciation.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        month: item.month,
        value: item.totalValue,
        depreciation: item.totalDepreciation
      }));

    // Total current value with filters
    const totalValue = await prisma.asset.aggregate({
      where: whereClause,
      _sum: { currentValue: true }
    });

    // Total purchase value with filters (using unitPrice instead of purchasePrice)
    const totalPurchaseValue = await prisma.asset.aggregate({
      where: whereClause,
      _sum: { unitPrice: true }
    });

    // Total maintenance cost with filters (skip if maintenance table doesn't exist)
    let maintenanceCost = { _sum: { cost: 0 } };
    try {
      maintenanceCost = await prisma.maintenance.aggregate({
        where: {
          asset: whereClause
        },
        _sum: { cost: true }
      });
    } catch (error) {
      console.log('🔍 API Debug: Maintenance table not available, skipping maintenance cost calculation');
      maintenanceCost = { _sum: { cost: 0 } };
    }

    // Asset count 12 months ago (for growth calculation)
    const pastAssets = await prisma.asset.count({
      where: {
        ...whereClause,
        createdAt: {
          lt: twelveMonthsAgo
        }
      }
    });

    // Value 12 months ago with filters
    const pastValueResult = await prisma.asset.aggregate({
      where: {
        ...whereClause,
        createdAt: {
          lt: twelveMonthsAgo
        }
      },
      _sum: {
        currentValue: true
      }
    });

    const assetGrowth = totalAssets - pastAssets;
    const valueGrowth = (totalValue._sum.currentValue ?? 0) - (pastValueResult._sum.currentValue ?? 0);

    // Calculate total depreciation from our enhanced data
    const totalDepreciation = sortedDepreciationData.reduce((acc, item) => {
      return acc + item.depreciation;
    }, 0);

    // Advanced analytics calculations
    let averageAssetAge = [{ avg_age: 0 }];
    try {
      if (Object.keys(whereClause).length === 0) {
        averageAssetAge = await prisma.$queryRaw`
          SELECT AVG(EXTRACT(YEAR FROM AGE(NOW(), "sivDate"))) as avg_age
          FROM "Asset"
          WHERE "sivDate" IS NOT NULL
        `;
      } else {
        // For filtered queries, calculate age manually
        const assetsForAge = await prisma.asset.findMany({
          where: whereClause,
          select: { sivDate: true }
        });

        if (assetsForAge.length > 0) {
          const totalAge = assetsForAge.reduce((sum, asset) => {
            if (asset.sivDate) {
              const ageInYears = (now.getTime() - asset.sivDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
              return sum + ageInYears;
            }
            return sum;
          }, 0);
          averageAssetAge = [{ avg_age: totalAge / assetsForAge.length }];
        }
      }
    } catch (error) {
      console.error('Error calculating average asset age:', error);
      averageAssetAge = [{ avg_age: 0 }];
    }

    // Asset utilization rate
    const utilizationRate = totalAssets > 0 ? (activeAssets / totalAssets) * 100 : 0;

    // ROI calculation (simplified)
    const totalROI = totalPurchaseValue._sum.unitPrice > 0
      ? ((totalValue._sum.currentValue - (maintenanceCost._sum.cost || 0)) / totalPurchaseValue._sum.unitPrice) * 100
      : 0;

    // Get unique filter options for frontend (get all unique values, not just from filtered results)
    console.log('🔍 API Debug: Fetching filter options...');

    // Get all unique categories
    const categoriesResult = await prisma.asset.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } }
    });

    // Get all unique departments
    const departmentsResult = await prisma.asset.findMany({
      select: { currentDepartment: true },
      distinct: ['currentDepartment'],
      where: { currentDepartment: { not: null } }
    });

    // Get all unique locations
    const locationsResult = await prisma.asset.findMany({
      select: { location: true },
      distinct: ['location'],
      where: { location: { not: null } }
    });

    // Get all unique depreciation methods
    const depreciationMethodsResult = await prisma.asset.findMany({
      select: { depreciationMethod: true },
      distinct: ['depreciationMethod'],
      where: { depreciationMethod: { not: null } }
    });

    const uniqueCategories = categoriesResult.map(item => item.category).filter(Boolean);
    const uniqueDepartments = departmentsResult.map(item => item.currentDepartment).filter(Boolean);
    const uniqueLocations = locationsResult.map(item => item.location).filter(Boolean);
    const uniqueDepreciationMethods = depreciationMethodsResult.map(item => item.depreciationMethod).filter(Boolean);

    console.log('🔍 API Debug: Filter options found:');
    console.log('  - Categories:', uniqueCategories);
    console.log('  - Departments:', uniqueDepartments);
    console.log('  - Locations:', uniqueLocations);
    console.log('  - Depreciation Methods:', uniqueDepreciationMethods);

    // Calculate depreciation-specific analytics
    let totalCurrentBookValue = 0;
    let totalAccumulatedDepreciation = 0;
    let assetsActivelyDepreciating = 0;
    let assetsFullyDepreciated = 0;
    let assetsNotStarted = 0;
    let depreciationEndingIn12Months = 0;
    const depreciationByMethod = {};

    assets.forEach(asset => {
      const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
      const unitPrice = asset.unitPrice || 0;
      const usefulLifeYears = asset.usefulLifeYears || 5;
      const residualPercentage = asset.residualPercentage || 0;
      const method = asset.depreciationMethod || 'STRAIGHT_LINE';

      // Initialize method tracking
      if (!depreciationByMethod[method]) {
        depreciationByMethod[method] = {
          count: 0,
          totalValue: 0,
          totalBookValue: 0,
          totalDepreciation: 0
        };
      }

      if (sivDate && unitPrice > 0) {
        const salvageValue = asset.salvageValue || (unitPrice * residualPercentage / 100);
        const assetAgeYears = Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25));

        // Calculate current book value
        let currentBookValue = unitPrice;
        if (year && month && bookValueMap[asset.id] !== undefined) {
          currentBookValue = bookValueMap[asset.id];
        } else {
          try {
            const monthsElapsed = Math.max(0, (now.getFullYear() - sivDate.getFullYear()) * 12 + (now.getMonth() - sivDate.getMonth()));
            const totalMonths = usefulLifeYears * 12;
            const depreciableAmount = unitPrice - salvageValue;
            const monthlyDepreciation = depreciableAmount / totalMonths;
            const accumulatedDepreciation = Math.min(monthlyDepreciation * monthsElapsed, depreciableAmount);
            currentBookValue = Math.max(unitPrice - accumulatedDepreciation, salvageValue);
          } catch (error) {
            console.warn('Error calculating book value for analytics:', error.message);
          }
        }

        const accumulatedDepreciation = unitPrice - currentBookValue;

        totalCurrentBookValue += currentBookValue;
        totalAccumulatedDepreciation += accumulatedDepreciation;

        // Track depreciation status
        if (sivDate > now) {
          assetsNotStarted++;
        } else if (assetAgeYears >= usefulLifeYears) {
          assetsFullyDepreciated++;
        } else {
          assetsActivelyDepreciating++;
        }

        // Check if depreciation ending in 12 months
        const endDate = new Date(sivDate);
        endDate.setFullYear(endDate.getFullYear() + usefulLifeYears);
        const monthsUntilEnd = Math.max(0, (endDate - now) / (1000 * 60 * 60 * 24 * 30));
        if (monthsUntilEnd <= 12 && monthsUntilEnd > 0) {
          depreciationEndingIn12Months++;
        }

        // Track by method
        depreciationByMethod[method].count++;
        depreciationByMethod[method].totalValue += unitPrice;
        depreciationByMethod[method].totalBookValue += currentBookValue;
        depreciationByMethod[method].totalDepreciation += accumulatedDepreciation;
      }
    });

    const averageDepreciationRate = totalPurchaseValue._sum.unitPrice > 0 ?
      (totalAccumulatedDepreciation / totalPurchaseValue._sum.unitPrice) * 100 : 0;

    // Calculate book value totals based on year/month selection
    let totalBookValue = 0;
    let monthlyBookValueTotals = {};

    if (year && month) {
      // Specific month selected - sum book values for that month
      assets.forEach(asset => {
        if (bookValueMap[asset.id] !== undefined) {
          totalBookValue += bookValueMap[asset.id];
        }
      });
    } else if (year && !month) {
      // Only year selected - calculate totals for all 12 months
      console.log(`🔍 API Debug: Calculating monthly totals for ${year} with ${assets.length} filtered assets`);

      // Recalculate book values for filtered assets if needed
      const filteredBookValuesByAsset = {};

      for (const asset of assets) {
        if (bookValuesByAsset[asset.id]) {
          // Use existing calculation if available
          filteredBookValuesByAsset[asset.id] = bookValuesByAsset[asset.id];
        } else {
          // Calculate book values for this filtered asset
          try {
            const depreciableCost = asset.depreciableCost || asset.unitPrice;
            const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
            const usefulLifeYears = asset.usefulLifeYears || 5;
            const method = asset.depreciationMethod || 'STRAIGHT_LINE';
            const sivDate = asset.sivDate;

            if (sivDate && depreciableCost > 0) {
              const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

              const depreciationInput = {
                unitPrice: depreciableCost,
                sivDate: sivDate.toISOString().split('T')[0],
                usefulLifeYears,
                salvageValue,
                method,
                residualPercentage: asset.residualPercentage || 0
              };

              const monthlyResults = calculateMonthlyDepreciation(depreciationInput);
              const yearlyValues = {};

              // Extract book values for the selected year
              monthlyResults.forEach(result => {
                if (result.year === parseInt(year)) {
                  yearlyValues[result.month] = result.bookValue;
                }
              });

              filteredBookValuesByAsset[asset.id] = yearlyValues;
            }
          } catch (error) {
            console.error('🔍 API Debug: Error calculating book values for filtered asset', asset.id, ':', error.message);
          }
        }
      }

      // Now calculate monthly totals using the filtered book values
      for (let m = 1; m <= 12; m++) {
        monthlyBookValueTotals[m] = 0;
        let assetsWithDataForMonth = 0;

        assets.forEach(asset => {
          if (filteredBookValuesByAsset[asset.id] && filteredBookValuesByAsset[asset.id][m] !== undefined) {
            const assetBookValue = filteredBookValuesByAsset[asset.id][m];
            monthlyBookValueTotals[m] += assetBookValue;
            assetsWithDataForMonth++;

            // Debug first few assets for first month
            if (m === 1 && assetsWithDataForMonth <= 3) {
              console.log(`  Asset ${asset.itemDescription || asset.name}: Month ${m} = $${assetBookValue.toFixed(2)}`);
            }
          }
        });

        console.log(`  Month ${m}: $${monthlyBookValueTotals[m].toFixed(2)} (${assetsWithDataForMonth} assets)`);
      }

      // For the main totalBookValue, use current book values
      totalBookValue = totalCurrentBookValue;
    } else {
      // No year/month filter - use current book values
      totalBookValue = totalCurrentBookValue;
    }

    const formattedData = {
      stats: {
        totalAssets,
        activeAssets,
        totalValue: totalValue._sum.currentValue ?? 0,
        totalPurchaseValue: totalPurchaseValue._sum.unitPrice ?? 0,
        maintenanceCost: maintenanceCost._sum.cost ?? 0,
        assetGrowth,
        valueGrowth,
        totalDepreciation,
        averageAssetAge: averageAssetAge[0]?.avg_age ? parseFloat(averageAssetAge[0].avg_age) : 0,
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
        totalROI: parseFloat(totalROI.toFixed(2)),
        // Book value based on selection
        totalBookValue: parseFloat(totalBookValue.toFixed(2)),
        monthlyBookValueTotals: Object.fromEntries(
          Object.entries(monthlyBookValueTotals).map(([month, value]) => [month, parseFloat(value.toFixed(2))])
        ),
        // Depreciation-specific analytics
        totalCurrentBookValue: parseFloat(totalCurrentBookValue.toFixed(2)),
        totalAccumulatedDepreciation: parseFloat(totalAccumulatedDepreciation.toFixed(2)),
        averageDepreciationRate: parseFloat(averageDepreciationRate.toFixed(2)),
        assetsActivelyDepreciating,
        assetsFullyDepreciated,
        assetsNotStarted,
        depreciationEndingIn12Months,
        depreciationByMethod: Object.entries(depreciationByMethod).map(([method, data]) => ({
          method,
          count: data.count,
          totalValue: parseFloat(data.totalValue.toFixed(2)),
          totalBookValue: parseFloat(data.totalBookValue.toFixed(2)),
          totalDepreciation: parseFloat(data.totalDepreciation.toFixed(2)),
          averageDepreciationRate: data.totalValue > 0 ? parseFloat(((data.totalDepreciation / data.totalValue) * 100).toFixed(2)) : 0
        }))
      },
      pagination: {
        page,
        limit,
        total: totalAssetsCount,
        totalPages: Math.ceil(totalAssetsCount / limit),
        hasNextPage: page < Math.ceil(totalAssetsCount / limit),
        hasPreviousPage: page > 1
      },
      byCategory: assetsByCategory.map(item => ({
        category: item.category || 'Uncategorized',
        status: item.status,
        count: item._count.id,
        value: item._sum.currentValue ?? 0
      })),
      byDepartment: assetsByDepartment.map(item => ({
        department: item.currentDepartment || 'Unassigned',
        status: item.status,
        count: item._count.id,
        value: item._sum.currentValue ?? 0
      })),
      statusDistribution: statusDistribution.map(item => ({
        status: item.status,
        count: item._count.id,
        percentage: totalAssets > 0 ? parseFloat(((item._count.id / totalAssets) * 100).toFixed(2)) : 0
      })),
      depreciation: sortedDepreciationData,
      assets: assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        itemDescription: asset.itemDescription,
        serialNumber: asset.serialNumber,
        oldTagNumber: asset.oldTagNumber,
        newTagNumber: asset.newTagNumber,
        grnNumber: asset.grnNumber,
        grnDate: asset.grnDate ? asset.grnDate.toISOString().split('T')[0] : null,
        unitPrice: asset.unitPrice,
        sivNumber: asset.sivNumber,
        sivDate: asset.sivDate ? asset.sivDate.toISOString().split('T')[0] : null,
        currentDepartment: asset.currentDepartment,
        remark: asset.remark,
        usefulLifeYears: asset.usefulLifeYears,
        residualPercentage: asset.residualPercentage,
        category: asset.category,
        status: asset.status,
        location: asset.location,
        currentValue: asset.currentValue,
        depreciationMethod: asset.depreciationMethod,
        supplier: asset.supplier,
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : null,
        age: asset.sivDate ? Math.floor((now - asset.sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0,
        depreciationRate: asset.unitPrice > 0 ?
          ((asset.unitPrice - asset.currentValue) / asset.unitPrice * 100).toFixed(1) : 0,
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
        ...(year && month ? { bookValue: bookValueMap[asset.id] ?? null } : {}),
        ...(year && !month ? {
          bookValuesByMonth: bookValuesByAsset[asset.id] || {},
          // Add debug info for the first few assets
          ...(assets.indexOf(asset) < 3 ? {
            _debug_bookValuesByMonth: bookValuesByAsset[asset.id] || {},
            _debug_hasBookValues: !!(bookValuesByAsset[asset.id] && Object.keys(bookValuesByAsset[asset.id]).length > 0)
          } : {})
        } : {}),
      })),
      filterOptions: {
        categories: uniqueCategories,
        departments: uniqueDepartments,
        locations: uniqueLocations,
        depreciationMethods: uniqueDepreciationMethods,
        // Depreciation-specific filter options
        depreciationStatus: [
          { value: 'active', label: 'Actively Depreciating' },
          { value: 'fully_depreciated', label: 'Fully Depreciated' },
          { value: 'not_started', label: 'Not Started' }
        ],
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
      },
      analytics: {
        depreciationTrend: sortedDepreciationData.length > 1 ?
          sortedDepreciationData[sortedDepreciationData.length - 1].depreciation - sortedDepreciationData[0].depreciation : 0,
        averageDepreciationRate: totalPurchaseValue._sum.unitPrice > 0 ?
          (totalDepreciation / totalPurchaseValue._sum.unitPrice) * 100 : 0,
        assetTurnover: totalPurchaseValue._sum.unitPrice > 0 ?
          (totalValue._sum.currentValue / totalPurchaseValue._sum.unitPrice) : 0
      },
      bookValueByDepartment,
      bookValueByCategory,
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