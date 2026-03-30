-- Support triage table for HelpScout integration
-- Stores categorized and prioritized support tickets for review

create table if not exists public.support_triage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Ticket identification
  ticket_id text not null,
  source text not null check (source in ('helpscout', 'zendesk', 'email')),
  external_id text, -- HelpScout conversation ID, etc.

  -- Ticket content
  subject text not null,
  description text,
  from_email text,
  from_name text,

  -- Triage
  category text not null check (category in (
    'BUG', 'FEATURE_REQUEST', 'BILLING', 'HOW_TO', 'TECHNICAL', 'GENERAL'
  )),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  assign_to text not null, -- 'engineering', 'product', 'billing', 'support'

  -- Response
  suggested_response text,
  estimated_resolution_time text,
  next_steps jsonb default '[]'::jsonb,

  -- Status
  status text not null default 'pending_review' check (status in (
    'pending_review', 'approved', 'sent', 'escalated', 'dismissed'
  )),

  -- Processing metadata
  processed_at timestamptz,
  processed_by_agent_id uuid,

  -- HelpScout-specific
  helpscout_mailbox_id text,
  helpscout_thread_count int default 0,
  helpscout_customer_id text,

  -- Review
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  review_notes text,

  -- Resolution
  resolution_notes text,
  resolved_at timestamptz,

  unique(ticket_id, source)
);

-- Indexes for lookups
create index idx_support_triage_status on public.support_triage(status);
create index idx_support_triage_priority on public.support_triage(priority);
create index idx_support_triage_category on public.support_triage(category);
create index idx_support_triage_source on public.support_triage(source);
create index idx_support_triage_created_at on public.support_triage(created_at desc);

-- RLS Policies
alter table public.support_triage enable row level security;

-- Service role can do everything
create policy "Service role has full access to support_triage"
  on public.support_triage
  to service_role
  using (true)
  with check (true);

-- Users with support role can read
create policy "Support role can read support_triage"
  on public.support_triage
  for select
  to authenticated
  using (
    jwt_claims() ->> 'role' = 'authenticated'
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and (users.role = 'admin' or users.role = 'support')
    )
  );

-- Users can update status (for reviewing/approving responses)
create policy "Support role can update support_triage"
  on public.support_triage
  for update
  to authenticated
  using (
    jwt_claims() ->> 'role' = 'authenticated'
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and (users.role = 'admin' or users.role = 'support')
    )
  )
  with check (true);

-- Updated at trigger
create trigger update_support_triage_updated_at
  before update on public.support_triage
  for each row
  execute procedure public.update_updated_at_column();

-- Comments
comment on table public.support_triage is 'Support ticket triage and categorization for HelpScout integration';
comment on column public.support_triage.ticket_id is 'Source-specific ticket identifier';
comment on column public.support_triage.source is 'Ticket source: helpscout, zendesk, or email';
comment on column public.support_triage.external_id is 'External system ID (e.g., HelpScout conversation ID)';
comment on column public.support_triage.category is 'Triage category: BUG, FEATURE_REQUEST, BILLING, HOW_TO, TECHNICAL, GENERAL';
comment on column public.support_triage.priority is 'Priority level: low, medium, high, urgent';
comment on column public.support_triage.assign_to is 'Team assignment: engineering, product, billing, support';
comment on column public.support_triage.suggested_response is 'AI-generated response draft for review';
comment on column public.support_triage.next_steps is 'JSON array of recommended next steps';
comment on column public.support_triage.status is 'Review status: pending_review, approved, sent, escalated, dismissed';
