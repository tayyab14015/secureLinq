import mysql from 'mysql2/promise';

export interface User {
  ID: number;
  name: string;
  phoneNumber: string;
}

export interface Load {
  ID: number;
  userId: number;
  loadNumber: string;
  status?: boolean;
  userName?: string;
}

export interface MeetingRoom {
  ID: number;
  loadId: number;
  roomId: string;
  channelName: string;
  meetingLink: string;
  status: 'active' | 'ended';
  created_at: Date;
  lastJoinedAt: Date;
}

// Recording interface for Agora cloud recordings
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
  startedAt: Date;
  completedAt?: Date;
  created_at: Date;
  uid:  string,
  cname: string
}

// S3 Media interface (for type safety)
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

// Database result types
interface DatabaseResult {
  insertId: number;
  affectedRows: number;
}

const dbConfig = {
  host: process.env.DB_HOST ,
  user: process.env.DB_USER , 
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};

export async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw new Error('Failed to connect to database');
  }
}

export async function query(sql: string, params: unknown[] = []): Promise<unknown> {
  const connection = await createConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export async function getAllLoads(): Promise<Load[]> {
  const sql = `
    SELECT l.ID, l.userId, l.loadNumber, l.status, u.name as userName 
    FROM loads l 
    LEFT JOIN users u ON l.userId = u.ID 
    ORDER BY l.ID DESC
  `;
  const results = await query(sql);
  return results as Load[];
}

export async function createLoad(userId: number, loadNumber: string): Promise<number> {
  const sql = 'INSERT INTO loads (userId, loadNumber) VALUES (?, ?)';
  const result = await query(sql, [userId, loadNumber]) as DatabaseResult;
  return result.insertId;
}

export async function updateLoadStatus(loadId: number, status: boolean): Promise<boolean> {
  const sql = 'UPDATE loads SET status = ? WHERE ID = ?';
  const result = await query(sql, [status, loadId]) as DatabaseResult;
  return result.affectedRows > 0;
}

export async function getLoadById(loadId: number): Promise<Load | null> {
  const sql = `
    SELECT l.ID, l.userId, l.loadNumber, l.status, u.name as userName 
    FROM loads l 
    LEFT JOIN users u ON l.userId = u.ID 
    WHERE l.ID = ?
  `;
  const results = await query(sql, [loadId]) as Load[];
  return results.length > 0 ? results[0] : null;
}

export async function getLoadByLoadNumber(loadNumber: string): Promise<Load | null> {
  const sql = `
    SELECT l.ID, l.userId, l.loadNumber, l.status, u.name as userName 
    FROM loads l 
    LEFT JOIN users u ON l.userId = u.ID 
    WHERE l.loadNumber = ?
  `;
  const results = await query(sql, [loadNumber]) as Load[];
  return results.length > 0 ? results[0] : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE ID = ?';
  const results = await query(sql, [id]) as User[];
  return results.length > 0 ? results[0] : null;
}

export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE phoneNumber = ?';
  const results = await query(sql, [phoneNumber]) as User[];
  return results.length > 0 ? results[0] : null;
}

export async function createUser(name: string, phoneNumber: string): Promise<number> {
  const sql = 'INSERT INTO users (name, phoneNumber) VALUES (?, ?)';
  const result = await query(sql, [name, phoneNumber]) as DatabaseResult;
  return result.insertId;
}

export async function getAllUsers(): Promise<User[]> {
  const sql = 'SELECT * FROM users ORDER BY created_at DESC';
  const results = await query(sql);
  return results as User[];
}

// Meeting room management functions
export async function createMeetingRoom(
  loadId: number, 
  roomId: string, 
  channelName: string, 
  meetingLink: string
): Promise<number> {
  const sql = 'INSERT INTO meeting_rooms (loadId, roomId, channelName, meetingLink) VALUES (?, ?, ?, ?)';
  const result = await query(sql, [loadId, roomId, channelName, meetingLink]) as DatabaseResult;
  return result.insertId;
}

