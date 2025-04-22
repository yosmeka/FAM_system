import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      amount,
      date,
      method,
      usefulLife,
      salvageValue,
      depreciationRate,
      description
    } = body;

    const depreciation = await prisma.depreciation.create({
      data: {
        assetId: params.id,
        amount,
        date: new Date(date),
        method,
        usefulLife,
        salvageValue,
        depreciationRate,
        description,
      },
    });

    return NextResponse.json(depreciation);
  } catch (error) {
    console.error('Error creating depreciation:', error);
    return NextResponse.json(
      { error: 'Failed to create depreciation record' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const depreciations = await prisma.depreciation.findMany({
      where: {
        assetId: params.id,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(depreciations);
  } catch (error) {
    console.error('Error fetching depreciations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch depreciation records' },
      { status: 500 }
    );
  }
}'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

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
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
}

export default function AssetDepreciationPage({ searchParams }: { searchParams: { assetId: string } }) {
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
  const [usefulLife, setUsefulLife] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [depreciationMethod, setDepreciationMethod] = useState<'STRAIGHT_LINE' | 'DECLINING_BALANCE'>('STRAIGHT_LINE');
  const [depreciationRate, setDepreciationRate] = useState<number>(20); // Default 20% for declining balance

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${searchParams.assetId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch asset');
        }
        const data = await response.json();
        setAsset(data);
      } catch (error) {
        toast.error('Failed to fetch asset details');
        console.error('Error fetching asset:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (searchParams.assetId) {
      fetchAsset();
    }
  }, [searchParams.assetId]);

  useEffect(() => {
    if (asset) {
      calculateDepreciation();
    }
  }, [asset, usefulLife, salvageValue, depreciationMethod, depreciationRate]);

  const calculateDepreciation = () => {
    if (!asset) return;

    const results: DepreciationResult[] = [];
    const purchasePrice = asset.purchasePrice;
    
    if (depreciationMethod === 'STRAIGHT_LINE') {
      const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;
      
      for (let year = 1; year <= usefulLife; year++) {
        const bookValue = purchasePrice - (annualDepreciation * year);
        results.push({
          year,
          depreciation: annualDepreciation,
          bookValue: Math.max(bookValue, salvageValue),
          method: 'STRAIGHT_LINE'
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
          method: 'DECLINING_BALANCE'
        });

        if (currentBookValue <= salvageValue) break;
      }
    }

    setDepreciationResults(results);
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
            <p>Purchase Date: {new Date(asset.purchaseDate).toLocaleDateString()}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Depreciation Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Depreciation Method</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={depreciationMethod}
                  onChange={(e) => setDepreciationMethod(e.target.value as 'STRAIGHT_LINE' | 'DECLINING_BALANCE')}
                >
                  <option value="STRAIGHT_LINE">Straight Line</option>
                  <option value="DECLINING_BALANCE">Declining Balance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Useful Life (Years)</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={usefulLife}
                  onChange={(e) => setUsefulLife(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Salvage Value</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={salvageValue}
                  onChange={(e) => setSalvageValue(Number(e.target.value))}
                />
              </div>

              {depreciationMethod === 'DECLINING_BALANCE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Depreciation Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={depreciationRate}
                    onChange={(e) => setDepreciationRate(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            <h2 className="text-xl font-semibold mb-4">Depreciation Schedule</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depreciation</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {depreciationResults.map((result) => (
                  <tr key={result.year}>
                    <td className="px-6 py-4 whitespace-nowrap">{result.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${result.depreciation.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${result.bookValue.toFixed(2)}</td>
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