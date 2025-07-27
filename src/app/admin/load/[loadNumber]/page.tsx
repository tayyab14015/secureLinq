'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MediaViewer from '../../../../components/MediaViewer';
import MeetingLinkGenerator from '../../../../components/MeetingLinkGenerator';
// import RecordingsList from '../../../../components/RecordingsList';

interface Load {
  ID: number;
  userId: number;
  loadNumber: string;
  status?: string;
  userName?: string;
}

interface LoadPageParams {
  params: Promise<{
    loadNumber: string;
  }>;
}

export default function LoadPage({ params }: LoadPageParams) {
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { loadNumber } = use(params);

  const fetchLoad = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!loadNumber) {
        throw new Error('Load number is required');
      }

      // Fetch load details by loadNumber
      const response = await fetch(`/api/loads?loadNumber=${encodeURIComponent(loadNumber)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Load not found');
        }
        throw new Error('Failed to fetch load details');
      }
      
      const data = await response.json();
      setLoad(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoad(null);
    } finally {
      setLoading(false);
    }
  }, [loadNumber]);

  useEffect(() => {
    fetchLoad();
  }, [fetchLoad]);

  const handleBack = () => {
    setIsNavigating(true);
    router.push('/admin/dashboard');
  };

  // Simplified approach - no complex call handling needed

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={fetchLoad}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      disabled={isNavigating}
                      className={`px-2 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        isNavigating 
                          ? 'bg-red-50 text-red-400 cursor-not-allowed' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                      onClick={handleBack}
                    >
                      {isNavigating ? (
                        <div className="flex items-center">
                          <div className="animate-spin h-3 w-3 border border-red-400 border-t-transparent rounded-full mr-2"></div>
                          Loading...
                        </div>
                      ) : (
                        'Back to Dashboard'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!load) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Load not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The load &ldquo;{loadNumber}&rdquo; could not be found.
            </p>
            <div className="mt-6">
              <button
                type="button"
                disabled={isNavigating}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isNavigating 
                    ? 'text-gray-300 bg-gray-400 cursor-not-allowed' 
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={handleBack}
              >
                {isNavigating ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  'Back to Dashboard'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 sm:py-6">
            <button
              onClick={handleBack}
              disabled={isNavigating}
              className={`mr-3 sm:mr-4 p-2 rounded-md ${
                isNavigating 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isNavigating ? (
                <div className="h-5 w-5 sm:h-6 sm:w-6 animate-spin border-2 border-gray-300 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              )}
            </button>
            <img 
              src="/secured-linq-logo.jpg" 
              alt="Secured Linq Logo" 
              className="h-8 w-auto sm:h-10 mr-3 sm:mr-4"
            />
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Load #{load.loadNumber}</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                User: {load.userName || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Single Column Layout on Mobile, Two Column on Desktop */}
          <div className="grid grid-cols-1 xl:grid-cols-6 gap-4 sm:gap-6">
            {/* Video Meeting Section */}
            <div className="xl:col-span-2 order-2 xl:order-1">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-4 sm:px-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Video Meeting</h2>
                  <MeetingLinkGenerator
                    loadId={load.ID}
                    loadNumber={load.loadNumber}
                    userName={load.userName || 'Unknown'}
                  />
                </div>
              </div>
            </div>

            {/* Load Media Section */}
            <div className="xl:col-span-4 order-1 xl:order-2">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-4 sm:px-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Load Media</h2>
                  <MediaViewer loadNumber={load.loadNumber} />
                </div>
              </div>
            </div>
          </div>

          {/* Recordings Section */}
          {/* <RecordingsList loadId={load.ID} /> */}
        </div>
      </main>
    </div>
  );
} 