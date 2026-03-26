# AMP-48: Stripe Billing Foundation

**Type**: feature
**Priority**: P0 — revenue enablement
**Status**: Open

## Description

Implement the Stripe billing foundation for AutoMapod's three-tier subscription
model. This covers everything from Stripe customer creation through tier
enforcement — the complete path from "sign up" to "paying subscriber".

## Tier Structure (confirmed)

| Tier | Price | Trial |
|------|-------|-------|
| Free | $0/mo | N/A |
| Pro | $19/mo or $190/yr | 14 days, no card required |
| Business | $49/mo or $490/yr | 14 days, no card required |

## Scope

### In Scope

#### Database
- [ ] Migration: add `stripe_customer_id`, `subscription_status`, `subscription_tier`,
      `trial_ends_at`, `current_period_end` to `profiles` or new `subscriptions` table
- [ ] RLS policies for subscription data

#### Stripe Setup
- [ ] Create Stripe products + prices (Pro monthly, Pro annual, Business monthly,
      Business annual) — can be done in Stripe dashboard or via API
- [ ] Configure 14-day trial on Pro and Business prices
- [ ] Set up webhook endpoint in Stripe dashboard

#### API Routes
- [ ] `POST /api/billing/checkout` — create Stripe Checkout session (new subscription)
- [ ] `POST /api/billing/portal` — create Stripe Customer Portal session (manage/cancel)
- [ ] `POST /api/webhooks/stripe` — handle subscription lifecycle events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.payment_failed`

#### Tier Enforcement
- [ ] `lib/subscription.ts` — helpers: `getUserTier()`, `canUploadEpisode()`,
      `canTranscribe()`, `getRemainingStorage()`, `getAnalyticsWindow()`
- [ ] Episode upload: block if at free tier episode/storage limit
- [ ] Transcription: block if tier doesn't include it or hours exhausted
- [ ] Analytics: restrict to 7-day window on free tier

#### UI
- [ ] `/pricing` — public pricing page (Free / Pro / Business cards with CTA)
- [ ] Upgrade prompt component — reusable gate shown when user hits a limit
- [ ] `/settings/billing` — current plan, usage, upgrade/downgrade, cancel button
      (links to Stripe Customer Portal)
- [ ] Trial banner — shown during 14-day trial with days remaining

### Out of Scope
- Ad insertion / monetization tools (future)
- Team member management UI (Business tier — future)
- Geographic analytics (Business tier — future, data not yet collected)
- Metered billing / usage overages (keep simple for v1)
- Invoice PDF customisation

## Approach

### Database schema
Add to `profiles` table (or create `subscriptions` table):
```sql
stripe_customer_id    TEXT UNIQUE,
subscription_tier     TEXT DEFAULT 'free',  -- 'free' | 'pro' | 'business'
subscription_status   TEXT DEFAULT 'active', -- 'active' | 'trialing' | 'past_due' | 'canceled'
trial_ends_at         TIMESTAMPTZ,
current_period_end    TIMESTAMPTZ
```

### Tier limits
```typescript
const TIER_LIMITS = {
  free:     { podcasts: 1, episodes: 10,        storageMb: 500,   transcriptionHours: 0,  analyticsWindowDays: 7   },
  pro:      { podcasts: 3, episodes: Infinity,   storageMb: 10240, transcriptionHours: 10, analyticsWindowDays: Infinity },
  business: { podcasts: Infinity, episodes: Infinity, storageMb: 51200, transcriptionHours: 40, analyticsWindowDays: Infinity },
};
```

### Webhook security
Verify `stripe-signature` header using `stripe.webhooks.constructEvent()` with
`STRIPE_WEBHOOK_SECRET` env var. Reject any request that fails verification.

### Trial flow
- User signs up → free tier by default
- User clicks "Start free trial" on pricing page → Stripe Checkout with trial
- Checkout session `allow_promotion_codes: true`, `payment_method_collection: 'if_required'`
  (no card required for trial start)
- On `checkout.session.completed` → update DB to `trialing`, set `trial_ends_at`
- Trial ends → Stripe auto-charges if card on file, or cancels to free

## Dependencies

- Stripe account with products configured
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in env
- `stripe` npm package

## New Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_...
```

## Definition of Done

- [ ] New subscriber can start a 14-day Pro trial from `/pricing`
- [ ] Webhook correctly updates DB on subscription state changes
- [ ] Free tier user hitting episode limit sees upgrade prompt
- [ ] Free tier user attempting transcription sees upgrade prompt
- [ ] Analytics page shows 7-day restriction banner for free users
- [ ] `/settings/billing` shows current plan + links to Stripe portal
- [ ] Stripe webhook rejects requests with invalid signatures
- [ ] All new API routes require authentication
- [ ] E2E tests for checkout, webhook, and gate enforcement
- [ ] `tsc --noEmit` clean

## Implementation Sequence

1. DB migration + `lib/subscription.ts`
2. Stripe checkout + portal API routes
3. Stripe webhook handler
4. Tier enforcement (upload + transcription + analytics gates)
5. UI: `/pricing` page + upgrade prompt component
6. UI: `/settings/billing` page + trial banner
7. E2E tests
