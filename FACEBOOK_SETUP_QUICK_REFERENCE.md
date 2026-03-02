# 🎯 Facebook Data Deletion - Quick Setup

## URL to Add to Facebook

**Copy this URL to your Facebook App Settings:**

```
https://yourdomain.com/api/facebook/data-deletion
```

*(Replace `yourdomain.com` with your actual domain)*

---

## Steps to Configure in Facebook

### 1. Go to Facebook Developers Console
- Visit: https://developers.facebook.com/
- Select your app → **Settings → Basic**

### 2. Find the App Secret
- Scroll to the bottom of Basic Settings
- Copy your **App Secret** (keep this secure!)

### 3. Set Environment Variable
Add to your environment:
```
FACEBOOK_APP_SECRET=your_app_secret_value
```

### 4. Add Data Deletion Callback URL
Look for one of these settings:
- "Data Deletion Callback URL"
- "Data Deletion Request File URL"  
- "Data Deletion URL"

Paste:
```
https://yourdomain.com/api/facebook/data-deletion
```

### 5. Verify Privacy Policy
Make sure Facebook knows about your privacy policy:
- Your Privacy Policy is at: `https://yourdomain.com/privacy`
- Add this link in your Facebook App settings where required

---

## What Gets Deleted

When a user requests data deletion through Facebook:
- ✅ User account and profile
- ✅ All prescriptions
- ✅ All appointments
- ✅ All reminders & medications
- ✅ All messages
- ✅ All health logs
- ✅ All notifications
- ✅ Calorie tracking data

---

## Best Option: Separate Data Deletion Page vs Terms

**We created a SEPARATE Privacy Policy page** (best practice):

✅ **Why separate is better:**
- Users can access it anytime
- Easy for Facebook to verify compliance
- Can be referenced in app footer/settings
- Complies with GDPR/CCPA
- Professional appearance

**Your new pages:**
- `/privacy` - Full privacy & data deletion policy
- Settings within app can link to this

---

## Testing

**Local Testing:**
```bash
# Start your server
npm run dev

# Test endpoint exists (will fail signature check - that's OK)
curl -X POST http://localhost:5000/api/facebook/data-deletion \
  -H "Content-Type: application/json" \
  -d '{"signed_request":"test"}'

# Response should be:
# {"message":"Invalid signed request"}
```

**Production Testing:**
Use Facebook's built-in test tool in Developer Dashboard

---

## Environment Configuration

Add to `.env` (locally) and Render Dashboard (production):

```env
FACEBOOK_APP_SECRET=your_secret_here
APP_BASE_URL=https://yourdomain.com
```

---

## After Setup

1. ✅ Code deployed to production
2. ✅ Environment variables set
3. ✅ URL added to Facebook Settings
4. ✅ Test with Facebook's tool
5. ✅ Ready for submission!

---

## Files Modified

- `server/routes.ts` - Added endpoint
- `server/storage.ts` - Added bulk deletion methods  
- `client/src/App.tsx` - Added privacy route
- `client/src/pages/privacy-page.tsx` - New privacy page
- `FACEBOOK_DATA_DELETION_GUIDE.md` - Full documentation

---

**Need help?** Check `FACEBOOK_DATA_DELETION_GUIDE.md` for detailed info!
