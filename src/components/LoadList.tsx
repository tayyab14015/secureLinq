'use client';

import { useState, useEffect } from 'react';
import { Load } from '../../lib/db';

interface LoadListProps {
  onSelectLoad: (loadNumber: string) => void;
  refreshTrigger?: number;
  filteredUserIds?: number[];
}

export default function LoadList({ onSelectLoad, refreshTrigger, filteredUserIds }: LoadListProps) {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/loads');
      if (!response.ok) {
        throw new Error('Failed to fetch loads');
      }
      const data = await response.json();
      setLoads(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadClick = (load: Load) => {
    setSelectedLoadId(load.ID);
    onSelectLoad(load.loadNumber);
  };

  useEffect(() => {
    fetchLoads();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchLoads}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filter loads based on selected users
  const filteredLoads = filteredUserIds && filteredUserIds.length > 0 
    ? loads.filter(load => filteredUserIds.includes(load.userId))
    : loads;

  if (loads.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>No loads found. Create your first load to get started.</p>
      </div>
    );
  }

  if (filteredLoads.length === 0 && filteredUserIds && filteredUserIds.length > 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>No loads found for the selected users.</p>
        <p className="text-sm mt-2">Try selecting different users or clear the filter.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">All Loads</h3>
          <span className="text-sm text-gray-500">
            Showing {filteredLoads.length} of {loads.length} loads
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {filteredLoads.map((load) => (
          <div
            key={load.ID}
            className={`px-6 py-4 cursor-pointer transition-colors relative ${
              selectedLoadId === load.ID 
                ? 'bg-blue-50 border-l-4 border-blue-500' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleLoadClick(load)}
          >
            {selectedLoadId === load.ID && (
              <div className="absolute inset-0 bg-blue-50 bg-opacity-75 flex items-center justify-center z-10">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-700 font-medium">Loading...</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Load #{load.loadNumber}
                </h4>
                <p className="text-sm text-gray-500">
                  User: {load.userName || 'Unknown'}
                </p>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ID: {load.ID}
                </span>
                <svg
                  className="ml-2 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 