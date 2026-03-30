-- Add ad_enhanced_audio_url column to episodes table
-- This stores the URL of the audio with ads injected

ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS ad_enhanced_audio_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN episodes.ad_enhanced_audio_url IS 'URL of the audio file with ads injected (if any). Falls back to audio_url if null.';
