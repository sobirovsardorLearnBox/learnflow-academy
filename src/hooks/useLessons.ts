import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Lesson = Tables<'lessons'>;
export type Quiz = Tables<'quizzes'>;
export type LessonProgress = Tables<'lesson_progress'>;

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

export const useLessonProgress = (userId?: string) => {
  return useQuery({
    queryKey: ['lesson_progress', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true);
      
      if (error) throw error;
      return data as LessonProgress[];
    },
    enabled: !!userId,
  });
};

export const useUserStats = (userId?: string) => {
  return useQuery({
    queryKey: ['user_stats', userId],
    queryFn: async () => {
      if (!userId) return { completedLessons: 0, completedUnits: 0 };
      
      const [lessonsResult, unitsResult] = await Promise.all([
        supabase
          .from('lesson_progress')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('completed', true),
        supabase
          .from('user_progress')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('completed', true),
      ]);
      
      return {
        completedLessons: lessonsResult.count || 0,
        completedUnits: unitsResult.count || 0,
      };
    },
    enabled: !!userId,
  });
};

export const useUnitProgress = (unitIds: string[], userId?: string) => {
  return useQuery({
    queryKey: ['unit_progress', unitIds, userId],
    queryFn: async () => {
      if (!userId || unitIds.length === 0) return {};
      
      // Get all lessons for these units
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, unit_id')
        .in('unit_id', unitIds)
        .eq('is_active', true);
      
      if (!lessons) return {};
      
      // Get completed lessons for this user
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true);
      
      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);
      
      // Calculate progress per unit
      const unitProgress: Record<string, { completed: number; total: number }> = {};
      
      for (const lesson of lessons) {
        if (!unitProgress[lesson.unit_id]) {
          unitProgress[lesson.unit_id] = { completed: 0, total: 0 };
        }
        unitProgress[lesson.unit_id].total++;
        if (completedLessonIds.has(lesson.id)) {
          unitProgress[lesson.unit_id].completed++;
        }
      }
      
      return unitProgress;
    },
    enabled: !!userId && unitIds.length > 0,
  });
};

export const useQuizzes = (lessonId?: string) => {
  return useQuery({
    queryKey: ['quizzes', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      // Use the secure RPC function that hides correct answers from students
      const { data, error } = await supabase
        .rpc('get_quiz_questions', { p_lesson_id: lessonId });
      
      if (error) throw error;
      
      // Transform to QuizQuestion format
      return (data || []).map((q) => ({
        id: q.id,
        question: q.question,
        options: (q.options as unknown as string[]) || [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation || undefined,
      })) as QuizQuestion[];
    },
    enabled: !!lessonId,
  });
};

// Hook to check a quiz answer server-side
export const useCheckQuizAnswer = () => {
  return useMutation({
    mutationFn: async ({ quizId, selectedAnswer }: { quizId: string; selectedAnswer: number }) => {
      const { data, error } = await supabase
        .rpc('check_quiz_answer', { p_quiz_id: quizId, p_selected_answer: selectedAnswer });
      
      if (error) throw error;
      return data as { is_correct: boolean; correct_answer: number; explanation: string | null };
    },
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
    mutationFn: async ({ 
      lessonId, 
      userId, 
      score = 0,
      videoCompleted = false,
      quizScore = 0 
    }: { 
      lessonId: string; 
      userId: string; 
      score?: number;
      videoCompleted?: boolean;
      quizScore?: number;
    }) => {
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existing) {
        // Update with new scores if higher
        const newScore = Math.max(existing.score || 0, score);
        const newVideoCompleted = existing.video_completed || videoCompleted;
        const newQuizScore = Math.max(existing.quiz_score || 0, quizScore);
        
        const { error } = await supabase
          .from('lesson_progress')
          .update({ 
            completed: true, 
            completed_at: existing.completed_at || new Date().toISOString(),
            score: newScore,
            video_completed: newVideoCompleted,
            quiz_score: newQuizScore
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({ 
            lesson_id: lessonId, 
            user_id: userId, 
            completed: true, 
            completed_at: new Date().toISOString(),
            score,
            video_completed: videoCompleted,
            quiz_score: quizScore
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_progress'] });
      queryClient.invalidateQueries({ queryKey: ['user_stats'] });
      queryClient.invalidateQueries({ queryKey: ['unit_progress'] });
      queryClient.invalidateQueries({ queryKey: ['lesson_scores'] });
    },
  });
};

// Hook to get lesson scores for statistics
export const useLessonScores = (userId?: string) => {
  return useQuery({
    queryKey: ['lesson_scores', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select(`
          *,
          lessons:lesson_id (
            id,
            title,
            unit_id,
            units:unit_id (
              id,
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('completed', true)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

// Hook to get average score
export const useAverageScore = (userId?: string) => {
  return useQuery({
    queryKey: ['average_score', userId],
    queryFn: async () => {
      if (!userId) return { averageScore: 0, totalScore: 0, lessonCount: 0 };
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('score')
        .eq('user_id', userId)
        .eq('completed', true);
      
      if (error) throw error;
      
      const scores = data?.map(d => d.score || 0) || [];
      const totalScore = scores.reduce((a, b) => a + b, 0);
      const averageScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
      
      return { averageScore, totalScore, lessonCount: scores.length };
    },
    enabled: !!userId,
  });
};

export const useMarkUnitComplete = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ unitId, userId }: { unitId: string; userId: string }) => {
      const { data: existing } = await supabase
        .from('user_progress')
        .select('*')
        .eq('unit_id', unitId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('user_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_progress')
          .insert({ 
            unit_id: unitId, 
            user_id: userId, 
            completed: true, 
            completed_at: new Date().toISOString() 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_progress'] });
      queryClient.invalidateQueries({ queryKey: ['user_stats'] });
    },
  });
};
