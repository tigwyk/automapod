# [AMP-003] Implement Podcast Management UI

**Type**: feature
**Priority**: P1 (Blocks 10 E2E tests)
**Status**: In Progress

## Description

Create the podcast form component to enable podcast creation and editing functionality. Currently 10 E2E tests are failing because the `@/components/podcast-form` component doesn't exist.

## Current Issues

### Missing Podcast Form Component
The podcast management pages try to import from `@/components/podcast-form` which doesn't exist:
```typescript
import PodcastForm from '@/components/podcast-form';
```

Error: `Module not found: Can't resolve '@/components/podcast-form'`

### Test Failures
- 10/19 E2E tests fail at podcast management functionality
- Tests cannot create, edit, or validate podcasts
- Blocks podcast creation workflow

## Scope

### In Scope
- [ ] Create `src/components/podcast-form.tsx` component
- [ ] Implement podcast creation form fields:
  - [ ] Title (required)
  - [ ] Description
  - [ ] RSS slug (auto-generate from title)
  - [ ] Cover image URL
- [ ] Add form validation (server-side)
- [ ] Implement RSS slug generation logic
- [ ] Add RSS slug format validation (alphanumeric, hyphens)
- [ ] Support both create and edit modes
- [ ] Style to match existing upload form design
- [ ] Handle form submission with proper error handling

### Out of Scope
- Podcast cover image upload (use URL field for now)
- Advanced podcast settings (categories, explicit content, etc.)
- Podcast deletion button (separate component already exists)
- RSS feed generation (separate feature - AMP-004)

## Technical Approach

### Component Structure
```typescript
interface PodcastFormProps {
  podcast?: Podcast; // For edit mode
  action: (formData: FormData) => Promise<void>;
}

export function PodcastForm({ podcast, action }: PodcastFormProps) {
  // Form state management
  // RSS slug auto-generation
  // Form submission handling
}
```

### RSS Slug Generation
- Convert title to lowercase
- Replace spaces with hyphens
- Remove special characters
- Ensure valid format (alphanumeric, hyphens only)
- Make editable after auto-generation

### Server Actions
```typescript
// Create podcast
async function createPodcast(formData: FormData) {
  'use server';
  // Validate and insert into database
  // Generate RSS slug if not provided
}

// Update podcast
async function updatePodcast(id: string, formData: FormData) {
  'use server';
  // Validate and update database
  // Validate RSS slug uniqueness
}
```

### Validation Rules
- Title: required, max 255 characters
- Description: optional, max 5000 characters
- RSS slug: required, unique, alphanumeric + hyphens, max 100 characters
- Cover image URL: optional, valid URL

## Dependencies

- [x] AMP-001 (authentication - must be merged first)
- [x] AMP-002 (R2 storage - must be merged first)
- [ ] `app/podcasts/new/page.tsx` (already exists, needs component)
- [ ] `app/podcasts/[id]/page.tsx` (already exists, needs component)

## Definition of Done

- [ ] `src/components/podcast-form.tsx` exists and exported
- [ ] Form renders on `/podcasts/new` page
- [ ] Form renders on `/podcasts/[id]` edit page
- [ ] Can create new podcast successfully
- [ ] Can edit existing podcast successfully
- [ ] RSS slug auto-generates from title
- [ ] RSS slug validation works
- [ ] Form validation displays errors
- [ ] All 10 podcast E2E tests passing
- [ ] Code committed to feature branch
- [ ] Pass rate reaches 30/39 (77%)

## Testing

### Manual Testing
1. Navigate to `/podcasts/new`
2. Fill in podcast form
3. Verify RSS slug auto-generates
4. Submit and verify podcast created
5. Navigate to `/podcasts/[id]`
6. Edit podcast details
7. Submit and verify podcast updated

### E2E Tests
- Should create a new podcast
- Should show validation errors for invalid data
- Should auto-generate RSS slug from title
- Should validate RSS slug format
- Should view and edit podcast details
- Should prevent deleting podcast with episodes
- Should navigate from dashboard to podcasts
- Should cancel podcast creation
- Plus 2 more existing tests

## Related

- Blocks: 10 E2E tests for podcast management
- Dependencies: AMP-001, AMP-002 (must be merged first)
- Next: AMP-004 (RSS feed generation)
- Skills: amp-hosting (podcast RSS/media hosting)

## Notes

- Keep form simple initially (URL field for cover image, not upload)
- RSS slug should be unique across all podcasts
- Follow design patterns from upload-form.tsx for consistency
- Use Server Actions for form submission
- Client Component for interactivity (RSS slug auto-generation)

## Implementation Results

*To be filled after implementation*
