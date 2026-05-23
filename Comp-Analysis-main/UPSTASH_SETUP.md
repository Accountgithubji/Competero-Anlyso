# Upstash Redis Setup Guide

This guide walks you through setting up Upstash Redis for persistent data storage on Vercel.

## Quick Start (3 Steps)

### Step 1: Create Upstash Redis Database

1. Go to https://console.upstash.com
2. Sign up or log in
3. Click **"Create Database"**
4. Choose:
   - **Type**: Redis
   - **Region**: Select closest to your users (e.g., `us-east-1` for US)
   - **Database Name**: `comp-analysis` (or any name)
5. Click **"Create"**

### Step 2: Get Your Credentials

Once created, you'll see your database dashboard:

1. Click **"REST API"** tab
2. Copy these two values:
   - **UPSTASH_REDIS_REST_URL** (looks like: `https://xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (looks like: `AXXXxxxxx...`)

### Step 3: Add to Vercel

#### Option A: Using Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add two new variables:
   - **Name**: `UPSTASH_REDIS_REST_URL`
     **Value**: (paste from Step 2)
   - **Name**: `UPSTASH_REDIS_REST_TOKEN`
     **Value**: (paste from Step 2)
5. Click **"Save"**

#### Option B: Using Vercel CLI

```bash
# Set environment variables
vercel env add UPSTASH_REDIS_REST_URL
# Paste your URL when prompted

vercel env add UPSTASH_REDIS_REST_TOKEN
# Paste your token when prompted
```

#### Option C: Using Auto-Fetch Script (Requires Vercel Token)

If you already have Vercel environment variables set up:

```powershell
# Set your Vercel credentials
$env:VERCEL_TOKEN = "<your-vercel-token>"
$env:VERCEL_PROJECT_ID = "<your-project-id>"

# Run the fetch script
.\scripts\fetch-upstash-env.ps1
```

**Get your Vercel token:**
- Go to https://vercel.com/account/tokens
- Create a new token with `read` access to environment variables
- Copy the token

**Find your project ID:**
- Go to https://vercel.com/dashboard
- Open your project
- The URL will be: `vercel.com/<team>/<project-id>`

## Verify Setup

### Local Development

1. Update your `.env` file with Upstash credentials:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXxxxxx...
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

3. Test the connection:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"ok":true,"service":"yt-competitor"}`

### Production (Vercel)

1. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

2. Check logs:
   ```bash
   vercel logs
   ```

3. Test the endpoint:
   ```bash
   curl https://your-project.vercel.app/api/health
   ```

## How It Works

### Local Development (No Upstash)
- Uses in-memory database + `.local-db/` JSON files
- Data persists between restarts
- Perfect for testing

### Production (Vercel + Upstash)
- Uses Upstash Redis for persistent storage
- Data survives serverless cold starts
- Shared across all deployments

### Automatic Fallback
The app automatically detects which mode to use:
- If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set → Uses Redis
- Otherwise → Falls back to local JSON files

## Troubleshooting

### "Redis connection failed"
- Check that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set correctly
- Verify they're in Vercel environment variables (not just local `.env`)
- Check Upstash console to ensure database is running

### "Data not persisting"
- Verify you're using Upstash credentials (not local mode)
- Check Vercel logs: `vercel logs`
- Ensure database is active in Upstash console

### "Sync takes too long"
- Upstash free tier has rate limits
- Add delays between API calls (already implemented)
- Consider upgrading to paid plan for higher limits

## Pricing

**Upstash Free Tier:**
- 10,000 commands/day
- 256MB storage
- Perfect for development and small projects

**Paid Plans:**
- Start at $0.20/100K commands
- Unlimited storage options
- See https://upstash.com/pricing

## Next Steps

1. ✅ Create Upstash database
2. ✅ Add credentials to Vercel
3. ✅ Deploy to Vercel
4. ✅ Test sync endpoint: `POST /api/sync`
5. ✅ Monitor data in Upstash console

## Support

- **Upstash Docs**: https://upstash.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Project Issues**: Check GitHub issues

---

**Last Updated**: May 23, 2026
