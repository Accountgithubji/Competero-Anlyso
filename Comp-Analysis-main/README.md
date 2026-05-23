# Comp-Analysis - YouTube Competitor Intelligence Dashboard

A full-stack Next.js application for analyzing YouTube competitor channels, extracting audience insights, and generating AI-powered content recommendations.

## 🎯 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Frontend | ✅ Running | http://localhost:3000 |
| API Code | ✅ Ready | All routes compiled |
| Dependencies | ✅ Installed | 284 packages |
| MongoDB | ❌ Needed | Connection required |

---

## 🚀 Quick Start (5 minutes)

### Step 1: Set Up MongoDB

**Option A: MongoDB Atlas (Cloud) - RECOMMENDED**
```
1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Create M0 free cluster
4. Create user: admin / password123
5. Get connection string
6. Copy to .env as MONGO_URL
```

**Option B: Local MongoDB**
```
1. Download: https://www.mongodb.com/try/download/community
2. Install and start service
3. Keep .env as is (mongodb://localhost:27017)
```

### Step 2: Update .env

Replace `MONGO_URL` with your connection string:

```env
# MongoDB Atlas example:
MONGO_URL=mongodb+srv://admin:password123@cluster0.abc123.mongodb.net/yt_competitor?retryWrites=true&w=majority

# Or local:
MONGO_URL=mongodb://localhost:27017
```

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Test

1. Open http://localhost:3000
2. Click "Sync" button
3. Wait for data to load

---

## 📋 Features

### Dashboard
- **Channel Rankings** - Compare your channels vs competitors
- **Performance Metrics** - Views, likes, comments in last 48h
- **Top Videos** - Best performing competitor videos
- **Benchmark** - Where your channel ranks

### AI Analysis
- **Comment Sentiment** - Positive/negative/neutral breakdown
- **Pain Points** - Student frustrations and confusions
- **Discussion Topics** - What audience is talking about
- **Content Ideas** - AI-generated video ideas based on gaps

### Keyword Research
- **Trending Keywords** - Most discussed topics
- **Opportunity Keywords** - Gaps competitors miss
- **Pain Point Keywords** - Long-tail searches from comments
- **YouTube Metrics** - Views, competition, opportunity score

### Video Analysis
- Click any video to see:
  - Comment sentiment analysis
  - Top discussion points
  - Student pain points
  - Engagement metrics

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14.2.3** - React framework
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **Shadcn/UI** - 45+ pre-built components
- **Recharts** - Data visualization
- **React Hook Form** - Form management

### Backend
- **Next.js API Routes** - Serverless backend
- **MongoDB** - Database
- **Google Gemini API** - AI analysis
- **YouTube Data API v3** - Video data

### Deployment
- **Standalone mode** - Ready for production
- **CORS enabled** - Cross-origin requests
- **Memory optimized** - 4GB Node.js limit

---

## 📁 Project Structure

```
app/
├── api/[[...path]]/route.js    # Backend API (all routes)
├── page.js                      # Dashboard UI
├── layout.js                    # Root layout
└── globals.css                  # Global styles

components/ui/                   # 45+ Shadcn UI components
hooks/                          # Custom React hooks
lib/                            # Utilities
```

---

## 🔌 API Endpoints

All endpoints under `/api/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/dashboard` | GET | Dashboard data |
| `/videos` | GET | All videos |
| `/sync` | POST | Sync YouTube data |
| `/keywords/regenerate` | POST | Regenerate keywords |
| `/keywords/enrich` | POST | Enrich with metrics |
| `/ideas/regenerate` | POST | Regenerate ideas |
| `/videos/:id/analyze` | POST | Analyze video |

---

## 🔑 Environment Variables

