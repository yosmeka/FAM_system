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

    // Fetch ALL assets (no pagination)
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

    // Simple book value calculations (no complex depreciation for now)
    let bookValueMap = {};
    let monthlyBookValueTotals = {};

    if (year && month) {
      console.log('🔍 API Debug: Year + Month filter - calculating simple book values');
      for (const asset of assets) {
        const unitPrice = asset.unitPrice || 0;
        const currentValue = asset.currentValue || 0;
        // Simple calculation: use current value or estimate
        const bookValue = currentValue > 0 ? currentValue : unitPrice * 0.8; // 80% of original
        bookValueMap[asset.id] = bookValue;
      }
    } else if (year && !month) {
      console.log('🔍 API Debug: Year only filter - calculating monthly book values');
      for (const asset of assets) {
        const unitPrice = asset.unitPrice || 0;
        const monthlyValues = {};
        // Simple monthly calculation
        for (let m = 1; m <= 12; m++) {
          monthlyValues[m] = unitPrice * (0.9 - (m * 0.02)); // Simple depreciation
        }
        bookValueMap[asset.id] = monthlyValues;
      }
      
      // Calculate monthly totals
      for (let m = 1; m <= 12; m++) {
        monthlyBookValueTotals[m] = 0;
        assets.forEach(asset => {
          if (bookValueMap[asset.id] && bookValueMap[asset.id][m]) {
            monthlyBookValueTotals[m] += bookValueMap[asset.id][m];
          }
        });
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

    // Calculate total book value
    let totalBookValue = 0;
    if (year && month) {
      totalBookValue = Object.values(bookValueMap).reduce((sum, value) => sum + (value || 0), 0);
    } else if (year && !month) {
      // Use average of monthly values
      const monthlyTotals = Object.values(monthlyBookValueTotals);
      totalBookValue = monthlyTotals.length > 0 ? monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length : 0;
    } else {
      totalBookValue = totalCurrentValue; // Use current value as book value
    }

    // Get filter options
    const filterOptions = {
      categories: [...new Set(assets.map(asset => asset.category).filter(Boolean))].map(cat => ({ value: cat, label: cat })),
      departments: [...new Set(assets.map(asset => asset.currentDepartment).filter(Boolean))].map(dept => ({ value: dept, label: dept })),
      locations: [...new Set(assets.map(asset => asset.location).filter(Boolean))].map(loc => ({ value: loc, label: loc })),
      depreciationMethods: [...new Set(assets.map(asset => asset.depreciationMethod).filter(Boolean))].map(method => ({ value: method, label: method })),
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
        // Add book value fields based on filters
        ...(year && month ? { bookValue: bookValueMap[asset.id] ?? null } : {}),
        ...(year && !month ? { bookValuesByMonth: bookValueMap[asset.id] || {} } : {}),
        ...(!year && !month ? { currentBookValue: asset.currentValue || asset.unitPrice || 0 } : {})
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
