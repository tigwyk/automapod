# [AMP-006] Episode Edit Page

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

Add ability to edit episode metadata (title, description, podcast assignment) after upload.

## Scope

### In Scope (MVP)
- [ ] Create ticket and plan work
- [ ] GET /episodes/[id]/edit page
- [ ] PATCH /api/episodes/[id] endpoint
- [ ] Edit form with title and description
- [ ] Podcast selector (change which podcast episode belongs to)
- [ ] Form validation
- [ ] Save changes to database
- [ ] Navigate back to episode detail after save
- [ ] Cancel button to return without saving
- [ ] E2E tests

### Out Scope (Future)
- [ ] Edit audio file (replace audio)
- [ ] Edit transcript
- [ ] Edit duration
- [ ] Bulk edit multiple episodes
- [ ] Scheduled publishing

## Approach

### Edit Page UI

**Route**: `/episodes/[id]/edit`

**Form fields:**
- Title (text input, required)
- Description (textarea, optional)
- Podcast (select dropdown, required)

**Actions:**
- Save button (submit form)
- Cancel button (navigate back)

### API Endpoint

**Route**: `PATCH /api/episodes/[id]`

**Request body:**
```typescript
{
  title?: string;
  description?: string;
  podcast_id?: string;
}
```

**Response:**
```typescript
{
  id: string;
  title: string;
  description: string;
  podcast_id: string;
}
```

### Validation

- Title required (min 1 character)
- At least one field must change
- User must own the podcast
- Episode must exist

## Dependencies

- Episode exists in database
- User authentication
- User owns the episode's podcast (or target podcast for reassignment)

## Definition of Done
- [ ] Edit page accessible from episode detail page
- [ ] Form pre-populated with current values
- [ ] Can edit title and description
- [ ] Can change podcast assignment
- [ ] Changes persist to database
- [ ] Validation prevents invalid data
- [ ] Cancel returns to episode detail
- [ ] Tests pass

## Technical Details

### Edit Page Structure

```typescript
// Pre-populate form with current episode data
const episode = await getEpisode(id);

// Form submission calls API
await fetch(`/api/episodes/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ title, description, podcast_id }),
});
```

### Podcast Selector

Need to fetch user's podcasts for the dropdown:
```typescript
const { data: podcasts } = await supabase
  .from('podcasts')
  .select('id, title')
  .eq('user_id', user.id);
```

## Notes

- This is a common UX pattern - users often need to fix typos or reorganize content
- Reassigning episodes between podcasts is useful for reorganization
- Keep it simple - no audio editing yet

---

*Created: 2026-03-15*
