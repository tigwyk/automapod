/**
 * Database Types for AutoMapod
 * Generated from Supabase schema
 */

// ============================================
// Core Types
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ad_campaigns: {
        Row: AdCampaign
        Insert: AdCampaignInsert
        Update: AdCampaignUpdate
      }
      ad_creatives: {
        Row: AdCreative
        Insert: AdCreativeInsert
        Update: AdCreativeUpdate
      }
      ad_placements: {
        Row: AdPlacement
        Insert: AdPlacementInsert
        Update: AdPlacementUpdate
      }
      silence_markers: {
        Row: SilenceMarker
        Insert: SilenceMarkerInsert
        Update: SilenceMarkerUpdate
      }
      episodes: {
        Row: Episode
        Insert: EpisodeInsert
        Update: EpisodeUpdate
      }
      podcasts: {
        Row: Podcast
        Insert: PodcastInsert
        Update: PodcastUpdate
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ad_campaign_type: 'host_read' | 'pre_recorded' | 'network'
      ad_campaign_status: 'draft' | 'active' | 'paused' | 'completed'
      ad_placement_type: 'pre_roll' | 'mid_roll' | 'post_roll' | 'dynamic'
      ad_placement_status: 'pending' | 'placed' | 'skipped'
    }
  }
}

// ============================================
// Ad Campaign Types
// ============================================

export type AdCampaignType = Database.public.Enums['ad_campaign_type']
export type AdCampaignStatus = Database.public.Enums['ad_campaign_status']

export interface AdCampaign {
  id: string
  user_id: string
  name: string
  type: AdCampaignType
  start_date: string // ISO 8601 datetime
  end_date: string | null // ISO 8601 datetime
  budget_cents: number
  status: AdCampaignStatus
  created_at: string // ISO 8601 datetime
  updated_at: string // ISO 8601 datetime
}

export type AdCampaignInsert = Omit<AdCampaign, 'id' | 'created_at' | 'updated_at'>
export type AdCampaignUpdate = Partial<Omit<AdCampaignInsert, 'user_id'>>

// Supabase query result with aggregated counts
export interface AdCampaignWithCounts extends AdCampaign {
  ad_creatives?: [{ count: number }]
  ad_placements?: [{ count: number }]
}

// ============================================
// Ad Creative Types
// ============================================

export interface AdCreative {
  id: string
  campaign_id: string
  name: string
  audio_url: string
  duration_seconds: number
  transcript: string | null
  click_through_url: string | null
  created_at: string // ISO 8601 datetime
}

export type AdCreativeInsert = Omit<AdCreative, 'id' | 'created_at'>
export type AdCreativeUpdate = Partial<AdCreativeInsert>

// Supabase query result with nested campaign data
export interface AdCreativeWithCampaign extends AdCreative {
  ad_campaigns: {
    user_id: string
  }[]
}

// Supabase query result with nested campaign name
export interface AdCreativeWithCampaignName extends AdCreative {
  ad_campaigns?: {
    name: string
  }[]
}

// Supabase query result with nested campaign for ownership check
export interface AdCreativeWithCampaignForOwnership extends AdCreative {
  ad_campaigns: {
    user_id: string
  }[]
}

// ============================================
// Ad Placement Types
// ============================================

export type AdPlacementType = Database.public.Enums['ad_placement_type']
export type AdPlacementStatus = Database.public.Enums['ad_placement_status']

export interface AdPlacement {
  id: string
  episode_id: string
  creative_id: string
  position_ms: number
  type: AdPlacementType
  status: AdPlacementStatus
  created_at: string // ISO 8601 datetime
}

export type AdPlacementInsert = Omit<AdPlacement, 'id' | 'created_at'>
export type AdPlacementUpdate = Partial<AdPlacementInsert>

// Supabase query result with nested creative and campaign data
export interface AdPlacementWithDetails extends AdPlacement {
  ad_creatives?: {
    name: string
    ad_campaigns?: {
      name: string
    }[]
  }[]
}

// ============================================
// Silence Marker Types
// ============================================

