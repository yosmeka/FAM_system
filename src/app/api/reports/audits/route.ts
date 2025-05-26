import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// GET /api/reports/audits
export const GET = withRole(['ADMIN', 'MANAGER', 'USER'], async function GET() {
  try {
    console.log("Audit reports API called");
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch all audit records with asset information
    console.log("Fetching audit data...");
    const allAudits = await prisma.assetAudit.findMany({
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            category: true,
            status: true,
            lastAuditDate: true,
            nextAuditDate: true,
          },
        },
      },
      orderBy: {
        auditDate: 'desc',
      },
    });

    console.log(`Found ${allAudits.length} audit records`);

    if (allAudits.length === 0) {
      return NextResponse.json({
        stats: {
          totalAudits: 0,
          completedAudits: 0,
          pendingAudits: 0,
          failedAudits: 0,
          needsReviewAudits: 0,
          totalDiscrepancies: 0,
          unresolvedDiscrepancies: 0,
          complianceRate: 0,
          avgAuditFrequency: 0,
          overdueAudits: 0,
          auditGrowth: 0,
          avgResolutionTime: 0,
        },
        statusDistribution: [],
        conditionDistribution: [],
        departmentDistribution: [],
        monthlyTrends: [],
        topAssets: [],
        overdueAssets: [],
        recentDiscrepancies: [],
      });
    }

    // Calculate basic statistics
    const totalAudits = allAudits.length;
    const completedAudits = allAudits.filter(audit => audit.status === 'COMPLETED').length;
    const pendingAudits = allAudits.filter(audit => audit.status === 'PENDING').length;
    const failedAudits = allAudits.filter(audit => audit.status === 'FAILED').length;
    const needsReviewAudits = allAudits.filter(audit => audit.status === 'NEEDS_REVIEW').length;

    // Discrepancy statistics
    const auditsWithDiscrepancies = allAudits.filter(audit =>
      audit.discrepancies && audit.discrepancies.trim().length > 0
    );
    const totalDiscrepancies = auditsWithDiscrepancies.length;
    const unresolvedDiscrepancies = auditsWithDiscrepancies.filter(audit =>
      !audit.discrepancyResolved
    ).length;

    // Compliance rate (completed audits / total audits)
    const complianceRate = totalAudits > 0 ? (completedAudits / totalAudits) * 100 : 0;

    // Current month's audits
    const currentMonthAudits = allAudits.filter(
      audit => new Date(audit.auditDate) >= new Date(now.getFullYear(), now.getMonth(), 1)
    ).length;

    // Last month's audits
    const lastMonthAudits = allAudits.filter(
      audit => {
        const auditDate = new Date(audit.auditDate);
        return auditDate >= new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1) &&
               auditDate < new Date(now.getFullYear(), now.getMonth(), 1);
      }
    ).length;

    // Audit growth calculation
    const auditGrowth = lastMonthAudits > 0
      ? ((currentMonthAudits - lastMonthAudits) / lastMonthAudits) * 100
      : currentMonthAudits > 0 ? 100 : 0;

    // Calculate average resolution time for resolved discrepancies
    const resolvedDiscrepancies = auditsWithDiscrepancies.filter(audit =>
      audit.discrepancyResolved && audit.resolvedDate
    );

    let avgResolutionTime = 0;
    if (resolvedDiscrepancies.length > 0) {
      const totalResolutionDays = resolvedDiscrepancies.reduce((sum, audit) => {
        const auditDate = new Date(audit.auditDate);
        const resolvedDate = new Date(audit.resolvedDate!);
        const diffTime = Math.abs(resolvedDate.getTime() - auditDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      avgResolutionTime = totalResolutionDays / resolvedDiscrepancies.length;
    }

    // Get all assets to check for overdue audits
    const allAssets = await prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        serialNumber: true,
        department: true,
        category: true,
        nextAuditDate: true,
        lastAuditDate: true,
      },
    });

    // Count overdue audits
    const overdueAssets = allAssets.filter(asset => {
      if (!asset.nextAuditDate) return false;
      return new Date(asset.nextAuditDate) < now;
    });
    const overdueAudits = overdueAssets.length;

    // Calculate average audit frequency (days between audits)
    let avgAuditFrequency = 0;
    const assetsWithMultipleAudits = await prisma.asset.findMany({
      where: {
        audits: {
          some: {},
        },
      },
      include: {
        audits: {
          orderBy: {
            auditDate: 'desc',
          },
          take: 2,
        },
      },
    });

    if (assetsWithMultipleAudits.length > 0) {
      let totalDaysBetweenAudits = 0;
      let validIntervals = 0;

      assetsWithMultipleAudits.forEach(asset => {
        if (asset.audits.length >= 2) {
          const latestAudit = new Date(asset.audits[0].auditDate);
          const previousAudit = new Date(asset.audits[1].auditDate);
          const diffTime = Math.abs(latestAudit.getTime() - previousAudit.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDaysBetweenAudits += diffDays;
          validIntervals++;
        }
      });

      if (validIntervals > 0) {
        avgAuditFrequency = totalDaysBetweenAudits / validIntervals;
      }
    }

    // Status distribution
    const statusDistribution = [
      { status: 'COMPLETED', count: completedAudits, percentage: (completedAudits / totalAudits) * 100 },
      { status: 'PENDING', count: pendingAudits, percentage: (pendingAudits / totalAudits) * 100 },
      { status: 'FAILED', count: failedAudits, percentage: (failedAudits / totalAudits) * 100 },
      { status: 'NEEDS_REVIEW', count: needsReviewAudits, percentage: (needsReviewAudits / totalAudits) * 100 },
    ].filter(item => item.count > 0);

    // Condition distribution
    const conditionCounts = allAudits.reduce((acc, audit) => {
      acc[audit.condition] = (acc[audit.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const conditionDistribution = Object.entries(conditionCounts).map(([condition, count]) => ({
      condition,
      count,
      percentage: (count / totalAudits) * 100,
    }));

    // Department distribution
    const departmentCounts = allAudits.reduce((acc, audit) => {
      const dept = audit.asset?.department || 'Unknown';
      if (!acc[dept]) {
        acc[dept] = {
          totalAudits: 0,
          completedAudits: 0,
          discrepancies: 0,
        };
      }
      acc[dept].totalAudits++;
      if (audit.status === 'COMPLETED') {
        acc[dept].completedAudits++;
      }
      if (audit.discrepancies && audit.discrepancies.trim().length > 0) {
        acc[dept].discrepancies++;
      }
      return acc;
    }, {} as Record<string, { totalAudits: number; completedAudits: number; discrepancies: number }>);

    const departmentDistribution = Object.entries(departmentCounts).map(([department, data]) => ({
      department,
      totalAudits: data.totalAudits,
      completedAudits: data.completedAudits,
      complianceRate: data.totalAudits > 0 ? (data.completedAudits / data.totalAudits) * 100 : 0,
      discrepancies: data.discrepancies,
    }));

    // Monthly trends for the past 12 months
    const monthlyTrends = new Map<string, {
      totalAudits: number;
      completedAudits: number;
      discrepancies: number;
    }>();

    // Initialize all months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyTrends.set(monthKey, {
        totalAudits: 0,
        completedAudits: 0,
        discrepancies: 0,
      });
    }

    // Populate with actual data
    allAudits.forEach(audit => {
      const auditDate = new Date(audit.auditDate);
      if (auditDate >= oneYearAgo) {
        const monthKey = auditDate.toISOString().slice(0, 7);
        const monthData = monthlyTrends.get(monthKey);
        if (monthData) {
          monthData.totalAudits++;
          if (audit.status === 'COMPLETED') {
            monthData.completedAudits++;
          }
          if (audit.discrepancies && audit.discrepancies.trim().length > 0) {
            monthData.discrepancies++;
          }
        }
      }
    });

    const formattedMonthlyTrends = Array.from(monthlyTrends.entries()).map(([month, data]) => ({
      month,
      totalAudits: data.totalAudits,
      completedAudits: data.completedAudits,
      discrepancies: data.discrepancies,
      complianceRate: data.totalAudits > 0 ? (data.completedAudits / data.totalAudits) * 100 : 0,
    }));

    // Top assets by audit frequency
    const assetAuditCounts = allAudits.reduce((acc, audit) => {
      const assetId = audit.asset?.id || 'unknown';
      if (!acc[assetId]) {
        acc[assetId] = {
          assetId,
          assetName: audit.asset?.name || 'Unknown',
          serialNumber: audit.asset?.serialNumber || 'Unknown',
          department: audit.asset?.department || 'Unknown',
          category: audit.asset?.category || 'Unknown',
          totalAudits: 0,
          lastAuditDate: null as string | null,
          nextAuditDate: audit.asset?.nextAuditDate?.toISOString() || null,
          condition: audit.condition,
          discrepancies: 0,
          isOverdue: false,
        };
      }
      acc[assetId].totalAudits++;
      acc[assetId].discrepancies += (audit.discrepancies && audit.discrepancies.trim().length > 0) ? 1 : 0;

      // Update last audit date if this audit is more recent
      if (!acc[assetId].lastAuditDate || new Date(audit.auditDate) > new Date(acc[assetId].lastAuditDate!)) {
        acc[assetId].lastAuditDate = audit.auditDate.toISOString();
        acc[assetId].condition = audit.condition;
      }

      return acc;
    }, {} as Record<string, any>);

    // Check for overdue status
    Object.values(assetAuditCounts).forEach((asset: any) => {
      if (asset.nextAuditDate) {
        asset.isOverdue = new Date(asset.nextAuditDate) < now;
      }
    });

    const topAssets = Object.values(assetAuditCounts)
      .sort((a: any, b: any) => b.totalAudits - a.totalAudits)
      .slice(0, 10);

    // Overdue assets
    const overdueAssetsList = Object.values(assetAuditCounts)
      .filter((asset: any) => asset.isOverdue)
      .sort((a: any, b: any) => new Date(a.nextAuditDate).getTime() - new Date(b.nextAuditDate).getTime())
      .slice(0, 10);

    // Recent unresolved discrepancies
    const recentDiscrepancies = auditsWithDiscrepancies
      .filter(audit => !audit.discrepancyResolved)
      .sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime())
      .slice(0, 10)
      .map(audit => {
        const auditDate = new Date(audit.auditDate);
        const daysPending = Math.floor((now.getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: audit.id,
          assetName: audit.asset?.name || 'Unknown',
          auditDate: audit.auditDate.toISOString(),
          discrepancy: audit.discrepancies || '',
          resolved: audit.discrepancyResolved,
          resolvedDate: audit.resolvedDate?.toISOString() || null,
          daysPending,
        };
      });

    return NextResponse.json({
      stats: {
        totalAudits,
        completedAudits,
        pendingAudits,
        failedAudits,
        needsReviewAudits,
        totalDiscrepancies,
        unresolvedDiscrepancies,
        complianceRate: Math.round(complianceRate * 10) / 10,
        avgAuditFrequency: Math.round(avgAuditFrequency),
        overdueAudits,
        auditGrowth: Math.round(auditGrowth * 10) / 10,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      },
      statusDistribution,
      conditionDistribution,
      departmentDistribution,
      monthlyTrends: formattedMonthlyTrends,
      topAssets,
      overdueAssets: overdueAssetsList,
      recentDiscrepancies,
    });

  } catch (error) {
    console.error('Error generating audit reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate audit reports', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
