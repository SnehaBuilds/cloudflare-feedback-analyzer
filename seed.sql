-- Sample feedback data from various sources
INSERT INTO feedback (source, content, author) VALUES
  ('GitHub', 'The new API endpoint is incredibly slow. Takes over 5 seconds to respond. This is blocking our production deployment.', 'dev_sarah'),
  ('Discord', 'Love the new dashboard redesign! So much cleaner and easier to navigate.', 'user_mike'),
  ('Support Ticket', 'Cannot authenticate using OAuth. Getting 401 errors constantly. Documentation is unclear about token refresh.', 'enterprise_customer'),
  ('Twitter', 'Just deployed my first Worker. The DX is amazing! Went from idea to production in 20 minutes.', '@builderjane'),
  ('GitHub', 'Feature request: Would love to see real-time logs in the dashboard instead of polling every 30 seconds.', 'dev_alex'),
  ('Support Ticket', 'Billing page is confusing. Not clear what we are being charged for. Need better cost breakdown.', 'startup_cto'),
  ('Discord', 'The CLI keeps crashing on Windows. Error: ENOENT file not found. Very frustrating.', 'user_chris'),
  ('Email', 'Your Workers AI integration is a game changer. Built sentiment analysis in minutes. Incredible!', 'data_scientist'),
  ('GitHub', 'Documentation for D1 migrations is outdated. Screenshots show old UI that does not match current dashboard.', 'dev_taylor'),
  ('Twitter', 'Why is there no dark mode in the dashboard? My eyes are dying.', '@nightowldev'),
  ('Support Ticket', 'R2 upload speeds are inconsistent. Sometimes fast, sometimes timing out. Need reliability.', 'media_company'),
  ('Discord', 'The community here is so helpful! Got my question answered in 5 minutes.', 'user_newbie'),
  ('Email', 'Excited about the new Workers pricing. Finally makes sense for small projects!', 'indie_dev'),
  ('GitHub', 'Bug: Wrangler deploy fails with cryptic error message. Need better error handling.', 'dev_jordan'),
  ('Support Ticket', 'Enterprise support response time is too slow. Waited 3 days for critical issue.', 'fortune500_eng');
