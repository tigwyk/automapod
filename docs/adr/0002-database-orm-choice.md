# ADR-002: Database and ORM Choice - Supabase Direct Client

## Status
Accepted

## Context
AutomaPod needs a database solution that handles:
- User authentication and sessions
- Relational data (users, podcasts, episodes)
- Row-level security (multi-tenancy)
- Real-time subscriptions (future features)
- File storage integration

### Requirements
- Fast development with minimal setup
- Built-in authentication
- Type-safe database access
- Row-level security for data isolation
- Generous free tier for MVP
- Easy deployment

## Decision
Use **Supabase (PostgreSQL)** with **direct Supabase client**, **no traditional ORM**.

### Tech Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                  (Next.js App Router)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌────▼────┐  ┌─────▼──────┐
    │  Server │  │   API   │  │ Middleware │
    │ Actions │  │  Routes │  │            │
    └────┬────┘  └────┬────┘  └─────┬──────┘
         │            │             │
         └────────────┼─────────────┘
                      │
         ┌────────────▼────────────┐
         │   Supabase Client       │
         │   (Direct Access)       │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │   Supabase PostgreSQL   │
         │   + Auth + Storage      │
         └─────────────────────────┘
```

### Implementation Pattern

**Server Components:**
```typescript
import { createClient } from '@/lib/supabase/server'

async function PodcastsPage() {
  const supabase = await createClient()
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('*')

  return <PodcastList podcasts={podcasts} />
}
```

**API Routes:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('episodes')
    .insert({ ... })

  return NextResponse.json(data)
}
```

**Public Routes (RSS):**
```typescript
import { createPublicClient } from '@/lib/supabase/public'

export async function GET(request: Request) {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('podcasts')
    .select('*, episodes(*)')
    .eq('slug', slug)
    .single()

  return new Response(generateRSS(data))
}
```

## Consequences

### Positive
- **Zero boilerplate**: No migrations to write, no schema files
- **Built-in auth**: User management out of the box
- **Type generation**: `supabase gen types typescript` generates types
- **Row-level security**: Multi-tenancy enforced at DB level
- **Real-time ready**: When we need real-time features
- **Storage included**: Direct integration with R2 replacement
- **Fast development**: No ORM layer to maintain
- **Best of both worlds**: SQL power + JS convenience

### Negative
- **Vendor lock-in**: Tied to Supabase ecosystem
- **No query builder**: Must write raw SQL for complex queries
- **Type safety gaps**: Generated types can be out of sync
- **Learning curve**: Team must learn Supabase patterns
- **Migration complexity**: Harder to move off Supabase later

### Mitigations
- Use **view functions** for complex queries instead of raw SQL in code
- Run **type generation** in post-commit hook
- Keep **business logic in TypeScript**, not database
- Design **schema to be portable** (standard PostgreSQL)
- **Regular backups** for migration flexibility

## Alternatives Considered

### Prisma + PostgreSQL
**Rejected because:**
- Additional migration layer to maintain
- No built-in auth (need separate solution)
- No row-level security (must implement manually)
- More boilerplate for MVP
- Supabase gives us Prisma-like DX + more

### Drizzle ORM + PostgreSQL
**Rejected because:**
- Still need separate auth solution
- No built-in RLS (security concern)
- More setup time
- Supabase client is sufficient for our needs

### Traditional ORMs (TypeORM, Sequelize)
**Rejected because:**
- Heavy abstraction over SQL
- Worse TypeScript experience than Supabase
- No built-in auth or RLS
- Overkill for our query complexity

### Direct PostgreSQL (pg library)
**Rejected because:**
- Must implement authentication
- Must implement RLS manually
- Must build connection pooling
- No type generation
- Too much work for MVP

### Supabase with Prisma
**Rejected because:**
- Unnecessary abstraction layer
- Supabase client is already type-safe
- Adds complexity without clear benefit
- Prisma over Supabase has known issues

## Why No ORM?

### Our Query Patterns
- **Simple CRUD**: 90% of queries are simple selects/inserts
- **No complex joins**: Denormalized for performance
- **RLS handles security**: No need for query-based authorization
- **Server-side rendering**: Supabase client designed for this

### When We Might Add an ORM
- Complex business logic that belongs in database
- Need for query composition patterns
- Performance optimization requires advanced SQL
- Team size grows and wants more abstraction

## Migration Strategy

**If we need to leave Supabase:**
1. Export PostgreSQL database (standard format)
2. Migrate to any PostgreSQL hosting
3. Replace Supabase client with direct `pg` or add ORM
4. Implement auth (NextAuth or similar)
5. Implement RLS (application-level checks)

**Cost**: ~2-3 weeks of engineering work

## References
- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Generation](https://supabase.com/docs/reference/javascript/type-casts)
- [Why We Chose Supabase](https://supabase.com/blog)

## Implementation Notes
- Use **server client** for authenticated requests
- Use **public client** for public routes (RSS, analytics)
- Use **middleware** for auth state refresh
- Use **RLS policies** for all multi-tenant data
- Run **`supabase gen types`** in CI pipeline

## Revision History
- 2026-03-30: Initial decision by CTO
