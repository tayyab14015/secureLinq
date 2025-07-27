// db.ts
import { createClient, Client } from '@libsql/client';

export interface User {
  ID: number;
  name: string;
  phoneNumber: string;
}

export interface Load {
  ID: number;
  userId: number;
  loadNumber: string;
  status?: number;
  userName?: string;
}

export interface MeetingRoom {
  ID: number;
  loadId: number;
  roomId: string;
  channelName: string;
  meetingLink: string;
  status: 'active' | 'ended';
  created_at: string;
  lastJoinedAt: string;
}

export interface Recording {
  ID: number;
  meetingRoomId: number;
  resourceId: string;
  sid: string;
  recordingId: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  duration: number;
  fileSize: number;
  status: 'recording' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  created_at: string;
  uid: string;
  cname: string;
}

export interface S3Media {
  id: string;
  type: string;
  step?: number;
  timestamp: string;
  fileName: string;
  size: number;
  loadNumber: string;
  signedUrl: string;
  s3Key: string;
  uri: string;
}

interface DatabaseResult {
  lastInsertRowid: bigint;
  changes: number;
}

const dbConfig = {
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
};

let db: Client;

export async function createConnection(): Promise<Client> {
  if (!db) {
    db = createClient(dbConfig);
  }
  return db;
}

export async function query(sql: string, params: (string | number | boolean | null)[] = []): Promise<unknown[]> {
  const client = await createConnection();
  const result = await client.execute(sql, params);
  return result.rows;
}


