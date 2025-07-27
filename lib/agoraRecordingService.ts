// Remove unused import and add proper interfaces
interface AgoraFile {
  fileName: string;
  fileSize?: number;
  duration?: number;
}

interface AgoraStopResponse {
  fileList?: AgoraFile[];
  serverResponse?: {
    fileList?: AgoraFile[];
  };
}

interface AgoraQueryResponse {
  serverResponse?: {
    status?: number;
    fileList?: AgoraFile[] | string;
    fileListMode?: string;
  };
}

interface AgoraAcquireResponse {
  resourceId?: string;
}

interface AgoraStartResponse {
  sid?: string;
}

export class AgoraRecordingService {
  static getAuthHeader() {
    const encoded = process.env.Encoded_Key;
    if (!encoded) throw new Error('Encoded_Key not set in environment');
    return `Basic ${encoded}`;
  }

  static getAgoraAppId() {
    const appId = process.env.AGORA_APP_ID;
    if (!appId) throw new Error('AGORA_APP_ID not set in environment');
    return appId;
  }

  static getAgoraBaseUrl() {
    return `https://api.agora.io/v1/apps/${this.getAgoraAppId()}`;
  }

  static async makeAgoraRequest(endpoint: string, method: string, body?: unknown, stepLabel?: string) {
    const url = `${this.getAgoraBaseUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
    };
    const options: RequestInit = {
      method,
      headers,
    };
    if (body) {
      console.log(`[Agora ${stepLabel || 'API'}] Request payload:`, JSON.stringify(body, null, 2));
      options.body = JSON.stringify(body);
    }
    try {
      const res = await fetch(url, options);
      let data: unknown = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        console.error(`[Agora ${stepLabel || 'API'}] Error:`, res.status, data);
        const errorData = data as { error?: string; message?: string } | null;
        throw new Error(errorData?.error || errorData?.message || res.statusText);
      }
      console.log(`[Agora ${stepLabel || 'API'}] Response:`, JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      console.error(`[Agora ${stepLabel || 'API'}] Request failed:`, err);
      throw err;
    }
  }

  static getS3Config() {
    const config = {
      vendor: 1, // AWS S3
      region: parseInt(process.env.AWS_REGION_ID || '21'),
      bucket: process.env.AWS_S3_BUCKET_NAME || '',
      accessKey: process.env.AWS_ACCESS_KEY_ID || '',
      secretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      fileNamePrefix: [], // Upload directly to root of bucket
    };
    
    console.log('[S3 Config] Generated configuration:', {
      vendor: config.vendor,
      region: config.region,
      bucket: config.bucket ? `${config.bucket.substring(0, 5)}...` : 'MISSING',
      accessKey: config.accessKey ? `${config.accessKey.substring(0, 5)}...` : 'MISSING',
      secretKey: config.secretKey ? `${config.secretKey.substring(0, 5)}...` : 'MISSING',
      fileNamePrefix: config.fileNamePrefix
    });
    
    // Validate required fields
    const missing = [];
    if (!config.bucket) missing.push('AWS_S3_BUCKET_NAME');
    if (!config.accessKey) missing.push('AWS_ACCESS_KEY_ID');
    if (!config.secretKey) missing.push('AWS_SECRET_ACCESS_KEY');
    if (config.region != 21) missing.push('AWS_REGION_ID');
    
    if (missing.length > 0) {
      console.error('[S3 Config] Missing required environment variables:', missing);
      throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
    }
    
    return config;
  }

  static async startRecording(channelName: string, uid: string, token: string, loadNumber: string) {
    console.log(`[Recording] Starting recording for channel: ${channelName}, uid: ${uid}, loadNumber: ${loadNumber}`);
    
    // 1. Acquire resource
    const acquireRes = await this.makeAgoraRequest('/cloud_recording/acquire', 'POST', {
      cname: channelName,
      uid,
      clientRequest: {
        resourceExpiredHour: 24,
        scene: 0
      },
    }, 'ACQUIRE') as AgoraAcquireResponse;
    
    if (!acquireRes.resourceId) throw new Error('Failed to acquire resourceId');
    console.log(`[Recording] Acquired resourceId: ${acquireRes.resourceId}`);
    
    // 2. Get S3 configuration
    const s3Config = this.getS3Config();
    console.log(`[Recording] Using S3 config for loadNumber: ${loadNumber}`);
    
    // 3. Start recording with comprehensive configuration
    const startPayload = {
      cname: channelName,
      uid,
      clientRequest: {
        token,
        recordingConfig: {
          channelType: 0,  // Communication channel type
          streamTypes: 2,  // Audio and video
          maxIdleTime: 30, // Stop recording if no user for 30 seconds
          streamMode: 'standard', // Standard mode
          channelProfile: 0, // Communication profile
          videoStreamType: 0, // High stream
          transcodingConfig: {
            width: 640,
            height: 480,
            fps: 15,
            bitrate: 500,
            mixedVideoLayout: 1, // Floating layout
            backgroundColor: "#000000"
          }
        },
        recordingFileConfig: {
          avFileType: ["hls", "mp4"] // Generate both HLS and MP4
        },
        storageConfig: s3Config
      }
    };
    
    console.log(`[Recording] Start recording payload (S3 details masked):`, {
      ...startPayload,
      clientRequest: {
        ...startPayload.clientRequest,
        storageConfig: {
          ...s3Config,
          accessKey: s3Config.accessKey ? `${s3Config.accessKey.substring(0, 5)}...` : 'MISSING',
          secretKey: s3Config.secretKey ? `${s3Config.secretKey.substring(0, 5)}...` : 'MISSING'
        }
      }
    });
    
    const startRes = await this.makeAgoraRequest(
      `/cloud_recording/resourceid/${acquireRes.resourceId}/mode/mix/start`,
      'POST',
      startPayload,
      'START'
    ) as AgoraStartResponse;
    
    console.log(`[Recording] Recording started successfully. SID: ${startRes.sid}`);
    
    return {
      success: true,
      resourceId: acquireRes.resourceId,
      sid: startRes.sid,
      recordingId: startRes.sid,
      cname: channelName,
      uid: uid
    };
  }

  static async stopRecording(resourceId: string, sid: string, uid: string , cname:string, retryCount: number = 0): Promise<unknown> {
    try {
      const stopRes = await this.makeAgoraRequest(
        `/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
        'POST',
        {
          cname: cname,
          uid: uid,
          clientRequest: {},
        },
        'STOP'
      ) as AgoraStopResponse;
      
