import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-foreground">AutomaPod</span>
          </Link>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
              create a new account
            </Link>
          </p>
        </div>

        <div className="card-elevated p-8">
          <form className="space-y-5" action="/api/auth/signin" method="POST">
            <div>
              <label htmlFor="email" className="label mb-1.5 block">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="label mb-1.5 block">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link href="/request-reset" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
