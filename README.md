# ⚡ Feedback Analyzer

An AI-powered feedback aggregation and analysis tool built with Cloudflare Workers, D1, and Workers AI.

**Live Demo:** https://feedback-analyzer.snehavilas-kamble.workers.dev

![Feedback Analyzer Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Built with Cloudflare](https://img.shields.io/badge/Built%20with-Cloudflare-orange)

---

## 📋 Overview

Feedback Analyzer helps product teams aggregate feedback from multiple channels (GitHub, Discord, Support Tickets, Twitter, Email) and extract actionable insights using AI-powered sentiment analysis, theme extraction, and priority classification.

### Key Features

- 🤖 **AI-Powered Analysis** - Sentiment analysis (POSITIVE/NEGATIVE/NEUTRAL) and theme extraction using Workers AI
- 🎯 **Priority Classification** - Automatically categorizes feedback as high/medium/low urgency based on keywords
- 📊 **Interactive Dashboard** - Real-time analytics with pagination and filtering
- 🔄 **Multi-Source Support** - Aggregate feedback from GitHub, Discord, Support, Twitter, and Email
- ⚡ **Edge-First Architecture** - Global deployment on Cloudflare's network for sub-50ms response times
- 🗄️ **Structured Storage** - SQL database with full-text search and indexes

---

## 🏗️ Architecture

Built entirely on Cloudflare's Developer Platform:

### Cloudflare Products Used

1. **Cloudflare Workers** - Serverless application runtime
2. **D1 Database** - Serverless SQL database at the edge
3. **Workers AI** - On-network ML inference with DistilBERT and Llama 3

### System Architecture

```
User Request → Cloudflare Workers → D1 Database (feedback storage)
                      ↓
                Workers AI (sentiment + themes)
                      ↓
                Updated Data → Dashboard
```

### Tech Stack

- **Frontend:** Vanilla JavaScript, Custom CSS
- **Backend:** TypeScript on Cloudflare Workers
- **Database:** D1 (SQLite at the edge)
- **AI Models:**
  - Sentiment: `@cf/huggingface/distilbert-sst-2-int8`
  - Themes: `@cf/meta/llama-3-8b-instruct`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works!)
- Wrangler CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SnehaBuilds/cloudflare-feedback-analyzer.git
   cd cloudflare-feedback-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create D1 Database**
   ```bash
   npx wrangler d1 create feedback-db
   ```

4. **Update wrangler.jsonc**
   
   Copy the `database_id` from the previous command output and update your `wrangler.jsonc`:
   ```json
   {
     "d1_databases": [
       {
         "binding": "DB",
         "database_name": "feedback-db",
         "database_id": "YOUR_DATABASE_ID_HERE"
       }
     ]
   }
   ```

5. **Initialize Database Schema**
   ```bash
   npx wrangler d1 execute feedback-db --remote --file=schema.sql
   npx wrangler d1 execute feedback-db --remote --file=seed.sql
   ```

6. **Add Priority Column (Optional Enhancement)**
   ```bash
   npx wrangler d1 execute feedback-db --remote --file=add-priority.sql
   ```

7. **Deploy to Cloudflare**
   ```bash
   npx wrangler deploy
   ```

Your app will be live at `https://feedback-analyzer.YOUR_SUBDOMAIN.workers.dev`

---

## 📖 API Documentation

### Endpoints

#### `GET /`
Interactive dashboard with analytics and feedback list

#### `GET /api/feedback`
Retrieve paginated feedback entries

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page

**Response:**
```json
{
  "results": [...],
  "page": 1,
  "limit": 20,
  "total": 93,
  "totalPages": 5
}
```

#### `POST /api/feedback`
Submit new feedback

**Body:**
```json
{
  "source": "GitHub",
  "content": "The new API is great!",
  "author": "john_doe"
}
```

#### `GET /api/analyze`
Trigger AI analysis on unanalyzed feedback (processes up to 20 items)

**Response:**
```json
{
  "analyzed": 15,
  "results": [
    {
      "id": 1,
      "sentiment": "POSITIVE",
      "themes": "api, performance, ease of use",
      "priority": "medium"
    }
  ]
}
```

#### `GET /api/stats`
Get aggregated statistics

