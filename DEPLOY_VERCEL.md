# Deploying the frontend to Vercel ✅

This project uses Vite + React. These notes walk through the minimal setup to deploy the frontend on Vercel and connect it to your Railway backend.

## What I changed
- Added `vercel-build` script in `package.json` (`vite build`).
- Updated `vercel.json` to use `@vercel/static-build` with `dist` as the output directory and a SPA rewrite to `index.html`.

## Vercel project settings (Important) ⚙️
1. Create a new Project in Vercel (import this repo or select existing). 
2. Build & Output:
   - **Framework Preset**: Leave auto-detect or set to "Other".
   - **Build Command**: `npm run vercel-build` (or Vercel will auto-run `npm run build`).
   - **Output Directory**: `dist` (we configured this in `vercel.json`).

3. Environment Variables (set in Vercel Dashboard -> Settings -> Environment):
   - `VITE_API_URL` = `https://your-railway-backend-url` (no trailing slash), e.g. `https://my-backend.up.railway.app`
   - Any other Vite envs you use (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.)

   Note: Vite prefixes `VITE_` variables are embedded at build time.

4. Deploy branch (usually `main` or `master`) and trigger a deployment.

## Backend (Railway) – CORS and allowed origins ✅
- The backend (`backend/server.js`) already supports adding the frontend URL via `process.env.FRONTEND_URL`. Set this env on Railway to your Vercel URL (e.g., `https://your-project.vercel.app`).
- Double-check allowed origins include your Vercel URL. The server also has a built-in allowance for `https://ca-successful.vercel.app`.

## Common gotchas 💡
- Vite env vars are baked into the build. After you set/modify env vars in Vercel, trigger a redeploy so the app is rebuilt with the correct `VITE_*` values.
- Ensure Railway `PORT` and `MONGODB_URI` are set correctly and that Railway exposes the backend URL you configured in `VITE_API_URL`.
- If you need a custom domain on Vercel, add it in Vercel dashboard and then update the Railway `FRONTEND_URL` and `VITE_API_URL` if needed.

## Optional improvements (recommended)
- Add `VERCEL_*` preview-specific envs if you want separate staging/preview settings.
- Add a short verification script: once deployed, test `https://<your-vercel-url>/` loads and that API calls to `VITE_API_URL/api/health` return 200.

---

If you want, I can:
- Add a small `vercel-check.sh` script that verifies the build output and a quick healthcheck against your backend.
- Add CI checks (lint + build) in GitHub Actions for safer deployments.

Which of these would you like me to add next?