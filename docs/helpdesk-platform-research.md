# Helpdesk Platform Research

**Context**: AutomaPod is a solo-operated podcast hosting SaaS. Support must scale without a team — tickets are managed primarily by Claude Code skills via CLI/API automation.

---

## Key Requirements

| Requirement | Priority |
|------------|----------|
| Strong REST/GraphQL API | Critical |
| CLI-friendly automation | Critical |
| Solo-friendly pricing | High |
| Email integration | High |
| Knowledge base / self-service | High |
| Webhooks for event-driven automation | High |
| AI-native features | Nice to have |

---

## Platform Comparison

### GitHub Issues + GitHub CLI

**Pricing**: Free (public repos) · $4/user/month (private repos on GitHub Team)

| | |
|---|---|
| **API** | ✅ GraphQL + REST — excellent |
| **CLI** | ✅ `gh issue` — native, powerful |
| **Email** | ❌ No built-in (needs webhook bridge) |
| **Knowledge Base** | ❌ Requires separate tool |
| **AI** | ⚠️ Via GitHub Copilot only |
| **Automation** | ✅ GitHub Actions, full API surface |

**Best for**: Maximum automation control, zero to minimal cost, staying in the GitHub ecosystem.

```bash
# Claude can manage support entirely via gh CLI
gh issue create --title "Bug: Upload fails" --body "Details..." --label "support"
gh issue list --label "support" --state open
gh issue view 42
gh issue comment 42 --body "Thanks for reporting..."
gh issue close 42
```

---

### Plain

**Pricing**: $35/month (Foundation, 1 seat) · $269/month (Horizon, 3 seats)

| | |
|---|---|
| **API** | ✅ API-first — everything is programmable |
| **CLI** | ⚠️ No official CLI; use API directly |
| **Email** | ✅ Built-in (2 addresses on Foundation) |
| **Knowledge Base** | ✅ Included (1 on Foundation, unlimited on Horizon) |
| **AI** | ✅ Ari AI agent, auto-labelling, urgency detection |
| **Automation** | ✅ Webhooks, machine users, AI workflows |

**Foundation plan includes**: Slack (25 channels), email (2 addresses), Linear/Jira integrations, AI agent (50 resolutions/month), 5 workflows, 7-day reporting.

**Best for**: A purpose-built, AI-native support platform with a reasonable solo-founder price. "API-first" is a core design principle — Claude skills can automate everything via the API.

---

### Help Scout

**Pricing**: Free (5 users, 1 inbox, 100 contacts/month) · $25/user/month (Standard) · $45/user/month (Plus)

| | |
|---|---|
| **API** | ✅ REST API available |
| **CLI** | ❌ No official CLI |
| **Email** | ✅ Core feature |
| **Knowledge Base** | ✅ Docs site included |
| **AI** | ✅ AI Assist, AI Drafts, AI Summarize |
| **Automation** | ⚠️ Workflows, but less developer-centric |

**Free tier limits**: 5 users, 1 inbox, 100 contacts/month, 10 tags, 10 saved replies.

**Best for**: Traditional support UX with a solid free start. Good stepping stone before a full-featured platform.

---

### Freshdesk

**Pricing**: Free (1–2 agents, 6 months) · $19/agent/month (Growth) · $55/agent/month (Pro)

| | |
|---|---|
| **API** | ✅ REST API |
| **CLI** | ❌ No official CLI |
| **Email** | ✅ Core feature |
| **Knowledge Base** | ✅ Customer portal included |
| **AI** | ✅ Freddy AI Agent, Copilot |
| **Automation** | ⚠️ Rule-based automation, no CLI |

**Best for**: Teams wanting a proven, full-featured platform. The free tier is generous but expires after 6 months.

---

### Zendesk

**Pricing**: $155/agent/month (Suite + Copilot Professional)

| | |
|---|---|
| **API** | ✅ Comprehensive |
| **CLI** | ⚠️ Unofficial tools only |
| **Email** | ✅ Full omnichannel |
| **AI** | ✅ Copilot, AI agents |
| **Automation** | ✅ Extensive |

