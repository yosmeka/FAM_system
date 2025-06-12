"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Settings } from "lucide-react";
import {
  ManageDepreciationModal,
  DepreciationSettings,
} from "@/components/ManageDepreciationModal";

interface Asset {
  id: string;
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  status: string;
  location: string;
  department: string;
  category: string;
  supplier: string;
  warrantyExpiry: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DepreciationResult {
  year: number;
  depreciation: number;
  bookValue: number;
  method: "STRAIGHT_LINE" | "DECLINING_BALANCE";
}

export default function AssetDepreciationPage() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId") || ""; // fallback to empty string if not provided
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [depreciationResults, setDepreciationResults] = useState<
    DepreciationResult[]
  >([]);
  const [usefulLife, setUsefulLife] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [depreciationMethod, setDepreciationMethod] = useState<
    "STRAIGHT_LINE" | "DECLINING_BALANCE"
  >("STRAIGHT_LINE");
  const [depreciationRate, setDepreciationRate] = useState<number>(20); // Default 20% for declining balance
  const [isManagingDepreciation, setIsManagingDepreciation] = useState(false);
  const [depreciationSettings, setDepreciationSettings] =
    useState<DepreciationSettings>({
      isDepreciable: true,
      depreciableCost: 0,
      salvageValue: 0,
      usefulLifeMonths: 60,
      depreciationMethod: "STRAIGHT_LINE",
      dateAcquired: new Date().toISOString().split("T")[0],
    });

