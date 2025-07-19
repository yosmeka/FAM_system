// 'use client';

// import React from 'react';
// import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
// import { RoleBasedChart } from '@/components/ui/RoleBasedChart';

// interface DepreciationByMethod {
//   method: string;
//   count: number;
//   totalValue: number;
//   totalBookValue: number;
//   totalDepreciation: number;
//   averageDepreciationRate: number;
// }

// interface DepreciationAnalyticsProps {
//   stats: {
//     totalCurrentBookValue: number;
//     totalAccumulatedDepreciation: number;
//     averageDepreciationRate: number;
//     assetsActivelyDepreciating: number;
//     assetsFullyDepreciated: number;
//     assetsNotStarted: number;
//     depreciationEndingIn12Months: number;
//     depreciationByMethod: DepreciationByMethod[];
//     totalPurchaseValue: number;
//   };
//   className?: string;
// }

// export function DepreciationAnalytics({ stats, className = '' }: DepreciationAnalyticsProps) {
//   // Calculate additional metrics
//   const totalAssets = stats.assetsActivelyDepreciating + stats.assetsFullyDepreciated + stats.assetsNotStarted;
//   const depreciationProgress = stats.totalPurchaseValue > 0 ? 
//     (stats.totalAccumulatedDepreciation / stats.totalPurchaseValue) * 100 : 0;
  
//   // Prepare chart data for depreciation by method
//   const methodChartData = stats.depreciationByMethod.map(method => ({
//     name: method.method.replace('_', ' '),
//     value: method.count,
//     totalValue: method.totalValue,
//     averageRate: method.averageDepreciationRate
//   }));

//   // Prepare status distribution data
//   const statusData = [
//     { name: 'Actively Depreciating', value: stats.assetsActivelyDepreciating, color: '#10B981' },
//     { name: 'Fully Depreciated', value: stats.assetsFullyDepreciated, color: '#EF4444' },
//     { name: 'Not Started', value: stats.assetsNotStarted, color: '#F59E0B' }
//   ];

//   return (
//     <div className={`space-y-6 ${className}`}>
//       {/* Depreciation Overview Cards */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <RoleBasedStats
//           name="Current Book Value"
//           value={new Intl.NumberFormat('en-US', {
//             style: 'currency',
//             currency: 'USD',
//             maximumFractionDigits: 0
//           }).format(stats.totalCurrentBookValue)}
//           trend={depreciationProgress}
//           trendLabel="depreciated"
//           variant="info"
//           className="bg-white dark:bg-gray-800"
//         />
        
//         <RoleBasedStats
//           name="Accumulated Depreciation"
//           value={new Intl.NumberFormat('en-US', {
//             style: 'currency',
//             currency: 'USD',
//             maximumFractionDigits: 0
//           }).format(stats.totalAccumulatedDepreciation)}
//           trend={stats.averageDepreciationRate}
//           trendLabel="avg rate"
//           variant="warning"
//           className="bg-white dark:bg-gray-800"
//         />
        
//         <RoleBasedStats
//           name="Actively Depreciating"
//           value={stats.assetsActivelyDepreciating}
//           trend={totalAssets > 0 ? (stats.assetsActivelyDepreciating / totalAssets) * 100 : 0}
//           trendLabel="of total assets"
//           variant="success"
//           className="bg-white dark:bg-gray-800"
//         />
        
//         <RoleBasedStats
//           name="Ending Soon"
//           value={stats.depreciationEndingIn12Months}
//           trend={stats.assetsActivelyDepreciating > 0 ? 
//             (stats.depreciationEndingIn12Months / stats.assetsActivelyDepreciating) * 100 : 0}
//           trendLabel="of active assets"
//           variant="danger"
//           className="bg-white dark:bg-gray-800"
//         />
//       </div>

