/**
 * Support Agent - Automated Job
 *
 * Monitors HelpScout for new conversations,
 * triages incoming tickets, categorizes issues,
 * and suggests responses using amp-support skill.
 *
 * Schedule: Every 30 minutes
 * Runtime: Edge Function with pg_cron
 *
 * HelpScout API Docs: https://developer.helpscout.com/docs-api/
 * OAuth2 Authentication: https://developer.helpscout.com/mailbox-api/overview/authentication
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

type TicketSource = 'helpscout' | 'zendesk' | 'email';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'new' | 'open' | 'pending' | 'closed';
type TicketCategory = 'BUG' | 'FEATURE_REQUEST' | 'BILLING' | 'HOW_TO' | 'TECHNICAL' | 'GENERAL';
type TeamAssignment = 'engineering' | 'product' | 'billing' | 'support';

interface SupportTicket {
  id: string;
  source: TicketSource;
  external_id: string;
  subject: string;
  description: string;
  from_email: string;
  from_name: string;
  priority: TicketPriority;
  status: TicketStatus;
  tags: string[];
  created_at: Date;
  // HelpScout-specific
  helpscout_mailbox_id?: string;
  helpscout_thread_count?: number;
  helpscout_customer_id?: string;
}

interface HelpScoutConversation {
  id: number;
  number: number;
  mailboxId: number;
  status: string;
  subject: string;
  preview: string;
  threads: Array<{
    id: number;
    type: string;
    createdBy: {
      type: string;
      id?: number;
      email?: string;
      first?: string;
      last?: string;
    };
    body?: string;
    createdAt: string;
  }>;
  tags: string[];
  createdAt: string;
  modifiedAt: string;
}

interface HelpScoutCustomer {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface TriageResult {
  category: TicketCategory;
  priority: TicketPriority;
  assign_to: TeamAssignment;
}

interface GeneratedResponse {
  ticket_id: string;
  category: TicketCategory;
  suggested_response: string;
  estimated_resolution_time: string;
  next_steps: string[];
}

// ============================================================================
// Triage Configuration
// ============================================================================

const TRIAGE_CATEGORIES: Record<string, {
  pattern: RegExp;
  priority: TicketPriority;
  assign_to: TeamAssignment;
}> = {
  BUG: {
    pattern: /bug|error|broken|not working|crash|fail|issue/i,
    priority: 'high',
    assign_to: 'engineering',
  },
  FEATURE_REQUEST: {
    pattern: /feature|request|add|enhancement|improve|wish|suggest/i,
    priority: 'low',
    assign_to: 'product',
  },
  BILLING: {
    pattern: /billing|payment|invoice|refund|subscription|charge|credit/i,
    priority: 'high',
    assign_to: 'billing',
  },
  HOW_TO: {
    pattern: /how to|how do i|help with|can i|tutorial|guide/i,
    priority: 'medium',
    assign_to: 'support',
  },
  TECHNICAL: {
    pattern: /rss|feed|audio|upload|transcription|api|integration|webhook/i,
    priority: 'medium',
    assign_to: 'engineering',
  },
};

// ============================================================================
// Response Templates
// ============================================================================

interface ResponseTemplate {
  greeting: string | ((name: string) => string);
  body: (ticket: SupportTicket) => string;
  closing: string;
  estimated_resolution_time: string;
  next_steps: string[];
}

const RESPONSE_TEMPLATES: Record<TicketCategory, ResponseTemplate> = {
  BUG: {
    greeting: (name: string) => `Hi ${name},`,
    body: (ticket: SupportTicket) => {
      const snippet = ticket.description?.length
        ? ticket.description.length > 100
          ? ticket.description.substring(0, 97) + '...'
          : ticket.description
        : 'this issue occurred';

      return `Thanks for reporting this issue - I'm sorry you're running into trouble.\n\nI can see this is happening when you ${snippet}. Let me investigate this and get back to you with an update.\n\nI'll respond within 24 hours with an update.`;
    },
    closing: 'Best regards,\nAutoMapod Support',
    estimated_resolution_time: '1-2 business days',
    next_steps: ['Gather reproduction steps', 'Check system status', 'Escalate to engineering'],
  },
  FEATURE_REQUEST: {
    greeting: (name: string) => `Hi ${name},`,
    body: () => `Great suggestion! I can see how this would be useful for your podcast workflow.\n\nI've added this to our feature request tracker. We consider all requests when planning our roadmap, and I'll let you know if this gets scheduled.\n\nIs there anything else this feature would solve for you?`,
    closing: 'Best regards,\nAutoMapod Support',
    estimated_resolution_time: 'Not applicable',
    next_steps: ['Log in feature tracker', 'Check for similar requests', 'Update user if implemented'],
  },
  BILLING: {
    greeting: (name: string) => `Hi ${name},`,
    body: () => `I understand you have a billing concern. Let me look into this right away and get back to you within 24 hours with a resolution.\n\nSorry for the trouble!`,
    closing: 'Best regards,\nAutoMapod Support',
    estimated_resolution_time: '24 hours',
    next_steps: ['Review billing records', 'Check payment processor', 'Calculate refund if applicable'],
  },
  HOW_TO: {
    greeting: (name: string) => `Hi ${name},`,
    body: () => `Great question! Here's how to do that:\n\n[Provide step-by-step instructions based on their question]\n\nLet me know if you need more clarification!`,
    closing: 'Best regards,\nAutoMapod Support',
    estimated_resolution_time: 'Immediate',
    next_steps: ['Provide documentation link', 'Offer walkthrough', 'Follow up for confirmation'],
  },
  TECHNICAL: {
    greeting: (name: string) => `Hi ${name},`,
    body: () => `This sounds like a technical issue. Let me check our system status and documentation to help you resolve this.\n\nI'll get back to you within 2-4 hours with an update.`,
    closing: 'Best regards,\nAutoMapod Support',
    estimated_resolution_time: '2-4 hours',
    next_steps: ['Check system status', 'Review relevant docs', 'Test reproduction'],
  },
  GENERAL: {
    greeting: (name: string) => `Hi ${name},`,
    body: () => `Thank you for contacting AutoMapod support. I've received your message and will get back to you within 24 hours.`,
    closing: 'Best regards,\nAutoMapod Support',
    estimated_resolution_time: '24 hours',
    next_steps: ['Review inquiry', 'Research if needed', 'Draft response'],
  },
};

// ============================================================================
// HelpScout API Client
// ============================================================================

interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

class HelpScoutClient {
  private clientId: string;
  private clientSecret: string;
  private botUserId: string;
  private baseUrl = 'https://api.helpscout.net/v2';
  private tokenUrl = 'https://api.helpscout.net/v2/oauth2/token';
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(clientId: string, clientSecret: string, botUserId: string) {
    this.clientId = clientId.trim();
    this.clientSecret = clientSecret.trim();
    this.botUserId = botUserId.trim();
  }

  /**
   * Get OAuth2 access token using client credentials flow
   * HelpScout uses OAuth2 for API v2 authentication
   * Docs: https://developer.helpscout.com/mailbox-api/overview/authentication
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Request new access token
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorJson = await response.json();
        errorDetails = JSON.stringify(errorJson);
      } catch {
        errorDetails = await response.text();
      }

      throw new Error(
        `HelpScout OAuth2 token request failed: ${response.status} ${response.statusText}\n` +
        `Details: ${errorDetails}`
      );
    }

    const data: OAuth2TokenResponse = await response.json();

    if (!data.access_token) {
      throw new Error('HelpScout OAuth2 response missing access_token');
    }

    // Cache token with expiration buffer (5 minutes before actual expiry)
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

    console.log('HelpScout OAuth2 token obtained successfully');
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Get OAuth2 access token
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorJson = await response.json();
        errorDetails = JSON.stringify(errorJson);
      } catch {
        errorDetails = await response.text();
      }

      throw new Error(
        `HelpScout API error: ${response.status} ${response.statusText}\n` +
        `Endpoint: ${endpoint}\n` +
        `Details: ${errorDetails}`
      );
    }

    return response.json();
  }

  async getConversations(mailboxId?: string, status = 'active', page = 1): Promise<{
    conversations: HelpScoutConversation[];
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      status,
      embed: 'threads',
      page: page.toString(),
      pageSize: '50',
    });

    if (mailboxId) {
      params.append('mailboxId', mailboxId);
    }

    const data = await this.request<{
      _embedded: { conversations: HelpScoutConversation[] };
      _page: { totalPages: number };
    }>(`/conversations?${params.toString()}`);

    return {
      conversations: data._embedded.conversations,
      totalPages: data._page.totalPages,
    };
  }

  async getAllConversations(mailboxId?: string, status = 'active'): Promise<HelpScoutConversation[]> {
    const allConversations: HelpScoutConversation[] = [];
    let page = 1;

    while (true) {
      const { conversations, totalPages } = await this.getConversations(mailboxId, status, page);
      allConversations.push(...conversations);

      if (page >= totalPages) break;
      page++;
    }

    return allConversations;
  }

  async getCustomer(id: number): Promise<HelpScoutCustomer> {
    return this.request<HelpScoutCustomer>(`/customers/${id}`);
  }

  async addTag(conversationId: number, tag: string): Promise<void> {
    await this.request(`/conversations/${conversationId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags: [tag] }),
    });
  }

  async createReply(conversationId: number, text: string, draft = true): Promise<void> {
    const botUserId = parseInt(this.botUserId);
    if (isNaN(botUserId)) {
      throw new Error(`Invalid HELPSCOUT_BOT_USER_ID: ${this.botUserId}`);
    }

    await this.request(`/conversations/${conversationId}/threads`, {
      method: 'POST',
      body: JSON.stringify({
        type: draft ? 'draft' : 'customer',
        text,
        createdBy: { type: 'user', id: botUserId },
      }),
    });
  }
}

// ============================================================================
// Triage Functions
// ============================================================================

function triageTicket(ticket: SupportTicket): TriageResult {
  const combined = `${ticket.subject} ${ticket.description || ''}`.toLowerCase();

  for (const [category, rules] of Object.entries(TRIAGE_CATEGORIES)) {
    if (rules.pattern.test(combined)) {
      return {
        category: category as TicketCategory,
        priority: ticket.priority === 'urgent' ? 'urgent' : rules.priority,
        assign_to: rules.assign_to,
      };
    }
  }

  // Default categorization
  return {
    category: 'GENERAL',
    priority: 'low',
    assign_to: 'support',
  };
}

function generateResponse(ticket: SupportTicket, triage: TriageResult): GeneratedResponse {
  const template = RESPONSE_TEMPLATES[triage.category] || RESPONSE_TEMPLATES.GENERAL;

  return {
    ticket_id: ticket.id,
    category: triage.category,
    suggested_response: [
      typeof template.greeting === 'function' ? template.greeting(ticket.from_name) : template.greeting,
      template.body(ticket),
      template.closing,
    ].join('\n\n'),
    estimated_resolution_time: template.estimated_resolution_time,
    next_steps: template.next_steps,
  };
}

// ============================================================================
// Ticket Processing
// ============================================================================

interface TicketProcessResult {
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  sampleDetails: any[];
}

async function processTickets(
  supabase: SupabaseClient,
  helpScoutClient: HelpScoutClient | null
): Promise<TicketProcessResult> {
  console.log('Support agent: Fetching new tickets...');

  const tickets = await fetchTicketsFromSources(helpScoutClient);
  console.log(`Found ${tickets.length} new tickets`);

  if (tickets.length === 0) {
    return { processedCount: 0, skippedCount: 0, errorCount: 0, sampleDetails: [] };
  }

  // Batch check: Get all existing ticket IDs in one query
  const { data: existingTickets } = await supabase
    .from('support_triage')
    .select('ticket_id, source')
    .or(tickets.map(t => `and(ticket_id.eq.${t.id},source.eq.${t.source})`).join(','));

  const existingSet = new Set(
    (existingTickets || []).map(t => `${t.ticket_id}|${t.source}`)
  );

  // Filter out already-processed tickets
  const newTickets = tickets.filter(
    t => !existingSet.has(`${t.id}|${t.source}`)
  );

  console.log(`${newTickets.length} new tickets after deduplication`);

  if (newTickets.length === 0) {
    return { processedCount: 0, skippedCount: tickets.length, errorCount: 0, sampleDetails: [] };
  }

  let processedCount = 0;
  let errorCount = 0;
  const sampleDetails: any[] = [];

  // Prepare triage records for batch insert
  const triageRecords = newTickets.map((ticket) => {
    const triage = triageTicket(ticket);
    const response = generateResponse(ticket, triage);

    return {
      ticket_id: ticket.id,
      source: ticket.source,
      external_id: ticket.external_id,
      subject: ticket.subject,
      description: ticket.description,
      from_email: ticket.from_email,
      from_name: ticket.from_name,
      category: triage.category,
      priority: triage.priority,
      assign_to: triage.assign_to,
      suggested_response: response.suggested_response,
      estimated_resolution_time: response.estimated_resolution_time,
      next_steps: response.next_steps,
      status: 'pending_review',
      helpscout_mailbox_id: ticket.helpscout_mailbox_id,
      helpscout_thread_count: ticket.helpscout_thread_count,
      helpscout_customer_id: ticket.helpscout_customer_id,
      processed_at: new Date().toISOString(),
    };
  });

  // Batch insert with upsert to handle race conditions
  const { data: insertedData, error: insertError } = await supabase
    .from('support_triage')
    .upsert(triageRecords, {
      onConflict: 'ticket_id,source',
      ignoreDuplicates: false,
    })
    .select();

  if (insertError) {
    console.error('Failed to store triage records:', insertError);
    return { processedCount: 0, skippedCount: tickets.length, errorCount: tickets.length, sampleDetails: [] };
  }

  processedCount = insertedData?.length || 0;
  sampleDetails.push(...(insertedData || []).slice(0, 10));

  console.log(`Stored ${processedCount} triage records`);

  // Tag conversations in HelpScout (parallel with concurrency limit)
  if (helpScoutClient) {
    const toTag = newTickets.filter(t => t.source === 'helpscout');
    const BATCH_SIZE = 5;

    for (let i = 0; i < toTag.length; i += BATCH_SIZE) {
      const batch = toTag.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (ticket) => {
          try {
            const conversationId = parseInt(ticket.external_id);
            if (isNaN(conversationId)) {
              console.warn(`Invalid conversation ID: ${ticket.external_id}`);
              return;
            }
            await helpScoutClient!.addTag(conversationId, 'auto-triaged');
            console.log(`Tagged conversation ${conversationId} as auto-triaged`);
          } catch (e) {
            console.error(`Failed to tag conversation ${ticket.external_id}:`, e);
            errorCount++;
          }
        })
      );
    }
  }

  return {
    processedCount,
    skippedCount: tickets.length - processedCount,
    errorCount,
    sampleDetails,
  };
}

async function fetchTicketsFromSources(helpScoutClient: HelpScoutClient | null): Promise<SupportTicket[]> {
  const tickets: SupportTicket[] = [];

  // Fetch from HelpScout
  if (helpScoutClient) {
    try {
      const conversations = await helpScoutClient.getAllConversations();

      for (const convo of conversations) {
        // Get customer info from first thread
        const customerThread = convo.threads.find(t => t.type === 'customer');
        if (!customerThread || !customerThread.createdBy) {
          console.warn(`Conversation ${convo.id} has no valid customer thread, skipping`);
          continue;
        }

        const { email, first, last, id } = customerThread.createdBy;

        if (!email) {
          console.warn(`Conversation ${convo.id} has no customer email, skipping`);
          continue;
        }

        tickets.push({
          id: `hs-${convo.id}`,
          source: 'helpscout',
          external_id: convo.id.toString(),
          subject: convo.subject || '(No subject)',
          description: convo.preview || '',
          from_email: email,
          from_name: [first, last].filter(Boolean).join(' ') || email,
          priority: convo.tags.some(t => t.toLowerCase().includes('urgent')) ? 'urgent' : 'medium',
          status: convo.status as TicketStatus,
          tags: convo.tags,
          created_at: new Date(convo.createdAt),
          helpscout_mailbox_id: convo.mailboxId.toString(),
          helpscout_thread_count: convo.threads.length,
          helpscout_customer_id: id?.toString(),
        });
      }

      console.log(`Fetched ${tickets.length} conversations from HelpScout`);
    } catch (error) {
      console.error('Error fetching from HelpScout:', error);
    }
  }

  // TODO: Implement Zendesk integration
  // TODO: Fetch from email support@

  return tickets;
}

// ============================================================================
// Edge Function Handler
// ============================================================================

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const helpScoutClientId = Deno.env.get('HELPSCOUT_CLIENT_ID')?.trim();
    const helpScoutClientSecret = Deno.env.get('HELPSCOUT_CLIENT_SECRET')?.trim();
    const helpScoutBotUserId = Deno.env.get('HELPSCOUT_BOT_USER_ID')?.trim() || '0';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let helpScoutClient: HelpScoutClient | null = null;
    if (helpScoutClientId && helpScoutClientSecret) {
      helpScoutClient = new HelpScoutClient(helpScoutClientId, helpScoutClientSecret, helpScoutBotUserId);
      console.log('HelpScout client initialized with OAuth2');
    } else {
      console.warn('HELPSCOUT_CLIENT_ID or HELPSCOUT_CLIENT_SECRET not set, skipping HelpScout integration');
    }

    const results = await processTickets(supabase, helpScoutClient);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Support agent error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ============================================================================
// Self-Test
// ============================================================================

export async function selfTest() {
  console.log('Running support agent self-test...');

  const testTicket: SupportTicket = {
    id: 'test-123',
    source: 'email',
    external_id: 'test-ext-123',
    subject: 'Podcast upload not working',
    description: 'I keep getting an error when trying to upload my podcast episode',
    from_email: 'user@example.com',
    from_name: 'Test User',
    priority: 'medium',
    status: 'new',
    tags: [],
    created_at: new Date(),
  };

  const triage = triageTicket(testTicket);
  console.log('Triage result:', triage);

  if (triage.category !== 'TECHNICAL' && triage.category !== 'BUG') {
    throw new Error('Expected technical or bug category');
  }

  const response = generateResponse(testTicket, triage);
  console.log('Generated response:', response.suggested_response.substring(0, 100) + '...');

  console.log('Support agent self-test passed');
}
