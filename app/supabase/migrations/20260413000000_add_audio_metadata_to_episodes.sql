-- Add file size and content type metadata to episodes for valid RSS enclosure tags
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS audio_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS audio_content_type TEXT;

COMMENT ON COLUMN episodes.audio_file_size IS 'File size in bytes of the original audio file (used in RSS enclosure length attribute)';
COMMENT ON COLUMN episodes.audio_content_type IS 'MIME type of the audio file (e.g. audio/mpeg, audio/mp4) used in RSS enclosure type attribute';
