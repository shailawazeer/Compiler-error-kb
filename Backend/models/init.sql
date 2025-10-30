-- Create the database
CREATE DATABASE IF NOT EXISTS compiler_kb;

-- Use the database
USE compiler_kb;

-- Create the errors table
CREATE TABLE IF NOT EXISTS errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  error_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  solution_text TEXT,
  programming_language VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_normalized (normalized_query(255))
);

-- Verify table was created
DESCRIBE errors;