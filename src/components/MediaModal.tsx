'use client';

import { useEffect } from 'react';
import { S3Media } from '../../lib/db';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: S3Media | null;
}

export default function MediaModal({ isOpen, onClose, mediaItem }: MediaModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mediaItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - No onClick handler to prevent closing */}
      <div className="absolute inset-0 bg-black bg-opacity-75" />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mediaItem.step ? `Step ${mediaItem.step} - ${mediaItem.type === 'image' ? 'Image' : 'Video'}` : mediaItem.fileName}
            </h3>
            {mediaItem.size && (
              <p className="text-sm text-gray-500">
                Size: {(mediaItem.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media Content */}
        <div className="bg-gray-100 flex items-center justify-center min-h-[400px]">
          {mediaItem.type === 'image' ? (
            <img
              src={mediaItem.signedUrl}
              alt={mediaItem.fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik05MCA2MEgxMTBWMTQwSDkwVjYwWiIgZmlsbD0iIzlBA0E0QiIvPgo8cGF0aCBkPSJNNjAgOTBIMTQwVjExMEg2MFY5MFoiIGZpbGw9IiM5Q0E0QjIiLz4KPC9zdmc+';
              }}
            />
          ) : (
            <video
              controls
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg bg-black"
              onError={() => {
                console.error('Video failed to load:', mediaItem.signedUrl);
              }}
            >
              <source src={mediaItem.uri || mediaItem.signedUrl} type="video/mp4" />
              <p className="text-gray-500 p-4">Your browser does not support the video tag.</p>
            </video>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center min-h-[80px]">
          <div className="flex-1 mr-4">
            <p className="text-sm font-medium text-gray-900 truncate mb-1">
              {mediaItem.fileName}
            </p>
            <p className="text-xs text-gray-500">
              {mediaItem.step ? `Step ${mediaItem.step}` : 'Media file'} • {(mediaItem.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 