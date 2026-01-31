-- =====================================================
-- SECURITY FIX: Add TO authenticated to all RLS policies
-- This prevents anonymous users from accessing data
-- =====================================================

-- ============== ATTENDANCE ==============
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can manage their students attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;

CREATE POLICY "Admins can manage all attendance" ON public.attendance
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage their students attendance" ON public.attendance
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
  WHERE gm.user_id = attendance.user_id AND g.teacher_id = auth.uid()
));

CREATE POLICY "Users can view their own attendance" ON public.attendance
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== DEVICES ==============
DROP POLICY IF EXISTS "Admins can manage all devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can view all devices" ON public.devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can view their own devices" ON public.devices;

CREATE POLICY "Admins can manage all devices" ON public.devices
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own devices" ON public.devices
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" ON public.devices
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own devices" ON public.devices
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== GROUP_MEMBERS ==============
DROP POLICY IF EXISTS "Admins can manage all group members" ON public.group_members;
DROP POLICY IF EXISTS "Students can view their own group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Teachers can manage members of their groups" ON public.group_members;

CREATE POLICY "Admins can manage all group members" ON public.group_members
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view their own group memberships" ON public.group_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can manage members of their groups" ON public.group_members
FOR ALL TO authenticated
USING (is_teacher_of_group(group_id, auth.uid()));

-- ============== GROUP_SECTIONS ==============
DROP POLICY IF EXISTS "Admins can manage group sections" ON public.group_sections;
DROP POLICY IF EXISTS "Students can view their group sections" ON public.group_sections;
DROP POLICY IF EXISTS "Teachers can manage their group sections" ON public.group_sections;

CREATE POLICY "Admins can manage group sections" ON public.group_sections
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view their group sections" ON public.group_sections
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = group_sections.group_id AND gm.user_id = auth.uid() AND gm.is_approved = true
));

CREATE POLICY "Teachers can manage their group sections" ON public.group_sections
FOR ALL TO authenticated
USING (is_teacher_of_group(group_id, auth.uid()));

-- ============== GROUP_UNITS ==============
DROP POLICY IF EXISTS "Admins can manage group units" ON public.group_units;
DROP POLICY IF EXISTS "Students can view their group units" ON public.group_units;
DROP POLICY IF EXISTS "Teachers can manage their group units" ON public.group_units;

CREATE POLICY "Admins can manage group units" ON public.group_units
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view their group units" ON public.group_units
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = group_units.group_id AND gm.user_id = auth.uid() AND gm.is_approved = true
));

CREATE POLICY "Teachers can manage their group units" ON public.group_units
FOR ALL TO authenticated
USING (is_teacher_of_group(group_id, auth.uid()));

-- ============== GROUPS ==============
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.groups;
DROP POLICY IF EXISTS "Students can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Teachers can create their own groups" ON public.groups;
DROP POLICY IF EXISTS "Teachers can delete their own groups" ON public.groups;
DROP POLICY IF EXISTS "Teachers can update their own groups" ON public.groups;
DROP POLICY IF EXISTS "Teachers can view their own groups" ON public.groups;

CREATE POLICY "Admins can manage all groups" ON public.groups
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view groups they belong to" ON public.groups
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM group_members
  WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.is_approved = true
));

CREATE POLICY "Teachers can create their own groups" ON public.groups
FOR INSERT TO authenticated
WITH CHECK (teacher_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Teachers can delete their own groups" ON public.groups
FOR DELETE TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own groups" ON public.groups
FOR UPDATE TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own groups" ON public.groups
FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

-- ============== LESSON_PROGRESS ==============
DROP POLICY IF EXISTS "Admins and teachers can view all lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can manage their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Admins and teachers can view all lesson progress" ON public.lesson_progress
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Users can manage their own lesson progress" ON public.lesson_progress
FOR ALL TO authenticated
USING (auth.uid() = user_id);

-- ============== LESSONS ==============
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can view lessons from their assigned groups" ON public.lessons;

CREATE POLICY "Admins can manage lessons" ON public.lessons
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view lessons from their assigned groups" ON public.lessons
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role) OR EXISTS (
  SELECT 1 FROM units u
  JOIN levels l ON l.id = u.level_id
  JOIN group_sections gs ON gs.section_id = l.section_id
  JOIN group_members gm ON gm.group_id = gs.group_id
  WHERE u.id = lessons.unit_id AND gm.user_id = auth.uid() AND gm.is_approved = true
));

-- ============== LEVELS ==============
DROP POLICY IF EXISTS "Admins can manage levels" ON public.levels;
DROP POLICY IF EXISTS "Users can view levels from their assigned groups" ON public.levels;

CREATE POLICY "Admins can manage levels" ON public.levels
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view levels from their assigned groups" ON public.levels
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role) OR EXISTS (
  SELECT 1 FROM group_sections gs
  JOIN group_members gm ON gm.group_id = gs.group_id
  WHERE gs.section_id = levels.section_id AND gm.user_id = auth.uid() AND gm.is_approved = true
));

-- ============== NOTIFICATION_PREFERENCES ==============
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== NOTIFICATIONS ==============
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== PAYMENTS ==============
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

CREATE POLICY "Admins can manage payments" ON public.payments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own payments" ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== PROFILES ==============
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view their group teacher profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view profiles of their group members" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile permissive" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can manage profiles" ON public.profiles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students can view their group teacher profiles" ON public.profiles
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND gm.is_approved = true AND g.teacher_id = profiles.user_id
));

CREATE POLICY "Teachers can view profiles of their group members" ON public.profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
  WHERE gm.user_id = profiles.user_id AND g.teacher_id = auth.uid()
));

-- ============== PUSH_SUBSCRIPTIONS ==============
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Admins can view all subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== QUIZZES ==============
DROP POLICY IF EXISTS "Admins and teachers can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Students can view active quizzes" ON public.quizzes;

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and teachers can view quizzes" ON public.quizzes
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view active quizzes" ON public.quizzes
FOR SELECT TO authenticated
USING (is_active = true);

-- ============== SECTIONS ==============
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
DROP POLICY IF EXISTS "Users can view sections from their assigned groups" ON public.sections;

CREATE POLICY "Admins can manage sections" ON public.sections
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view sections from their assigned groups" ON public.sections
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role) OR EXISTS (
  SELECT 1 FROM group_sections gs
  JOIN group_members gm ON gm.group_id = gs.group_id
  WHERE gs.section_id = sections.id AND gm.user_id = auth.uid() AND gm.is_approved = true
));

-- ============== UNITS ==============
DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
DROP POLICY IF EXISTS "Users can view units from their assigned groups" ON public.units;

CREATE POLICY "Admins can manage units" ON public.units
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view units from their assigned groups" ON public.units
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role) OR EXISTS (
  SELECT 1 FROM levels l
  JOIN group_sections gs ON gs.section_id = l.section_id
  JOIN group_members gm ON gm.group_id = gs.group_id
  WHERE l.id = units.level_id AND gm.user_id = auth.uid() AND gm.is_approved = true
));

-- ============== USER_PROGRESS ==============
DROP POLICY IF EXISTS "Admins and teachers can view all progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;

CREATE POLICY "Admins and teachers can view all progress" ON public.user_progress
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Users can manage their own progress" ON public.user_progress
FOR ALL TO authenticated
USING (auth.uid() = user_id);

-- ============== USER_ROLES ==============
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============== STORAGE.OBJECTS ==============
DROP POLICY IF EXISTS "Admins and teachers can delete thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view videos" ON storage.objects;

CREATE POLICY "Admins and teachers can manage thumbnails" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'thumbnails' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Admins can manage videos" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view videos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'videos');