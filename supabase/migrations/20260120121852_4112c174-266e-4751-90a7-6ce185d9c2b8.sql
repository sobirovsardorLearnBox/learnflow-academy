-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  system_notifications BOOLEAN NOT NULL DEFAULT true,
  new_lesson_notifications BOOLEAN NOT NULL DEFAULT true,
  reminder_notifications BOOLEAN NOT NULL DEFAULT true,
  achievement_notifications BOOLEAN NOT NULL DEFAULT true,
  payment_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modify the notification trigger to respect preferences
CREATE OR REPLACE FUNCTION public.check_notification_preference(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  pref_exists BOOLEAN;
  is_enabled BOOLEAN;
BEGIN
  -- Check if user has preferences
  SELECT EXISTS(SELECT 1 FROM public.notification_preferences WHERE user_id = p_user_id) INTO pref_exists;
  
  -- If no preferences, allow all notifications (default behavior)
  IF NOT pref_exists THEN
    RETURN true;
  END IF;
  
  -- Check specific notification type
  CASE p_notification_type
    WHEN 'system' THEN
      SELECT system_notifications INTO is_enabled FROM public.notification_preferences WHERE user_id = p_user_id;
    WHEN 'new_lesson' THEN
      SELECT new_lesson_notifications INTO is_enabled FROM public.notification_preferences WHERE user_id = p_user_id;
    WHEN 'reminder' THEN
      SELECT reminder_notifications INTO is_enabled FROM public.notification_preferences WHERE user_id = p_user_id;
    WHEN 'achievement' THEN
      SELECT achievement_notifications INTO is_enabled FROM public.notification_preferences WHERE user_id = p_user_id;
    WHEN 'payment' THEN
      SELECT payment_notifications INTO is_enabled FROM public.notification_preferences WHERE user_id = p_user_id;
    ELSE
      RETURN true; -- Unknown types are allowed
  END CASE;
  
  RETURN COALESCE(is_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;