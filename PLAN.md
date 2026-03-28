# AutomaPod Business - CompanyOS Implementation Plan

## Vision

AutomaPod is an all-in-one podcast suite covering hosting, production, analytics, and monetization. Built as a technical solo venture using CompanyOS principles for structured, disciplined development.

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### 1.1 Global Configuration
- [x] Create directory structure
- [x] Set up `~/.claude/settings.json` with permissions, hooks, env vars
- [x] Create global rules (evidence-first, scope-intent, code-quality)
- [x] Set up on-demand reference docs (14 docs)

### 1.2 CompanyOS Structure
- [x] Create directory structure (companyos, config, app)
- [x] Initialize git repos
- [x] Create README files

---

## Phase 2: CompanyOS Skills ✅ COMPLETE

### Business Operations Skills (9/9)
| Skill | Purpose | Status |
|-------|---------|--------|
| `amp-ops` | Company operations, conventions, decisions | ✅ Complete |
| `amp-comms` | External communications - email, drafts | ✅ Complete |
| `amp-secrets` | API keys, credentials, secrets management | ✅ Complete |
| `amp-content` | Marketing, blog posts, announcements | ✅ Complete |
| `amp-feedback` | User feedback review, triage, patterns | ✅ Complete |
| `amp-support` | Customer support conversations, triage | ✅ Complete |
| `amp-calendar` | Scheduling, meeting prep, time awareness | ✅ Complete |
| `amp-pricing` | Pricing decisions, tier structures | ✅ Complete |
| `amp-audit` | Setup health, permissions, security check | ✅ Complete |

### Podcast-Specific Skills (5/5)
| Skill | Purpose | Status |
|-------|---------|--------|
| `amp-audio` | Audio processing, transcription, enhancement | ✅ Complete |
| `amp-hosting` | RSS feed management, media hosting | ✅ Complete |
| `amp-analytics` | Listener analytics, download tracking | ✅ Complete |
| `amp-monetization` | Ad insertion, subscription management | ✅ Complete |
| `amp-supabase` | Supabase database operations, RLS, migrations | ✅ Complete |

---

## Phase 3: Technical Workflow ✅ COMPLETE

### 3.1 Core Commands (6/6)
- [x] `/start` - Feature planning and branch creation
- [x] `/commit` - Auto-triage review + push
- [x] `/amp-commit` - CompanyOS-specific commit (PRs for core, direct for config)
- [x] `/amp-help` - List all AutomaPod capabilities
- [x] `/amp-plan` - Build prioritized daily plan
- [x] `/amp-recap` - Log session accomplishments

### 3.2 Review Triage System
- [x] NONE (non-source only)
- [x] LIGHT (any .ts/.tsx change)
- [x] FULL (10+ files, sensitive paths, auth/payment)

### 3.3 Hooks (10/10)
- [x] Session health check (session-start.sh)
- [x] File protection (file-protection.sh)
- [x] Session state preservation (session-end.sh)
- [x] Changelog tracking (changelog-track.sh)
- [x] Skill telemetry tracking (skill-telemetry.sh)
- [x] Pre-commit quality gates (pre-commit.sh)
- [x] Worktree safety checks (worktree-safety.sh)
- [x] Checkpoint reminders (checkpoint-reminder.sh)
- [x] Session crash recovery (session-crash-recovery.sh)
- [x] Session state initialization (session-start.sh enhanced)

---

## Phase 4: Automated Jobs ✅ COMPLETE

| Job | Schedule | Purpose | Status |
|-----|----------|---------|--------|
| `email-agent` | Every 5 min | Gmail polling, reply/routing | ✅ Complete |
| `support-agent` | Every 30 min | HelpScout/Zendesk triage | ✅ Complete |
| `analytics-agent` | Daily | Analytics aggregation | ✅ Complete |

**Implementation:**
- Edge Functions with pg_cron scheduling
- Jobs in `companyos/jobs/` directory
- Scheduler SQL: `companyos/jobs/scheduler.sql`
- Self-test functions included for each job

---

## Phase 5: Application Architecture ✅ COMPLETE