//       {/* Charts Section */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Depreciation Status Distribution */}
//         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
//           <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
//             📊 Depreciation Status Distribution
//           </h3>
//           <RoleBasedChart
//             type="doughnut"
//             data={{
//               labels: statusData.map(item => item.name),
//               datasets: [{
//                 data: statusData.map(item => item.value),
//                 backgroundColor: statusData.map(item => item.color),
//                 borderWidth: 2,
//                 borderColor: '#ffffff'
//               }]
//             }}
//             options={{
//               responsive: true,
//               maintainAspectRatio: false,
//               plugins: {
//                 legend: {
//                   position: 'bottom' as const,
//                   labels: {
//                     padding: 20,
//                     usePointStyle: true
//                   }
//                 },
//                 tooltip: {
//                   callbacks: {
//                     label: function(context: any) {
//                       const total = statusData.reduce((sum, item) => sum + item.value, 0);
//                       const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : '0';
//                       return `${context.label}: ${context.raw} (${percentage}%)`;
//                     }
//                   }
//                 }
//               }
//             }}
//             height={300}
//           />
//         </div>

//         {/* Assets by Depreciation Method */}
//         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
//           <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
//             🔧 Assets by Depreciation Method
//           </h3>
//           <RoleBasedChart
//             type="bar"
//             data={{
//               labels: methodChartData.map(item => item.name),
//               datasets: [{
//                 label: 'Number of Assets',
//                 data: methodChartData.map(item => item.value),
//                 backgroundColor: 'rgba(239, 68, 68, 0.8)',
//                 borderColor: 'rgba(239, 68, 68, 1)',
//                 borderWidth: 1
//               }]
//             }}
//             options={{
//               responsive: true,
//               maintainAspectRatio: false,
//               plugins: {
//                 legend: {
//                   display: false
//                 },
//                 tooltip: {
//                   callbacks: {
//                     afterLabel: function(context: any) {
//                       const methodData = methodChartData[context.dataIndex];
//                       return [
//                         `Total Value: $${methodData.totalValue.toLocaleString()}`,
//                         `Avg Rate: ${methodData.averageRate.toFixed(1)}%`
//                       ];
//                     }
//                   }
//                 }
//               },
//               scales: {
//                 y: {
//                   beginAtZero: true,
//                   ticks: {
//                     stepSize: 1
//                   }
//                 }
//               }
//             }}
//             height={300}
//           />
//         </div>
//       </div>

//       {/* Detailed Method Breakdown Table */}
//       <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
//         <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
//           📋 Depreciation Method Analysis
//         </h3>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
//             <thead className="bg-gray-50 dark:bg-gray-700">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
//                   Method
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
//                   Assets
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
//                   Total Value
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
//                   Current Book Value
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
//                   Accumulated Depreciation
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
//                   Avg Rate
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
//               {stats.depreciationByMethod.map((method, index) => (
//                 <tr key={method.method} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : ''}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
//                     {method.method.replace(/_/g, ' ')}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
//                     {method.count}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
//                     ${method.totalValue.toLocaleString()}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
//                     ${method.totalBookValue.toLocaleString()}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
//                     ${method.totalDepreciation.toLocaleString()}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
//                     {method.averageDepreciationRate.toFixed(1)}%
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Key Insights */}
//       <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-lg border border-red-200 dark:border-red-700">
//         <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">
//           💡 Key Depreciation Insights
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
//           <div className="space-y-2">
//             <p className="text-red-700 dark:text-red-300">
//               <strong>Portfolio Health:</strong> {depreciationProgress.toFixed(1)}% of original value has been depreciated
//             </p>
//             <p className="text-red-700 dark:text-red-300">
//               <strong>Active Management:</strong> {stats.assetsActivelyDepreciating} assets are currently depreciating
//             </p>
//           </div>
//           <div className="space-y-2">
//             <p className="text-red-700 dark:text-red-300">
//               <strong>Upcoming Actions:</strong> {stats.depreciationEndingIn12Months} assets will complete depreciation within 12 months
//             </p>
//             <p className="text-red-700 dark:text-red-300">
//               <strong>Fully Depreciated:</strong> {stats.assetsFullyDepreciated} assets have reached their salvage value
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
