/**
 * Feedback Analyzer - Cloudflare Workers Application
 * Built with Workers, D1, and Workers AI
 */

interface Env {
  DB: D1Database;
  AI: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === '/' || url.pathname === '') {
        return new Response(getHTML(), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.pathname === '/api/feedback' && request.method === 'GET') {
        return handleGetFeedback(env, corsHeaders, url);
      }

      if (url.pathname === '/api/feedback' && request.method === 'POST') {
        return handlePostFeedback(request, env, corsHeaders);
      }

      if (url.pathname === '/api/analyze') {
        return handleAnalyze(env, corsHeaders);
      }

      if (url.pathname === '/api/stats') {
        return handleStats(env, corsHeaders);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function handleGetFeedback(env: Env, corsHeaders: Record<string, string>, url: URL): Promise<Response> {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const { results } = await env.DB.prepare(
    'SELECT * FROM feedback ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM feedback').first();
  const total = (totalResult as any).total;

  return new Response(JSON.stringify({
    results,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handlePostFeedback(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const body: any = await request.json();
  const { source, content, author } = body;

  if (!source || !content) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await env.DB.prepare(
    'INSERT INTO feedback (source, content, author) VALUES (?, ?, ?)'
  ).bind(source, content, author || 'Anonymous').run();

  return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleAnalyze(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM feedback WHERE sentiment IS NULL LIMIT 20'
  ).all();

  if (results.length === 0) {
    return new Response(JSON.stringify({ message: 'No feedback to analyze' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const analyzed: any[] = [];

  for (const feedback of results) {
    try {
      // Sentiment Analysis
      const sentimentResponse: any = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', {
        text: (feedback as any).content,
      });

      // Theme extraction
      const themeResponse: any = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'Extract 2-3 key themes or topics from this feedback. Return only a comma-separated list of themes, nothing else.',
          },
          {
            role: 'user',
            content: (feedback as any).content,
          },
        ],
      });

      const sentiment = sentimentResponse[0]?.label || 'NEUTRAL';
      const themes = themeResponse.response || 'general';
      
      // Determine priority based on content
      const content = ((feedback as any).content || '').toLowerCase();
      let priority = 'medium';
      
      if (content.includes('bug') || content.includes('error') || content.includes('blocking') || 
          content.includes('critical') || content.includes('cannot') || content.includes('broken') ||
          content.includes('slow') || content.includes('crash')) {
        priority = 'high';
      } else if (content.includes('would love') || content.includes('feature request') || 
                 content.includes('suggestion') || content.includes('nice to have')) {
        priority = 'low';
      }

      await env.DB.prepare(
        'UPDATE feedback SET sentiment = ?, themes = ?, priority = ?, analyzed_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(sentiment, themes, priority, (feedback as any).id).run();

      analyzed.push({ id: (feedback as any).id, sentiment, themes, priority });
    } catch (error) {
      console.error('Analysis error for feedback', (feedback as any).id, error);
    }
  }

  return new Response(JSON.stringify({ analyzed: analyzed.length, results: analyzed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleStats(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM feedback').first();
  
  const analyzedResult = await env.DB.prepare(
    'SELECT COUNT(*) as analyzed FROM feedback WHERE sentiment IS NOT NULL'
  ).first();
  
  const sentimentResult = await env.DB.prepare(
    'SELECT sentiment, COUNT(*) as count FROM feedback WHERE sentiment IS NOT NULL GROUP BY sentiment'
  ).all();
  
  const priorityResult = await env.DB.prepare(
    'SELECT priority, COUNT(*) as count FROM feedback GROUP BY priority'
  ).all();

  const sourceResult = await env.DB.prepare(
    'SELECT source, COUNT(*) as count FROM feedback GROUP BY source'
  ).all();

  const recentResult = await env.DB.prepare(
    'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 5'
  ).all();

  const themesResult = await env.DB.prepare(
    'SELECT themes FROM feedback WHERE themes IS NOT NULL'
  ).all();

  const themeMap: Record<string, number> = {};
  themesResult.results.forEach((row: any) => {
    if (row.themes) {
      row.themes.split(',').forEach((theme: string) => {
        const cleaned = theme.trim().toLowerCase();
        themeMap[cleaned] = (themeMap[cleaned] || 0) + 1;
      });
    }
  });

  const topThemes = Object.entries(themeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => ({ theme, count }));

  const total = (totalResult as any).total;
  const analyzed = (analyzedResult as any).analyzed;

  return new Response(JSON.stringify({
    total: total,
    analyzed: analyzed,
    pending: total - analyzed,
    sentimentDistribution: sentimentResult.results,
    priorityDistribution: priorityResult.results,
    sourceDistribution: sourceResult.results,
    recentFeedback: recentResult.results,
    topThemes,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Analyzer</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0a0e27; --card: #1a2151; --accent: #00d9ff;
      --orange: #ff6b35; --text: #f0f4f8; --muted: #94a3b8;
    }
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    h1 {
      font-family: 'Space Mono', monospace;
      font-size: 3rem;
      background: linear-gradient(135deg, var(--orange), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    button {
      font-family: 'Space Mono', monospace;
      padding: 0.75rem 1.5rem;
      border: 2px solid var(--accent);
      background: transparent;
      color: var(--accent);
      cursor: pointer;
      font-weight: 700;
      text-transform: uppercase;
      transition: all 0.3s;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    button:hover:not(:disabled) {
      background: var(--accent);
      color: var(--bg);
      transform: translateY(-2px);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .stat-card {
      background: var(--card);
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid var(--accent);
    }
    .stat-value {
      font-family: 'Space Mono', monospace;
      font-size: 2.5rem;
      color: var(--accent);
    }
    .feedback-item {
      background: var(--card);
      padding: 1.5rem;
      margin: 1rem 0;
      border-radius: 6px;
      border-left: 3px solid var(--orange);
    }
    .feedback-item.priority-high {
      border-left-color: #ef4444;
      border-left-width: 5px;
    }
    .feedback-item.priority-low {
      border-left-color: #6366f1;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .positive { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
    .negative { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
    .neutral { background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid #94a3b8; }
    .priority-high { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
    .priority-medium { background: rgba(251, 191, 36, 0.2); color: #f59e0b; border: 1px solid #f59e0b; }
    .priority-low { background: rgba(99, 102, 241, 0.2); color: #6366f1; border: 1px solid #6366f1; }
    .pagination {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      justify-content: center;
      margin: 2rem 0;
      font-family: 'Space Mono', monospace;
    }
    .pagination button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }
    .page-info {
      color: var(--muted);
      margin: 0 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Feedback Analyzer</h1>
    <p style="color: var(--muted); font-family: 'Space Mono', monospace; margin-bottom: 2rem;">
      Powered by Cloudflare Workers, D1, and Workers AI
    </p>
    <div>
      <button onclick="loadData()">🔄 Refresh</button>
      <button onclick="analyze()">🤖 Analyze with AI</button>
      <button onclick="addSample()">➕ Add Sample</button>
    </div>
    <div id="content">
      <p style="color: var(--muted); margin-top: 2rem;">Loading...</p>
    </div>
  </div>
  <script>
    let currentPage = 1;
    let totalPages = 1;
    
    loadData();
    
    async function loadData(page = 1) {
      currentPage = page;
      try {
        const [stats, feedbackData] = await Promise.all([
          fetch('/api/stats').then(r => r.json()),
          fetch(\`/api/feedback?page=\${page}&limit=20\`).then(r => r.json())
        ]);
        
        const feedback = feedbackData.results;
        totalPages = feedbackData.totalPages;
        
        document.getElementById('content').innerHTML = \`
          <div class="stats-grid">
            <div class="stat-card">
              <div style="color: var(--muted); text-transform: uppercase; font-size: 0.85rem;">Total</div>
              <div class="stat-value">\${stats.total}</div>
            </div>
            <div class="stat-card">
              <div style="color: var(--muted); text-transform: uppercase; font-size: 0.85rem;">Analyzed</div>
              <div class="stat-value">\${stats.analyzed}</div>
            </div>
            <div class="stat-card">
              <div style="color: var(--muted); text-transform: uppercase; font-size: 0.85rem;">High Priority</div>
              <div class="stat-value" style="color: #ef4444;">\${stats.priorityDistribution?.find(p => p.priority === 'high')?.count || 0}</div>
            </div>
            <div class="stat-card">
              <div style="color: var(--muted); text-transform: uppercase; font-size: 0.85rem;">Pending</div>
              <div class="stat-value">\${stats.pending}</div>
            </div>
          </div>
          
          <div class="pagination">
            <button onclick="loadData(1)" \${currentPage === 1 ? 'disabled' : ''}>⏮️ First</button>
            <button onclick="loadData(\${currentPage - 1})" \${currentPage === 1 ? 'disabled' : ''}>◀️ Prev</button>
            <span class="page-info">Page \${currentPage} of \${totalPages}</span>
            <button onclick="loadData(\${currentPage + 1})" \${currentPage === totalPages ? 'disabled' : ''}>Next ▶️</button>
            <button onclick="loadData(\${totalPages})" \${currentPage === totalPages ? 'disabled' : ''}>Last ⏭️</button>
          </div>
          
          <h2 style="margin: 2rem 0 1rem; font-family: 'Space Mono', monospace; color: var(--orange);">
            Feedback (Showing \${(currentPage - 1) * 20 + 1}-\${Math.min(currentPage * 20, feedbackData.total)} of \${feedbackData.total})
          </h2>
          \${feedback.map(f => \`
            <div class="feedback-item priority-\${f.priority || 'medium'}">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                <strong style="color: var(--accent);">\${f.source}</strong>
                <div style="display: flex; gap: 0.5rem;">
                  \${f.priority ? \`<span class="badge priority-\${f.priority}">\${f.priority.toUpperCase()}</span>\` : ''}
                  \${f.sentiment ? \`<span class="badge \${f.sentiment.toLowerCase()}">\${f.sentiment}</span>\` : '<span style="color: var(--muted); font-size: 0.85rem;">Not analyzed</span>'}
                </div>
              </div>
              <p>\${f.content}</p>
              \${f.themes ? \`<p style="margin-top: 0.5rem; color: var(--muted); font-size: 0.9rem;">
                Themes: \${f.themes}
              </p>\` : ''}
              <p style="margin-top: 0.5rem; color: var(--muted); font-size: 0.8rem;">
                \${f.author || 'Anonymous'} • \${new Date(f.created_at).toLocaleDateString()}
              </p>
            </div>
          \`).join('')}
          
          <div class="pagination">
            <button onclick="loadData(1)" \${currentPage === 1 ? 'disabled' : ''}>⏮️ First</button>
            <button onclick="loadData(\${currentPage - 1})" \${currentPage === 1 ? 'disabled' : ''}>◀️ Prev</button>
            <span class="page-info">Page \${currentPage} of \${totalPages}</span>
            <button onclick="loadData(\${currentPage + 1})" \${currentPage === totalPages ? 'disabled' : ''}>Next ▶️</button>
            <button onclick="loadData(\${totalPages})" \${currentPage === totalPages ? 'disabled' : ''}>Last ⏭️</button>
          </div>
        \`;
      } catch (error) {
        document.getElementById('content').innerHTML = '<p style="color: #ef4444;">Error loading data. Make sure database is initialized.</p>';
      }
    }
    
    async function analyze() {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '⏳ Analyzing...';
      try {
        await fetch('/api/analyze');
        alert('Analysis complete! Refreshing...');
        setTimeout(() => loadData(currentPage), 1000);
      } catch (error) {
        alert('Error during analysis');
      } finally {
        btn.disabled = false;
        btn.textContent = '🤖 Analyze with AI';
      }
    }
    
    async function addSample() {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Testing',
          content: 'This is a test feedback entry added via the dashboard!',
          author: 'demo_user'
        })
      });
      loadData(1);
    }
  </script>
</body>
</html>`;
}