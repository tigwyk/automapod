/**
 * AppNav — shared authenticated navigation component.
 *
 * Server component: fetches the user's subscription to conditionally
 * render the TrialBanner. Always includes Dashboard, Podcasts, Analytics,
 * and Billing links plus a Sign Out button.
 */

import Link from 'next/link';
import { getUserSubscription } from '@/lib/get-user-subscription';
import { TrialBanner } from '@/components/trial-banner';

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
}

interface AppNavProps {
  userId: string;
  userEmail?: string | null;
  /** Which standard link should appear active */
  activeLink?: 'dashboard' | 'podcasts' | 'analytics' | 'billing';
  /** Extra links shown after the standard set (e.g. podcast-specific breadcrumbs) */
  extraLinks?: NavLink[];
  /** Action buttons shown to the left of user info in the right rail */
  actionSlot?: React.ReactNode;
}

export async function AppNav({
  userId,
  userEmail,
  activeLink,
  extraLinks = [],
  actionSlot,
}: AppNavProps) {
  const subscription = await getUserSubscription(userId);
  const isTrialing = subscription.status === 'trialing' && subscription.trialEndsAt !== null;

  const standardLinks: (NavLink & { key: AppNavProps['activeLink'] })[] = [
    { key: 'dashboard', href: '/dashboard', label: 'Dashboard' },
    { key: 'podcasts',  href: '/podcasts',  label: 'Podcasts'  },
    { key: 'analytics', href: '/analytics', label: 'Analytics' },
    { key: 'billing',   href: '/settings/billing', label: 'Billing' },
  ];

  return (
    <>
      {isTrialing && subscription.trialEndsAt && (
        <TrialBanner trialEndsAt={subscription.trialEndsAt} />
      )}
      <nav className="bg-white border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: logo + links */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="text-xl font-bold text-foreground">AutomaPod</span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                {standardLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      activeLink === link.key
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {extraLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      link.active ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: action slot + user email + sign out */}
            <div className="flex items-center gap-3">
              {actionSlot}
              {userEmail && (
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {userEmail}
                </span>
              )}
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="btn btn-sm btn-outline">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
