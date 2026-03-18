---
workflow:
  base_branch: main
  direct_to_main: false
  quality_gates:
    - cd app && npm run test:e2e
    - cd app && npm run lint
    - cd app && npm run type-check
  review:
    max_level: FULL
  ship:
    method: pr
    deploy_hint: "Merge PR and Vercel will auto-deploy"
---

# AutomaPod Business - Claude Context

## Project Overview

AutomaPod is an all-in-one podcast hosting suite built as a technical solo venture using CompanyOS principles for structured, disciplined development.

**Location**: `/Users/leeingram/development/projects/automapod-business`

**Founder**: Technical soloist with deep technical skills who needs structure and process for solo work.

## Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Transcription**: Groq Whisper API
- **Job Queue**: BullMQ + Redis (planned)
- **Deployment**: Vercel
- **Testing**: Playwright (42 E2E tests)

## Directory Structure

```
automapod-business/
├── app/              # Main Next.js application
├── companyos/        # CompanyOS skills and operational tools
├── config/           # Configuration, MCP registry
├── .claude/          # Project-specific Claude configuration
└── PLAN.md           # Implementation plan
```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `feature/AMP-XXX-description` - Feature development
- `fix/AMP-XXX-description` - Bug fixes
- `refactor/` - Code refactoring

### Commit Workflow
1. Use `/start AMP-XXX` to plan features and create branches
2. Implement with local testing
3. Use `/amp-commit` for auto-triaged review and commit
4. Create PR for review
5. Merge to main triggers Vercel deployment

### Quality Gates
All commits must pass:
- E2E tests (`npm run test:e2e`)
- Linting (`npm run lint`)
- Type checking (`npm run type-check`)

## Review Triage

Reviews are automatically triaged based on change scope:

- **NONE**: Non-source only (docs, tests, config)
- **LIGHT**: Any .ts/.tsx change, fewer than 10 files
- **FULL**: 10+ files, or sensitive paths (auth, migrations, payment)

## Current Status

### ✅ Complete
- User authentication (Supabase)
- Episode upload & transcription (Groq Whisper)
- Episode management (list, view, delete)
- 42 E2E tests passing
- RLS policies configured

### 🚧 In Progress
- Podcast management (create, edit)
- RSS feed generation per podcast
- File upload to R2 (currently using temp://)
- Analytics tracking (downloads, listeners)

### 📋 TODO
- Subscription/billing management
- Ad insertion
- Episode scheduling
- Multi-episode batch operations

## CompanyOS Integration

This project uses CompanyOS skills for business operations:

**Business Operations:**
- `amp-ops` - Company operations, conventions, decisions
- `amp-comms` - External communications, email drafts
- `amp-secrets` - API keys, credentials management
- `amp-calendar` - Scheduling, meeting prep

**Domain Skills:**
- `amp-audio` - Audio processing, transcription, enhancement
- `amp-hosting` - RSS feed management, media hosting
- `amp-analytics` - Listener analytics, download tracking
- `amp-monetization` - Ad insertion, subscription management

## Key Conventions

### Naming
- Use `amp-` prefix for AutomaPod-specific skills
- Branch names: `feature/AMP-XXX-description`
- Commit format: Conventional commits

### Database
- All queries use parameterized queries (SQL injection prevention)
- RLS policies on all tables
- Migrations in `app/supabase/migrations/`

### Security
- Input validation with Zod at boundaries
- Environment variables trimmed defensively
- No hardcoded credentials

### Testing
- E2E tests for critical paths
- Test data isolated by prefix
- Cleanup in `afterEach` hooks

## Common Tasks

### Run E2E Tests
```bash
cd app
npm run test:e2e
```

### Run Development Server
```bash
cd app
npm run dev
```

### Create Migration
```bash
cd app
supabase migration new migration_name
```

### Deploy to Vercel
Merge PR to `main` - auto-deploys via Vercel integration

## Important Notes

- **Never commit directly to main** without PR review
- **Always test locally before committing**
- **Use /amp-commit** for all CompanyOS changes
- **Follow evidence-first rule** - read code before making claims
- **Match scope to request** - avoid over-engineering

## Documentation

- **[PLAN.md](./PLAN.md)** - Detailed implementation plan
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[app/README.md](./app/README.md)** - App-specific docs

## Global Rules (from ~/.claude/rules/)

The following global rules apply:
- `evidence-first.md` - Never assert without reading/verifying
- `code-quality.md` - TypeScript strict, security standards
- `scope-intent.md` - Match response scope to request
- `commit-recipe.md` - Conventional commit format
- `protected-workflows.md` - Use /amp-commit for all changes
- `review-triage.md` - Automatic review level selection
- `reasoning-calibration.md` - Match effort to task
- `learning-capture.md` - Capture insights as ★ Insight blocks
- `output-formatting.md` - Complete structured output
- `on-demand-references.md` - Index of reference docs

## On-Demand Reference Docs

Reference docs are available in `~/.claude/docs/`:
- `testing-playwright.md` - E2E testing patterns
- `commit-reference.md` - Commit workflow details
- `review-triage-reference.md` - Triage decision logic
- `mcp-server-config.md` - MCP server setup
- `skill-authoring.md` - Creating amp-* skills

## Contact

For questions about this project, use `amp-ops` skill to look up conventions and decisions.
