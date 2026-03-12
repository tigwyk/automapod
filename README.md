# AutoMapod Business

All-in-one podcast hosting suite built with CompanyOS principles for structured, disciplined solo development.

## 🎯 Vision

AutoMapod provides podcasters with everything they need to host, transcribe, distribute, and monetize their podcasts - all in one platform.

## 📁 Project Structure

This is a **monorepo** containing three main components:

```
automapod-business/
├── app/              # Main Next.js application (hosted on Vercel)
├── companyos/        # CompanyOS skills and operational tools
├── config/           # Configuration, MCP registry, environment setup
├── .claude/          # Claude AI global configuration and rules
└── PLAN.md           # Implementation plan and progress tracking
```

### Component Descriptions

**`app/`** - Main Application
- Next.js 15 with App Router
- Supabase for auth & database
- Groq Whisper for transcription
- Playwright E2E tests (42 tests)
- Deployed to Vercel

**`companyos/`** - CompanyOS Core
- Operational skills (ops, comms, secrets, etc.)
- Domain-specific skills (audio, hosting, analytics, monetization)
- Technical workflow commands
- Automated job definitions

**`config/`** - Configuration
- MCP server registry
- Environment-specific settings
- Company documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Groq API key
- Claude CLI (for CompanyOS)

### Setup

1. **Clone the main repo:**
   ```bash
   git clone https://github.com/your-org/automapod-business.git
   cd automapod-business
   ```

2. **Initialize submodules:**
   ```bash
   git submodule update --init --recursive
   ```

3. **Set up the app:**
   ```bash
   cd app
   npm install
   cp .env.example .env.local
   # Add your SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY
   npm run dev
   ```

4. **Run tests:**
   ```bash
   cd app
   npm run test:e2e
   ```

## 🧪 Testing

The main app has comprehensive E2E test coverage:
- 42 Playwright tests
- Authentication, dashboard, upload, episode management
- Run with `npm run test:e2e` in the `app/` directory

## 📚 Documentation

- **[PLAN.md](./PLAN.md)** - Implementation plan and progress
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and tech stack
- **[app/README.md](./app/README.md)** - App-specific documentation

## 🏗️ CompanyOS

This project uses the **CompanyOS** methodology for structured solo development:
- Skills for business operations
- Commands for technical workflows
- Automated jobs for operations
- Global configuration for AI assistance

See `companyos/` for details.

## 📝 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `feature/*` - Feature development
- `fix/*` - Bug fixes

### Commit Conventions
- Conventional commits format
- Automatic attribution via git hooks
- Review triage: NONE, LIGHT, or FULL based on change scope

### Commands
```bash
/start      # Plan feature and create branch
/amp-commit  # Auto-triaged commit (CompanyOS specific)
/amp-plan    # Build prioritized daily plan
/amp-recap   # Log session accomplishments
```

## 🚢 Deployment

- **App**: Vercel (automatically deploys from `app/main`)
- **Database**: Supabase (migrations in `app/supabase/migrations/`)
- **Storage**: Cloudflare R2 (for audio files)

## 📊 Current Status

✅ **Complete**:
- User authentication
- Episode upload & transcription
- Episode management (list, view, delete)
- 42 E2E tests passing
- RLS policies configured

🚧 **In Progress**:
- Podcast management
- RSS feed generation
- Analytics tracking

## 📧 Contact

- **Website**: https://automapod.app
- **Email**: support@automapod.app
- **GitHub**: https://github.com/your-org/automapod-business

## 📄 License

Proprietary - All rights reserved