  const fetchAssetAndDepreciation = async () => {
    try {
      // First fetch the asset
      if (!assetId) return;
      const assetResponse = await fetch(`/api/assets/${assetId}`);
      if (!assetResponse.ok) {
        throw new Error("Failed to fetch asset");
      }
      const assetData = await assetResponse.json();
      setAsset(assetData);

      // Then fetch the depreciation data
      const depreciationResponse = await fetch(
        `/api/assets/${assetId}/depreciation`
      );
      if (!depreciationResponse.ok) {
        throw new Error("Failed to fetch depreciation data");
      }
      const depreciationData = await depreciationResponse.json();

      // Update state with the fetched depreciation settings
      setSalvageValue(depreciationData.depreciationSettings.salvageValue);
      setUsefulLife(depreciationData.depreciationSettings.usefulLifeYears);
      setDepreciationMethod(
        depreciationData.depreciationSettings.depreciationMethod ===
          "STRAIGHT_LINE"
          ? "STRAIGHT_LINE"
          : "DECLINING_BALANCE"
      );

      if (
        depreciationData.depreciationSettings.depreciationMethod !==
        "STRAIGHT_LINE"
      ) {
        setDepreciationRate(
          depreciationData.depreciationSettings.depreciationRate || 20
        );
      }

      // Set the depreciation results
      setDepreciationResults(depreciationData.depreciationResults);

      // Update the depreciation settings for the modal
      setDepreciationSettings({
        isDepreciable: true,
        depreciableCost: depreciationData.depreciationSettings.depreciableCost,
        salvageValue: depreciationData.depreciationSettings.salvageValue,
        usefulLifeMonths:
          depreciationData.depreciationSettings.usefulLifeMonths,
        depreciationMethod:
          depreciationData.depreciationSettings.depreciationMethod,
        dateAcquired: new Date(depreciationData.depreciationSettings.startDate)
          .toISOString()
          .split("T")[0],
      });
    } catch (error) {
      toast.error("Failed to fetch asset details");
      console.error("Error fetching asset:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Suppress exhaustive-deps warning for fetchAssetAndDepreciation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    function fetchAssetAndDepreciationEffect() {
      if (assetId) {
        fetchAssetAndDepreciation();
      }
    },
    [assetId]
  );

  // Suppress exhaustive-deps warning for calculateDepreciation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    function calculateDepreciationEffect() {
      if (asset && !isLoading) {
        calculateDepreciation();
      }
    },
    [
      asset,
      isLoading,
      usefulLife,
      salvageValue,
      depreciationMethod,
      depreciationRate,
      assetId,
    ]
  );

  const calculateDepreciation = async () => {
    if (!asset) return;

    try {
      // Call the API with the current settings
      if (!assetId) return;
      const response = await fetch(
        `/api/assets/${assetId}/depreciation?usefulLife=${usefulLife}&salvageValue=${salvageValue}&method=${depreciationMethod}&depreciationRate=${depreciationRate}`
      );

      if (!response.ok) throw new Error("Failed to fetch depreciation data");

      const data = await response.json();
      setDepreciationResults(data.depreciationResults);

      toast.success("Depreciation recalculated successfully");
    } catch (error) {
      console.error("Error calculating depreciation:", error);
      toast.error("Failed to calculate depreciation");

      // Fallback to client-side calculation if API fails
      const results: DepreciationResult[] = [];
      const purchasePrice = asset.purchasePrice;

      if (depreciationMethod === "STRAIGHT_LINE") {
        const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;

        for (let year = 1; year <= usefulLife; year++) {
          const bookValue = purchasePrice - annualDepreciation * year;
          results.push({
            year,
            depreciation: annualDepreciation,
            bookValue: Math.max(bookValue, salvageValue),
            method: "STRAIGHT_LINE",
          });
        }
      } else {
        let currentBookValue = purchasePrice;
        const rate = depreciationRate / 100;

        for (let year = 1; year <= usefulLife; year++) {
          const depreciation = currentBookValue * rate;
          currentBookValue -= depreciation;

          if (currentBookValue < salvageValue) {
            currentBookValue = salvageValue;
          }

          results.push({
            year,
            depreciation,
            bookValue: currentBookValue,
            method: "DECLINING_BALANCE",
          });

          if (currentBookValue <= salvageValue) break;
        }
      }

      setDepreciationResults(results);
    }
  };

  const handleSaveDepreciationSettings = async (
    settings: DepreciationSettings
  ) => {
    if (!asset) return;

    try {
      // Convert months to years for the API
      const usefulLifeYears = Math.ceil(settings.usefulLifeMonths / 12);

      // Call the API with the new settings using PUT method to update the asset
      if (!assetId) return;
      const response = await fetch(
        `/api/assets/${assetId}/depreciation?usefulLife=${usefulLifeYears}&salvageValue=${
          settings.salvageValue
        }&method=${settings.depreciationMethod}&depreciationRate=${
          settings.depreciationMethod === "DOUBLE_DECLINING" ? 40 : 20
        }&depreciableCost=${settings.depreciableCost}&dateAcquired=${
          settings.dateAcquired
        }`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok)
        throw new Error("Failed to update depreciation settings");

      // Refetch asset and depreciation data to ensure UI is up-to-date
      await fetchAssetAndDepreciation();

      // Close the modal
      setIsManagingDepreciation(false);

      toast.success("Depreciation settings updated successfully");
    } catch (error) {
      console.error("Error updating depreciation settings:", error);
      toast.error("Failed to update depreciation settings");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Asset Depreciation Calculator</h1>

      {isLoading ? (
        <div>Loading...</div>
      ) : asset ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Asset Details</h2>
            <p>Name: {asset.name}</p>
            <p>Purchase Price: ${asset.purchasePrice.toFixed(2)}</p>
            <p>
              Purchase Date: {new Date(asset.purchaseDate).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Depreciation Settings</h2>
              <button
                onClick={() => setIsManagingDepreciation(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Manage
              </button>
            </div>
          </div>

          <ManageDepreciationModal
            open={isManagingDepreciation}
            onClose={() => setIsManagingDepreciation(false)}
            onSave={handleSaveDepreciationSettings}
            initialSettings={depreciationSettings}
          />

          <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            <h2 className="text-xl font-semibold mb-4">
              Depreciation Schedule
            </h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depreciation
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Book Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {depreciationResults.map((result) => (
                  <tr key={result.year}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${result.depreciation.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${result.bookValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>Asset not found</div>
      )}
    </div>
  );
}
