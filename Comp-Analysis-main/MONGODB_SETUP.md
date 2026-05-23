# MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud) - RECOMMENDED ⭐

### Quick Setup (5 minutes)

1. **Create Free Account**
   - Go to: https://www.mongodb.com/cloud/atlas
   - Sign up with email or Google
   - Create a free account (M0 tier - always free)

2. **Create a Cluster**
   - Click "Create" → Select "M0 Free"
   - Choose region closest to you
   - Wait 2-3 minutes for cluster to deploy

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `admin`
   - Password: `password123` (or your choice)
   - Click "Add User"

4. **Get Connection String**
   - Go to "Databases" → Click "Connect"
   - Select "Drivers" → Node.js
   - Copy the connection string
   - Replace `<password>` with your password

5. **Update .env**
   ```
   MONGO_URL=mongodb+srv://admin:password123@cluster0.xxxxx.mongodb.net/yt_competitor?retryWrites=true&w=majority
   ```

6. **Restart Dev Server**
   ```bash
   npm run dev
   ```

---

## Option 2: Local MongoDB Installation

### Windows Installation

1. **Download MongoDB Community Edition**
   - Go to: https://www.mongodb.com/try/download/community
   - Select Windows, MSI package
   - Download the latest version

2. **Install**
   - Run the MSI installer
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service"
   - Click "Install"

3. **Verify Installation**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB Service**
   ```powershell
   # Start service
   net start MongoDB
   
   # Or manually run mongod
   mongod --dbpath "C:\data\db"
   ```

5. **Create Data Directory** (if needed)
   ```powershell
   mkdir C:\data\db
   ```

6. **Connection String**
   ```
   MONGO_URL=mongodb://localhost:27017
   ```

---

## Option 3: Docker (if Docker Desktop is installed)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then use:
```
MONGO_URL=mongodb://localhost:27017
```

---

## Verify Connection

Once MongoDB is running, test the connection:

```bash
# In a new terminal
mongosh "mongodb://localhost:27017"
# or for Atlas:
mongosh "mongodb+srv://admin:password123@cluster0.xxxxx.mongodb.net/yt_competitor"
```

You should see a prompt like:
```
yt_competitor>
```

---

## Troubleshooting

### "Connection refused" error
- MongoDB is not running
- Check if service is started: `net start MongoDB`
- Or manually run: `mongod`

### "Authentication failed" error (Atlas)
- Check username/password in connection string
- Verify IP whitelist in Atlas (should be 0.0.0.0/0 for development)

### "Database not found" error
- This is normal - MongoDB creates it automatically on first write
- Just proceed with the app

---

## Next Steps

1. Choose Option 1 (Atlas) or Option 2 (Local)
2. Update `.env` with your connection string
3. Restart dev server: `npm run dev`
4. Click "Sync" button in the app to test

The app will automatically create collections when needed!
