-- Create notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Function to create notification for lesson completion
CREATE OR REPLACE FUNCTION public.notify_lesson_completed()
RETURNS TRIGGER AS $$
DECLARE
  lesson_title TEXT;
  unit_name TEXT;
BEGIN
  -- Only trigger on new completions
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    -- Get lesson and unit info
    SELECT l.title, u.name INTO lesson_title, unit_name
    FROM lessons l
    JOIN units u ON u.id = l.unit_id
    WHERE l.id = NEW.lesson_id;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'lesson_complete',
      'Dars tugatildi! 🎉',
      format('Siz "%s" darsini muvaffaqiyatli tugatdingiz!', lesson_title),
      jsonb_build_object('lesson_id', NEW.lesson_id, 'unit_name', unit_name)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create notification for unit completion
CREATE OR REPLACE FUNCTION public.notify_unit_completed()
RETURNS TRIGGER AS $$
DECLARE
  unit_title TEXT;
  level_name TEXT;
BEGIN
  -- Only trigger on new completions
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    -- Get unit and level info
    SELECT u.name, l.name INTO unit_title, level_name
    FROM units u
    JOIN levels l ON l.id = u.level_id
    WHERE u.id = NEW.unit_id;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'unit_complete',
      'Bo''lim tugatildi! 🏆',
      format('Tabriklaymiz! Siz "%s" bo''limini to''liq tugatdingiz!', unit_title),
      jsonb_build_object('unit_id', NEW.unit_id, 'level_name', level_name, 'score', NEW.score)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create notification for payment approval
CREATE OR REPLACE FUNCTION public.notify_payment_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'payment',
      'To''lov tasdiqlandi! ✅',
      format('%s %s oyi uchun to''lovingiz tasdiqlandi. Barcha darslarga kirish ochildi!', NEW.year, NEW.month),
      jsonb_build_object('payment_id', NEW.id, 'month', NEW.month, 'year', NEW.year, 'amount', NEW.amount)
    );
  -- Notify if payment is blocked
  ELSIF NEW.status = 'blocked' AND (OLD IS NULL OR OLD.status != 'blocked') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'payment',
      'To''lov holati o''zgardi ⚠️',
      format('%s %s oyi uchun to''lovingiz bloklandi. Iltimos, admin bilan bog''laning.', NEW.year, NEW.month),
      jsonb_build_object('payment_id', NEW.id, 'month', NEW.month, 'year', NEW.year)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER on_lesson_completed
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lesson_completed();

CREATE TRIGGER on_unit_completed
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_unit_completed();

CREATE TRIGGER on_payment_status_changed
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_status_changed();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;