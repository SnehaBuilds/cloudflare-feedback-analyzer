ALTER TABLE feedback ADD COLUMN priority TEXT DEFAULT 'medium';

UPDATE feedback SET priority = 'high' 
WHERE LOWER(content) LIKE '%bug%' 
   OR LOWER(content) LIKE '%error%' 
   OR LOWER(content) LIKE '%blocking%' 
   OR LOWER(content) LIKE '%critical%'
   OR LOWER(content) LIKE '%cannot%'
   OR LOWER(content) LIKE '%broken%'
   OR LOWER(content) LIKE '%slow%';

UPDATE feedback SET priority = 'low' 
WHERE LOWER(content) LIKE '%would love%' 
   OR LOWER(content) LIKE '%feature request%'
   OR LOWER(content) LIKE '%nice to have%'
   OR LOWER(content) LIKE '%suggestion%';

CREATE INDEX IF NOT EXISTS idx_priority ON feedback(priority);