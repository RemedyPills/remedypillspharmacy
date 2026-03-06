# Render Deployment Checklist - RemedyPills Pharmacy

## ✅ Step 1: DATABASE_URL (Most Critical)

**Go to Render Dashboard:**
1. Select your Web Service
2. Go to **Environment** tab
3. Verify `DATABASE_URL` is set (auto-populated from PostgreSQL)
4. If missing, copy from your PostgreSQL instance Internal Database URL

## ✅ Step 2: Environment Variables

Set these in Render Environment settings:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (from PostgreSQL) | Required - connection string |
| `SESSION_SECRET` | (random 32+ char string) | Generate one, e.g., `openssl rand -base64 32` |
| `APP_BASE_URL` | `https://your-app.onrender.com` | Your actual Render domain |
| `NODE_ENV` | `production` | Required for SSL |

## ✅ Step 3: Google OAuth Redirect URIs

**In Google Cloud Console:**
1. Go to **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-app.onrender.com/api/auth/google/callback
   ```
4. Click **Save**

## ✅ Step 4: Redeploy

1. Push changes to GitHub OR
2. Click "Manual Deploy" → "Deploy latest commit" on Render

## ✅ Step 5: Test Login

- **URL:** `https://your-app.onrender.com/auth`
- **Admin Credentials:**
  - Username: `admin`
  - Password: `admin123`

## Troubleshooting

### If admin login fails:
- Check Render logs for errors
- Verify DATABASE_URL is valid
- Verify SESSION_SECRET is set
- Check if admin user was created (seed runs on startup)

### If Google OAuth fails:
- Verify APP_BASE_URL matches your actual Render domain
- Verify redirect URI in Google Cloud Console matches exactly
- Check OAuth consent screen has email scope approved

### Common Error Messages:
- `DATABASE_URL is missing` → Set DATABASE_URL in Render
- `SESSION_SECRET is missing` → Set SESSION_SECRET in Render  
- `Invalid username or password` → Admin account issue, check logs
- `Google authentication failed` → Check OAuth redirect URIs

