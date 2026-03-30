# ADR-003: API Contract Design - RESTful with Next.js API Routes

## Status
Accepted

## Context
AutomaPod needs to expose various API endpoints for:
- Browser clients (React components)
- Mobile apps (future)
- Webhooks (Stripe, Supabase)
- Public access (RSS feeds, analytics tracking)
- Background job processing

### Requirements
- Fast development with minimal overhead
- Type safety between client and server
- Authentication and authorization
- File upload support (audio files)
- Rate limiting and CORS
- Easy testing and debugging

## Decision
Use **RESTful API** with **Next.js API Routes** and **Server Actions**.

### API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   React     │  │   Mobile    │  │    Webhooks         │ │
│  │ Components  │  │   Apps      │  │  (Stripe, etc)      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway Layer                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Server    │  │   API       │  │   Public Endpoints  │ │
│  │  Actions    │  │   Routes    │  │   (RSS, Analytics)  │ │
│  │ (/api/*)    │  │ (/api/*)    │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          └─────────────────┼────────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │         Middleware Layer             │
         │  (Auth, CORS, Rate Limiting)         │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │       Business Logic Layer           │
         │  (Supabase, R2, Groq, Stripe)        │
         └──────────────────────────────────────┘
```

### API Endpoint Categories

#### 1. **Server Actions** (Mutations from Client Components)
```typescript
'use server'

export async function createEpisode(formData: FormData) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('episodes')
    .insert({ ... })

  return { data, error }
}
```

**Usage:**
- Form submissions from client components
- Mutations that require authentication
- Need progressive enhancement

#### 2. **API Routes** (Standard REST)
```typescript
// /api/episodes/route.ts
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('episodes')
    .select('*')

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const episode = await createEpisode(body)
  return NextResponse.json(episode, { status: 201 })
}
```

**Usage:**
- External integrations (mobile apps, third parties)
- Webhook endpoints (Stripe, Supabase)
- Complex request/response handling
- File uploads (multipart/form-data)

#### 3. **Public Endpoints** (No Auth)
```typescript
// /rss/[slug]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createPublicClient()
  const podcast = await getPodcast(params.slug)
  return new Response(generateRSS(podcast), {
    headers: { 'Content-Type': 'application/xml' }
  })
}
```

**Usage:**
- RSS feeds
- Analytics tracking pixels
- Public podcast metadata

### API Contract Specification

**Base URL:** `https://automapod.com/api`

**Authentication:** Bearer token via `Authorization` header or session cookie

**Response Format:** JSON (except XML for RSS)

**Error Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid episode data",
    "details": { "title": ["Title is required"] }
  }
}
```

#### Core Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/podcasts` | Required | List user's podcasts |
| `POST` | `/api/podcasts` | Required | Create podcast |
| `GET` | `/api/podcasts/:id` | Required | Get podcast details |
| `PUT` | `/api/podcasts/:id` | Required | Update podcast |
| `DELETE` | `/api/podcasts/:id` | Required | Delete podcast |
| `GET` | `/api/podcasts/:id/episodes` | Required | List podcast episodes |
| `POST` | `/api/episodes` | Required | Create episode |
| `POST` | `/api/episodes/:id/upload` | Required | Upload audio |
| `GET` | `/api/episodes/:id` | Required | Get episode |
| `DELETE` | `/api/episodes/:id` | Required | Delete episode |
| `GET` | `/rss/:slug` | Public | RSS feed |
| `POST` | `/api/track/download` | Public | Track download |
| `POST` | `/api/webhooks/stripe` | Signature | Stripe webhooks |

## Consequences

### Positive
- **Simple and familiar**: REST is well-understood
- **Framework-native**: No additional libraries needed
- **Type-safe with Server Actions**: End-to-end type safety
- **Easy to debug**: Standard HTTP requests
- **Built-in middleware**: Auth, CORS, rate limiting
- **File upload support**: Native Next.js handling
- **Edge deployment**: Can deploy to Edge network

### Negative
- **Over-fetching**: REST may return more data than needed
- **Multiple requests**: More round trips vs GraphQL
- **No real-time**: Must add separate solution
- **Versioning burden**: Must maintain backward compatibility

### Mitigations
- Use **select projections** to limit returned fields
- Implement **HTTP caching** for frequently accessed data
- Add **Supabase Realtime** when needed
- Use **API versioning** from the start (`/api/v1/*`)

## Alternatives Considered

### GraphQL
**Rejected because:**
- Overkill for our API complexity
- Additional learning curve for team
- No built-in file upload support
- Requires additional library (Apollo, Relay)
- More complexity for solo development
- Next.js doesn't have first-class support

**May reconsider when:**
- Multiple client types with different data needs
- Complex nested queries
- Team is familiar with GraphQL
- Need for real-time subscriptions

### tRPC
**Rejected because:**
- Tighter coupling to TypeScript
- Less standard for external integrations
- Harder to use from mobile apps
- Webhook integration more complex
- Still maturing as a technology

### Hybrid (tRPC + API Routes)
**Rejected because:**
- Two different patterns to maintain
- Confusing for future developers
- No clear benefit over just API Routes

### gRPC
**Rejected because:**
- Overkill for web API
- Poor browser support
- Complex protobuf setup
- Not RESTful (harder to debug)

## API Versioning Strategy

**Start with URL versioning:**
```
/api/v1/podcasts
/api/v1/episodes
```

**Why version from day 1:**
- Easy to add breaking changes later
- Clear separation of API versions
- Standard practice for public APIs
- Allows deprecation of old endpoints

**Version lifecycle:**
- `v1`: Current (supported)
- `v2`: When breaking changes needed
- `v1` deprecated 6 months after `v2` launch
- `v1` sunset 12 months after `v2` launch

## Security Considerations

### Authentication
- **Session-based**: Browser clients (cookies)
- **Bearer tokens**: Mobile apps, API clients
- **API keys**: Future third-party integrations

### Authorization
- **Row-level security**: Enforced at database level
- **User context**: Extracted from session/JWT
- **Resource ownership**: Users can only access their data

### Rate Limiting
- **Authenticated**: 100 requests/minute
- **Public**: 10 requests/minute
- **Webhooks**: No limit (signature verified)

### CORS
- **Development**: All origins allowed
- **Production**: Only `automapod.com` domains

## References
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [REST API Design Best Practices](https://restfulapi.net/)
- [API Versioning Best Practices](https://apiux.com/2016/03/29/versioning-rest-api/)

## Implementation Notes
- Use **Zod** for request validation
- Return **consistent error format**
- Add **OpenAPI spec** for documentation (future)
- Implement **rate limiting** in middleware
- Use **Edge Routes** for global performance

## Revision History
- 2026-03-30: Initial decision by CTO