export async function run(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<DatabaseResult> {
  const client = await createConnection();
  const result = await client.execute(sql, params); // ✅ Pass params as second arg
  return {
    lastInsertRowid: result.lastInsertRowid as bigint,
    changes: result.rowsAffected
  };
}


export async function getAllLoads(): Promise<Load[]> {
  const sql = `
    SELECT l.ID, l.userId, l.loadNumber, l.status, u.name as userName 
    FROM loads l 
    LEFT JOIN users u ON l.userId = u.ID 
    ORDER BY l.ID DESC
  `;
  return await query(sql) as Load[];
}

export async function createLoad(userId: number, loadNumber: string): Promise<bigint> {
  const sql = 'INSERT INTO loads (userId, loadNumber) VALUES (?, ?)';
  const result = await run(sql, [userId, loadNumber]);
  return result.lastInsertRowid as bigint;
}

export async function updateLoadStatus(loadId: number, status: boolean): Promise<boolean> {
  const sql = 'UPDATE loads SET status = ? WHERE ID = ?';
  const result = await run(sql, [status ? 1 : 0, loadId]);
  return result.changes > 0;
}

export async function getLoadById(loadId: number): Promise<Load | null> {
  const sql = `
    SELECT l.ID, l.userId, l.loadNumber, l.status, u.name as userName 
    FROM loads l 
    LEFT JOIN users u ON l.userId = u.ID 
    WHERE l.ID = ?
  `;
  const results = await query(sql, [loadId]) as Load[];
  return results[0] || null;
}

export async function getLoadByLoadNumber(loadNumber: string): Promise<Load | null> {
  const sql = `
    SELECT l.ID, l.userId, l.loadNumber, l.status, u.name as userName 
    FROM loads l 
    LEFT JOIN users u ON l.userId = u.ID 
    WHERE l.loadNumber = ?
  `;
  const results = await query(sql, [loadNumber]) as Load[];
  return results[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE ID = ?';
  const results = await query(sql, [id]) as User[];
  return results[0] || null;
}

export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE phoneNumber = ?';
  const results = await query(sql, [phoneNumber]) as User[];
  return results[0] || null;
}

export async function createUser(name: string, phoneNumber: string): Promise<bigint> {
  const sql = 'INSERT INTO users (name, phoneNumber) VALUES (?, ?)';
  const result = await run(sql, [name, phoneNumber]);
  return result.lastInsertRowid;
}

export async function getAllUsers(): Promise<User[]> {
  const sql = 'SELECT * FROM users ORDER BY created_at DESC';
  return await query(sql) as User[];
}

export async function createMeetingRoom(
  loadId: number, 
  roomId: string, 
  channelName: string, 
  meetingLink: string
): Promise<bigint> {
  const sql = 'INSERT INTO meeting_rooms (loadId, roomId, channelName, meetingLink) VALUES (?, ?, ?, ?)';
  const result = await run(sql, [loadId, roomId, channelName, meetingLink]);
  return result.lastInsertRowid;
}

export async function getMeetingRoomByLoadId(loadId: number): Promise<MeetingRoom | null> {
  const sql = 'SELECT * FROM meeting_rooms WHERE loadId = ? AND status = "active"';
  const results = await query(sql, [loadId]) as MeetingRoom[];
  return results[0] || null;
}

export async function getMeetingRoomByRoomId(roomId: string): Promise<MeetingRoom | null> {
  const sql = 'SELECT * FROM meeting_rooms WHERE roomId = ? AND status = "active"';
  const results = await query(sql, [roomId]) as MeetingRoom[];
  return results[0] || null;
}

export async function getMeetingRoomById(id: number): Promise<MeetingRoom | null> {
  const sql = 'SELECT * FROM meeting_rooms WHERE ID = ? AND status = "active"';
  const results = await query(sql, [id]) as MeetingRoom[];
  return results[0] || null;
}

export async function updateMeetingRoomLastJoined(roomId: string): Promise<boolean> {
  const sql = 'UPDATE meeting_rooms SET lastJoinedAt = CURRENT_TIMESTAMP WHERE roomId = ?';
  const result = await run(sql, [roomId]);
  return result.changes > 0;
}

export async function endMeetingRoom(roomId: string): Promise<boolean> {
  const sql = 'UPDATE meeting_rooms SET status = "ended" WHERE roomId = ?';
  const result = await run(sql, [roomId]);
  return result.changes > 0;
}

export async function createRecording(
  meetingRoomId: number,
  resourceId: string,
  sid: string,
  recordingId: string,
  uid: string,
  cname: string
): Promise<bigint> {
  const sql = `
    INSERT INTO recordings (meetingRoomId, resourceId, sid, recordingId, status, startedAt, uid, cname) 
    VALUES (?, ?, ?, ?, 'recording', CURRENT_TIMESTAMP, ?, ?)
  `;
  const result = await run(sql, [meetingRoomId, resourceId, sid, recordingId, uid, cname]);
  return result.lastInsertRowid;
}

export async function updateRecordingFile(
  recordingId: string,
  fileName: string,
  s3Key: string,
  s3Url: string,
  duration: number,
  fileSize: number
): Promise<boolean> {
  const sql = `
    UPDATE recordings 
    SET fileName = ?, s3Key = ?, s3Url = ?, duration = ?, fileSize = ?, 
        status = 'completed', completedAt = CURRENT_TIMESTAMP 
    WHERE recordingId = ?
  `;
  const result = await run(sql, [fileName, s3Key, s3Url, duration, fileSize, recordingId]);
  return result.changes > 0;
}

export async function updateRecordingStatus(
  recordingId: string,
  status: 'recording' | 'completed' | 'failed'
): Promise<boolean> {
  const sql = `
    UPDATE recordings 
    SET status = ?, completedAt = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completedAt END
    WHERE recordingId = ?
  `;
  const result = await run(sql, [status, status, recordingId]);
  return result.changes > 0;
}

export async function getRecordingByRecordingId(recordingId: string): Promise<Recording | null> {
  const sql = 'SELECT * FROM recordings WHERE recordingId = ?';
  const results = await query(sql, [recordingId]) as Recording[];
  return results[0] || null;
}

export async function getRecordingsByMeetingRoomId(meetingRoomId: number): Promise<Recording[]> {
  const sql = 'SELECT * FROM recordings WHERE meetingRoomId = ? ORDER BY created_at DESC';
  return await query(sql, [meetingRoomId]) as Recording[];
}

export async function getActiveRecordingByMeetingRoomId(meetingRoomId: number): Promise<Recording | null> {
  const sql = 'SELECT * FROM recordings WHERE meetingRoomId = ? AND status = "recording" ORDER BY created_at DESC LIMIT 1';
  const results = await query(sql, [meetingRoomId]) as Recording[];
  return results[0] || null;
}
