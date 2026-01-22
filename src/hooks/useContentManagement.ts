import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Section {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Level {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  level_number: number;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  level_id: string;
  name: string;
  description: string | null;
  unit_number: number;
  is_active: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  unit_id: string;
  lesson_number: number;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: string;
  thumbnail_url: string | null;
  content: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Sections hooks
export function useAdminSections() {
  return useQuery({
    queryKey: ['admin-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Section[];
    },
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (section: Partial<Section>) => {
      const { data, error } = await supabase
        .from('sections')
        .insert(section as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      toast({ title: 'Section created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating section', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Section> & { id: string }) => {
      const { data, error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      toast({ title: 'Section updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating section', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderSections() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sections: { id: string; display_order: number }[]) => {
      const promises = sections.map(({ id, display_order }) =>
        supabase.from('sections').update({ display_order }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast({ title: 'Sections reordered' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reordering sections', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      toast({ title: 'Section deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting section', description: error.message, variant: 'destructive' });
    },
  });
}

// Levels hooks
export function useAdminLevels(sectionId?: string) {
  return useQuery({
    queryKey: ['admin-levels', sectionId],
    queryFn: async () => {
      let query = supabase
        .from('levels')
        .select('*')
        .order('level_number', { ascending: true });
      
      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Level[];
    },
    enabled: !!sectionId || sectionId === undefined,
  });
}

export function useCreateLevel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (level: Partial<Level>) => {
      const { data, error } = await supabase
        .from('levels')
        .insert(level as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      toast({ title: 'Level created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating level', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLevel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Level> & { id: string }) => {
      const { data, error } = await supabase
        .from('levels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      toast({ title: 'Level updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating level', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLevel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      toast({ title: 'Level deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting level', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderLevels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (levels: { id: string; level_number: number }[]) => {
      const promises = levels.map(({ id, level_number }) =>
        supabase.from('levels').update({ level_number }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      toast({ title: 'Levels reordered' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reordering levels', description: error.message, variant: 'destructive' });
    },
  });
}

// Units hooks
export function useAdminUnits(levelId?: string) {
  return useQuery({
    queryKey: ['admin-units', levelId],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select('*')
        .order('unit_number', { ascending: true });
      
      if (levelId) {
        query = query.eq('level_id', levelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!levelId || levelId === undefined,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (unit: Partial<Unit>) => {
      const { data, error } = await supabase
        .from('units')
        .insert(unit as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
      toast({ title: 'Unit created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating unit', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Unit> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
      toast({ title: 'Unit updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating unit', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
      toast({ title: 'Unit deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting unit', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderUnits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (units: { id: string; unit_number: number }[]) => {
      const promises = units.map(({ id, unit_number }) =>
        supabase.from('units').update({ unit_number }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Units reordered' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reordering units', description: error.message, variant: 'destructive' });
    },
  });
}

// Lessons hooks
export function useAdminLessons(unitId?: string) {
  return useQuery({
    queryKey: ['admin-lessons', unitId],
    queryFn: async () => {
      let query = supabase
        .from('lessons')
        .select('*')
        .order('lesson_number', { ascending: true });
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!unitId || unitId === undefined,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lesson: Partial<Lesson>) => {
      const { data, error } = await supabase
        .from('lessons')
        .insert(lesson as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'Lesson created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating lesson', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lesson> & { id: string }) => {
      const { data, error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'Lesson updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating lesson', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'Lesson deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting lesson', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderLessons() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lessons: { id: string; lesson_number: number }[]) => {
      const promises = lessons.map(({ id, lesson_number }) =>
        supabase.from('lessons').update({ lesson_number }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast({ title: 'Lessons reordered' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reordering lessons', description: error.message, variant: 'destructive' });
    },
  });
}