export async function getMeetingRoomByLoadId(loadId: number): Promise<MeetingRoom | null> {
  const sql = 'SELECT * FROM meeting_rooms WHERE loadId = ? AND status = "active"';
  const results = await query(sql, [loadId]) as MeetingRoom[];
  return results.length > 0 ? results[0] : null;
}

export async function getMeetingRoomByRoomId(roomId: string): Promise<MeetingRoom | null> {
  const sql = 'SELECT * FROM meeting_rooms WHERE roomId = ? AND status = "active"';
  const results = await query(sql, [roomId]) as MeetingRoom[];
  return results.length > 0 ? results[0] : null;
}
export async function getMeetingRoomById(id: number): Promise<MeetingRoom | null> {
  const sql = 'SELECT * FROM meeting_rooms WHERE ID = ? AND status = "active"';
  const results = await query(sql, [id]) as MeetingRoom[];
  return results.length > 0 ? results[0] : null;
} 

export async function updateMeetingRoomLastJoined(roomId: string): Promise<boolean> {
  const sql = 'UPDATE meeting_rooms SET lastJoinedAt = NOW() WHERE roomId = ?';
  const result = await query(sql, [roomId]) as DatabaseResult;
  return result.affectedRows > 0;
}

export async function endMeetingRoom(roomId: string): Promise<boolean> {
  const sql = 'UPDATE meeting_rooms SET status = "ended" WHERE roomId = ?';
  const result = await query(sql, [roomId]) as DatabaseResult;
  return result.affectedRows > 0;
}

// Recording management functions
export async function createRecording(
  meetingRoomId: number,
  resourceId: string,
  sid: string,
  recordingId: string,
  uid: string,
  cname: string
): Promise<number> {
  const sql = `
    INSERT INTO recordings (meetingRoomId, resourceId, sid, recordingId, status, startedAt,uid,cname) 
    VALUES (?, ?, ?, ?, 'recording', NOW(), ? ,?)
  `;
  const result = await query(sql, [meetingRoomId, resourceId, sid, recordingId,uid,cname]) as DatabaseResult;
  return result.insertId;
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
        status = 'completed', completedAt = NOW() 
    WHERE recordingId = ?
  `;
  const result = await query(sql, [fileName, s3Key, s3Url, duration, fileSize, recordingId]) as DatabaseResult;
  return result.affectedRows > 0;
}

export async function updateRecordingStatus(
  recordingId: string,
  status: 'recording' | 'completed' | 'failed'
): Promise<boolean> {
  const sql = `
    UPDATE recordings 
    SET status = ?, completedAt = CASE WHEN ? IN ('completed', 'failed') THEN NOW() ELSE completedAt END
    WHERE recordingId = ?
  `;
  const result = await query(sql, [status, status, recordingId]) as DatabaseResult;
  return result.affectedRows > 0;
}

export async function getRecordingByRecordingId(recordingId: string): Promise<Recording | null> {
  const sql = 'SELECT * FROM recordings WHERE recordingId = ?';
  const results = await query(sql, [recordingId]) as Recording[];
  return results.length > 0 ? results[0] : null;
}

export async function getRecordingsByMeetingRoomId(meetingRoomId: number): Promise<Recording[]> {
  const sql = 'SELECT * FROM recordings WHERE meetingRoomId = ? ORDER BY created_at DESC';
  const results = await query(sql, [meetingRoomId]) as Recording[];
  return results;
}

export async function getActiveRecordingByMeetingRoomId(meetingRoomId: number): Promise<Recording | null> {
  const sql = 'SELECT * FROM recordings WHERE meetingRoomId = ? AND status = "recording" ORDER BY created_at DESC LIMIT 1';
  const results = await query(sql, [meetingRoomId]) as Recording[];
  return results.length > 0 ? results[0] : null;
} 