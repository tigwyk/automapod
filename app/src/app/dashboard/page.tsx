import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="bg-white border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-foreground">AutomaPod</h1>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/podcasts" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Podcasts</Link>
                <Link href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Analytics</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="btn btn-sm btn-outline"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="card-elevated p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Welcome to AutomaPod</h2>
                <p className="text-muted-foreground">Your podcast hosting suite</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/podcasts/new" className="group p-4 rounded-xl border border-border bg-white hover:border-primary/50 hover:shadow-medium transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Create Podcast</h3>
                    <p className="text-sm text-muted-foreground mt-1">Start a new podcast show</p>
                  </div>
                </div>
              </Link>

              <Link href="/podcasts" className="group p-4 rounded-xl border border-border bg-white hover:border-primary/50 hover:shadow-medium transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                    <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Manage Podcasts</h3>
                    <p className="text-sm text-muted-foreground mt-1">Upload episodes, view RSS, configure settings</p>
                  </div>
                </div>
              </Link>

              <Link href="/analytics" className="group p-4 rounded-xl border border-border bg-white hover:border-primary/50 hover:shadow-medium transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Analytics</h3>
                    <p className="text-sm text-muted-foreground mt-1">Track downloads and listener stats</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Podcast Management</p>
                  <p className="text-xs text-muted-foreground">Organize episodes into shows</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Audio Upload</p>
                  <p className="text-xs text-muted-foreground">MP3, M4A, WAV, OGG up to 500MB</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">AI Transcription</p>
                  <p className="text-xs text-muted-foreground">Powered by Groq Whisper</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">RSS Feeds</p>
                  <p className="text-xs text-muted-foreground">Apple Podcasts & Spotify ready</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Analytics</p>
                  <p className="text-xs text-muted-foreground">Track downloads and listeners</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Secure Storage</p>
                  <p className="text-xs text-muted-foreground">Cloudflare R2 hosting</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