**Best for**: Enterprise. At $155/month minimum, not viable for a solo founder at early stage.

---

### Linear

**Pricing**: Free (unlimited viewers) · $8–16/user/month

| | |
|---|---|
| **API** | ✅ GraphQL — excellent |
| **CLI** | ⚠️ Unofficial `linear-cli` |
| **Email** | ❌ Not a support tool |
| **Knowledge Base** | ❌ |
| **AI** | ✅ AI agent workflows |

**Note**: Linear is a product/engineering issue tracker, not a customer support platform. It's an excellent *internal* tool but not a helpdesk replacement.

---

## Decision Framework

```
Are you comfortable with custom setup?
  ├── YES → GitHub Issues + email bridge ($0–4/mo) 
  └── NO  → Do you want AI built-in?
              ├── YES → Plain Foundation ($35/mo)
              └── NO  → Help Scout Free Tier ($0)

Will you scale beyond solo soon?
  ├── YES → Plain (scales gracefully, API-first)
  └── NO  → GitHub Issues or Help Scout
```

---

## Recommendation

### 🏆 Top Pick: Plain Foundation ($35/month)

**Why Plain wins for AutomaPod:**

1. **API-first by design** — Every action in the UI is available via API. Claude skills can automate triage, responses, labelling, and escalation.
2. **All-in-one** — Email, Slack, in-app chat, help center, and AI agent in a single platform. No duct tape required.
3. **AI built-in** — Ari AI agent handles routine queries automatically (50 resolutions/month on Foundation). Reduces manual load from day one.
4. **Podcast-friendly audience** — B2B focused, which matches AutomaPod's creator/business user base.
5. **Reasonable price** — $35/month for a solo operator is defensible; GitHub-level DIY is more work than it's worth once paying customers arrive.
6. **Machine users** — Plain supports API-only "machine users" (no seat cost), perfect for Claude automation.
7. **Linear integration** — Already using Linear/GitHub? Plain integrates natively.

**Claude automation pattern with Plain:**
```bash
# Via Plain's GraphQL API (wrapped in amp-support skill)
amp-support list                          # List open threads
amp-support view THREAD-123               # Read thread details
amp-support reply THREAD-123 "response"   # Send reply
amp-support label THREAD-123 billing      # Add label
amp-support resolve THREAD-123            # Mark resolved
```

---

### 🥈 Runner-up: GitHub Issues + Email Bridge

Best if you want maximum flexibility and zero/minimal cost at the expense of setup time.

**Setup:**
- Create a private `automapod-support` GitHub repo
- Use [Forward Email](https://forwardemail.net) or a Zapier zap to create issues from support emails
- Manage entirely via `gh` CLI
- Build `amp-support` skill around `gh issue` commands

**Cost**: ~$0–10/month total.

**Trade-off**: More brittle, no built-in knowledge base, customers get no self-service portal.

---

### 🥉 Budget Bridge: Help Scout Free

Start free, validate support workflows, migrate to Plain when volume justifies it.

**Limits to watch**: 100 contacts/month, 1 inbox, 10 saved replies.

---

## Suggested amp-support Skill

Regardless of platform, the `amp-support` skill should expose a consistent CLI interface:

```
amp-support list [--status open|resolved] [--label billing]
amp-support view <id>
amp-support reply <id> <message>
amp-support label <id> <label>
amp-support resolve <id>
amp-support triage              # AI-assisted triage of all open tickets
amp-support draft <id>          # Generate AI draft response
amp-support stats               # Response time, volume, top issues
```

The underlying implementation can swap between GitHub Issues, Plain API, or Help Scout API without changing the interface.

---

## Next Steps

1. **Sign up for Plain Foundation** (14-day free trial, no credit card)
2. Connect support email address
3. Build `amp-support` skill using Plain's GraphQL API
4. Add `amp-support triage` to daily workflow
5. Evaluate after 30 days — migrate to GitHub Issues if Plain feels like overkill

---

*Researched: March 2026 | Platforms: Plain, Help Scout, Freshdesk, Zendesk, GitHub Issues, Linear*
