'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface ManagerSelectorProps {
  onSelect: (managerId: string) => void;
  selectedManagerId?: string;
}

export function ManagerSelector({ onSelect, selectedManagerId }: ManagerSelectorProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);

  // Fetch managers on component mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching managers...');

        // Create a dummy list of managers for testing if needed
        const dummyManagers = [
          { id: '1', name: 'Manager 1', email: 'manager1@example.com' },
          { id: '2', name: 'Manager 2', email: 'manager2@example.com' },
        ];

        // Try to fetch from API
        const response = await fetch('/api/managers');
        console.log('Managers API response status:', response.status);

        if (!response.ok) {
          console.warn('Failed to fetch managers from API, using dummy data');
          setManagers(dummyManagers);
          setFilteredManagers(dummyManagers);
          return;
        }

        const data = await response.json();
        console.log('Fetched managers:', data);

        if (Array.isArray(data) && data.length > 0) {
          setManagers(data);
          setFilteredManagers(data);
        } else {
          console.warn('No managers found in API response, using dummy data');
          setManagers(dummyManagers);
          setFilteredManagers(dummyManagers);
        }
      } catch (error) {
        console.error('Error fetching managers:', error);
        // Use dummy data as fallback
        const dummyManagers = [
          { id: '1', name: 'Manager 1', email: 'manager1@example.com' },
          { id: '2', name: 'Manager 2', email: 'manager2@example.com' },
        ];
        setManagers(dummyManagers);
        setFilteredManagers(dummyManagers);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManagers();
  }, []);

  // Set selected manager if selectedManagerId is provided
  useEffect(() => {
    if (selectedManagerId && managers.length > 0) {
      const manager = managers.find(m => m.id === selectedManagerId);
      if (manager) {
        setSelectedManager(manager);
      }
    }
  }, [selectedManagerId, managers]);

  // Filter managers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredManagers(managers);
    } else {
      const filtered = managers.filter(
        manager =>
          manager.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          manager.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredManagers(filtered);
    }
  }, [searchTerm, managers]);

  const handleSelectManager = (manager: Manager) => {
    setSelectedManager(manager);
    onSelect(manager.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label htmlFor="manager" className="block text-sm font-medium text-gray-700 mb-1">
        Assign to Manager *
      </label>

      <div className="relative">
        <div
          className="flex items-center justify-between w-full rounded-md border border-gray-300 shadow-sm p-2 bg-white cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedManager ? (
            <div className="flex items-center">
              <span className="text-sm">{selectedManager.name} ({selectedManager.email})</span>
            </div>
          ) : (
            <span className="text-gray-500">Select a manager</span>
          )}
          <span className="text-gray-400">▼</span>
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 pl-8 py-2 text-sm"
                  placeholder="Search managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading managers...</div>
              ) : filteredManagers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No managers found</div>
              ) : (
                <ul className="py-1">
                  {filteredManagers.map((manager) => (
                    <li
                      key={manager.id}
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                        selectedManager?.id === manager.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectManager(manager)}
                    >
                      <div className="font-medium">{manager.name || 'Unnamed'}</div>
                      <div className="text-gray-500 text-xs">{manager.email}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Show a message if no manager is selected */}
      {!selectedManager && (
        <p className="mt-1 text-sm text-red-500">
          Please select a manager to send your maintenance request to
        </p>
      )}
    </div>
  );
}
