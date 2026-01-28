# Vercel Frontend Deployment Instructions

## Prerequisites
- GitHub account with repository access
- Vercel account (free tier available)

## Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Frontend ready for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select "CA_Successful" repository
5. Configure Project:
   - **Framework Preset**: Vite
   - **Root Directory**: ./ (root)
   - **Build Command**: npm run build
   - **Output Directory**: dist
   - **Install Command**: npm install

## Step 3: Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
VITE_API_URL = https://your-railway-backend-url.railway.app
```

(Replace with your actual Railway backend URL)

## Step 4: Deploy

Click "Deploy" - Vercel will:
1. ✅ Install dependencies
2. ✅ Run `npm run build` (generates dist folder)
3. ✅ Deploy to CDN
4. ✅ Provide a live URL

## Testing

Once deployed:
1. Visit your Vercel URL
2. Test login/signup
3. Verify API calls connect to your Railway backend
4. Test course enrollment, test series, payments

## Troubleshooting

**Build fails?**
- Check `.env` variables are set in Vercel
- Verify `vite.config.ts` is correct
- Check `package.json` build script

**API calls fail?**
- Verify `VITE_API_URL` in Vercel environment variables
- Ensure Railway backend URL is correct
- Check CORS configuration in backend

**Blank page after deployment?**
- Check browser console for errors
- Verify `vercel.json` rewrites rule exists
- Clear browser cache (Ctrl+Shift+Del)

## Files Added/Modified for Deployment

✅ `.vercelignore` - Tells Vercel what to ignore
✅ `vite.config.ts` - Optimized for production
✅ `.env.example` - Example environment variables
✅ `vercel.json` - SPA routing configuration (already existed)

## Auto-Deployments

After initial setup:
- Every push to `main` branch automatically deploys
- You can see deployment history in Vercel Dashboard
- Rollback to previous versions if needed

## Environment Variable Reference

For your `.env.local` in local development:

```env
VITE_API_URL=http://localhost:5000
```

For Vercel (set in dashboard):

```env
VITE_API_URL=https://your-railway-app.railway.app
```

---

**Your frontend is now ready for Vercel deployment!** 🚀
