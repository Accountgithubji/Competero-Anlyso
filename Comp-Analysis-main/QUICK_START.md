# Quick Start - Get Backend Running in 5 Minutes

## The Problem
The app needs MongoDB to store data. You have 3 options:

---

## ⭐ FASTEST: MongoDB Atlas (Cloud) - 5 minutes

### Step 1: Create Free Account
1. Go to: https://www.mongodb.com/cloud/atlas
2. Click "Sign Up"
3. Create account with email/Google

### Step 2: Create Cluster
1. Click "Create" → Select "M0 Free"
2. Choose your region
3. Wait 2-3 minutes

### Step 3: Create User
1. Go to "Database Access"
2. Click "Add New Database User"
3. Username: `admin`
4. Password: `password123`
5. Click "Add User"

### Step 4: Get Connection String
1. Go to "Databases" → Click "Connect"
2. Select "Drivers" → "Node.js"
3. Copy the connection string
4. Replace `<password>` with `password123`

Example:
```
mongodb+srv://admin:password123@cluster0.abc123.mongodb.net/yt_competitor?retryWrites=true&w=majority
```

### Step 5: Update .env
Edit `.env` file and replace:
```
MONGO_URL=mongodb+srv://admin:password123@cluster0.abc123.mongodb.net/yt_competitor?retryWrites=true&w=majority
```

### Step 6: Restart Server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 7: Test
- Open http://localhost:3000
- Click "Sync" button
- Wait for data to load

---

## Alternative: Local MongoDB

### Windows
1. Download: https://www.mongodb.com/try/download/community
2. Run installer (MSI)
3. Check "Install as Service"
4. Keep `.env` as is (already set to `mongodb://localhost:27017`)
5. Start service: `net start MongoDB`
6. Restart dev server: `npm run dev`

### Mac
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

---

## Verify It's Working

Once MongoDB is running, you should see:
- ✅ No 500 errors in browser
- ✅ Dashboard loads
- ✅ "Sync" button works
- ✅ Data appears after sync

---

## Troubleshooting

### Still getting 500 errors?
1. Check `.env` file has correct `MONGO_URL`
2. Verify MongoDB is running
3. Restart dev server: `npm run dev`
4. Check browser console for errors

### "Connection refused"?
- MongoDB isn't running
- For Atlas: Check internet connection
- For Local: Run `mongod` or `net start MongoDB`

### "Authentication failed"?
- Check username/password in connection string
- For Atlas: Verify IP whitelist (should allow 0.0.0.0/0)

---

## Next Steps

1. **Choose MongoDB Atlas** (easiest, no installation)
2. **Update `.env`** with your connection string
3. **Restart dev server**
4. **Click "Sync"** to fetch YouTube data
5. **Wait for AI analysis** to complete

That's it! The app will handle everything else.

---

## What Happens After Sync?

1. Fetches last 48 hours of videos from all tracked channels
2. Analyzes top 8 videos with AI (Gemini)
3. Extracts audience pain points
4. Generates content ideas
5. Performs keyword research
6. Displays everything on dashboard

Enjoy! 🚀
