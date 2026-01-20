-- Add score column to lesson_progress table
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS score integer DEFAULT 0;

-- Add video_completed column to track video watching
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS video_completed boolean DEFAULT false;

-- Add quiz_score column to track quiz percentage
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS quiz_score integer DEFAULT 0;