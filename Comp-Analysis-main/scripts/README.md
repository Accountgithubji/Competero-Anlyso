# Setup Scripts

Helper scripts for configuring Upstash Redis and deploying to Vercel.

## Available Scripts

### 1. Interactive Setup Wizard (Recommended)

```bash
npm run setup:upstash
```

**What it does:**
- Guides you through entering Upstash credentials
- Tests the connection
- Updates your `.env` file automatically
- Shows next steps

**Best for:** First-time setup, interactive experience

**Example:**
```
$ npm run setup:upstash

╔════════════════════════════════════════════════════════════╗
║         Upstash Redis Setup Wizard                         ║
║    Configure persistent database for Vercel deployment     ║
╚════════════════════════════════════════════════════════════╝

📋 This wizard will help you set up Upstash Redis.

Prerequisites:
  1. Upstash account (free at https://console.upstash.com)
  2. Redis database created
  3. REST API credentials copied

Do you have your Upstash credentials ready? (yes/no): yes

🔐 Enter your Upstash credentials:

UPSTASH_REDIS_REST_URL: https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN: AXXXxxxxx...

🧪 Testing connection...
✅ Connection successful!

💾 Updating .env file...
✅ .env file updated

📝 Next steps:
  1. Restart your dev server: npm run dev
  2. Test the connection: curl http://localhost:3000/api/health
  3. Deploy to Vercel: vercel deploy --prod
```

### 2. Auto-Fetch from Vercel (Node.js)

```bash
npm run setup:upstash:fetch -- <vercel-token> <project-id>
```

**What it does:**
- Fetches Upstash credentials from Vercel environment variables
- Updates your local `.env` file
- No manual copy-paste needed

**Requirements:**
- Vercel token (get from https://vercel.com/account/tokens)
- Vercel project ID (from dashboard URL)
- Upstash credentials already added to Vercel

**Example:**
```bash
npm run setup:upstash:fetch -- "vercel_xxx" "prj_yyy"
```

**Or with environment variables:**
```bash
$env:VERCEL_TOKEN = "vercel_xxx"
$env:VERCEL_PROJECT_ID = "prj_yyy"
npm run setup:upstash:fetch
```

### 3. Auto-Fetch from Vercel (PowerShell)

```powershell
.\scripts\fetch-upstash-env.ps1 -VercelToken "<token>" -ProjectId "<project-id>"
```

**What it does:**
- Same as Node.js version but using PowerShell
- Better integration with Windows environment

**Example:**
```powershell
.\scripts\fetch-upstash-env.ps1 -VercelToken "vercel_xxx" -ProjectId "prj_yyy"
```

**Or with environment variables:**
```powershell
$env:VERCEL_TOKEN = "vercel_xxx"
$env:VERCEL_PROJECT_ID = "prj_yyy"
.\scripts\fetch-upstash-env.ps1
```

## Step-by-Step Guide

### First Time Setup

1. **Create Upstash Database**
   - Go to https://console.upstash.com
   - Create a new Redis database
   - Copy REST API credentials

2. **Run Setup Wizard**
   ```bash
   npm run setup:upstash
   ```
   - Enter your credentials when prompted
   - Script tests connection and updates `.env`

3. **Restart Dev Server**
   ```bash
   npm run dev
   ```

4. **Test Connection**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Deploy to Vercel

1. **Add Credentials to Vercel**
   - Go to https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Deploy**
   ```bash
   vercel deploy --prod
   ```

3. **Verify**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```

## Troubleshooting

### "Connection failed"
- Verify credentials are correct
- Check Upstash console to ensure database is running
- Try the interactive wizard: `npm run setup:upstash`

### "Invalid token"
- Get a new Vercel token: https://vercel.com/account/tokens
- Ensure it has environment variable read permissions

### "Project not found"
- Find your project ID in Vercel dashboard URL
- Format: `vercel.com/<team>/<project-id>`

### "ENOENT: no such file or directory, open '.env'"
- Create `.env` file first: `cp .env.example .env`
- Then run setup script

## File Locations

```
scripts/
├── setup-upstash.js          # Interactive wizard (Node.js)
├── fetch-upstash-env.js      # Auto-fetch from Vercel (Node.js)
├── fetch-upstash-env.ps1     # Auto-fetch from Vercel (PowerShell)
└── README.md                 # This file
```

## Environment Variables

After running any setup script, your `.env` file will contain:

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxxxx...
```

These are used by `lib/localDb.js` to connect to Upstash Redis.

## Security Notes

- Never commit `.env` file to Git (already in `.gitignore`)
- Keep tokens private and secure
- Use Vercel's environment variable encryption for production
- Rotate tokens periodically

## Support

- **Upstash Docs**: https://upstash.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Project Issues**: Check GitHub issues

---

**Last Updated**: May 23, 2026