```env
# MongoDB (REQUIRED - needs setup)
MONGO_URL=mongodb://localhost:27017
DB_NAME=yt_competitor

# YouTube API (already configured)
YOUTUBE_API_KEY=AIzaSyBaaxQr_RrNkWV_A_uXWrBGmGBWpGjaVJA

# Google Gemini API (already configured)
GOOGLE_API_KEY=AIzaSyCa6cmJGWndUhLwwakoTLiA6ijgfjUfnyY

# Channels to track
TRACKED_HANDLES=@collegekaka,@OmEducareServices,@MedicaWing,@SparkupClasses,@GarimaGoelBiology,@dr.anandmani,@Mentorbox

# Your channels
OWN_HANDLES=@AddaNEETCounselling,@vidyaneetadda247

# Niche
CHANNEL_NICHE=NEET/Medical Education
```

---

## 📚 Available Commands

```bash
# Development
npm run dev              # Start dev server (with memory optimization)
npm run dev:no-reload   # Dev server without reload optimization

# Production
npm run build           # Build for production
npm start              # Start production server
```

---

## 🐛 Troubleshooting

### 500 Errors on API Calls
**Cause:** MongoDB not running or connection string wrong
**Fix:**
1. Verify MongoDB is running
2. Check `.env` has correct `MONGO_URL`
3. Restart dev server

### "MongoTopologyClosedError"
**Cause:** MongoDB connection failed
**Fix:**
- For Atlas: Check internet, verify connection string
- For Local: Start MongoDB service

### "Authentication failed"
**Cause:** Wrong username/password in connection string
**Fix:**
- Verify credentials in `.env`
- For Atlas: Check IP whitelist (should be 0.0.0.0/0)

### Port 3000 Already in Use
**Fix:**
```powershell
Get-Process -Id <PID> | Stop-Process -Force
npm run dev
```

---

## 📖 Setup Guides

- **QUICK_START.md** - 5-minute setup guide
- **BACKEND_SETUP.md** - Detailed MongoDB setup
- **MONGODB_SETUP.md** - Installation options
- **STATUS.md** - Current project status

---

## 🎓 How It Works

### Sync Process
1. **Fetch Channels** - Resolve YouTube handles to channel IDs
2. **Get Videos** - Fetch last 48 hours of videos
3. **Analyze Comments** - Use Gemini AI to analyze sentiment
4. **Extract Insights** - Pain points, discussion topics
5. **Generate Ideas** - AI creates content ideas
6. **Keyword Research** - Analyze trending keywords
7. **Store Data** - Save everything to MongoDB

### Dashboard Display
1. **Channel Rankings** - Sorted by views in last 48h
2. **Performance Metrics** - Aggregated stats
3. **Top Videos** - Best performing content
4. **Keyword Insights** - Trending and opportunity keywords
5. **Content Ideas** - AI-generated video ideas

---

## 🔐 Security Notes

- API keys are in `.env` (not committed to git)
- MongoDB connection string in `.env`
- CORS headers configured for development
- No sensitive data in frontend code

---

## 📊 Data Flow

```
YouTube API
    ↓
Fetch Videos & Comments
    ↓
Gemini AI Analysis
    ↓
MongoDB Storage
    ↓
Frontend Dashboard
```

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set all `.env` variables in your hosting platform
- Use MongoDB Atlas for cloud database
- Ensure API keys are secure

### Hosting Options
- Vercel (recommended for Next.js)
- AWS Lambda
- Google Cloud Run
- Any Node.js hosting

---

## 📝 Changes Made

✅ Removed OpenAI dependency
✅ Kept Gemini API as sole AI provider
✅ Fixed missing `classifyVideo` function
✅ Installed all dependencies
✅ Started dev server
✅ Created comprehensive setup guides

---

## 🎯 Next Steps

1. **Set up MongoDB** (Atlas or Local)
2. **Update .env** with connection string
3. **Restart dev server**
4. **Click "Sync"** to fetch YouTube data
5. **View insights** on dashboard

---

## 📞 Support

For issues:
1. Check setup guides in project root
2. Verify `.env` configuration
3. Check browser console (F12) for errors
4. Check server logs in terminal

---

## 📄 License

This project is private and for educational purposes.

---

**Status:** Frontend ✅ | Backend Code ✅ | MongoDB ❌

**Next Action:** Set up MongoDB and update `.env`

Happy analyzing! 🎬📊
