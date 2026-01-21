CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  sentiment TEXT,
  themes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  analyzed_at DATETIME
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_source ON feedback(source);
CREATE INDEX IF NOT EXISTS idx_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment ON feedback(sentiment);