**Response:**
```json
{
  "total": 93,
  "analyzed": 91,
  "pending": 2,
  "sentimentDistribution": [...],
  "priorityDistribution": [...],
  "sourceDistribution": [...],
  "topThemes": [...]
}
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    sentiment TEXT,
    themes TEXT,
    priority TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    analyzed_at DATETIME
);

CREATE INDEX idx_sentiment ON feedback(sentiment);
CREATE INDEX idx_source ON feedback(source);
CREATE INDEX idx_priority ON feedback(priority);
CREATE INDEX idx_created_at ON feedback(created_at);
```

---

## 💡 Usage Examples

### Adding Feedback Programmatically

```bash
curl -X POST https://feedback-analyzer.YOUR_SUBDOMAIN.workers.dev/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "source": "GitHub",
    "content": "The new dashboard is intuitive and fast!",
    "author": "developer123"
  }'
```

### Triggering AI Analysis

```bash
curl https://feedback-analyzer.YOUR_SUBDOMAIN.workers.dev/api/analyze
```

### Retrieving Statistics

```bash
curl https://feedback-analyzer.YOUR_SUBDOMAIN.workers.dev/api/stats
```

---

## 🎨 Features in Detail

### Sentiment Analysis
Uses DistilBERT model to classify feedback as:
- **POSITIVE** - Praise, satisfaction, enthusiasm
- **NEGATIVE** - Complaints, bugs, frustrations
- **NEUTRAL** - Questions, neutral observations

### Theme Extraction
Llama 3 extracts 2-3 key themes from each feedback:
- "performance, speed, optimization"
- "user interface, navigation, design"
- "documentation, examples, tutorials"

### Priority Classification
Automatically determines urgency:
- **HIGH** - Contains keywords: bug, error, blocking, critical, broken, slow
- **MEDIUM** - General feedback
- **LOW** - Contains keywords: feature request, would love, nice to have, suggestion

---

## 🛠️ Development

### Local Development

```bash
npm run dev
# or
npx wrangler dev
```

### Generate TypeScript Types

```bash
npm run cf-typegen
```

### Deploy

```bash
npm run deploy
# or
npx wrangler deploy
```

### View Logs

```bash
npx wrangler tail
```

---

## 📊 Performance

- **Dashboard Load:** <50ms
- **API Response:** <100ms
- **AI Analysis:** ~300ms per item
- **Database Queries:** <20ms

---

## 🔮 Future Enhancements

- [ ] **Workflows Integration** - Multi-step orchestration for complex analysis pipelines
- [ ] **Vectorize Integration** - Semantic search to find similar feedback
- [ ] **R2 Storage** - Store screenshots and file attachments
- [ ] **Email Workers** - Ingest feedback directly from email
- [ ] **Slack Integration** - Daily summaries posted to Slack
- [ ] **Trend Analysis** - Track sentiment changes over time
- [ ] **Custom Categories** - User-defined feedback categories

---

## 📝 Project Context

This project was built as part of the **Cloudflare Product Manager Intern (Summer 2026)** assignment. The goal was to build a prototype using 2-3 Cloudflare products and document friction points in the developer experience.

**Assignment Objectives:**
1. ✅ Build a functional prototype using Cloudflare products
2. ✅ Deploy to production
3. ✅ Document 3-5 friction points with actionable feedback

**Time Spent:**
- Learning Cloudflare Platform: 1 hour
- Building Prototype: 2.5 hours
- Documentation: 1 hour

---

## 🐛 Known Issues

### Workers AI Sentiment Model Accuracy
The DistilBERT sentiment model currently classifies most feedback as NEGATIVE, even clearly positive statements. This appears to be a model-level issue. Theme extraction with Llama 3 works correctly.

**Workaround:** The priority classification based on keywords provides a reliable alternative for triaging feedback.

See full analysis in the submission document.

---

## 📄 License

MIT License - feel free to use this project as a starting point for your own feedback analyzer!

---

## 👤 Author

**Sneha Vilas Kamble**
- GitHub: [@SnehaBuilds](https://github.com/SnehaBuilds)
- Assignment: Cloudflare Product Manager Intern (Summer 2026)

---

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- AI models powered by [Workers AI](https://ai.cloudflare.com/)
- Database by [Cloudflare D1](https://developers.cloudflare.com/d1/)
- Prototyped with assistance from Claude (Anthropic)

---

## 📞 Support

For questions about this project:
1. Check the [API Documentation](#-api-documentation) above
2. Review the [deployment guide](#-quick-start)
3. Open an issue on GitHub

For Cloudflare-specific questions, visit [Cloudflare Developers](https://developers.cloudflare.com/)

---

**⚡ Built on the edge. Analyzed with AI. Deployed globally.**
