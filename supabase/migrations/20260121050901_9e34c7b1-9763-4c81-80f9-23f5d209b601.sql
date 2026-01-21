-- Add video_type column to lessons table for different video sources
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS video_type TEXT NOT NULL DEFAULT 'youtube';

-- Add constraint for valid video types
ALTER TABLE public.lessons 
ADD CONSTRAINT lessons_video_type_check 
CHECK (video_type IN ('youtube', 'telegram', 'upload', 'direct'));

-- Add comment to explain video types
COMMENT ON COLUMN public.lessons.video_type IS 'Type of video: youtube (public/unlisted YouTube), telegram (Telegram video), upload (uploaded file), direct (direct URL)';