### 5.1 Tech Stack (LOCKED)
- Frontend: **Next.js 15** (App Router)
- Database: **Supabase** (PostgreSQL)
- Storage: **Cloudflare R2** (S3-compatible)
- Transcription: **Groq** (Whisper)
- Job Queue: **BullMQ + Redis**
- Deployment: **Vercel**

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system design.

### 5.2 Core Features
- [x] Audio upload and processing (presigned R2 URL, direct browser → R2)
- [x] User authentication (Supabase)
- [x] Transcription (Groq Whisper)
- [x] Episode database schema
- [x] E2E test suite (85+ tests passing)
- [x] RSS feed generation
- [x] Podcast management UI
- [x] Episode management UI
- [x] R2 storage library
- [x] Analytics dashboard (overview → podcast → episode drill-down)
- [ ] Subscription/billing management (NEXT)

---

## Phase 6: MVP Buildout ✅ COMPLETE

### 6.1 Authentication & Database
- [x] Supabase project setup
- [x] User authentication (signup/login/logout)
- [x] Database migrations (podcasts, episodes, episode_downloads)
- [x] RLS policies configured
- [x] Middleware protection for /dashboard, /episodes

### 6.2 Upload & Transcription
- [x] Upload UI with drag-and-drop
- [x] File validation (type, size)
- [x] Groq Whisper API integration
- [x] Transcription result display
- [x] Episode creation in database
- [x] Progress indicators
- [x] Presigned R2 upload (browser → R2 direct, no server body limit)

### 6.3 Testing
- [x] Playwright E2E test suite (95+ tests total)
- [x] Authentication tests (14 tests)
- [x] Dashboard tests (8 tests)
- [x] Upload tests (9 tests)
- [x] Episode management tests (8 tests)
- [x] Podcast management tests (11 tests)
- [x] RSS feed tests (10 tests)
- [x] R2 integration tests (20 tests)
- [x] Analytics tests (6 tests)
- [x] Podcast analytics tests (4 tests)
- [x] Analytics overview tests (7 tests)
- [x] Transcription tests (6 tests)
- [x] Episode edit tests (7 tests)
- [x] Test documentation
- [x] TypeScript strict mode — tsc --noEmit exits clean

### 6.4 Episode Management
- [x] Episode list page (view all episodes)
- [x] Episode detail page (view, delete)
- [x] DELETE API route for episodes
- [x] Dashboard navigation to episode list
- [x] Episode edit page

### 6.5 Additional Features (Complete)
- [x] Podcast creation/management (CRUD + validation)
- [x] RSS feed generation per podcast (RSS 2.0 + iTunes)
- [x] R2 storage library implementation (upload, delete, validation, presigned URLs)
- [x] R2 cleanup on episode deletion (orphaned file cleanup)
- [x] Download tracking (pixel + redirect modes, IP hashing, platform detection)
- [x] Analytics dashboard — overview, podcast-level, episode-level with drill-down nav

---

## Phase 7: CompanyOS Polish ✅ COMPLETE

