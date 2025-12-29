import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Lesson = Tables<'lessons'>;
export type Quiz = Tables<'quizzes'>;

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export const useLessons = (unitId?: string) => {
  return useQuery({
    queryKey: ['lessons', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .order('lesson_number', { ascending: true });
      
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!unitId,
  });
};

export const useLesson = (lessonId?: string) => {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Lesson | null;
    },
    enabled: !!lessonId,
  });
};

export const useQuizzes = (lessonId?: string) => {
  return useQuery({
    queryKey: ['quizzes', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_active', true)
        .order('question_order', { ascending: true });
      
      if (error) throw error;
      
      // Transform to QuizQuestion format
      return (data || []).map(q => ({
        id: q.id,
        question: q.question,
        options: (q.options as string[]) || [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation || undefined,
      })) as QuizQuestion[];
    },
    enabled: !!lessonId,
  });
};

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      lesson_id: string; 
      question: string; 
      options: string[]; 
      correct_answer: number;
      explanation?: string;
      question_order: number;
    }) => {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          lesson_id: data.lesson_id,
          question: data.question,
          options: data.options,
          correct_answer: data.correct_answer,
          explanation: data.explanation,
          question_order: data.question_order,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', variables.lesson_id] });
    },
  });
};

export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string;
      question?: string; 
      options?: string[]; 
      correct_answer?: number;
      explanation?: string;
      question_order?: number;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from('quizzes')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
};

export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
};

export const useMarkLessonComplete = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ unitId, userId }: { unitId: string; userId: string }) => {
      const { data: existing, error: checkError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('unit_id', unitId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existing) {
        const { error } = await supabase
          .from('user_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_progress')
          .insert({ unit_id: unitId, user_id: userId, completed: true, completed_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_progress'] });
    },
  });
};
