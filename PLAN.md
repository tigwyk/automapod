# AutoMapod Business - CompanyOS Implementation Plan

## Vision

AutoMapod is an all-in-one podcast suite covering hosting, production, analytics, and monetization. Built as a technical solo venture using CompanyOS principles for structured, disciplined development.

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### 1.1 Global Configuration
- [x] Create directory structure
- [x] Set up `~/.claude/settings.json` with permissions, hooks, env vars
- [x] Create global rules (evidence-first, scope-intent, code-quality)
- [ ] Set up on-demand reference docs

### 1.2 CompanyOS Structure
- [x] Create directory structure (companyos, config, app)
- [ ] Initialize git repos
- [ ] Create README files

---

## Phase 2: CompanyOS Skills ✅ COMPLETE

### Business Operations Skills
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
| `amp-search` | Cross-tool information search | Not needed |
| `amp-meetings` | Meeting notes, transcripts, action items | Future |

### Podcast-Specific Skills
| Skill | Purpose | Status |
|-------|---------|--------|
| `amp-audio` | Audio processing, transcription, enhancement | ✅ Complete |
| `amp-hosting` | RSS feed management, media hosting | ✅ Complete |
| `amp-analytics` | Listener analytics, download tracking | ✅ Complete |
| `amp-monetization` | Ad insertion, subscription management | ✅ Complete |

---

## Phase 3: Technical Workflow ✅ COMPLETE

### 3.1 Core Commands
- [x] `/start` - Feature planning and branch creation
- [x] `/commit` - Auto-triage review + push
- [x] `/amp-commit` - CompanyOS-specific commit (PRs for core, direct for config)
- [x] `/amp-help` - List all AutoMapod capabilities
- [x] `/amp-plan` - Build prioritized daily plan
- [x] `/amp-recap` - Log session accomplishments

### 3.2 Review Triage System
- [x] NONE (non-source only)
- [x] LIGHT (any .ts/.tsx change)
- [x] FULL (10+ files, sensitive paths, auth/payment)

### 3.3 Hooks
- [x] Session health check (session-start.sh)
- [x] File protection (file-protection.sh)
- [x] Session state preservation (session-end.sh)
- [x] Changelog tracking (changelog-track.sh)

---

## Phase 4: Automated Jobs

### Priority Jobs
| Job | Schedule | Purpose | Status |
|-----|----------|---------|--------|
| `email-agent` | Every 5 min | Gmail polling, reply/routing | Todo |
| `support-agent` | Every 30 min | HelpScout/Zendesk triage | Todo |
| `analytics-agent` | Daily | Analytics aggregation | Todo |
| `transcription-queue` | Every 10 min | Process uploaded audio | Todo |

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
- [x] Audio upload and processing ✅
- [x] User authentication (Supabase) ✅
- [x] Transcription (Groq Whisper) ✅
- [x] Episode database schema ✅
- [x] E2E test suite (36 tests passing) ✅
- [ ] RSS feed generation
- [ ] Episode management UI
- [ ] Analytics dashboard
- [ ] Subscription/billing management

---

## Phase 6: MVP Buildout 🚧 IN PROGRESS

### 6.1 Authentication & Database ✅ COMPLETE
- [x] Supabase project setup
- [x] User authentication (signup/login/logout)
- [x] Database migrations (podcasts, episodes, episode_downloads)
- [x] RLS policies configured
- [x] Middleware protection for /dashboard, /episodes

### 6.2 Upload & Transcription ✅ COMPLETE
- [x] Upload UI with drag-and-drop
- [x] File validation (type, size)
- [x] Groq Whisper API integration
- [x] Transcription result display
- [x] Episode creation in database
- [x] Progress indicators

### 6.3 Testing ✅ COMPLETE
- [x] Playwright E2E test suite (42 tests)
- [x] Authentication tests (14 tests)
- [x] Dashboard tests (8 tests)
- [x] Upload tests (9 tests)
- [x] Episode management tests (11 tests)
- [x] Test documentation

### 6.4 Episode Management ✅ COMPLETE
- [x] Episode list page (view all episodes)
- [x] Episode detail page (view, delete)
- [x] DELETE API route for episodes
- [x] Dashboard navigation to episode list
- [ ] Episode edit page (optional - can add later)

### 6.5 Remaining Features TODO
- [ ] Podcast creation/management
- [ ] RSS feed generation per podcast
- [ ] File upload to R2 (currently using temp://)
- [ ] Analytics tracking (downloads, listeners)

---

## Phase 7: CompanyOS Polish 📋 TODO

### 7.1 Git & Repositories
- [ ] Initialize git repos (core, config, app)
- [ ] Set up .gitignore properly
- [ ] Create initial commits
- [ ] Set up branch structure (main, feature/*, fix/*)

### 7.2 Documentation
- [ ] Create README for core repo
- [ ] Create README for config repo
- [ ] Update app README with setup instructions
- [ ] Document environment setup
- [ ] Document deployment process

### 7.3 Automated Jobs (Future)
- [ ] email-agent (Gmail polling)
- [ ] support-agent (HelpScout/Zendesk triage)
- [ ] analytics-agent (daily aggregation)
- [ ] transcription-queue (BullMQ worker)

---

*Last updated: 2026-03-11 - Session 5: E2E tests complete, MVP features working!*
