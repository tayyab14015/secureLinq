'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const VideoCallInterface = dynamic(() => import('./VideoCallInterface'), {
  ssr: false
});

interface MeetingRoom {
  ID: number;
  loadId: number;
  roomId: string;
  channelName: string;
  meetingLink: string;
  status: 'active' | 'ended';
}

interface MeetingLinkGeneratorProps {
  loadId: number;
  loadNumber: string;
  userName: string;
}

export default function MeetingLinkGenerator({ 
  loadId, 
  loadNumber, 
  userName 
}: MeetingLinkGeneratorProps) {
  const [meetingRoom, setMeetingRoom] = useState<MeetingRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);

  // Enhanced copy function with mobile fallback
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for mobile/older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          return successful;
        } catch (err) {
          console.error(err)
          document.body.removeChild(textArea);
          return false;
        }
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  };

  useEffect(() => {
    createOrGetMeetingRoom();
  }, [loadId]);

  const createOrGetMeetingRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create meeting room');
      }

      setMeetingRoom(data.meetingRoom);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create meeting room';
      setError(errorMessage);
      console.error('Meeting room creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMeetingLink = async () => {
    if (!meetingRoom?.meetingLink) return;

    try {
      const success = await copyToClipboard(meetingRoom.meetingLink);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Show error for failed copy
        alert('Failed to copy. Please copy the link manually.');
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy. Please copy the link manually.');
    }
  };

  const joinAsAdmin = async () => {
    setIsInitiating(true);
    
    // Add a small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setShowMeeting(true);
    setIsInitiating(false);
  };

  const handleEndMeeting = () => {
    setShowMeeting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        <span className="text-sm text-gray-600">Creating meeting...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={createOrGetMeetingRoom}
          className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Video Meeting</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            showMeeting 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {showMeeting ? 'Live' : 'Ready'}
          </span>
        </div>

        {/* Meeting Info */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Load:</span>
            <span className="font-medium">{loadNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">User:</span>
            <span className="font-medium">{userName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Room ID:</span>
            <span className="font-mono text-xs">{meetingRoom?.roomId}</span>
          </div>
        </div>

        {/* Meeting Link */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Link
          </label>
          <div className="flex rounded-md shadow-sm">
            <input
              type="text"
              value={meetingRoom?.meetingLink || ''}
              readOnly
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 bg-gray-50 text-sm focus:outline-none"
            />
            <button
              onClick={copyMeetingLink}
              className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md text-sm font-medium ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Share this link with the user to join the video meeting
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={joinAsAdmin}
            disabled={showMeeting || isInitiating}
            className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors ${
              showMeeting || isInitiating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isInitiating ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Initiating...
              </>
            ) : showMeeting ? (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Meeting Active
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Initiate Meeting
              </>
            )}
          </button>
        </div>

        {/* Instructions - Show when meeting is not active */}
        {!showMeeting && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-1">How to use:</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Copy the meeting link above</li>
              <li>2. Send it to the user (via SMS, WhatsApp, etc.)</li>
              <li>3. Click &quot;Initiate Meeting&quot; to start the video call</li>
              <li>4. User clicks the link to join instantly</li>
            </ol>
          </div>
        )}
      </div>

      {/* Separate Modal for Video Call Interface */}
      {showMeeting && meetingRoom && (
        <VideoCallInterface
          channelName={meetingRoom.channelName}
          roomId={meetingRoom.roomId}
          userId={1} // Admin user ID
          userName="Admin"
          isAdmin={true}
          onCallEnd={handleEndMeeting}
          isVisible={true}
          embedded={false} // Use full-screen modal, not embedded
        />
      )}
    </>
  );
} 