# Architecture Decision Records

## What is an ADR?

An Architecture Decision Record (ADR) is a document that describes an important architectural decision, its context, and consequences. ADRs help teams:

- Track significant technical decisions
- Understand the history of why things are built a certain way
- Make better decisions by considering trade-offs
- Onboard new team members more quickly

## ADR Template

```markdown
# ADR-XXX: [Decision Title]

## Status
Proposed | Accepted | Deprecated | Superseded by [ADR-XXX]

## Context
[What is the issue that we're seeing that is motivating this decision or change?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences
- [What becomes easier or more difficult to do because of this change?]
- [What are the trade-offs of this decision?]

## Alternatives Considered
- [Alternative 1]
- [Alternative 2]
- [Alternative 3]

## References
- [Links to relevant docs, discussions, etc.]
```

## Using ADRs

1. **Create a new ADR** for any significant architectural decision
2. **Number sequentially** (ADR-001, ADR-002, etc.)
3. **Mark the status** (Proposed → Accepted → Deprecated/Superseded)
4. **Link related ADRs** when superseding or building on previous decisions
5. **Review periodically** to ensure decisions are still valid

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./0001-monolith-vs-microservices.md) | Monolith vs Microservices | Accepted | 2026-03-30 |
| [ADR-002](./0002-database-orm-choice.md) | Database and ORM Choice | Accepted | 2026-03-30 |
| [ADR-003](./0003-api-contract.md) | API Contract Design | Accepted | 2026-03-30 |

---

## Guidelines

### When to create an ADR

Create an ADR for decisions that:
- Affect the overall system architecture
- Are difficult to reverse (one-way doors)
- Have significant performance or cost implications
- Change how data is stored or processed
- Impact security or compliance

### When NOT to create an ADR

Don't create ADRs for:
- Routine implementation decisions
- Temporary solutions
- Minor optimizations
- Library choices (unless architectural)

### Updating ADRs

When an ADR becomes outdated:
1. Mark it as `Deprecated` or `Superseded by [ADR-XXX]`
2. Create a new ADR documenting the new decision
3. Link the old ADR to the new one
4. Keep the old ADR for historical context
