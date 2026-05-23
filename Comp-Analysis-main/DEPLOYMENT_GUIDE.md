# Complete Deployment Guide

This guide covers everything needed to deploy the Comp-Analysis YouTube Competitor Intelligence Dashboard to Vercel with persistent Upstash Redis storage.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend + Backend)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js 14 App                                      │   │
│  │  ├─ Frontend: React 18 Dashboard (page.js)          │   │
│  │  └─ Backend: API Routes (/api/*)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Upstash Redis (Persistent Storage)                 │   │
│  │  ├─ Collections: channels, videos, analyses, etc.   │   │
│  │  └─ Survives cold starts & deployments             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓                                    ↓
    YouTube API v3                    Google Gemini API
    (Channel & Video Data)            (AI Analysis)
```

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- GitHub account (for version control)
- Vercel account (free at https://vercel.com)
- Upstash account (free at https://console.upstash.com)

## Step 1: Local Setup (5 minutes)

### 1.1 Clone or Download Project

```bash
# If using Git
git clone https://github.com/Accountgithubji/Competero-Anlyso.git
cd Competero-Anlyso

# Or extract downloaded ZIP
cd Comp-Analysis-main
```

### 1.2 Install Dependencies

```bash
npm install
```

### 1.3 Verify Build

```bash
npm run build
```

Should complete without errors.

## Step 2: Configure Upstash Redis (10 minutes)

### 2.1 Create Upstash Database

1. Go to https://console.upstash.com
2. Sign up or log in
3. Click **"Create Database"**
4. Configure:
   - **Type**: Redis
   - **Region**: Closest to your users (e.g., `us-east-1`)
   - **Name**: `comp-analysis`
5. Click **"Create"**

### 2.2 Get Credentials

1. Open your database
2. Click **"REST API"** tab
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2.3 Update Local .env

**Option A: Interactive Setup (Recommended)**

```bash
npm run setup:upstash
```

Follow the prompts and enter your credentials.

**Option B: Manual Update**

Edit `.env` file:

```
GOOGLE_API_KEY=AIzaSyCa6cmJGWndUhLwwakoTLiA6ijgfjUfnyY
YOUTUBE_API_KEY=AIzaSyBaaxQr_RrNkWV_A_uXWrBGmGBWpGjaVJA
TRACKED_HANDLES=@collegekaka,@OmEducareServices,@MedicaWing,@SparkupClasses,@GarimaGoelBiology,@dr.anandmani,@Mentorbox,@AddaNEETCounselling,@vidyaneetadda247
OWN_HANDLES=@AddaNEETCounselling,@vidyaneetadda247
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxxxx...
```

### 2.4 Test Locally

```bash
npm run dev
```

Visit http://localhost:3000 and verify the dashboard loads.

## Step 3: Deploy to Vercel (10 minutes)

### 3.1 Create Vercel Project

**Option A: GitHub Integration (Recommended)**

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Add Upstash setup scripts and deployment guides"
   git push origin main
   ```

2. Go to https://vercel.com/dashboard
3. Click **"Add New"** → **"Project"**
4. Select your GitHub repo
5. Click **"Import"**

**Option B: Vercel CLI**

```bash
npm install -g vercel
vercel deploy --prod
```

**Option C: Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Upload your project folder
4. Click **"Deploy"**

### 3.2 Add Environment Variables

1. Go to your Vercel project
2. Click **"Settings"** → **"Environment Variables"**
3. Add these variables:

| Key | Value |
|-----|-------|
| `GOOGLE_API_KEY` | `AIzaSyCa6cmJGWndUhLwwakoTLiA6ijgfjUfnyY` |
| `YOUTUBE_API_KEY` | `AIzaSyBaaxQr_RrNkWV_A_uXWrBGmGBWpGjaVJA` |
| `TRACKED_HANDLES` | `@collegekaka,@OmEducareServices,@MedicaWing,@SparkupClasses,@GarimaGoelBiology,@dr.anandmani,@Mentorbox,@AddaNEETCounselling,@vidyaneetadda247` |
| `OWN_HANDLES` | `@AddaNEETCounselling,@vidyaneetadda247` |
| `UPSTASH_REDIS_REST_URL` | (from Upstash console) |
| `UPSTASH_REDIS_REST_TOKEN` | (from Upstash console) |

4. Click **"Save"**

### 3.3 Trigger Deployment

If using GitHub integration:
```bash
git push origin main
```

Otherwise, redeploy from Vercel dashboard.

## Step 4: Verify Deployment (5 minutes)

### 4.1 Test Health Endpoint

```bash
curl https://your-project.vercel.app/api/health
```

Expected response:
```json
{"ok":true,"service":"yt-competitor"}
```

### 4.2 Test Dashboard

```bash
curl https://your-project.vercel.app/api/dashboard
```

Should return channel and video data.

### 4.3 Run Sync

```bash
curl -X POST https://your-project.vercel.app/api/sync
```

This will:
- Fetch videos from all 9 channels
- Analyze top videos with Gemini AI
- Generate content ideas and keywords
- Save everything to Upstash Redis

Takes ~1-2 minutes.

### 4.4 Check Upstash Console

1. Go to https://console.upstash.com
2. Open your database
3. Click **"Data Browser"**
4. Verify collections exist:
   - `col:channels`
   - `col:videos`
   - `col:analyses`
   - `col:content_ideas`
   - `col:keywords`

## Step 5: Monitor & Maintain

### Daily Operations

**Manual Sync** (recommended):
- Visit your dashboard
- Click "Sync Now" button
- Wait ~1-2 minutes for completion

**API Sync**:
```bash
curl -X POST https://your-project.vercel.app/api/sync
```

### Monitoring

**Vercel Logs**:
```bash
vercel logs
```

**Upstash Metrics**:
- Go to https://console.upstash.com
- View database stats and usage

**Error Tracking**:
- Check Vercel dashboard for failed deployments
- Review API logs for errors

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 error on sync | Check Upstash credentials in Vercel env vars |
| Data not persisting | Verify Upstash database is active |
| Slow performance | Check Upstash rate limits (free tier: 10K commands/day) |
| Build fails | Run `npm run build` locally to debug |

## Step 6: Scaling & Optimization

### When to Upgrade Upstash

- Free tier: 10K commands/day, 256MB storage
- Upgrade when:
  - Hitting rate limits
  - Need more storage
  - Want higher throughput

See https://upstash.com/pricing

### Performance Tips

1. **Reduce sync frequency**: Currently manual only (good!)
2. **Limit video analysis**: Currently analyzes top 5 videos (good!)
3. **Cache results**: Already implemented in local DB
4. **Monitor API quotas**: YouTube API has daily limits

### Cost Breakdown

| Service | Cost |
|---------|------|
| Vercel | Free (up to 100GB bandwidth) |
| Upstash | Free (10K commands/day) |
| YouTube API | Free (10K quota/day) |
| Google Gemini | Free (limited) |
| **Total** | **$0/month** |

## Rollback & Recovery

### Rollback to Previous Deployment

```bash
vercel rollback
```

### Restore from Upstash Backup

Upstash automatically backs up data. Contact support for recovery.

### Manual Backup

```bash
# Export data from Upstash
curl -H "Authorization: Bearer <token>" \
  https://xxx.upstash.io/backup
```

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Configure Upstash Redis
3. ✅ Run first sync
4. ✅ Monitor dashboard
5. 📊 Analyze competitor trends
6. 🎬 Create content based on insights
7. 📈 Track your channel performance

## Support & Resources

- **Project Repo**: https://github.com/Accountgithubji/Competero-Anlyso
- **Vercel Docs**: https://vercel.com/docs
- **Upstash Docs**: https://upstash.com/docs
- **YouTube API**: https://developers.google.com/youtube/v3
- **Gemini API**: https://ai.google.dev

## FAQ

**Q: Can I use this without Upstash?**
A: Yes! Locally it uses JSON files. But for Vercel, you need Upstash for persistence.

**Q: How often should I sync?**
A: Currently manual only. Recommended: 1-2 times daily.

**Q: What if I hit API rate limits?**
A: Upgrade Upstash plan or reduce sync frequency.

**Q: Can I modify the tracked channels?**
A: Yes! Edit `TRACKED_HANDLES` in environment variables.

**Q: Is my data secure?**
A: Yes. Upstash uses encryption and secure tokens.

---

**Last Updated**: May 23, 2026
**Status**: Production Ready ✅
