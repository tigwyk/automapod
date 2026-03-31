# Incident Response Template

**Use this template for documenting and responding to production incidents.**

---

## Incident Header

| Field | Value |
|-------|-------|
| Incident ID | INC-YYYY-MM-DD-# |
| Date | YYYY-MM-DD |
| Severity | Critical / High / Medium / Low |
| Status | Investigating / Identified / Monitoring / Resolved |
| Duration | X hours |
| On-Call | [Name] |

---

## Executive Summary

**What happened?**
[2-3 sentence summary of the incident]

**Impact:**
- Users affected: [X users / All users]
- Duration: [X hours]
- Services affected: [RSS feeds, audio downloads, etc.]

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered: [alert type] |
| HH:MM | On-call acknowledged |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

---

## Root Cause

**What caused this incident?**
[Technical explanation of what went wrong]

**Contributing factors:**
- [Factor 1]
- [Factor 2]

**Why did it happen?**
[The "five whys" analysis]

---

## Resolution

**What did we do to fix it?**
[Steps taken to resolve the incident]

1. [Action 1]
2. [Action 2]
3. [Action 3]

**Verification:**
[How did we confirm the fix worked?]

---

## Impact Assessment

**Customer-facing impact:**
- [Description of what users experienced]

**Internal impact:**
- [Description of internal systems affected]

**Data loss:**
- [Yes/No - if yes, describe]

---

## Follow-Up Actions

### Immediate (within 24 hours)

- [ ] Update runbook if new patterns discovered
- [ ] Communicate with affected users (if needed)
- [ ] Schedule postmortem meeting

### Short-term (within 1 week)

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

### Long-term (within 1 month)

- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Process improvement]

---

## Lessons Learned

**What went well:**
- [What worked in the response]

**What could be improved:**
- [What didn't work or could be better]

**Action items for improvement:**
- [ ] [Improvement 1]
- [ ] [Improvement 2]

---

## Appendix

### Logs and Evidence

[Relevant logs, screenshots, metrics]

### Communications

[Customer notifications, status page updates, etc.]

### Related Issues

- [AUT-XX](https://paperclip.ing/AUT/issues/AUT-XX) - Related task
- [GitHub PR #XX](https://github.com/tigwyk/automapod/pull/XX) - Fix PR

---

**Postmortem completed by:** [Name]
**Date:** YYYY-MM-DD
**Approved by:** [CTO/Manager]
