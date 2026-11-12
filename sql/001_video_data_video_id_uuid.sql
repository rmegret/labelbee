-- Labelbee now gets videos from DataInfrastructure (UUID ids).
-- Run once on an existing labelbee database so annotations (video_data)
-- can reference DataInfrastructure video UUIDs.
--
-- Annotations saved before this change keep their old integer video id
-- (as text); they will not match a DataInfrastructure video until they are
-- re-linked, e.g.:
--   UPDATE video_data SET video_id = '<datainfra uuid>' WHERE video_id = '<old id>';

BEGIN;
ALTER TABLE video_data DROP CONSTRAINT IF EXISTS video_data_video_id_fkey;
ALTER TABLE video_data ALTER COLUMN video_id TYPE VARCHAR(64) USING video_id::text;
CREATE INDEX IF NOT EXISTS ix_video_data_video_id ON video_data (video_id);
COMMIT;
