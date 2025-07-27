'use client';

import { useState, useEffect } from 'react';
import { S3Media } from '../../lib/db';
import MediaModal from './MediaModal';

interface MediaViewerProps {
  loadNumber: string;
  refreshTrigger?: number;
}

export default function MediaViewer({ loadNumber, refreshTrigger }: MediaViewerProps) {
  const [media, setMedia] = useState<S3Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<S3Media | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, [loadNumber, refreshTrigger]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      
      if (!loadNumber) {
        throw new Error('Load number is required');
      }

      const apiUrl = `/api/media?loadNumber=${encodeURIComponent(loadNumber)}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch media');
      }
      
      const data = await response.json();
      setMedia(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaClick = (mediaItem: S3Media) => {
    setSelectedMedia(mediaItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMedia(null);
  };

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
          onClick={fetchMedia}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Media Found</h3>
        <p>No images or videos are associated with load {loadNumber} yet.</p>
      </div>
    );
  }

  const images = media.filter(item => item.type === 'image');
  const videos = media.filter(item => item.type === 'video');

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
            <h4 className="text-base sm:text-lg font-medium text-gray-900">Load Media - {loadNumber}</h4>
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 self-start">
              {images.length} images, {videos.length} videos
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-3 sm:gap-4">
            {/* Render Images */}
            {images.map((item, index) => (
              <div key={`img-${item.id}`} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                    {item.step ? `Step ${item.step} - Image` : `Image ${index + 1}`}
                  </h5>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {(item.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <div className="relative">
                  <div 
                    className="w-full h-36 sm:h-44 md:h-40 lg:h-48 xl:h-52 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-colors flex items-center justify-center overflow-hidden"
                    onClick={() => handleMediaClick(item)}
                  >
                    <img
                      src={item.signedUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ display: 'block' }}
                      onLoad={(e) => {
                        console.log('Image loaded:', item.fileName);
                        // Show the image by ensuring it's visible
                        const target = e.target as HTMLImageElement;
                        target.style.opacity = '1';
                      }}
                      onError={(e) => {
                        console.error('Image failed to load:', item.fileName, item.signedUrl);
                        // Hide the broken image and show placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                              <svg class="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              <span class="text-xs sm:text-sm">Image unavailable</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {/* Render Videos */}
            {videos.map((item, index) => (
              <div key={`vid-${item.id}`} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                    {item.step ? `Step ${item.step} - Video` : `Video ${index + 1}`}
                  </h5>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {(item.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <div className="relative">
                  <div 
                    className="w-full h-36 sm:h-44 md:h-40 lg:h-48 xl:h-52 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-colors flex items-center justify-center overflow-hidden"
                    onClick={() => handleMediaClick(item)}
                  >
                    <video
                      src={item.signedUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      onLoadedData={() => {
                        console.log('Video loaded:', item.fileName);
                      }}
                      onError={(e) => {
                        console.error('Video failed to load:', item.fileName, item.signedUrl);
                        // Hide the broken video and show placeholder
                        const target = e.target as HTMLVideoElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                              <svg class="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                              </svg>
                              <span class="text-xs sm:text-sm">Video unavailable</span>
                            </div>
                          `;
                        }
                      }}
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black bg-opacity-50 rounded-full p-2 sm:p-3">
                        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      <MediaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mediaItem={selectedMedia}
      />
    </>
  );
} 
