# Railway Deployment Configuration

## Critical Setup Steps

### 1. Create a NEW Railway Service (if not done)
- Go to https://railway.app
- Create a new project
- Add a service: **GitHub - ca-successfull repo**

### 2. Service Settings (MOST IMPORTANT)
In Railway Dashboard → Service Settings:

**Root Directory:** `backend`
- This MUST be set, otherwise Railway builds the wrong folder

**Build Command:** `npm ci --only=production`
**Start Command:** `npm start`

Or if using **Docker:**
**Dockerfile Path:** `backend/Dockerfile`

### 3. Environment Variables (REQUIRED)
Go to Railway → Variables tab and add ALL of these:

```
MONGODB_URI=mongodb+srv://successfulca300_db_user:hgbVrCL23TbDII36@cluster0.dt3xde5.mongodb.net/?appName=Cluster0
JWT_SECRET=90ebd8ab8ca8121d1d26f25e1dd68c54
NODE_ENV=production

APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=695d4e530014968757bc
APPWRITE_API_KEY=standard_9d68fa40f56f24952b1f1834a1c63d932cefdd5fda2308c2fcbfb8096571c5376085ad331e0601f50fd4b4a110aa8d093712ac0060910a1d0c67badda198e669a6d5713c8ed3a24c0d696816aeda82ff6577e047de1a1b75863731573a841fe9f2ae8196cbce4727fa27fa658579b7b53827bcdea113bbfb2ca599a2517bf4ba
APPWRITE_BUCKET_ID=695d5298000b5765bc66

BREVO_API_KEY=xsmtpsib-c03d023f9723f18e1e4b54dbb5ba16468e3ea719dd407c8f00a3394140dce204-hH9IcoXeJyiLco1K
BREVO_SENDER_EMAIL=successfulca300@gmail.com

RAZORPAY_KEY_ID=rzp_test_RuCV8Ohxw1GwIA
RAZORPAY_KEY_SECRET=dt5VbSjTYZ97Tu2XsXIEgiCq
```

### 4. Deploy
- Commit and push code to GitHub
- Railway should auto-deploy
- Watch Deploy Logs for `✅ SERVER READY` message

### 5. Verify
If logs show:
```
✅ SERVER READY
🚀 Running on: http://0.0.0.0:5000
📍 Health: http://0.0.0.0:5000/api/health
```
→ Backend is running correctly

If you see MongoDB errors:
```
❌ MongoDB connection failed...
```
→ Check `MONGODB_URI` is correct in Railway Variables

### Troubleshooting

**No logs appearing?**
- Check Root Directory is set to `backend`
- Check Build/Start commands are correct
- Click "Redeploy" to rebuild

**Container keeps stopping?**
- Check all required Environment Variables are set
- Open Deploy Logs to find the actual error

**Health check fails?**
- Ensure `MONGODB_URI` is accessible from Railway
- May need to whitelist Railway IP in MongoDB Atlas

---

Your backend URL on Railway: `https://ca-successfull-production.up.railway.app`
Your health endpoint: `https://ca-successfull-production.up.railway.app/api/health`
