# Quick Deployment Checklist

## Pre-Deployment (5 minutes)

- [ ] Create Upstash Redis database: https://console.upstash.com
- [ ] Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- [ ] Add to Vercel environment variables: https://vercel.com/dashboard

## Deploy to Vercel

### Option 1: GitHub Integration (Recommended)
```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys on push
# Check: https://vercel.com/dashboard
```

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod
```

### Option 3: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repo
4. Add environment variables
5. Click "Deploy"

## Post-Deployment (2 minutes)

- [ ] Test health endpoint: `https://your-project.vercel.app/api/health`
- [ ] Test dashboard: `https://your-project.vercel.app/api/dashboard`
- [ ] Run sync: `POST https://your-project.vercel.app/api/sync`
- [ ] Check Upstash console for data

## Environment Variables Required

```
GOOGLE_API_KEY=AIzaSyCa6cmJGWndUhLwwakoTLiA6ijgfjUfnyY
YOUTUBE_API_KEY=AIzaSyBaaxQr_RrNkWV_A_uXWrBGmGBWpGjaVJA
TRACKED_HANDLES=@collegekaka,@OmEducareServices,@MedicaWing,@SparkupClasses,@GarimaGoelBiology,@dr.anandmani,@Mentorbox,@AddaNEETCounselling,@vidyaneetadda247
OWN_HANDLES=@AddaNEETCounselling,@vidyaneetadda247
UPSTASH_REDIS_REST_URL=<from-upstash-console>
UPSTASH_REDIS_REST_TOKEN=<from-upstash-console>
```

## Verify Deployment

```bash
# Test health
curl https://your-project.vercel.app/api/health

# Expected response:
# {"ok":true,"service":"yt-competitor"}

# Test dashboard (should return channel data)
curl https://your-project.vercel.app/api/dashboard

# Trigger sync (takes ~1 minute)
curl -X POST https://your-project.vercel.app/api/sync
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 error on `/api/sync` | Check Upstash credentials in Vercel env vars |
| Data not persisting | Verify Upstash database is active |
| Slow sync | Free tier has rate limits; add delays or upgrade |
| Build fails | Check `npm run build` locally first |

## Rollback

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy specific commit
vercel deploy --prod <commit-hash>
```

## Monitoring

- **Vercel Logs**: `vercel logs`
- **Upstash Console**: https://console.upstash.com
- **Real-time Metrics**: https://vercel.com/dashboard → Project → Analytics

---

**Estimated Time**: 10 minutes total
**Cost**: Free (Upstash free tier + Vercel free tier)
