# Backend Setup - MongoDB Configuration

## Current Status
✅ Frontend: Running on http://localhost:3000
❌ Backend: Needs MongoDB connection

---

## 🚀 RECOMMENDED: MongoDB Atlas (Cloud)

### Why Atlas?
- ✅ No installation needed
- ✅ Free tier (M0) - always free
- ✅ Works from anywhere
- ✅ Automatic backups
- ✅ Takes 5 minutes to set up

### Setup Steps

#### 1. Create Account (2 minutes)
```
https://www.mongodb.com/cloud/atlas
→ Sign Up
→ Create account with email or Google
```

#### 2. Create Free Cluster (3 minutes)
```
Dashboard → Create → M0 Free
→ Select region (choose closest to you)
→ Create Cluster
→ Wait 2-3 minutes for deployment
```

#### 3. Create Database User (1 minute)
```
Left sidebar → Database Access
→ Add New Database User
→ Username: admin
→ Password: password123
→ Add User
```

#### 4. Get Connection String (1 minute)
```
Left sidebar → Databases
→ Click "Connect" button
→ Select "Drivers" → "Node.js"
→ Copy connection string
```

You'll get something like:
```
mongodb+srv://admin:password123@cluster0.abc123.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
```

#### 5. Update .env File
Replace the `MONGO_URL` line in `.env`:

**Before:**
```
MONGO_URL=mongodb://localhost:27017
```

**After:**
```
MONGO_URL=mongodb+srv://admin:password123@cluster0.abc123.mongodb.net/yt_competitor?retryWrites=true&w=majority
```

Replace:
- `admin` with your username
- `password123` with your password
- `cluster0.abc123` with your actual cluster name

#### 6. Restart Dev Server
```bash
# Stop current server (Ctrl+C in terminal)
# Then run:
npm run dev
```

#### 7. Test Connection
1. Open http://localhost:3000
2. You should see the dashboard (no 500 errors)
3. Click "Sync" button
4. Wait for data to load

---

## Alternative: Local MongoDB

### Windows Installation

#### Option A: MongoDB Community Edition (Recommended)
```
1. Download: https://www.mongodb.com/try/download/community
2. Select: Windows, MSI
3. Run installer
4. Check "Install MongoDB as a Service"
5. Complete installation
6. MongoDB will auto-start
7. Keep .env as is (mongodb://localhost:27017)
8. Restart dev server: npm run dev
```

#### Option B: Portable MongoDB (No Installation)
```
1. Download: https://www.mongodb.com/try/download/community
2. Select: Windows, ZIP
3. Extract to C:\mongodb
4. Create folder: C:\data\db
5. Run: C:\mongodb\bin\mongod.exe --dbpath C:\data\db
6. Keep .env as is
7. Restart dev server: npm run dev
```

### Mac Installation
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
# Keep .env as is
npm run dev
```

### Linux Installation
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
# Keep .env as is
npm run dev
```

---

## Verify Connection

### Check if MongoDB is Running

**For Atlas:**
- Just verify internet connection
- Check .env has correct connection string

**For Local MongoDB:**
```powershell
# Windows - check if service is running
Get-Service MongoDB

# Or try to connect
mongosh "mongodb://localhost:27017"
```

### Test Backend

1. Open http://localhost:3000
2. Open browser DevTools (F12)
3. Go to Network tab
4. Click "Sync" button
5. Check if `/api/sync` returns 200 (success) or 500 (error)

---

## Troubleshooting

### Error: "MongoTopologyClosedError: Topology is closed"
**Cause:** MongoDB not running or connection string wrong
**Fix:**
- For Atlas: Check internet, verify connection string in .env
- For Local: Start MongoDB service or run mongod

### Error: "ECONNREFUSED 127.0.0.1:27017"
**Cause:** Local MongoDB not running
**Fix:**
```powershell
# Windows
net start MongoDB
# or
mongod --dbpath C:\data\db

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongodb
```

### Error: "Authentication failed"
**Cause:** Wrong username/password in connection string
**Fix:**
- For Atlas: Verify credentials in connection string
- Check IP whitelist (should be 0.0.0.0/0 for development)

### Error: "Database not found"
**This is normal!** MongoDB creates it automatically on first write.
Just proceed - the app will create collections as needed.

---

## What Happens After Setup?

1. **Sync Button** → Fetches last 48h videos from tracked channels
2. **AI Analysis** → Analyzes comments with Gemini
3. **Keyword Research** → Generates trending keywords
4. **Content Ideas** → Suggests video ideas based on gaps
5. **Dashboard** → Displays all insights

---

## Environment Variables Reference

```env
# MongoDB Connection (choose one)
MONGO_URL=mongodb://localhost:27017                    # Local
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net  # Atlas

DB_NAME=yt_competitor                                  # Database name

# YouTube API (already configured)
YOUTUBE_API_KEY=AIzaSyBaaxQr_RrNkWV_A_uXWrBGmGBWpGjaVJA

# Google Gemini API (already configured)
GOOGLE_API_KEY=AIzaSyCa6cmJGWndUhLwwakoTLiA6ijgfjUfnyY

# Channels to Track
TRACKED_HANDLES=@collegekaka,@OmEducareServices,@MedicaWing,@SparkupClasses,@GarimaGoelBiology,@dr.anandmani,@Mentorbox

# Your Channels
OWN_HANDLES=@AddaNEETCounselling,@vidyaneetadda247

# Niche Description
CHANNEL_NICHE=NEET/Medical Education
```

---

## Next Steps

1. **Choose MongoDB Atlas** (easiest) or **Local MongoDB**
2. **Update .env** with connection string
3. **Restart dev server**: `npm run dev`
4. **Open http://localhost:3000**
5. **Click "Sync"** to test

You're all set! 🚀
