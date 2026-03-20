# Supabase Setup Guide

This guide explains how to properly configure Supabase for AutomaPod, particularly for authentication and email verification.

## Authentication Configuration

### 1. Site URL Configuration

In your Supabase project dashboard:

1. Go to **Settings** → **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL:
   - Production: `https://automapod.app`
   - Development: `http://localhost:3000`
3. Add allowed redirect URLs under **Redirect URLs**:
   - `https://automapod.app/auth/callback`
   - `http://localhost:3000/auth/callback`

### 2. Email Templates

The application uses custom redirect URLs for email verification. When a user signs up, they receive an email with a link to `/auth/callback` which:
1. Exchanges the verification code for a session
2. Redirects the user to the dashboard

### Environment Variables

Make sure these are set in your `.env.local` file:

```bash
# Site URL for redirects and callbacks
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_SITE_URL=https://automapod.app  # Production

# Alternative URL (used in some contexts)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Deployment

When deploying to Vercel:

1. Add `NEXT_PUBLIC_SITE_URL` as an environment variable in Vercel:
   - Value: `https://automapod.app`
2. Update the Site URL in Supabase dashboard to match
3. Ensure `/auth/callback` is in the allowed redirect URLs list

### Testing Email Verification Locally

1. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local`
2. Start the dev server: `npm run dev`
3. Sign up for a new account
4. Click the verification link in the email
5. You should be redirected to `http://localhost:3000/auth/callback?code=...`
6. The callback will exchange the code and redirect to `/dashboard`

### Troubleshooting

**Problem**: Email verification redirects to localhost instead of production URL.

**Solution**:
1. Check that `NEXT_PUBLIC_SITE_URL` is set correctly in your environment
2. Verify the Site URL in Supabase dashboard matches your production URL
3. Restart your dev server after changing environment variables

**Problem**: "Email verification failed" error after clicking the link.

**Solution**:
1. Check that `/auth/callback` is in the allowed redirect URLs in Supabase
2. Verify the Supabase URL and anon key are correct
3. Check browser console for error messages

## Related Files

- `app/src/app/api/auth/signup/route.ts` - Signup with email redirect
- `app/src/app/auth/callback/route.ts` - Email verification handler
- `app/src/app/api/auth/reset-password/route.ts` - Password reset with redirect
