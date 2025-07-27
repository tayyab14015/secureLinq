'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled to avoid "window is not defined" error
const VideoCallInterface = dynamic(
  () => import('../../../components/VideoCallInterface'),
  { ssr: false }
);

interface MeetingRoom {
  ID: number;
  loadId: number;
  roomId: string;
  channelName: string;
  meetingLink: string;
  status: 'active' | 'ended';
  created_at: string;
  lastJoinedAt: string;
}

interface JoinPageParams {
  params: Promise<{ roomId: string }>;
}

export default function JoinMeetingPage({ params }: JoinPageParams) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [meetingRoom, setMeetingRoom] = useState<MeetingRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);

  useEffect(() => {
    fetchMeetingRoom();
  }, [resolvedParams.roomId]);

  const fetchMeetingRoom = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/meetings?roomId=${resolvedParams.roomId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Meeting room not found');
      }

      setMeetingRoom(data.meetingRoom);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meeting room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setError(null);
    
    // Show the video call interface
    setShowMeeting(true);
    setIsJoining(false);
  };

  const handleEndMeeting = () => {
    setShowMeeting(false);
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading meeting room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Meeting Not Available</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showMeeting && meetingRoom) {
    return (
      <VideoCallInterface
        channelName={meetingRoom.channelName}
        roomId={meetingRoom.roomId}
        userId={Math.floor(Math.random() * 100000) + 1000} // Random user ID
        userName={userName}
        isAdmin={false}
        onCallEnd={handleEndMeeting}
        isVisible={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm sm:max-w-md w-full mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900">Join Video Meeting</h3>
            <p className="text-sm text-gray-500 mt-2">
              Meeting ID: <span className="font-mono text-xs sm:text-sm">{meetingRoom?.roomId}</span>
            </p>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoinMeeting}
            disabled={isJoining || !userName.trim()}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isJoining || !userName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {isJoining ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Joining...
              </>
            ) : (
              'Join Meeting'
            )}
          </button>

          {/* Meeting Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Meeting Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Room ID: <span className="font-mono text-xs">{meetingRoom?.roomId}</span></p>
              <p>Status: <span className="capitalize">{meetingRoom?.status}</span></p>
              <p>Created: <span className="text-xs">{meetingRoom ? new Date(meetingRoom.created_at).toLocaleString() : 'N/A'}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 