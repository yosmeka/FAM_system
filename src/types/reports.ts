// Common Types
export type ChartType = 'bar' | 'line' | 'pie' | 'heatmap';

export interface ChartDataPoint {
  name?: string;
  value: number;
  label?: string;
  category?: string;
  date?: string;
}

export interface ChartSeries {
  name: string;
  data: number[];
}

// Asset Reports
export interface AssetStats {
  totalAssets: number;
  totalValue: number;
  activeAssets: number;
  maintenanceCost: number;
  totalDepreciation: number;
  assetGrowth: number;
  valueGrowth: number;
}

export interface AssetCategoryData {
  category: string;
  count: number;
  value: number;
  status?: string;
}

export interface AssetStatusData {
  status: string;
  count: number;
}

export interface AssetValueData {
  month: string;
  value: number;
  depreciation: number;
}

export interface AssetDepartmentData {
  department: string;
  count: number;
}

export interface DepreciationData {
  month: string;
  bookValue: number;
  depreciation: number;
}

// Audit Reports
export interface AuditStats {
  totalAudits: number;
  completedAudits: number;
  pendingAudits: number;
  failedAudits: number;
  needsReviewAudits: number;
  totalDiscrepancies: number;
  unresolvedDiscrepancies: number;
  complianceRate: number;
  avgAuditFrequency: number;
  overdueAudits: number;
  auditGrowth: number;
  avgResolutionTime: number;
}

export interface AuditStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface AuditConditionData {
  condition: string;
  count: number;
  percentage: number;
}

export interface AuditDepartmentData {
  department: string;
  totalAudits: number;
  completedAudits: number;
  complianceRate: number;
  discrepancies: number;
}

export interface AuditTrendData {
  month: string;
  totalAudits: number;
  completedAudits: number;
  discrepancies: number;
  complianceRate: number;
}

export interface AuditAssetData {
  assetId: string;
  assetName: string;
  serialNumber: string;
  department: string;
  category: string;
  totalAudits: number;
  lastAuditDate: string | null;
  nextAuditDate: string | null;
  condition: string;
  discrepancies: number;
  isOverdue: boolean;
}

export interface AuditDiscrepancyData {
  id: string;
  assetName: string;
  auditDate: string;
  discrepancy: string;
  resolved: boolean;
  resolvedDate: string | null;
  daysPending: number;
}

// Maintenance Reports
export interface MaintenanceStats {
  totalRequests: number;
  pendingRequests: number;
  avgResolutionDays: number;
  completionRate: number;
  requestGrowth: number;
}

export interface MaintenanceStatusData {
  status: string;
  count: number;
}

export interface MaintenanceTrendData {
  month: string;
  count: number;
  completed: number;
}

export interface MaintenanceAssetData {
  name: string;
  totalRequests: number;
  lastMaintenance: string | null;
  averageCost: number | null;
  status: 'Due' | 'OK';
}

// Transfer Reports
export interface TransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  avgProcessingDays: number;
  approvalRate: number;
  transferGrowth: number;
}

export interface LocationTransferData {
  fromLocation: string;
  toLocation: string;
  count: number;
}

export interface TransferTrendData {
  month: string;
  count: number;
  approved: number;
}

export interface DepartmentTransferData {
  department: string;
  outgoing: number;
  incoming: number;
  avgProcessingDays: number;
}

// Disposal Reports
export interface DisposalStats {
  totalDisposals: number;
  pendingDisposals: number;
  approvedDisposals: number;
  rejectedDisposals: number;
  disposalGrowth: number;
}

export interface DisposalMethodData {
  method: string;
  count: number;
}

export interface DisposalTrendData {
  month: string;
  approved: number;
  rejected: number;
}

export interface ValueRecoveryData {
  month: string;
  expected: number;
  actual: number;
  rate?: number;
}

// Component Props Types
export interface RoleBasedBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'default';
}

export interface RoleBasedStatsProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  description?: string;
  variant?: 'success' | 'warning' | 'danger' | 'default';
}

export interface RoleBasedChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  options: {
    labels?: string[];
    values?: number[];
    xAxis?: string[];
    yAxis?: number[];
    series?: ChartSeries[];
  };
}

export interface RoleBasedCardProps {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface Column<T> {
  key: keyof T;
  header: string;
  permission?: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  className?: string;
}
