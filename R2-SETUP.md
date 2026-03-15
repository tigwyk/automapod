# Cloudflare R2 Setup Guide for AutoMapod

This guide walks you through setting up Cloudflare R2 for persistent audio file storage.

---

## ✅ Checklist

Before starting, make sure you have:
- [ ] Cloudflare account (free tier is sufficient)
- [ ] AutoMapod repository cloned locally
- [ ] Node.js and npm installed

---

## Step 1: Create R2 Buckets

### 1.1 Access R2 Dashboard

1. Go to: https://dash.cloudflare.com/
2. Select your account
3. Left sidebar → **R2** → **Overview**

### 1.2 Create Episodes Bucket

Click **Create bucket**:
```
Bucket name: automapod-episodes
Location: Automatic (recommended)
```

### 1.3 Create Images Bucket

Click **Create bucket**:
```
Bucket name: automapod-images
Location: Automatic (recommended)
```

---

## Step 2: Configure Public Access

### 2.1 Enable Public Access for Episodes

1. Go to **automapod-episodes** bucket
2. Click **Settings** tab
3. Scroll to **Public Access**
4. Click **Enable Public Access**
5. **Copy the public endpoint URL** (you'll need it)
6. Click **Save**

**Example public endpoint:**
```
https://abc123def456.r2.cloudflarestorage.com/automapod-episodes
```

### 2.2 Enable Public Access for Images

Repeat for **automapod-images** bucket and copy its public endpoint.

---

## Step 3: Set Up Custom Domain (Optional but Recommended)

### 3.1 Add Custom Domain for Episodes

1. In **automapod-episodes** bucket → **Settings**
2. Scroll to **Public Access**
3. Click **Add Custom Domain**

Enter:
```
Domain: audio.automapod.com
```

Click **Add custom domain**

### 3.2 Configure DNS

Cloudflare will provide a CNAME target. Add this DNS record:

```
Type: CNAME
Name: audio
Target: <provided-by-cloudflare>
Proxy: Proxied (orange cloud) ✓
```

**Why proxy?** Enables Cloudflare CDN for caching (faster downloads, lower costs)

### 3.3 Repeat for Images (Optional)

Repeat for `images.automapod.com` if desired.

---

## Step 4: Get API Credentials

### 4.1 Create R2 API Token

1. Cloudflare Dashboard → **R2** → **Overview**
2. Click **Manage R2 API Tokens**
3. Click **Create API Token**

Configure:
```
Token name: AutoMapod R2 Access
Permissions: Admin read & write
```

Click **Create API Token**

### 4.2 Save Credentials Securely

You'll see:
```
Account ID: abc123def456
Access Key ID: abc123def456
Secret Access Key: xyz789...
```

⚠️ **Save these immediately** - they won't be shown again!

---

## Step 5: Configure Environment Variables

### 5.1 Update `.env.local`

The `.env.local` file has been created for you. Fill in your credentials:

```bash
# Cloudflare R2
R2_ACCOUNT_ID=your-actual-account-id
R2_ACCESS_KEY_ID=your-actual-access-key-id
R2_SECRET_ACCESS_KEY=your-actual-secret-access-key

# R2 Bucket Configuration
R2_EPISODES_BUCKET=automapod-episodes
R2_IMAGES_BUCKET=automapod-images

# R2 Public Endpoints (from Step 2)
R2_EPISODES_PUBLIC_URL=https://your-account-id.r2.cloudflarestorage.com/automapod-episodes
R2_IMAGES_PUBLIC_URL=https://your-account-id.r2.cloudflarestorage.com/automapod-images

# Custom Domain (if configured in Step 3)
R2_EPISODES_CUSTOM_DOMAIN=https://audio.automapod.com
R2_IMAGES_CUSTOM_DOMAIN=https://images.automapod.com
```

### 5.2 Verify Configuration

Start the dev server:
```bash
cd app
npm run dev
```

If no R2 errors appear in the console, credentials are correct!

---

## Step 6: Test Upload

### 6.1 Upload a Test Episode

1. Go to: http://localhost:3000/episodes/new
2. Fill in:
   - Title: "Test Episode"
   - Description: "Testing R2 upload"
   - Audio file: Select a small MP3
3. Click **Upload Episode**

### 6.2 Verify Upload

1. Check Cloudflare R2 dashboard → **automapod-episodes** bucket
2. You should see a file in the bucket
3. File path format: `{rss-slug}/{episode-id}.mp3`

### 6.3 Test Playback

1. Go to: http://localhost:3000/episodes
2. Click on the uploaded episode
3. Verify the audio URL looks like:
   ```
   https://audio.automapod.com/{slug}/{id}.mp3
   ```

---

## Step 7: Update Existing Episodes

If you have episodes with `temp://` URLs, you can update them:

```sql
-- In Supabase SQL Editor
UPDATE episodes
SET audio_url = 'https://audio.automapod.com/path/to/file.mp3'
WHERE audio_url LIKE 'temp://%';
```

---

## Cost Breakdown

### Cloudflare R2 Pricing (Free Tier)

- **Storage**: 10GB free
- **Class A Operations** (write): 1M free/month
- **Class B Operations** (read): 10M free/month
- **Egress** (bandwidth): Unlimited free!

### Typical Podcast Usage

**100 episodes at 50MB each**:
- Storage: 5GB (within free tier)
- Uploads: 100 operations (negligible)
- Downloads: 10,000 × 50MB = 500GB egress (still free!)

**Estimated monthly cost**: $0

### Paid Tier (if needed)

- **Storage**: $0.015/GB/month (after 10GB free)
- **Operations**: $4.50/M Class A (after 1M free)

---

## Troubleshooting

### Issue: "R2 credentials not configured"

**Fix**: Verify `.env.local` has all R2_* variables set.

### Issue: "Access Denied"

**Fix**: Check API token has Admin permissions.

### Issue: Upload succeeds but file not in bucket

**Fix**: Verify bucket name matches in `.env.local`.

### Issue: Audio won't play

**Fix**: Check public access is enabled on the bucket.

### Issue: "Domain not found"

**Fix**: DNS propagation takes 5-10 minutes. Wait and retry.

---

## Security Best Practices

✅ **DO**:
- Keep `.env.local` private (already in `.gitignore`)
- Rotate API keys if compromised
- Use read-only API tokens for production (when possible)
- Monitor usage in Cloudflare dashboard

❌ **DON'T**:
- Commit `.env.local` to git
- Share API keys in chat/email
- Use Admin tokens in production (use scoped tokens)
- Expose Secret Access Key in logs

---

## Next Steps

After R2 is configured:

1. **Test the upload flow** - Upload several episodes
2. **Verify RSS feeds** - Check episode URLs in RSS XML
3. **Set up CDN** - Configure custom domain for caching
4. **Monitor costs** - Check Cloudflare dashboard periodically

---

## Need Help?

- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/
- **AWS S3 SDK Docs**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- **AutoMapod GitHub**: https://github.com/tigwyk/automapod

---

**Status**: ✅ Ready to configure!

Last updated: 2026-03-15