      return this.processStopResponse(stopRes);
    } catch (error: unknown) {
      console.error('Stop recording error:', error);
      
      // Check if this is error code 65 (network jitter) and we haven't retried too many times
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('65') || errorMessage?.includes('request not completed')) {
        if (retryCount < 2) {
          console.log(`Retrying stop recording due to code 65 (attempt ${retryCount + 1}/3)`);
          // Wait before retry (3 seconds for first retry, 6 seconds for second)
          const delay = retryCount === 0 ? 3000 : 6000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.stopRecording(resourceId, sid, uid, cname, retryCount + 1);
        }
      }
      
      // If we get here, either it's not code 65 or we've retried enough
      throw error;
    }
  }
  
  private static processStopResponse(stopRes: AgoraStopResponse) {
    
    console.log('Stop recording response:', JSON.stringify(stopRes, null, 2));
    
    // Extract file information from the stop response
    // Check both fileList and serverResponse.fileList
    const fileList = stopRes.fileList || stopRes.serverResponse?.fileList;
    
    if (fileList && fileList.length > 0) {
      console.log('Available files:', fileList.map((f: AgoraFile) => f.fileName));
      
      // Prefer .mp4 files over .m3u8 files for better compatibility
      let selectedFile = fileList.find((f: AgoraFile) => f.fileName?.endsWith('.mp4'));
      
      // If no .mp4 file found, use the first available file
      if (!selectedFile) {
        selectedFile = fileList[0];
      }
      
      console.log('Selected file for storage:', selectedFile.fileName);
      console.log('File information found in stop response:', selectedFile);
      
      return {
        success: true,
        fileName: selectedFile.fileName,
        fileSize: selectedFile.fileSize || 0,
        duration: selectedFile.duration || 0,
        fileList: fileList?.map((f: AgoraFile) => f.fileName) || [],
        // Construct S3 URL based on fileName
        s3Key: selectedFile.fileName,
        s3Url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${selectedFile.fileName}`
      };
    }
    
    console.log('No file information found in stop response');
    // Fallback if no file info in stop response
    return {
      success: true,
      fileName: undefined,
      fileList: [],
      fileSize: 0,
      duration: 0,
      s3Key: undefined,
      s3Url: null
    };
  }

  static async queryRecording(resourceId: string, sid: string) {
    return this.makeAgoraRequest(
      `/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
      'GET',
      undefined,
      'QUERY'
    );
  }

  static async getRecordingFileInfo(resourceId: string, sid: string, maxRetries: number = 10, delayMs: number = 2000) {
    console.log(`[Agora] Getting file info for resourceId: ${resourceId}, sid: ${sid}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const queryResult = await this.queryRecording(resourceId, sid) as AgoraQueryResponse;
        console.log(`[Agora] Query attempt ${attempt} result:`, JSON.stringify(queryResult, null, 2));
        
        // Check if recording is still in progress
        if (queryResult.serverResponse?.fileListMode === 'string' && queryResult.serverResponse?.fileList === '') {
          console.log(`[Agora] Recording still in progress, attempt ${attempt}/${maxRetries}`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }
        
        // Check if we have file information
        if (queryResult.serverResponse?.fileList && Array.isArray(queryResult.serverResponse.fileList) && queryResult.serverResponse.fileList.length > 0) {
          const fileInfo = queryResult.serverResponse.fileList[0];
          console.log(`[Agora] Found file info:`, JSON.stringify(fileInfo, null, 2));
          
          return {
            success: true,
            fileName: fileInfo.fileName,
            fileSize: fileInfo.fileSize,
            duration: fileInfo.duration,
            // The actual S3 URL will be constructed based on the fileName
            s3Key: fileInfo.fileName, // fileName contains the S3 key
            s3Url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileInfo.fileName}`
          };
        }
        
        // If no file list but recording is done, wait a bit more
        if (attempt < maxRetries) {
          console.log(`[Agora] No file list yet, waiting... attempt ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        console.error(`[Agora] Query attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw new Error('Failed to get recording file info after maximum retries');
  }
} 