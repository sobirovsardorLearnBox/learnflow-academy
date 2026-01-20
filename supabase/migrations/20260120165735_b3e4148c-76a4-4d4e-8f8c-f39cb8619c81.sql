-- Performance indexes for lesson_progress table
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed_at ON public.lesson_progress(completed_at DESC) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed ON public.lesson_progress(user_id, completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_user ON public.lesson_progress(lesson_id, user_id);

-- Performance indexes for user_progress table
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON public.user_progress(completed_at DESC) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_user_progress_user_completed ON public.user_progress(user_id, completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_user_progress_unit_user ON public.user_progress(unit_id, user_id);

-- Composite indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_lesson_progress_leaderboard ON public.lesson_progress(user_id, completed, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_leaderboard ON public.user_progress(user_id, completed, completed_at DESC);