import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useBeforeUnload } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Video, FileText, HelpCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VideoPlayer } from '@/components/lesson/VideoPlayer';
import { QuizComponent } from '@/components/lesson/QuizComponent';
import { LessonNavigation } from '@/components/lesson/LessonNavigation';
import { AchievementModal } from '@/components/achievement/AchievementModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons, useLesson, useQuizzes, useMarkLessonComplete, useMarkUnitComplete, useLessonProgress } from '@/hooks/useLessons';
import { useConfetti } from '@/hooks/useConfetti';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Lesson() {
  const { unitId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const lessonId = searchParams.get('lesson');
  
  const { data: lessons, isLoading: lessonsLoading } = useLessons(unitId);
  const { data: currentLesson, isLoading: lessonLoading } = useLesson(lessonId || undefined);
  const { data: quizQuestions, isLoading: quizLoading } = useQuizzes(lessonId || undefined);
  const { data: lessonProgress } = useLessonProgress(user?.user_id);
  const markLessonComplete = useMarkLessonComplete();
  const markUnitComplete = useMarkUnitComplete();
  const { triggerSuccessConfetti } = useConfetti();
  
  const [activeTab, setActiveTab] = useState('content');
  const hasTriggeredConfetti = useRef(false);
  const [achievementModal, setAchievementModal] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: '', description: '' });

  // Track if user has interacted with current lesson (viewed video, notes, or quiz)
  const hasInteracted = useRef(false);
  const currentLessonRef = useRef<string | null>(null);
  const userIdRef = useRef<string | undefined>(undefined);

  // Update refs when values change
  useEffect(() => {
    currentLessonRef.current = currentLesson?.id || null;
    userIdRef.current = user?.user_id;
  }, [currentLesson?.id, user?.user_id]);

  // Mark interaction when user views content
  useEffect(() => {
    if (currentLesson?.id) {
      hasInteracted.current = true;
    }
  }, [currentLesson?.id, activeTab]);

  // Get completed lessons from database
  const completedLessons = useMemo(() => {
    if (!lessonProgress || !lessons) return [];
    const lessonIds = lessons.map(l => l.id);
    return lessonProgress
      .filter(p => lessonIds.includes(p.lesson_id))
      .map(p => p.lesson_id);
  }, [lessonProgress, lessons]);

  // Function to save progress directly (for beforeunload)
  const saveProgressSync = useCallback(() => {
    const lessonId = currentLessonRef.current;
    const userId = userIdRef.current;
    
    if (!lessonId || !userId || !hasInteracted.current) return;
    
    // Check if already completed
    const isCompleted = lessonProgress?.some(p => p.lesson_id === lessonId);
    if (isCompleted) return;

    // Use navigator.sendBeacon for reliable save on page unload
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lesson_progress`;
    const data = JSON.stringify({
      lesson_id: lessonId,
      user_id: userId,
      completed: true,
      completed_at: new Date().toISOString()
    });
    
    navigator.sendBeacon(url + `?apikey=${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, 
      new Blob([data], { type: 'application/json' })
    );
  }, [lessonProgress]);

  // Save progress when page is about to unload (close tab, refresh, navigate away)
  useBeforeUnload(
    useCallback(() => {
      saveProgressSync();
    }, [saveProgressSync])
  );

  // Also handle browser beforeunload event for more reliable saving
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgressSync();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save progress when component unmounts (navigating to another route)
      saveProgressSync();
    };
  }, [saveProgressSync]);

  // Mark current lesson as complete
  const markCurrentLessonComplete = useCallback(async () => {
    if (currentLesson && user?.user_id && !completedLessons.includes(currentLesson.id)) {
      try {
        await markLessonComplete.mutateAsync({ lessonId: currentLesson.id, userId: user.user_id });
        hasInteracted.current = false;
        return true;
      } catch {
        toast.error('Progressni saqlashda xatolik');
        return false;
      }
    }
    return false;
  }, [currentLesson, user?.user_id, completedLessons, markLessonComplete]);

  // Save progress when lesson changes
  useEffect(() => {
    return () => {
      // When lessonId changes, save progress for previous lesson
      if (hasInteracted.current) {
        markCurrentLessonComplete();
        hasInteracted.current = false;
      }
    };
  }, [lessonId, markCurrentLessonComplete]);

  // Trigger confetti and achievement modal when all lessons are completed
  useEffect(() => {
    if (
      lessons && 
      lessons.length > 0 && 
      completedLessons.length === lessons.length && 
      !hasTriggeredConfetti.current
    ) {
      hasTriggeredConfetti.current = true;
      triggerSuccessConfetti();
      setAchievementModal({
        open: true,
        title: "Unit tugallandi!",
        description: `Siz barcha ${lessons.length} ta darsni muvaffaqiyatli tugatdingiz. Ajoyib natija!`
      });
    }
  }, [completedLessons.length, lessons, triggerSuccessConfetti]);

  // Set first lesson if none selected
  useEffect(() => {
    if (lessons && lessons.length > 0 && !lessonId) {
      setSearchParams({ lesson: lessons[0].id });
    }
  }, [lessons, lessonId, setSearchParams]);

  const handleSelectLesson = (lesson: { id: string }) => {
    setSearchParams({ lesson: lesson.id });
    setActiveTab('content');
  };

  const handleVideoComplete = async () => {
    const saved = await markCurrentLessonComplete();
    if (saved) {
      toast.success('Dars tugatildi!');
    }
  };

  const handleQuizComplete = async (score: number, total: number) => {
    await markCurrentLessonComplete();
    toast.success(`Test yakunlandi! Natija: ${score}/${total}`);
  };

  const handleMarkUnitComplete = async () => {
    if (!unitId || !user?.user_id) return;
    try {
      await markUnitComplete.mutateAsync({ unitId, userId: user.user_id });
      toast.success('Bo\'lim tugallandi deb belgilandi!');
    } catch {
      toast.error('Belgilashda xatolik');
    }
  };

  const currentIndex = lessons?.findIndex(l => l.id === lessonId) ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (lessons?.length ?? 0) - 1;

  const goToPrev = async () => {
    if (lessons && hasPrev) {
      // Save progress before navigating
      await markCurrentLessonComplete();
      setSearchParams({ lesson: lessons[currentIndex - 1].id });
    }
  };

  const goToNext = async () => {
    if (lessons && hasNext) {
      // Save progress before navigating
      await markCurrentLessonComplete();
      setSearchParams({ lesson: lessons[currentIndex + 1].id });
    }
  };

  if (lessonsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <BookOpen className="w-16 h-16 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">Bu bo'limda hali darslar mavjud emas.</p>
          <Button variant="outline" onClick={() => navigate('/courses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kurslarga qaytish
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Sidebar - Lesson Navigation */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block w-72 shrink-0"
        >
          <Card variant="glass" className="sticky top-6">
            <CardContent className="p-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="mb-4 -ml-2"
                onClick={() => navigate('/courses')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Bo'limlarga qaytish
              </Button>
              <LessonNavigation
                lessons={lessons}
                currentLessonId={lessonId || undefined}
                completedLessons={completedLessons}
                onSelectLesson={handleSelectLesson}
              />
              
              {/* Unit Progress */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Jarayon</span>
                  <span className="font-medium">
                    {completedLessons.length}/{lessons.length}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(completedLessons.length / lessons.length) * 100}%` }}
                  />
                </div>
                {completedLessons.length === lessons.length && lessons.length > 0 && (
                  <Button 
                    className="w-full mt-4" 
                    size="sm"
                    onClick={handleMarkUnitComplete}
                    disabled={markUnitComplete.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Bo'limni tugallash
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.aside>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-w-0"
        >
          {lessonLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : currentLesson ? (
            <div className="space-y-6">
              {/* Lesson Header */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{currentLesson.lesson_number}-dars</span>
                  {currentLesson.duration_minutes && (
                    <>
                      <span>•</span>
                      <span>{currentLesson.duration_minutes} daq</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold">{currentLesson.title}</h1>
                {currentLesson.description && (
                  <p className="text-muted-foreground mt-2">{currentLesson.description}</p>
                )}
              </div>

              {/* Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="content" className="gap-2">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Video</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Eslatmalar</span>
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Test</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-6">
                  {currentLesson.video_url ? (
                    <VideoPlayer
                      videoUrl={currentLesson.video_url}
                      title={currentLesson.title}
                      onComplete={handleVideoComplete}
                    />
                  ) : (
                    <Card variant="glass">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Video className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Bu dars uchun video mavjud emas</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Dars eslatmalari</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentLesson.content ? (
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentLesson.content) }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Bu dars uchun eslatma mavjud emas</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="quiz" className="mt-6">
                  {quizLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : quizQuestions && quizQuestions.length > 0 ? (
                    <QuizComponent
                      questions={quizQuestions}
                      onComplete={handleQuizComplete}
                    />
                  ) : (
                    <Card variant="glass">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <HelpCircle className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Bu dars uchun hali test mavjud emas</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={goToPrev}
                  disabled={!hasPrev}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Oldingi
                </Button>
                <Button
                  onClick={goToNext}
                  disabled={!hasNext}
                >
                  Keyingi
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Boshlash uchun dars tanlang</p>
            </div>
          )}
        </motion.main>
      </div>

      {/* Achievement Modal */}
      <AchievementModal
        open={achievementModal.open}
        onClose={() => setAchievementModal(prev => ({ ...prev, open: false }))}
        title={achievementModal.title}
        description={achievementModal.description}
        type="unit"
      />
    </DashboardLayout>
  );
}