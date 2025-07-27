'use client';

import { useState, useEffect, useRef } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack
} from 'agora-rtc-sdk-ng';

// Define remote user type based on Agora's actual remote user
type IRemoteUser = {
  uid: string | number;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
  displayName?: string;
  isAdmin?: boolean;
};

// Mobile detection utility
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Enable dual stream mode and set up Agora with mobile optimizations
AgoraRTC.setLogLevel(4); // Set to 0 for production

// Mobile-specific configuration
if (isMobile()) {
  console.log('Mobile device detected, applying mobile optimizations...');
  // Mobile optimizations will be applied during client creation
}

interface VideoCallInterfaceProps {
  channelName: string;
  roomId?: string;
  userId: number;
  userName?: string;
  isAdmin?: boolean;
  onCallEnd?: () => void;
  isVisible: boolean;
  embedded?: boolean;
}

export default function VideoCallInterface({
  channelName,
  roomId,
  userId,
  userName,
  isAdmin = false,
  onCallEnd,
  isVisible,
  embedded = false
}: VideoCallInterfaceProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IRemoteUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true); // true = front, false = back
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [showRecordingSuccess, setShowRecordingSuccess] = useState(false);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [isCallEnding, setIsCallEnding] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const [isVideoRefReady, setIsVideoRefReady] = useState(false);
  const [isRemoteVideoRefReady, setIsRemoteVideoRefReady] = useState(false);
  const hasStartedRecordingRef = useRef(false);
  const isCallEndingRef = useRef(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  // Check if we need scrolling for specific dimensions or errors
  const [needsScroll, setNeedsScroll] = useState(false);
  
  useEffect(() => {
    const checkDimensions = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const hasError = error || permissionError;
        setNeedsScroll((width > 639 && height === 551) || !!hasError);
      }
    };
    
    checkDimensions();
    window.addEventListener('resize', checkDimensions);
    return () => window.removeEventListener('resize', checkDimensions);
  }, [error, permissionError]);

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

  // Check permissions before initializing
  const checkPermissions = async (): Promise<boolean> => {
    try {
      // Check camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Stop the stream immediately as we only needed to check permissions
      stream.getTracks().forEach(track => track.stop());
      return true;
    } 
    catch (error: unknown) {
      console.error('Permission check failed:', error);
    
      let errorMessage = 'Camera and microphone access required for video calls.';
    
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Camera or microphone not found. Please check your devices.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is already in use by another application.';
        }
      }
    
      setPermissionError(errorMessage);
      return false;
    }
    
  };

  useEffect(() => {
    // Detect mobile on client side
    setIsMobileDevice(isMobile());
    
    if (isVisible && channelName) {
      handleInitialization();
    }

    return () => {
      leaveChannel();
    };
  }, [isVisible, channelName]);

  const handleInitialization = async () => {
    setIsInitializing(true);
    setPermissionError(null);
    
    // Check permissions first
    const hasPermissions = await checkPermissions();
    
    if (!hasPermissions) {
      setIsInitializing(false);
      return;
    }
    
    // If permissions are granted, initialize Agora
    await initializeAgora();
    setIsInitializing(false);
  };

  // Track when video refs are ready
  useEffect(() => {
    const checkVideoRefs = () => {
      if (localVideoRef.current) {
        console.log('Local video ref is ready:', localVideoRef.current);
        setIsVideoRefReady(true);
      } else {
        console.log('Local video ref not ready yet');
      }
      
      if (remoteVideoRef.current) {
        console.log('Remote video ref is ready:', remoteVideoRef.current);
        setIsRemoteVideoRefReady(true);
      } else {
        console.log('Remote video ref not ready yet');
      }
      
      // Try again after a short delay if not both ready
      if (!localVideoRef.current || !remoteVideoRef.current) {
        setTimeout(checkVideoRefs, 100);
      }
    };
    
    if (isVisible) {
      checkVideoRefs();
    }
  }, [isVisible]);

  // Play local video track when both ref and track are ready - with mobile optimizations
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && isVideoRefReady) {
      console.log('Playing local video track on ref...');
      try {
        // Clear any existing content first
        localVideoRef.current.innerHTML = '';
        
        // Add delay for mobile devices
        const playVideo = () => {
          if (localVideoRef.current && localVideoTrack) {
            localVideoTrack.play(localVideoRef.current);
            console.log('Local video track playing successfully');
          }
        };
        
        if (isMobileDevice) {
          // Mobile devices need a slight delay
          setTimeout(playVideo, 100);
        } else {
          playVideo();
        }
      } catch (error) {
        console.error('Error playing local video track:', error);
      }
    }
  }, [localVideoTrack, isVideoRefReady, isMobileDevice]);

  // Handle page unload - stop recording if admin is leaving
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (isAdmin && isRecording) {
        console.log('Page unloading - stopping recording...');
        setIsFinalizingRecording(true);
        // Try to stop recording quickly
        try {
          await stopRecording();
        } catch (error) {
          console.error('Failed to stop recording on page unload:', error);
        }
        // Show confirmation message
        event.preventDefault();
        event.returnValue = 'Recording is in progress. Are you sure you want to leave?';
        return 'Recording is in progress. Are you sure you want to leave?';
      }
    };

    // Only handle page unload, not tab switching
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAdmin, isRecording]);

  // Cleanup effect to reset recording tracker on unmount
  useEffect(() => {
    return () => {
      hasStartedRecordingRef.current = false;
    };
  }, []);

  // Auto-start recording when admin joins channel
  useEffect(() => {
    // Don't run any effects if call is ending
    if (isCallEnding) {
      console.log('Skipping auto-recording effect - call is ending');
      return;
    }

    console.log('Auto-recording effect triggered:', {
      isAdmin,
      isJoined,
      isRecording,
      isCallEnding,
      hasClient: !!client,
      hasRecordingId: !!recordingId,
      hasStartedBefore: hasStartedRecordingRef.current
    });

    if (isAdmin && isJoined && !isRecording && client && !recordingId && !hasStartedRecordingRef.current) {
      console.log('Admin successfully joined - starting automatic recording...');
      hasStartedRecordingRef.current = true; // Prevent multiple attempts
      
      // Wait a moment for the channel to be fully established
      const timer = setTimeout(async () => {
        // Double-check conditions before starting recording (including call ending check)
        if (isAdmin && isJoined && !isRecording && !isCallEnding && !recordingId) {
          try {
            await startRecording();
            console.log('Automatic recording started successfully');
          } catch (recordingError) {
            console.error('Failed to start automatic recording:', recordingError);
            hasStartedRecordingRef.current = false; // Reset on error to allow retry
            // Show a less intrusive message for automatic recording failures
            setError('Note: Automatic recording failed to start, but the meeting continues normally.');
          }
        } else {
          console.log('Skipping automatic recording - conditions changed or call ending');
          hasStartedRecordingRef.current = false; // Reset if conditions changed
        }
      }, 3000); // Wait 3 seconds to ensure everything is stable

      return () => clearTimeout(timer);
    }
  }, [isAdmin, isJoined, isRecording, client, recordingId]); // Removed isCallEnding from dependencies

  const initializeAgora = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create Agora client with mobile-optimized settings
      console.log('Creating Agora RTC client...');
      const clientConfig = {
        mode: 'rtc' as const,
        codec: isMobileDevice ? 'h264' as const : 'vp8' as const // H.264 works better on mobile
      };
      
      const agoraClient = AgoraRTC.createClient(clientConfig);
      console.log('Agora client created with config:', clientConfig);
      setClient(agoraClient);

      // Set up event listeners
      agoraClient.on('user-published', async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        console.log('User published:', user.uid, mediaType);

        if (mediaType === 'video') {
          console.log('Video published by user:', user.uid);
          console.log('User object with video track:', user);
          console.log('Video track available:', !!user.videoTrack);
          
          // Extract user info from UID (format: admin_123_EncodedName or user_123_EncodedName)
          const uidString = String(user.uid);
          let displayName = 'Unknown User';
          let remoteIsAdmin = false;
          
          console.log('Processing remote user UID:', uidString);
          console.log('Current user isAdmin:', isAdmin);
          
          if (uidString.startsWith('admin_')) {
            remoteIsAdmin = true;
            // Extract name from admin_123_EncodedName
            const parts = uidString.split('_');
            if (parts.length >= 3) {
              displayName = decodeURIComponent(parts[2]);
            } else {
              displayName = 'Admin';
            }
            console.log('Remote user is Admin:', displayName);
          } else if (uidString.startsWith('user_')) {
            remoteIsAdmin = false;
            // Extract name from user_123_EncodedName
            const parts = uidString.split('_');
            if (parts.length >= 3) {
              displayName = decodeURIComponent(parts[2]);
            } else {
              displayName = 'User';
            }
            console.log('Remote user is User:', displayName);
          }
          
          // Override display logic for better UX
          if (remoteIsAdmin) {
            displayName = 'Admin';
          } else if (!isAdmin) {
            // If current user is not admin, show the actual user name
            displayName = displayName;
          }
          // When a user joins, force admin to unsubscribe and resubscribe for connection refresh
          if (!remoteIsAdmin && isAdmin) {
            console.log('User joined - forcing admin unsubscribe/resubscribe for connection refresh...');
            
            try {
              // First unsubscribe from this user
              await agoraClient.unsubscribe(user, mediaType);
              console.log('Admin unsubscribed from user:', user.uid);
              
              // Wait a moment then resubscribe
              setTimeout(async () => {
                try {
                  await agoraClient.subscribe(user, mediaType);
                  console.log('Admin resubscribed to user:', user.uid);
                  
                  // Get the fresh user object after resubscription
                  const remoteUsers = agoraClient.remoteUsers;
                  const freshUser = remoteUsers.find(u => u.uid === user.uid);
                  
                  if (freshUser) {
                    console.log('Fresh user object after resubscription:', freshUser);
                    console.log('Fresh user video track available:', !!freshUser.videoTrack);
                    
                    // Force refresh the user object with fresh data
                    const refreshedUserWithMetadata: IRemoteUser = {
                      uid: freshUser.uid,
                      videoTrack: freshUser.videoTrack,
                      audioTrack: freshUser.audioTrack,
                      displayName,
                      isAdmin: remoteIsAdmin
                    };
                    
                    setRemoteUsers(prev => {
                      const filtered = prev.filter(u => u.uid !== user.uid);
                      return [...filtered, refreshedUserWithMetadata];
                    });
                    
                    // Play audio if available
                    if (freshUser.audioTrack) {
                      freshUser.audioTrack.play();
                    }
                  }
                  
                } catch (resubscribeError) {
                  console.error('Failed to resubscribe to user:', resubscribeError);
                }
              }, 1000);
              
            } catch (unsubscribeError) {
              console.error('Failed to unsubscribe from user:', unsubscribeError);
              // Continue with normal flow if unsubscribe fails
            }
          }
          
          // Explicitly preserve Agora properties and add metadata
          const userWithMetadata: IRemoteUser = {
            uid: user.uid,
            videoTrack: user.videoTrack,
            audioTrack: user.audioTrack,
            displayName,
            isAdmin: remoteIsAdmin
          };
          
          console.log('Storing user with metadata:', userWithMetadata);
          console.log('Video track explicitly preserved:', !!userWithMetadata.videoTrack);
          
          // Only set remote users immediately if not doing unsubscribe/resubscribe
          if (remoteIsAdmin || !isAdmin) {
                      setRemoteUsers(prev => {
            const filtered = prev.filter(u => u.uid !== user.uid);
            const newUsers = [...filtered, userWithMetadata];
            console.log('Setting remote users:', newUsers);
            console.log('Video track in state:', !!userWithMetadata.videoTrack);
            return newUsers;
          });
          } else {
            // For admin receiving user video, add a fallback in case unsubscribe/resubscribe fails
            setTimeout(() => {
              setRemoteUsers(prev => {
                const existingUser = prev.find(u => u.uid === user.uid);
                if (!existingUser || !existingUser.videoTrack) {
                  console.log('Fallback: Adding user with current video track');
                  const filtered = prev.filter(u => u.uid !== user.uid);
                  return [...filtered, userWithMetadata];
                }
                return prev;
              });
            }, 3000); // Fallback after 3 seconds
          }
          
          // Auto-reconnect admin video when user joins (mobile optimization)
          if (isMobileDevice && localVideoTrack && localVideoRef.current) {
            console.log('User joined - auto-reconnecting admin video for mobile...');
            setTimeout(() => {
              try {
                if (localVideoRef.current && localVideoTrack) {
                  localVideoRef.current.innerHTML = '';
                  localVideoTrack.play(localVideoRef.current);
                  console.log('Admin video auto-reconnected successfully');
                }
              } catch (autoReconnectError) {
                console.error('Admin video auto-reconnect failed:', autoReconnectError);
              }
            }, 500);
          }
        }

        if (mediaType === 'audio') {
          console.log('Playing remote audio track from user:', user.uid);
          user.audioTrack?.play();
        }
      });

      agoraClient.on('user-unpublished', (user, mediaType) => {
        console.log('User unpublished:', user.uid, mediaType);
        if (mediaType === 'video') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
      });

      agoraClient.on('user-left', (user) => {
        console.log('User left:', user.uid);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      // Create unique user ID to prevent conflicts and include user name
      const encodedUserName = encodeURIComponent(userName || (isAdmin ? 'Admin' : 'User'));
      const uniqueUserId = isAdmin ? `admin_${userId}_${encodedUserName}` : `user_${userId}_${encodedUserName}`;
      console.log('Requesting Agora token for channel:', channelName, 'uniqueUserId:', uniqueUserId);
      
      const tokenResponse = await fetch('/api/agora/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: uniqueUserId,
          role: 'publisher'
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token response error:', errorData);
        throw new Error('Failed to get Agora token');
      }

      const { token, appId } = await tokenResponse.json();
      console.log('Received Agora token and appId:', { appId: appId?.substring(0, 8) + '...', tokenLength: token?.length });

      // Join channel
      console.log('Joining Agora channel...');
      await agoraClient.join(appId, channelName, token, uniqueUserId);
      console.log('Successfully joined Agora channel with ID:', uniqueUserId);
      setIsJoined(true);

      // Create and publish local tracks with better error handling and mobile optimizations
      console.log('Creating microphone and camera tracks...');
      
      let audioTrack: IMicrophoneAudioTrack;
      let videoTrack: ICameraVideoTrack;
      
      try {
        // Mobile-optimized track creation
        if (isMobileDevice) {
          console.log('Creating tracks with mobile optimizations...');
          
          // Create audio track first on mobile
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: {
              sampleRate: 48000,
              stereo: false,
              bitrate: 128,
            }
          });
          
          // Create video track with mobile-optimized settings
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: 640,
              height: 480,
              frameRate: 15,
              bitrateMin: 200,
              bitrateMax: 1000,
            },
            optimizationMode: "motion" as const // Better for mobile
          });
          
          console.log('Successfully created mobile-optimized tracks');
        } else {
          // Desktop: Try to create both tracks simultaneously
          [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          console.log('Successfully created desktop tracks');
        }
        
        console.log('Audio track:', audioTrack);
        console.log('Video track:', videoTrack);
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // Log audio track details
        console.log('Audio track details:', {
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          deviceId: audioTrack.getTrackId ? audioTrack.getTrackId() : 'N/A'
        });

        // Publish tracks with mobile-specific handling
        if (isMobileDevice) {
          // Publish audio first, then video on mobile
          await agoraClient.publish([audioTrack]);
          console.log('Audio track published successfully');
          
          // Add delay before publishing video on mobile
          setTimeout(async () => {
            await agoraClient.publish([videoTrack]);
            console.log('Video track published successfully');
          }, 500);
        } else {
          await agoraClient.publish([audioTrack, videoTrack]);
          console.log('Successfully published tracks to Agora');
        }

        // Video track will be played in useEffect when ref is ready
        
      } catch (trackError) {
        console.error('Error creating tracks:', trackError);
        throw trackError; // Re-throw to be caught by outer try-catch
      }

      console.log('Successfully joined channel:', channelName);

      // Auto-start recording if admin - moved after setIsJoined(true)
      // This will be handled by a separate useEffect that watches for isJoined changes

    } catch (err) {
      console.error('Failed to initialize Agora:', err);
      setError(err instanceof Error ? err.message : 'Failed to join call');
    } finally {
      setIsLoading(false);
    }
  };

  const leaveChannel = async (stopRecordingFirst: boolean = true) => {
    try {
      // Auto-stop recording if admin and recording is active (only if not already stopped)
      if (stopRecordingFirst && isAdmin && isRecording) {
        console.log('Admin leaving - stopping automatic recording...');
        try {
          await stopRecording();
          console.log('Automatic recording stopped successfully');
        } catch (recordingError) {
          console.error('Failed to stop automatic recording:', recordingError);
          // Continue with channel leave even if recording stop fails
        }
      }

      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (client && isJoined) {
        await client.leave();
      }
      
      setClient(null);
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setRemoteUsers([]);
      setIsJoined(false);

      // Reset recording attempt tracker
      hasStartedRecordingRef.current = false;

      // In simplified approach, no need to update call status

    } catch (err) {
      console.error('Error leaving channel:', err);
    }
  };

  const toggleMute = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const switchCamera = async () => {
    if (!client || !isMobileDevice) return;
    
    try {
      console.log('Switching camera... Current:', isFrontCamera ? 'Front' : 'Back');
      
      // Stop and close current video track
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        
        // Unpublish the current video track
        await client.unpublish([localVideoTrack]);
      }
      
      // Create new video track with opposite camera
      const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
        facingMode: isFrontCamera ? 'environment' : 'user', // environment = back, user = front
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 15,
          bitrateMin: 200,
          bitrateMax: 1000,
        },
        optimizationMode: "motion" as const
      });
      
      // Update state
      setLocalVideoTrack(newVideoTrack);
      setIsFrontCamera(!isFrontCamera);
      
      // Publish the new video track
      await client.publish([newVideoTrack]);
      
      // Play the new video track
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = '';
        newVideoTrack.play(localVideoRef.current);
      }
      
      console.log('Camera switched successfully to:', !isFrontCamera ? 'Front' : 'Back');
      
    } catch (error) {
      console.error('Error switching camera:', error);
      setError('Failed to switch camera. Please try again.');
    }
  };

  const handleEndCall = async () => {
    console.log('handleEndCall called - current state:', {
      isRecording,
      hasRecordingId: !!recordingId,
      hasResourceId: !!resourceId,
      hasSid: !!sid
    });
    
    // Set call ending state to disable all controls immediately
    setIsCallEnding(true);
    isCallEndingRef.current = true;
    
    // Stop recording if active and show finalizing loader
    if (isRecording && recordingId && resourceId && sid) {
      console.log('Recording active - stopping recording first');
      setIsFinalizingRecording(true);
      
      try {
        await stopRecording();
        // Navigation will be handled after recording success
      } catch (error) {
        console.error('Error stopping recording during call end:', error);
        // If recording stop fails, still end the call
        await leaveChannel(false);
        setTimeout(() => {
          setIsFinalizingRecording(false);
          setIsCallEnding(false);
          if (onCallEnd) {
            onCallEnd();
          }
        }, 1000);
      }
      
      // Backup timeout in case recording stop gets stuck
      setTimeout(() => {
        console.log('Backup timeout triggered - forcing call end');
        if (isCallEndingRef.current) {
          setIsFinalizingRecording(false);
          setIsCallEnding(false);
          isCallEndingRef.current = false;
          hasStartedRecordingRef.current = false;
          if (onCallEnd) {
            onCallEnd();
          }
        }
      }, 15000); // 15 second backup timeout
      
    } else {
      // No recording active, leave channel and navigate immediately
      console.log('No recording active - ending call immediately');
      await leaveChannel(false);
      if (onCallEnd) {
        onCallEnd();
      }
    }
  };

  // Recording functions
  const startRecording = async () => {
    console.log('startRecording called with state:', {
      isAdmin,
      isJoined,
      hasClient: !!client,
      isRecording,
      remoteUsersCount: remoteUsers.length
    });

    if (!isAdmin || !isJoined || !client) {
      console.error('Only admin can start recording and must be joined to channel');
      console.error('State check failed:', { isAdmin, isJoined, hasClient: !!client });
      return;
    }

    // Note: Recording will start even if no participants are present yet
    // This allows automatic recording to begin when admin joins
    console.log('Starting recording with', remoteUsers.length, 'remote participants');

    try {
      // Get current token for recording
      const recordingUid = Math.floor(Math.random() * 1000000000).toString();
      const tokenResponse = await fetch('/api/agora/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: recordingUid,
          role: 'publisher'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get token for recording');
      }

      const { token } = await tokenResponse.json();

      // Start recording
      const response = await fetch('/api/agora/recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          channelName,
          uid: recordingUid,
          token
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start recording');
      }

      setIsRecording(true);
      setRecordingId(data.recordingId);
      setResourceId(data.resourceId);
      setSid(data.sid);
      console.log('Recording started successfully');

    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingId || !resourceId || !sid) {
      console.error('Recording not started or missing recording details');
      return;
    }

    if (!isRecording) {
      console.log('Recording already stopped, skipping duplicate stop request');
      return;
    }

    console.log('Stopping recording:', { recordingId, resourceId, sid });

    // Immediately set recording to false to prevent duplicate calls
    setIsRecording(false);

    try {
      const response = await fetch('/api/agora/recording/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId,
          resourceId,
          sid,
          cname: 'meeting_08f740b18c6e',  // Add this
          uid : '786035131'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Re-enable recording state if the request failed
        setIsRecording(true);
        throw new Error(data.error || 'Failed to stop recording');
      }

      // Clear recording state on successful stop
      setRecordingId(null);
      setResourceId(null);
      setSid(null);
      
      // Handle different response types
      if (data.fileName) {
        // Recording completed immediately with file
        setShowRecordingSuccess(true);
        console.log('Recording stopped and saved successfully');
      } else if (data.warning) {
        // Recording was too short or had issues
        console.warn('Recording stopped with warning:', data.warning);
        setError(`Recording Warning: ${data.warning}`);
      } else if (data.status === 'processing') {
        // Recording is being processed
        setShowRecordingSuccess(true);
        console.log('Recording stopped. File is being processed and will be available shortly.');
      } else {
        // Default success case
        setShowRecordingSuccess(true);
        console.log('Recording stopped successfully');
      }
      
      console.log('Checking if call is ending - isCallEnding:', isCallEnding, 'isCallEndingRef:', isCallEndingRef.current);
      
      // If we're ending the call, handle navigation after recording success
      if (isCallEnding || isCallEndingRef.current) {
        console.log('Call ending - recording stopped successfully, proceeding with navigation...');
        
        // Leave channel first if not already done
        try {
          await leaveChannel(false);
          console.log('Channel left successfully');
        } catch (error) {
          console.log('Channel already left or error leaving:', error);
        }
        
        // Show success message for 3 seconds before navigating
        setTimeout(() => {
          console.log('Completing call end navigation...');
          setIsFinalizingRecording(false);
          setIsCallEnding(false);
          isCallEndingRef.current = false;
          hasStartedRecordingRef.current = false; // Reset for next session
          if (onCallEnd) {
            console.log('Calling onCallEnd...');
            onCallEnd();
          } else {
            console.log('No onCallEnd callback provided');
          }
        }, 3000); // Show success message for 3 seconds before ending call
      } else {
        // Normal recording stop (not from ending call)
        console.log('Normal recording stop - not ending call');
        setIsFinalizingRecording(false);
      }
      
      // Hide success message after 7 seconds (longer for processing messages)
      setTimeout(() => setShowRecordingSuccess(false), 7000);

    } catch (error) {
      console.error('Error stopping recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
      
      // If we're ending the call, handle navigation after error
      if (isCallEnding) {
        console.log('Call ending - recording failed, proceeding with navigation...');
        
        // Leave channel even if recording failed
        try {
          await leaveChannel(false);
        } catch (error) {
          console.log('Channel already left or error leaving:', error);
        }
        
        setTimeout(() => {
          console.log('Completing call end navigation after error...');
          setIsFinalizingRecording(false);
          setIsCallEnding(false);
          hasStartedRecordingRef.current = false; // Reset for next session
          if (onCallEnd) {
            onCallEnd();
          }
        }, 2000); // Show error briefly before ending call
      } else {
        // Normal recording error (not from ending call)
        setIsFinalizingRecording(false);
      }
    }
  };

  // Render remote video when user joins - with mobile optimizations
  useEffect(() => {
    console.log('Video playing effect triggered');
    console.log('Remote users length:', remoteUsers.length);
    console.log('Remote video ref current:', !!remoteVideoRef.current);
    console.log('Remote video ref ready state:', isRemoteVideoRefReady);
    
    if (remoteUsers.length > 0 && remoteVideoRef.current && isRemoteVideoRefReady) {
      const remoteUser = remoteUsers[0];
      console.log('Attempting to play remote video for user:', remoteUser.uid);
      console.log('Remote user object:', remoteUser);
      console.log('Video track available:', !!remoteUser.videoTrack);
      console.log('Remote video ref:', remoteVideoRef.current);
      console.log('Is mobile device:', isMobileDevice);
      
      if (remoteUser.videoTrack && remoteVideoRef.current) {
        try {
          // Clear any existing content
          remoteVideoRef.current.innerHTML = '';
          
          // Mobile-specific video playing with extended delays
          const playRemoteVideo = () => {
            if (remoteVideoRef.current && remoteUser.videoTrack) {
              console.log('Playing remote video track...');
              remoteUser.videoTrack.play(remoteVideoRef.current);
              console.log('Successfully started playing remote video track');
            }
          };
          
          if (isMobileDevice) {
            // Mobile devices need longer delays for video track initialization
            console.log('Applying mobile-specific remote video delay...');
            setTimeout(playRemoteVideo, 200);
            
            // Additional retry attempts for mobile
            setTimeout(() => {
              if (remoteVideoRef.current && remoteVideoRef.current.children.length === 0) {
                console.log('First retry for mobile remote video...');
                try {
                  if (remoteUser.videoTrack) {
                    remoteUser.videoTrack.play(remoteVideoRef.current);
                  }
                } catch (retryError) {
                  console.error('First retry failed:', retryError);
                }
              }
            }, 1000);
            
            // Final retry attempt
            setTimeout(() => {
              if (remoteVideoRef.current && remoteVideoRef.current.children.length === 0) {
                console.log('Final retry for mobile remote video...');
                try {
                  if (remoteUser.videoTrack) {
                    remoteUser.videoTrack.play(remoteVideoRef.current);
                  }
                } catch (retryError) {
                  console.error('Final retry failed:', retryError);
                }
              }
            }, 2000);
          } else {
            // Desktop: immediate play with multiple retries for better reliability
            playRemoteVideo();
            
            // Multiple retry attempts for desktop
            setTimeout(() => {
              if (remoteVideoRef.current && remoteVideoRef.current.children.length === 0) {
                console.log('First retry for desktop remote video...');
                try {
                  if (remoteUser.videoTrack) {
                    remoteUser.videoTrack.play(remoteVideoRef.current);
                  }
                } catch (retryError) {
                  console.error('First retry failed:', retryError);
                }
              }
            }, 500);
            
            // Second retry attempt
            setTimeout(() => {
              if (remoteVideoRef.current && remoteVideoRef.current.children.length === 0) {
                console.log('Second retry for desktop remote video...');
                try {
                  if (remoteUser.videoTrack) {
                    remoteUser.videoTrack.play(remoteVideoRef.current);
                  }
                } catch (retryError) {
                  console.error('Second retry failed:', retryError);
                }
              }
            }, 1500);
            
            // Final retry attempt
            setTimeout(() => {
              if (remoteVideoRef.current && remoteVideoRef.current.children.length === 0) {
                console.log('Final retry for desktop remote video...');
                try {
                  if (remoteUser.videoTrack) {
                    remoteUser.videoTrack.play(remoteVideoRef.current);
                  }
                } catch (retryError) {
                  console.error('Final retry failed:', retryError);
                }
              }
            }, 3000);
          }
          
        } catch (error) {
          console.error('Error playing remote video track:', error);
        }
      } else {
        console.log('No video track available for remote user');
      }
    }
  }, [remoteUsers, isMobileDevice, isRemoteVideoRefReady]);

  // Additional effect to force video playing when remote ref becomes ready
  useEffect(() => {
    if (isRemoteVideoRefReady && remoteUsers.length > 0 && remoteVideoRef.current) {
      console.log('Remote video ref became ready, forcing video play attempt...');
      const remoteUser = remoteUsers[0];
      
      if (remoteUser.videoTrack) {
        setTimeout(() => {
          try {
            if (remoteVideoRef.current && remoteUser.videoTrack) {
              console.log('Force playing remote video after ref ready...');
              remoteVideoRef.current.innerHTML = '';
              remoteUser.videoTrack.play(remoteVideoRef.current);
              console.log('Force play successful');
            }
          } catch (error) {
            console.error('Force play failed:', error);
          }
        }, 500);
      }
    }
  }, [isRemoteVideoRefReady, remoteUsers]);

  if (!isVisible) {
    return null;
  }

  const content = (
    <div className={`bg-white rounded-lg shadow-xl ${embedded ? 'w-full' : 'max-w-4xl w-full mx-4 max-h-[70vh] min-h-[400px]'} flex flex-col`}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        {/* Title and Close Button Row */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Video Call
          </h3>
          {!embedded && (
            <button
              onClick={handleEndCall}
              className="text-gray-400 hover:text-gray-500 flex-shrink-0"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* URL and Copy Button Row */}
        <div className="flex items-center space-x-2">
          <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Meeting URL:</span>
          <div className="flex items-center bg-gray-50 rounded px-2 sm:px-3 py-1 border min-w-0 flex-1">
            <code className="text-xs sm:text-sm text-gray-800 font-mono truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/join/${roomId || channelName.replace('meeting_', '')}` : `[domain]/join/${roomId || channelName.replace('meeting_', '')}`}
            </code>
          </div>
          <button
            onClick={async () => {
              const meetingUrl = typeof window !== 'undefined' 
                ? `${window.location.origin}/join/${roomId || channelName.replace('meeting_', '')}`
                : '';
              if (meetingUrl) {
                const success = await copyToClipboard(meetingUrl);
                if (success) {
                  // Show a brief success indication
                  const button = document.querySelector('.copy-btn');
                  if (button) {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
                    setTimeout(() => {
                      button.innerHTML = originalText;
                    }, 2000);
                  }
                } else {
                  // Show error message
                  alert('Failed to copy. Please copy the URL manually.');
                }
              }
            }}
            className="copy-btn p-1 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 bg-gray-50 rounded border hover:bg-gray-100"
            title="Copy meeting URL"
          >
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className={`flex-1 px-3 sm:px-6 flex flex-col ${(isMobileDevice && !error && !permissionError) ? 'mt-10' : ''} ${needsScroll ? 'overflow-y-auto' : ''}`}>
        {/* Permission Error */}
        {permissionError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Camera and Microphone Access Required</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{permissionError}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleInitialization}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Initialization Loader */}
        {isInitializing && isLoading && !permissionError &&(
          <div className="flex justify-center items-center h-32 sm:h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto"></div>
              <span className="mt-2 block text-xs sm:text-sm">Initializing video call...</span>
              <span className="mt-1 block text-xs text-gray-500">
                Checking camera and microphone permissions...
              </span>
            </div>
          </div>
        )}

        {error && !permissionError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3 flex items-center justify-between">
            <p className="text-sm text-red-600 flex-1 mr-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                handleInitialization();
              }}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}

        {/* Recording Success Notification */}
        {showRecordingSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 sm:p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Recording Completed!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>The meeting recording has been automatically saved and will be available in the recordings list.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call Ending / Finalizing Recording Full Screen Loader */}
        {isCallEnding && (
          <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
              
              {isFinalizingRecording ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Finalizing Recording...</h2>
                  <p className="text-gray-600 mb-4">
                    Please wait while we save your meeting recording. This may take a few moments.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Ending Call...</h2>
                  <p className="text-gray-600 mb-4">
                    Please wait while we end the call.
                  </p>
                </>
              )}

              {showRecordingSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-800 font-medium">Recording Saved Successfully!</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Your meeting recording has been saved and will be available in the recordings list.
                  </p>
                </div>
              )}

              <div className="mt-6 text-sm text-gray-500">
                <p>Do not close this window...</p>
              </div>
            </div>
          </div>
        )}

        {/* Finalizing Recording Notification (when not ending call) */}
        {isFinalizingRecording && !isCallEnding && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Finalizing Recording...</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Please wait while we save your meeting recording. This may take a few moments.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isJoined && !isLoading && !permissionError && (
          <div className={`
            grid gap-2 sm:gap-4 -mb-2
            ${embedded 
              ? 'grid-cols-1 xl:grid-cols-2 grid-rows-2 xl:grid-rows-1 h-48 sm:h-64 lg:h-80' 
              : 'grid-cols-2 lg:grid-rows-1 h-48 sm:h-56 md:h-64 lg:h-72'
            }
          `}>
            {/* Local Video - Admin */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden min-h-0">
              <div 
                ref={localVideoRef} 
                className="w-full h-full absolute inset-0"
              ></div>
              <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 text-white text-xs sm:text-sm bg-black bg-opacity-50 px-1 sm:px-2 py-1 rounded z-10">
                You ({userName || (isAdmin ? 'Admin' : 'User')}) 
              </div>
              {!localVideoTrack && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                    <p className="text-xs sm:text-sm">Camera not available</p>
                    <p className="text-xs text-gray-400 mt-1">Check camera permissions</p>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Video - User */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden min-h-0">
              <div ref={remoteVideoRef} className="w-full h-full absolute inset-0"></div>
              <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 text-white text-xs sm:text-sm bg-black bg-opacity-50 px-1 sm:px-2 py-1 rounded z-10">
                {remoteUsers.length > 0 ? remoteUsers[0].displayName || 'Unknown User' : 'Waiting for user...'}
              </div>
              {remoteUsers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                  <div className="text-center">
                    <div className="animate-pulse">
                      <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm">Waiting for user to join...</p>
                  </div>
                </div>
              )}
              {remoteUsers.length > 0 && !remoteUsers[0].videoTrack && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                    <p className="text-xs sm:text-sm">User camera not available</p>
                    <p className="text-xs text-gray-400 mt-1">Waiting for video stream...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isJoined && !permissionError && (
        <div className="px-3 sm:px-6 py-2 sm:py-3 md:py-4 border-t border-gray-200 flex justify-center space-x-2 sm:space-x-4 mt-0">
          <button
            onClick={toggleMute}
            disabled={isCallEnding}
            className={`p-2 sm:p-3 rounded-full transition-colors ${
              isCallEnding 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                : isMuted 
                  ? 'bg-red-600 text-white hover:bg-opacity-80' 
                  : 'bg-gray-200 text-gray-700 hover:bg-opacity-80'
            }`}
            title={isCallEnding ? 'Call ending...' : (isMuted ? 'Unmute' : 'Mute')}
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMuted ? (
                // Muted microphone icon with slash
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z M3 3l18 18" />
              ) : (
                // Unmuted microphone icon
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleVideo}
            disabled={isCallEnding}
            className={`p-2 sm:p-3 rounded-full transition-colors ${
              isCallEnding 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                : isVideoOff 
                  ? 'bg-red-600 text-white hover:bg-opacity-80' 
                  : 'bg-gray-200 text-gray-700 hover:bg-opacity-80'
            }`}
            title={isCallEnding ? 'Call ending...' : (isVideoOff ? 'Turn on camera' : 'Turn off camera')}
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isVideoOff ? (
                // Video camera off icon with slash
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </>
              ) : (
                // Video camera on icon
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              )}
            </svg>
          </button>

          {/* Camera Switch Button - Only show on mobile devices */}
          {isMobileDevice && (
            <button
              onClick={switchCamera}
              disabled={isCallEnding}
              className={`p-2 sm:p-3 rounded-full transition-colors ${
                isCallEnding 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={isCallEnding ? 'Call ending...' : `Switch to ${isFrontCamera ? 'back' : 'front'} camera`}
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Recording status text for admin */}
          {isAdmin && isJoined && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              isRecording 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-500'
            }`}>
              {isRecording && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>}
              <span className={isRecording ? 'text-red-800 font-semibold' : 'text-gray-500'}>
                Recording
              </span>
            </div>
          )}

          <button
            onClick={handleEndCall}
            disabled={isCallEnding}
            className={`p-2 sm:p-3 rounded-full transition-colors ${
              isCallEnding 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            title={isCallEnding ? 'Ending call...' : 'End call'}
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.64 0 12.36s.11-.54.29-.72C2.93 9.01 7.13 7.5 12 7.5s9.07 1.51 11.71 4.14c.18.18.29.44.29.72s-.11.54-.29.72l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  // Return embedded or full-screen modal
  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      {content}
    </div>
  );
} 