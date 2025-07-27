'use client';

import { useEffect } from 'react';

interface RecordingsListProps {
  loadId: number;
}

export default function RecordingsList({ loadId }: RecordingsListProps) {
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    //fetchRecordings();
  }, [loadId]);

  // const fetchRecordings = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);

  //     const response = await fetch(`/api/recordings?loadId=${loadId}`);
      
  //     if (!response.ok) {
  //       throw new Error('Failed to fetch recordings');
  //     }

  //     // const data = await response.json();
  //     // setRecordings(data.recordings || []);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to load recordings');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // if (loading) {
  //   return (
  //     <div className="bg-white shadow rounded-lg">
  //       <div className="px-4 py-5 sm:p-6">
  //         <div className="flex justify-center items-center py-8">
  //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // if (error) {
  //   return (
  //     <div className="bg-white shadow rounded-lg">
  //       <div className="px-4 py-5 sm:p-6">
  //         <div className="bg-red-50 border border-red-200 rounded-md p-4">
  //           <div className="flex">
  //             <div className="flex-shrink-0">
  //               <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
  //                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  //               </svg>
  //             </div>
  //             <div className="ml-3">
  //               <h3 className="text-sm font-medium text-red-800">Error Loading Recordings</h3>
  //               <div className="mt-2 text-sm text-red-700">
  //                 <p>{error}</p>
  //               </div>
  //               <div className="mt-4">
  //                 <button
  //                   onClick={fetchRecordings}
  //                   className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
  //                 >
  //                   Try Again
  //                 </button>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // return (
  //   <div className="bg-white shadow rounded-lg">
  //     <div clName="px-4 py-5 sm:p-6">
  //       <div className="sm:flex sm:items-center sm:justify-between">
  //         <div>
  //           <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
  //             Video Recordings
  //           </h3>
  //           <p className="mt-1 max-w-2xl text-sm text-gray-500">
  //             Recorded video calls for this load
  //           </p>
  //         </div>
  //         <div className="mt-4 sm:mt-0">
  //           <button
  //             onClick={fetchRecordings}
  //             className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //           >
  //             <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  //               <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
  //             </svg>
  //             Refresh
  //           </button>
  //         </div>
  //       </div>

  //       {recordings.length === 0 ? (
  //         <div className="mt-6 text-center py-8">
  //           <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  //           </svg>
  //           <h3 className="mt-2 text-sm font-medium text-gray-900">No recordings</h3>
  //           <p className="mt-1 text-sm text-gray-500">
  //             No video recordings have been made for this load yet.
  //           </p>
  //         </div>
  //       ) : (
  //         <div className="mt-6">
  //           <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
  //             <table className="min-w-full divide-y divide-gray-300">
  //               <thead className="bg-gray-50">
  //                 <tr>
  //                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                     Recording
  //                   </th>
  //                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                     Status
  //                   </th>
  //                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                     Duration
  //                   </th>
  //                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                     Size
  //                   </th>
  //                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                     Started
  //                   </th>
  //                   <th scope="col" className="relative px-6 py-3">
  //                     <span className="sr-only">Actions</span>
  //                   </th>
  //                 </tr>
  //               </thead>
  //               <tbody className="bg-white divide-y divide-gray-200">
  //                 {recordings.map((recording) => (
  //                   <tr key={recording.ID}>
  //                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
  //                       {recording.fileName || `Recording ${recording.recordingId}`}
  //                     </td>
  //                     <td className="px-6 py-4 whitespace-nowrap">
  //                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recording.status)}`}>
  //                         {recording.status}
  //                       </span>
  //                     </td>
  //                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  //                       {formatDuration(recording.duration)}
  //                     </td>
  //                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  //                       {formatFileSize(recording.fileSize)}
  //                     </td>
  //                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  //                       {formatDate(recording.startedAt)}
  //                     </td>
  //                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
  //                       {recording.status === 'completed' && recording.fileName && (
  //                         <button
  //                           onClick={() => handleDownload(recording)}
  //                           className="text-blue-600 hover:text-blue-900 hover:underline"
  //                         >
  //                           Download
  //                         </button>
  //                       )}
  //                     </td>
  //                   </tr>
  //                 ))}
  //               </tbody>
  //             </table>
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   </div>
  // );
} 