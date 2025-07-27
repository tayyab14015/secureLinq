-- Create database
CREATE DATABASE IF NOT EXISTS securelinq;
USE securelinq;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phoneNumber VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_phone (phoneNumber)
);

-- Create loads table
CREATE TABLE IF NOT EXISTS loads (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    loadNumber VARCHAR(255) NOT NULL,
    status bit DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(ID) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_status (status)
);

-- Create meeting_rooms table for simplified video meetings
CREATE TABLE IF NOT EXISTS meeting_rooms (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    loadId INT NOT NULL UNIQUE,
    roomId VARCHAR(255) NOT NULL UNIQUE,
    channelName VARCHAR(255) NOT NULL,
    meetingLink VARCHAR(500) NOT NULL,
    status ENUM('active', 'ended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastJoinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loadId) REFERENCES loads(ID) ON DELETE CASCADE,
    INDEX idx_roomId (roomId),
    INDEX idx_status (status)
);

-- Create recordings table for Agora cloud recordings
CREATE TABLE IF NOT EXISTS recordings (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    meetingRoomId INT NOT NULL,
    resourceId VARCHAR(255) NOT NULL,
    sid VARCHAR(255) NOT NULL,
    recordingId VARCHAR(255) NOT NULL UNIQUE,
    fileName VARCHAR(500),
    s3Key VARCHAR(500),
    s3Url VARCHAR(1000),
    duration INT DEFAULT 0,
    fileSize BIGINT DEFAULT 0,
    status ENUM('recording', 'completed', 'failed') DEFAULT 'recording',
    startedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meetingRoomId) REFERENCES meeting_rooms(ID) ON DELETE CASCADE,
    INDEX idx_meetingRoomId (meetingRoomId),
    INDEX idx_recordingId (recordingId),
    INDEX idx_status (status),
    INDEX idx_startedAt (startedAt)
);



 ALTER TABLE recordings ADD COLUMN cname VARCHAR(255);
ALTER TABLE recordings ADD COLUMN uid VARCHAR(255);