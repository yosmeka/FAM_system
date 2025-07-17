// Export API endpoint for asset reports - returns ALL filtered data without pagination
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

export const GET = withRole(['MANAGER', 'USER', 'AUDITOR'], async function GET(req) {
  try {
    const url = new URL(req.url);
    const now = new Date();

    // Parse all filter parameters (same as main route)
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

    console.log('🔍 Export API Debug: All received parameters:', {
      startDate, endDate, category, currentDepartment, location, status, minValue, maxValue,
      depreciationMethod, year, month, depreciationStatus, minBookValue, maxBookValue,
      minDepreciationRate, maxDepreciationRate, assetAge, usefulLifeRange, sivDateFrom,
      sivDateTo, depreciationEndingSoon, residualPercentageRange
    });

    // Build where clause for filtering (same logic as main route)
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

    console.log('🔍 Export API Debug: Where clause built:', JSON.stringify(whereClause, null, 2));

    // Fetch ALL assets matching the filters (NO PAGINATION)
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

    console.log(`🔍 Export API Debug: Found ${assets.length} assets before post-processing filters`);

    // Calculate book values if year/month filters are applied
    let bookValueMap = {};
    let bookValuesByAsset = {};

    if (year && month) {
      // Calculate book values for specific month
      console.log(`🔍 Export API Debug: Calculating book values for ${year}-${month}`);
      
      for (const asset of assets) {
        try {
          if (asset.sivDate && asset.unitPrice > 0) {
            const { calculateMonthlyDepreciation } = require('@/utils/depreciation');
            
            const depreciationInput = {
              unitPrice: asset.unitPrice,
              sivDate: asset.sivDate.toISOString().split('T')[0],
              usefulLifeYears: asset.usefulLifeYears || 5,
              salvageValue: asset.salvageValue || (asset.unitPrice * (asset.residualPercentage || 0) / 100),
              method: asset.depreciationMethod || 'STRAIGHT_LINE',
              residualPercentage: asset.residualPercentage || 0
            };

            const monthlyResults = calculateMonthlyDepreciation(depreciationInput);
            const targetResult = monthlyResults.find(result => 
              result.year === year && result.month === month
            );

            if (targetResult) {
              bookValueMap[asset.id] = targetResult.bookValue;
            }
          }
        } catch (error) {
          console.warn('Error calculating book value for asset', asset.id, ':', error.message);
        }
      }
    } else if (year && !month) {
      // Calculate book values for all months in the year
      console.log(`🔍 Export API Debug: Calculating monthly book values for ${year}`);
      
      for (const asset of assets) {
        try {
          if (asset.sivDate && asset.unitPrice > 0) {
            const { calculateMonthlyDepreciation } = require('@/utils/depreciation');
            
            const depreciationInput = {
              unitPrice: asset.unitPrice,
              sivDate: asset.sivDate.toISOString().split('T')[0],
              usefulLifeYears: asset.usefulLifeYears || 5,
              salvageValue: asset.salvageValue || (asset.unitPrice * (asset.residualPercentage || 0) / 100),
              method: asset.depreciationMethod || 'STRAIGHT_LINE',
              residualPercentage: asset.residualPercentage || 0
            };

            const monthlyResults = calculateMonthlyDepreciation(depreciationInput);
            const yearlyValues = {};

            monthlyResults.forEach(result => {
              if (result.year === year) {
                yearlyValues[result.month] = result.bookValue;
              }
            });

            bookValuesByAsset[asset.id] = yearlyValues;
          }
        } catch (error) {
          console.warn('Error calculating monthly book values for asset', asset.id, ':', error.message);
        }
      }
    }

    // Apply post-processing filters (same logic as main route)
    let filteredAssets = assets;
    
    if (depreciationStatus || assetAge || minBookValue || maxBookValue || minDepreciationRate || maxDepreciationRate || depreciationEndingSoon) {
      console.log('🔍 Export API Debug: Applying depreciation-specific filters...');
      
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
        
        // Apply all the same filter logic as main route...
        // (Asset age, depreciation status, book value range, etc.)
        
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
      
      console.log(`🔍 Export API Debug: Filtered from ${assets.length} to ${filteredAssets.length} assets`);
    }

    // Format assets for export with ALL necessary fields
    const formattedAssets = filteredAssets.map(asset => {
      const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
      const assetAgeYears = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
      const depreciationRate = asset.unitPrice > 0 ? ((asset.unitPrice - (asset.currentValue || 0)) / asset.unitPrice) * 100 : 0;
      
      return {
        id: asset.id,
        name: asset.name || '',
        itemDescription: asset.itemDescription || '',
        serialNumber: asset.serialNumber || '',
        oldTagNumber: asset.oldTagNumber || '',
        newTagNumber: asset.newTagNumber || '',
        category: asset.category || '',
        type: asset.type || '',
        currentDepartment: asset.currentDepartment || '',
        location: asset.location || '',
        supplier: asset.supplier || '',
        status: asset.status || '',
        unitPrice: asset.unitPrice || 0,
        currentValue: asset.currentValue || 0,
        depreciableCost: asset.depreciableCost || 0,
        salvageValue: asset.salvageValue || 0,
        usefulLifeYears: asset.usefulLifeYears || 0,
        residualPercentage: asset.residualPercentage || 0,
        depreciationMethod: asset.depreciationMethod || '',
        sivDate: asset.sivDate ? asset.sivDate.toISOString().split('T')[0] : '',
        grnDate: asset.grnDate ? asset.grnDate.toISOString().split('T')[0] : '',
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
        age: parseFloat(assetAgeYears.toFixed(1)),
        depreciationRate: parseFloat(depreciationRate.toFixed(1)),
        calculatedSalvageValue: asset.salvageValue || (asset.residualPercentage ? ((asset.unitPrice || 0) * asset.residualPercentage / 100) : 0),
        // Add book value based on filters
        ...(year && month ? { bookValue: bookValueMap[asset.id] ?? null } : {}),
        ...(year && !month ? { bookValuesByMonth: bookValuesByAsset[asset.id] || {} } : {}),
        // Add current book value when no year/month filter
        ...(!year && !month ? {
          currentBookValue: (() => {
            try {
              if (!sivDate || !asset.unitPrice) return asset.unitPrice || 0;
              
              const { calculateMonthlyDepreciation } = require('@/utils/depreciation');
              const depreciationInput = {
                unitPrice: asset.unitPrice,
                sivDate: sivDate.toISOString().split('T')[0],
                usefulLifeYears: asset.usefulLifeYears || 5,
                salvageValue: asset.salvageValue || (asset.unitPrice * (asset.residualPercentage || 0) / 100),
                method: asset.depreciationMethod || 'STRAIGHT_LINE',
                residualPercentage: asset.residualPercentage || 0
              };
              
              const monthlyResults = calculateMonthlyDepreciation(depreciationInput);
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth() + 1;
              
              let latestBookValue = asset.unitPrice;
              for (const result of monthlyResults) {
                if (result.year < currentYear || (result.year === currentYear && result.month <= currentMonth)) {
                  latestBookValue = result.bookValue;
                } else {
                  break;
                }
              }
              
              return latestBookValue;
            } catch (error) {
              console.warn('Error calculating current book value for export:', error.message);
              return asset.currentValue || asset.unitPrice || 0;
            }
          })()
        } : {})
      };
    });

    console.log(`🔍 Export API Debug: Returning ${formattedAssets.length} formatted assets for export`);

    return Response.json({
      success: true,
      assets: formattedAssets,
      totalCount: formattedAssets.length,
      filters: {
        year,
        month,
        category,
        currentDepartment,
        location,
        status,
        depreciationMethod,
        depreciationStatus,
        assetAge,
        usefulLifeRange,
        residualPercentageRange
      }
    });

  } catch (error) {
    console.error('Export API Error:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to fetch export data',
      details: error.message 
    }, { status: 500 });
  }
});
