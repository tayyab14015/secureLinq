'use client';

import { useState } from 'react';

export default function TestDownloadPage() {
  const [recordingId, setRecordingId] = useState('2fb960393447f67a432cc9ace2c897d2');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSignedUrl = async () => {
    setLoading(true);
    setError('');
    setDownloadUrl('');

    try {
      const response = await fetch(`/api/agora/recording/download?recordingId=${recordingId}`);
      const data = await response.json();

      if (data.success) {
        setDownloadUrl(data.downloadUrl);
      } else {
        setError(data.error || 'Failed to generate download URL');
      }
    } catch {
      setError('Failed to generate download URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Recording Download</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="recordingId" className="block text-sm font-medium text-gray-700">
              Recording ID
            </label>
            <input
              type="text"
              id="recordingId"
              value={recordingId}
              onChange={(e) => setRecordingId(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border px-3 py-2"
              placeholder="Enter recording ID"
            />
          </div>

          <button
            onClick={generateSignedUrl}
            disabled={loading || !recordingId}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Download URL'
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {downloadUrl && (
            <div className="space-y-3">
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                ✅ Signed URL generated successfully!
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => window.open(downloadUrl, '_blank')}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  🎥 Open Video in New Tab
                </button>
                
                <div className="text-xs text-gray-500 break-all">
                  <strong>URL:</strong> {downloadUrl.substring(0, 100)}...
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Notes:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Signed URLs expire after 1 hour</li>
            <li>• The recording file must exist in S3</li>
            <li>• You need a valid recording ID from the database</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 