export interface SilenceMarker {
  id: string
  episode_id: string
  start_ms: number
  end_ms: number
  duration_ms: number
  confidence: number // 0-1
  is_suggested_placement: boolean
  created_at: string // ISO 8601 datetime
}

export type SilenceMarkerInsert = Omit<SilenceMarker, 'id' | 'created_at'>
export type SilenceMarkerUpdate = Partial<SilenceMarkerInsert>

// ============================================
// Episode Types (Extended for Ads)
// ============================================

export interface Episode {
  id: string
  podcast_id: string
  title: string
  description: string | null
  audio_url: string
  ad_enhanced_audio_url: string | null // URL with ads injected
  duration_seconds: number | null
  transcript: string | null
  transcript_status: 'pending' | 'processing' | 'completed' | 'failed' | null
  published_at: string | null // ISO 8601 datetime
  created_at: string // ISO 8601 datetime
}

export type EpisodeInsert = Omit<Episode, 'id' | 'created_at'>
export type EpisodeUpdate = Partial<Omit<EpisodeInsert, 'podcast_id'>>

// Supabase query result with nested podcast data
export interface EpisodeWithPodcast extends Episode {
  podcasts: {
    user_id: string
  }[]
}

// ============================================
// Podcast Types
// ============================================

export interface Podcast {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_image_url: string | null
  rss_slug: string | null
  created_at: string // ISO 8601 datetime
  updated_at: string // ISO 8601 datetime
}

export type PodcastInsert = Omit<Podcast, 'id' | 'created_at' | 'updated_at'>
export type PodcastUpdate = Partial<Omit<PodcastInsert, 'user_id'>>

// ============================================
// API Request/Response Types
// ============================================

// Campaign Management
export interface CreateCampaignRequest {
  name: string
  type: AdCampaignType
  start_date: string // ISO 8601 date
  end_date?: string // ISO 8601 date
  budget_cents?: number
}

export interface UpdateCampaignRequest {
  name?: string
  status?: AdCampaignStatus
  end_date?: string
  budget_cents?: number
}

export interface CampaignResponse extends AdCampaign {
  creatives_count?: number
  placements_count?: number
}

// Creative Management
export interface CreateCreativeRequest {
  campaign_id: string
  name: string
  audio_url: string
  duration_seconds: number
  transcript?: string
  click_through_url?: string
}

export interface CreativeResponse extends AdCreative {
  campaign_name?: string
}

// Placement Management
export interface CreatePlacementRequest {
  episode_id: string
  creative_id: string
  position_ms: number
  type: AdPlacementType
}

export interface UpdatePlacementRequest {
  position_ms?: number
  status?: AdPlacementStatus
}

export interface PlacementResponse extends AdPlacement {
  episode_title?: string
  creative_name?: string
  campaign_name?: string
}

// Silence Detection
export interface SilenceMarkerResponse extends SilenceMarker {
  formatted_time: string // "MM:SS" format
}

export interface AnalyzeSilenceRequest {
  min_duration_ms?: number // Minimum silence duration to detect (default: 1000ms)
  min_confidence?: number // Minimum confidence score (default: 0.7)
}

export interface AnalyzeSilenceResponse {
  episode_id: string
  markers_detected: number
  suggested_placements: number
  processing_time_ms: number
}

// Ad Injection
export interface InjectAdsRequest {
  episode_id: string
  placement_ids?: string[] // Specific placements to include (default: all 'placed')
}

export interface InjectAdsResponse {
  episode_id: string
  audio_url: string
  ads_injected: number
  total_duration_seconds: number
  processing_time_ms: number
}

// ============================================
// Helper Types
// ============================================

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type Nullable<T> = { [K in keyof T]: T[K] | null }

// ============================================
// Validation Errors
// ============================================

export class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(
    public resource: string,
    public id: string
  ) {
    super(`${resource} with id ${id} not found`)
    this.name = 'NotFoundError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Unauthorized access') {
    super(message)
    this.name = 'AuthorizationError'
  }
}
