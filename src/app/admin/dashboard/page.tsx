'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadList from '../../../components/LoadList';
import AddLoadForm from '../../../components/AddLoadForm';
import UserFilter from '../../../components/UserFilter';

export default function AdminDashboard() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filteredUserIds, setFilteredUserIds] = useState<number[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleSelectLoad = (loadNumber: string) => {
    router.push(`/admin/load/${encodeURIComponent(loadNumber)}`);
  };

  const handleLoadCreated = () => {
    setShowAddForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-4 sm:py-6 space-y-4 lg:space-y-0 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <img 
                src="/secured-linq-logo.jpg" 
                alt="Secured Linq Logo" 
                className="h-8 w-auto sm:h-10 lg:h-12 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">SecureLinQ Dashboard</h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">Secure management of loads and media</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
              <div className="w-full sm:w-auto min-w-0 sm:min-w-[200px]">
                <UserFilter onFilterChange={setFilteredUserIds} />
               </div>
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span className="sm:hidden">Add</span>
                  <span className="hidden sm:inline">Add New Load</span>
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isLoggingOut 
                      ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  {isLoggingOut ? (
                    <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-gray-300 border-t-transparent rounded-full mr-2"></div>
                  ) : (
                    <svg className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="sm:hidden">{isLoggingOut ? 'Logging out...' : 'Out'}</span>
                  <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
                    Loads Overview
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Manage all loads and their associated media files
                  </p>
                </div>
              </div>
            </div>
          </div>

          <LoadList 
            onSelectLoad={handleSelectLoad} 
            refreshTrigger={refreshTrigger}
            filteredUserIds={filteredUserIds}
          />
        </div>
      </main>

      {showAddForm && (
        <AddLoadForm 
          onLoadCreated={handleLoadCreated}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
} 