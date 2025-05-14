"use client";
import React from "react";
import { Bar, Line } from "react-chartjs-2";

export function AdminCharts({ userGrowth, permissionAssignments }: { userGrowth: any[], permissionAssignments: any[] }) {
  // Prepare user growth data
  const userGrowthData = {
    labels: userGrowth.map((d) => `${d.month}/${d.year}`),
    datasets: [
      {
        label: "User Registrations",
        data: userGrowth.map((d) => d.count),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };
  // Prepare permission assignments data
  const permissionAssignmentsData = {
    labels: permissionAssignments.map((d) => `${d.month}/${d.year}`),
    datasets: [
      {
        label: "Permissions Assigned",
        data: permissionAssignments.map((d) => d.count),
        backgroundColor: "rgba(255, 206, 86, 0.6)",
        borderColor: "rgba(255, 206, 86, 1)",
        borderWidth: 1,
      },
    ],
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto mb-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">User Growth (Last 12 Months)</h3>
        <Bar data={userGrowthData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-2 text-yellow-700 dark:text-yellow-300">Permission Assignments (Last 12 Months)</h3>
        <Line data={permissionAssignmentsData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
    </div>
  );
}
