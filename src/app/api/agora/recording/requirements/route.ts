import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    requirements: {
      minimum_duration: "30+ seconds recommended",
      active_streams: "At least one participant must be actively streaming audio or video",
      channel_activity: "Recording captures content only when streams are present in the channel",
      retry_policy: "Code 65 errors are retried automatically with backoff strategy"
    },
    common_issues: {
      "no_file_generated": {
        causes: [
          "Recording duration too short (< 15-30 seconds)",
          "No participants were actively streaming",
          "All participants left before recording started",
          "Channel was empty during recording"
        ],
        solutions: [
          "Ensure recording runs for at least 30 seconds",
          "Verify participants are streaming audio/video",
          "Check that recording starts after participants join",
          "Monitor recording status during session"
        ]
      },
      "code_65_errors": {
        description: "Request not completed - usually network jitter",
        auto_retry: "System automatically retries with 3s and 6s delays",
        manual_action: "If errors persist, check network connectivity"
      },
      "status_6_no_files": {
        description: "Recording ended but no content was captured",
        meaning: "Normal end state when no streamable content was present",
        action: "Recording is marked as failed automatically"
      }
    },
    best_practices: [
      "Start recording after participants join and begin streaming",
      "Keep recordings running for at least 30-60 seconds",
      "Monitor participant stream status before starting recording",
      "Use query endpoint to check recording status periodically",
      "Handle failed recordings gracefully in your UI"
    ],
    status_codes: {
      "0": "Idle",
      "1": "Starting", 
      "2": "Recording in progress",
      "3": "Recording paused",
      "4": "Recording stopped", 
      "5": "Uploading",
      "6": "Recording ended",
      "7": "Recording failed"
    }
  });
} 