# ADR-001: Monolithic Architecture with Next.js

## Status
Accepted

## Context
AutomaPod needs to serve podcast creators with a web application that handles:
- User authentication and management
- Audio file uploads and processing
- Podcast and episode management
- RSS feed generation
- Analytics tracking
- Billing and subscriptions

We need to choose between:
1. **Monolithic architecture** - Single deployable unit
2. **Microservices architecture** - Multiple independent services

### Constraints
- Solo development team (CTO)
- Need to ship MVP quickly
- Unknown initial traffic patterns
- Budget constraints
- Fast iteration required

## Decision
Use a **monolithic architecture** with Next.js 15 App Router.

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application                          │
│                  (Vercel Deployment)                            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   React     │  │  API Routes │  │  Server Actions     │   │
│  │ Components  │  │  (/api/*)   │  │  (Mutations)        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Middleware & Edge Functions                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Characteristics
- **Single codebase**: All logic in one repository
- **Single deployment**: Deploy as one unit to Vercel
- **Shared database**: All services connect to Supabase
- **Co-located code**: UI, API, and business logic together
- **Future-ready**: Can extract services later if needed

## Consequences

### Positive
- **Faster development**: No service boundaries to manage
- **Simpler operations**: One deployment pipeline
- **Better DX**: Full-stack TypeScript in one place
- **Easier debugging**: Call stacks span UI → API → database
- **Lower costs**: Single Vercel deployment, no infra overhead
- **Natural for Next.js**: Framework is designed for this

### Negative
- **Scaling limits**: Entire app scales together
- **Coupling risk**: Poor separation can create spaghetti code
- **Deployment dependencies**: All changes deploy together
- **Technology lock-in**: Harder to mix frameworks

### Mitigations
- Use **modular architecture** within the monolith
- **Separate concerns** with clear layer boundaries
- **Background jobs** run separately (BullMQ worker)
- **CDN caching** for RSS feeds and public assets
- **Feature flags** to decouple deployment from release

## Alternatives Considered

### Microservices
**Rejected because:**
- Too complex for solo development
- Operational overhead (N services to manage)
- Slower iteration (network boundaries, versioning)
- Overkill for unknown traffic patterns
- DevOps complexity outweighs benefits at this stage

**May reconsider when:**
- Team size > 5 engineers
- Need to scale individual components independently
- Different teams own different services
- Traffic justifies the complexity

### Modular Monolith
**Selected as implementation approach:**
- Keeps monolith simplicity
- Adds clear module boundaries
- Enables future extraction if needed
- Easier to reason about dependencies

### Serverless Functions
**Rejected because:**
- Next.js API routes provide same benefits
- Better dev experience with co-located code
- Vercel handles both similarly

## References
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Architecture: The Frustrations of Microservices](https://www.youtube.com/watch?v=SyTwm2Kb1Hk)
- [Monolith vs Microservices: The Right Choice](https://www.heroku.com/podcasts/codeish/57-monoliths-vs-microservices-with-camille-fournier)

## Implementation Notes
- Use **server components** for data fetching
- Use **API routes** for external integrations
- Use **server actions** for mutations
- Use **middleware** for auth and CORS
- Use **edge functions** for RSS feeds (future)

## Revision History
- 2026-03-30: Initial decision by CTO
