# Railway deployment notes — backend

Follow these exact steps to deploy only the backend to Railway.

1) Project / Service setup
- Connect your GitHub repo to Railway and create a new Service.
- IMPORTANT: Set the "Root Directory" (or Project Path) to `backend` so Railway builds the backend folder only.

2) Two deployment options
- Docker (recommended): choose Dockerfile and ensure path points to `backend/Dockerfile`.
- Node build: set Build command to `npm ci` and Start command to `npm start` (working dir = `backend`).

3) Environment variables (at minimum)
- `MONGODB_URI` = your MongoDB Atlas URI (required)
- `JWT_SECRET` = your JWT signing secret
- `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_BUCKET_ID` (if using Appwrite storage)
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (email config)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (payments)

Note: Railway provides a `PORT` environment variable automatically — do not hardcode a port.

4) Healthcheck and logs
- The Dockerfile contains a runtime HEALTHCHECK hitting `/api/health` on `127.0.0.1`. This helps Railway detect readiness.
- If the container keeps restarting, open the Railway deploy logs and search for MongoDB errors (e.g., `MongoServerSelectionError` or authentication errors).

5) Common pitfalls
- If Railway builds the frontend by mistake, ensure the Root Directory is `backend`.
- If DB auth fails, double-check `MONGODB_URI` credentials and IP access list in Atlas.
- Set `NODE_ENV=production` in Railway if you want production behavior.

6) Quick local verification
```powershell
cd backend
npm ci
$env:PORT=5000
node server.js
# then in another terminal:
curl http://localhost:5000/api/health
```

7) If you want, I can also add a simple `railway.json` sample for autopilot deployment — tell me and I will add it.

---
Created to make Railway deployment predictable and minimal change to existing code.
