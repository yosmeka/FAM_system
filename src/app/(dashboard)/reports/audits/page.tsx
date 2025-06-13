"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { RoleBasedStats } from "@/components/ui/RoleBasedStats";
import { RoleBasedChart } from "@/components/ui/RoleBasedChart";
import type {
  AuditStats,
  AuditStatusData,
  AuditConditionData,
  AuditDepartmentData,
  AuditTrendData,
  AuditAssetData,
  AuditDiscrepancyData,
} from "@/types/reports";
import { BackButton } from "@/components/ui/BackButton";

interface AuditReportsData {
  stats: AuditStats;
  statusDistribution: AuditStatusData[];
  conditionDistribution: AuditConditionData[];
  departmentDistribution: AuditDepartmentData[];
  monthlyTrends: AuditTrendData[];
  topAssets: AuditAssetData[];
  overdueAssets: AuditAssetData[];
  recentDiscrepancies: AuditDiscrepancyData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AuditReportsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<AuditReportsData | null>(null);
  const [filterType, setFilterType] = useState<"department" | "category">(
    "department"
  );
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  useEffect(() => {
    fetchAuditReports();
  }, []);

  const fetchAuditReports = async () => {
    try {
      const response = await fetch("/api/reports/audits");
      if (!response.ok) throw new Error("Failed to fetch audit reports");
      const data = await response.json();
      setAuditData(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case "FAILED":
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case "NEEDS_REVIEW":
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "EXCELLENT":
        return "text-green-600 bg-green-100";
      case "GOOD":
        return "text-blue-600 bg-blue-100";
      case "FAIR":
        return "text-yellow-600 bg-yellow-100";
      case "POOR":
        return "text-orange-600 bg-orange-100";
      case "CRITICAL":
        return "text-red-600 bg-red-100";
      case "MISSING":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!auditData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Audit Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen bg-white dark:bg-gray-900">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <BackButton
            href="/reports"
            className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Audit Reports Dashboard
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive audit analytics and compliance tracking
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Audits
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditData.stats.totalAudits}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {auditData.stats.auditGrowth >= 0 ? "+" : ""}
                {auditData.stats.auditGrowth}% vs last month
              </p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Compliance Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditData.stats.complianceRate}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {auditData.stats.completedAudits} of{" "}
                {auditData.stats.totalAudits} completed
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Overdue Audits
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditData.stats.overdueAudits}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Require immediate attention
              </p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Unresolved Issues
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditData.stats.unresolvedDiscrepancies}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Avg resolution: {auditData.stats.avgResolutionTime} days
              </p>
            </div>
            <ExclamationCircleIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Audit Status Distribution */}
        <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Audit Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={auditData.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentage }) =>
                  `${status}: ${percentage.toFixed(1)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {auditData.statusDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Condition Distribution */}
        <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Asset Condition Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={auditData.conditionDistribution}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB dark:stroke-gray-700"
              />
              <XAxis
                dataKey="condition"
                stroke="#6B7280 dark:stroke-gray-400"
              />
              <YAxis stroke="#6B7280 dark:stroke-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF dark:bg-gray-800",
                  border: "none",
                  borderRadius: "8px",
                  color: "#1F2937 dark:text-white",
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="p-6 rounded-lg shadow-lg mb-8 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Audit Trends
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={auditData.monthlyTrends}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB dark:stroke-gray-700"
            />
            <XAxis dataKey="month" stroke="#6B7280 dark:stroke-gray-400" />
            <YAxis stroke="#6B7280 dark:stroke-gray-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF dark:bg-gray-800",
                border: "none",
                borderRadius: "8px",
                color: "#1F2937 dark:text-white",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalAudits"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Total Audits"
            />
            <Line
              type="monotone"
              dataKey="completedAudits"
              stroke="#10B981"
              strokeWidth={2}
              name="Completed Audits"
            />
            <Line
              type="monotone"
              dataKey="discrepancies"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Discrepancies"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Department Performance */}
      <div className="p-6 rounded-lg shadow-lg mb-8 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Department Audit Performance
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={auditData.departmentDistribution}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB dark:stroke-gray-700"
            />
            <XAxis dataKey="department" stroke="#6B7280 dark:stroke-gray-400" />
            <YAxis stroke="#6B7280 dark:stroke-gray-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF dark:bg-gray-800",
                border: "none",
                borderRadius: "8px",
                color: "#1F2937 dark:text-white",
              }}
            />
            <Legend />
            <Bar dataKey="totalAudits" fill="#3B82F6" name="Total Audits" />
            <Bar
              dataKey="completedAudits"
              fill="#10B981"
              name="Completed Audits"
            />
            <Bar dataKey="discrepancies" fill="#F59E0B" name="Discrepancies" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Assets by Audit Frequency */}
        <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Most Audited Assets
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Asset
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Audits
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Condition
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditData.topAssets.slice(0, 8).map((asset, index) => (
                  <tr
                    key={asset.assetId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {asset.assetName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {asset.serialNumber}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                      {asset.totalAudits}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(
                          asset.condition
                        )}`}
                      >
                        {asset.condition}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                      {asset.discrepancies}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Audits */}
        <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Overdue Audits
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Asset
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Department
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Due Date
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditData.overdueAssets.slice(0, 8).map((asset, index) => (
                  <tr
                    key={asset.assetId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {asset.assetName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {asset.serialNumber}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                      {asset.department}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                      {asset.nextAuditDate
                        ? formatDate(asset.nextAuditDate)
                        : "Not set"}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200">
                        OVERDUE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Unresolved Discrepancies */}
      <div className="p-6 rounded-lg shadow-lg mb-8 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Unresolved Discrepancies
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Asset
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Audit Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Discrepancy
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Days Pending
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody>
              {auditData.recentDiscrepancies.map((discrepancy, index) => (
                <tr
                  key={discrepancy.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                    {discrepancy.assetName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                    {formatDate(discrepancy.auditDate)}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-gray-900 dark:text-white max-w-xs truncate"
                    title={discrepancy.discrepancy}
                  >
                    {discrepancy.discrepancy}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                    {discrepancy.daysPending}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        discrepancy.daysPending > 30
                          ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200"
                          : discrepancy.daysPending > 14
                          ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                      }`}
                    >
                      {discrepancy.daysPending > 30
                        ? "HIGH"
                        : discrepancy.daysPending > 14
                        ? "MEDIUM"
                        : "LOW"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
