import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TIER_LIMITS, TIER_LABELS, TIER_PRICES } from '@/lib/subscription';

export const metadata = { title: 'Pricing — AutomaPod' };

const FEATURES = [
  { label: 'Podcasts',           free: '1',           pro: 'Up to 3',        business: 'Unlimited'  },
  { label: 'Episodes',           free: '10 total',    pro: 'Unlimited',      business: 'Unlimited'  },
  { label: 'Storage',            free: '500 MB',      pro: '10 GB',          business: '50 GB'      },
  { label: 'Analytics history',  free: '7 days',      pro: 'All time',       business: 'All time'   },
  { label: 'Transcription',      free: '—',           pro: '10 hrs/mo',      business: '40 hrs/mo'  },
  { label: 'RSS feed',           free: '✓',           pro: '✓',              business: '✓'          },
  { label: 'Custom domain',      free: '—',           pro: '✓',              business: '✓'          },
  { label: 'Team members',       free: '—',           pro: '—',              business: 'Up to 3'    },
  { label: 'Support',            free: 'Community',   pro: 'Email',          business: 'Priority'   },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const canceled = params.canceled === '1';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Nav */}
      <nav className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground">AutomaPod</span>
          </Link>
          {user ? (
            <Link href="/dashboard" className="btn btn-sm btn-outline">Dashboard</Link>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" className="btn btn-sm btn-outline">Log in</Link>
              <Link href="/signup" className="btn btn-sm btn-primary">Sign up free</Link>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {canceled && (
          <div className="mb-8 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
            No problem — you can upgrade any time from your billing settings.
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">Simple, honest pricing</h1>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade when you need more.
            <br />
            <span className="font-medium text-foreground">14-day free trial on Pro and Business — no card required.</span>
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Free */}
          <div className="card-elevated p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">{TIER_LABELS.free}</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Get started, no credit card needed.</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              <li className="text-sm text-foreground">1 podcast</li>
              <li className="text-sm text-foreground">10 episodes</li>
              <li className="text-sm text-foreground">500 MB storage</li>
              <li className="text-sm text-foreground">7-day analytics</li>
              <li className="text-sm text-muted-foreground line-through">Transcription</li>
            </ul>
            {user ? (
              <Link href="/dashboard" className="btn btn-outline w-full text-center">
                Your current plan
              </Link>
            ) : (
              <Link href="/signup" className="btn btn-outline w-full text-center">
                Get started free
              </Link>
            )}
          </div>

          {/* Pro — highlighted */}
          <div className="card-elevated p-8 flex flex-col ring-2 ring-primary relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most popular
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">{TIER_LABELS.pro}</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold text-foreground">${TIER_PRICES.pro.monthly}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                or ${TIER_PRICES.pro.annual}/yr — save 2 months
              </p>
              <p className="mt-2 text-sm text-muted-foreground">For serious independent podcasters.</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              <li className="text-sm text-foreground">Up to 3 podcasts</li>
              <li className="text-sm text-foreground">Unlimited episodes</li>
              <li className="text-sm text-foreground">10 GB storage</li>
              <li className="text-sm text-foreground">Full analytics history</li>
              <li className="text-sm text-foreground">10 hrs/mo transcription</li>
              <li className="text-sm text-foreground">Custom domain</li>
            </ul>
            <PricingCTA tier="pro" user={user} />
          </div>

          {/* Business */}
          <div className="card-elevated p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">{TIER_LABELS.business}</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold text-foreground">${TIER_PRICES.business.monthly}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                or ${TIER_PRICES.business.annual}/yr — save 2 months
              </p>
              <p className="mt-2 text-sm text-muted-foreground">For networks and power users.</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              <li className="text-sm text-foreground">Unlimited podcasts</li>
              <li className="text-sm text-foreground">Unlimited episodes</li>
              <li className="text-sm text-foreground">50 GB storage</li>
              <li className="text-sm text-foreground">Full analytics history</li>
              <li className="text-sm text-foreground">40 hrs/mo transcription</li>
              <li className="text-sm text-foreground">Up to 3 team members</li>
              <li className="text-sm text-foreground">Priority support</li>
            </ul>
            <PricingCTA tier="business" user={user} />
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="card-elevated overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Feature comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Feature</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Free</th>
                  <th className="text-center px-6 py-3 font-medium text-primary">Pro</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURES.map((f) => (
                  <tr key={f.label} className="hover:bg-muted/10">
                    <td className="px-6 py-3 font-medium text-foreground">{f.label}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground">{f.free}</td>
                    <td className="px-6 py-3 text-center text-foreground font-medium">{f.pro}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground">{f.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Common questions</h2>
          <dl className="space-y-6">
            <div>
              <dt className="font-semibold text-foreground">Do I need a credit card to start the trial?</dt>
              <dd className="mt-1 text-muted-foreground text-sm">No. Start your 14-day trial with just your email. We&apos;ll ask for a card only if you choose to continue after the trial.</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">What happens when my trial ends?</dt>
              <dd className="mt-1 text-muted-foreground text-sm">If you&apos;ve added a payment method, your subscription continues automatically. If not, you&apos;re moved to the Free plan — your episodes and data stay safe.</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Can I change plans later?</dt>
              <dd className="mt-1 text-muted-foreground text-sm">Yes. Upgrade, downgrade, or cancel any time from your billing settings. Upgrades take effect immediately; downgrades take effect at the next billing cycle.</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Is annual billing worth it?</dt>
              <dd className="mt-1 text-muted-foreground text-sm">You get 2 months free (Pro: saves $38/yr, Business: saves $98/yr). Switch to annual any time from your billing portal.</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}

function PricingCTA({
  tier,
  user,
}: {
  tier: 'pro' | 'business';
  user: { id: string } | null;
}) {
  if (!user) {
    return (
      <Link
        href={`/signup?plan=${tier}`}
        className="btn btn-primary w-full text-center"
      >
        Start free trial
      </Link>
    );
  }

  return (
    <StartTrialButton tier={tier} />
  );
}

// Client component for the checkout redirect
import { StartTrialButton } from '@/components/start-trial-button';