### 7.1 Git & Repositories
- [x] Initialize git repos (core, config, app)
- [x] Set up .gitignore properly
- [x] Create initial commits
- [x] Set up branch structure (main, feature/*, fix/*)

### 7.2 Documentation (14/14 Complete)
- [x] **testing-playwright.md** - E2E testing patterns
- [x] **commit-reference.md** - Commit workflow details
- [x] **review-triage-reference.md** - Triage decision logic
- [x] **mcp-server-config.md** - MCP server setup
- [x] **skill-authoring.md** - Creating amp-* skills
- [x] **parallel-patterns.md** - Orchestrate multiple subagents
- [x] **bash-patterns.md** - Robust bash scripting
- [x] **multi-chain-epics.md** - Plan complex multi-ticket work
- [x] **production-safety.md** - Database migration safety
- [x] **ci-pipeline.md** - CI/CD operations
- [x] **testing-vitest.md** - Vitest testing patterns
- [x] **skill-usage.md** - Effective skill usage
- [x] **worktree-guide.md** - 8-worktree parallel development
- [x] **supabase-operations.md** - Supabase best practices

### 7.3 Session State System
- [x] Session state directory structure (`.claude-session/`)
- [x] State file schema and initialization
- [x] Crash recovery mechanism
- [x] Checkpoint system
- [x] Worktree coordination

### 7.4 8-Worktree Support
- [x] Setup script (`companyos/scripts/setup-8-worktrees.sh`)
- [x] Worktree state files
- [x] Master coordinator system
- [x] Helper scripts (wt.sh, wt-status.sh)
- [x] Symlink management for shared directories
- [x] Safety hooks for worktree coordination

---

## Phase 8: Monetisation ✅ COMPLETE

### 8.1 Subscription / Billing ✅ COMPLETE
- [x] Define tier structure (Free / Pro / Business)
- [x] Stripe customer + subscription creation
- [x] Billing portal (manage plan, cancel, invoices)
- [x] Webhook handling (subscription created/updated/cancelled)
- [x] Tier enforcement (usage limits per plan)
- [x] Upgrade/downgrade flows in UI
- [x] Billing E2E tests (10 tests — AMP-50)

### 8.2 Enhanced Automation ✅ COMPLETE
- [x] BullMQ transcription worker — standalone bun process, shared Redis helper, service role Supabase client (AMP-51)
- [x] Backfill profiles rows for pre-migration users (AMP-52)
- [x] Supabase CLI config committed, supabase/.temp gitignored (AMP-53)

### 8.3 Advanced Workflows (Optional)
- [ ] Multi-worktree parallel development execution
- [ ] Automated job deployment to production
- [ ] amp-meetings (Meeting notes, transcripts)

---

## CompanyOS Maturity: 100% ✅

### Comparison with Brad Feld's Configuration Guide

| Component | Feld's Guide | AutomaPod | Status |
|-----------|--------------|-----------|--------|
| **Hooks** | 10 hooks | 10 hooks | ✅ Complete |
| **Docs** | 13+ docs | 14 docs | ✅ Complete |
| **Session State** | Yes | Yes | ✅ Complete |
| **Automated Jobs** | 3+ jobs | 3 jobs | ✅ Complete |
| **8-Worktree** | Yes | Yes | ✅ Complete |
| **Quality Gates** | Yes | Yes | ✅ Complete |
| **Skill Telemetry** | Yes | Yes | ✅ Complete |

### Key Enhancements

1. **Session State System**: Full crash recovery and checkpoint system
2. **Skill Telemetry**: Automatic tracking of amp-* skill usage
3. **Quality Gates**: Pre-commit checks for secrets, console.logs, test guards
4. **Worktree Safety**: Multi-worktree coordination and conflict prevention
5. **Comprehensive Docs**: 14 on-demand reference docs for all major workflows
6. **Automated Jobs**: Email, support, and analytics agents with pg_cron scheduling
7. **8-Worktree Setup**: Complete parallel development infrastructure

### Quick Reference

**Setup Commands:**
```bash
# Initialize 8-worktree system
~/development/projects/automapod-business/companyos/scripts/setup-8-worktrees.sh

# Switch between worktrees
~/development/projects/wt.sh magic1

# Check all worktree status
~/development/projects/wt-status.sh
```

**Key Files:**
- Settings: `~/.claude/settings.json`
- Hooks: `~/.claude/hooks/` (10 hooks)
- Docs: `~/.claude/docs/` (14 docs)
- Skills: `~/.claude/skills/amp-*` (14 skills)
- Jobs: `companyos/jobs/` (3 automated jobs)
- Session: `project/.claude-session/` (state, checkpoints)

**Workflow:**
1. `/start AMP-XXX` → Plan feature
2. Implement in worktree (magic1-7)
3. `/commit` → Auto-triage review
4. Merge to main → Auto-deploy

---

*Last updated: 2026-03-28 — Phase 8 complete: billing (AMP-48/49/50), BullMQ worker (AMP-51), profiles backfill (AMP-52), Supabase CLI config (AMP-53). App is production-ready for beta users.*
