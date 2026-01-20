import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useBeforeUnload } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Video, FileText, HelpCircle, CheckCircle2, ChevronLeft, ChevronRight, Lock, AlertCircle, Calendar } from 'lucide-react';
import DOMPurify from 'dompurify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VideoPlayer } from '@/components/lesson/VideoPlayer';
import { QuizComponent } from '@/components/lesson/QuizComponent';
import { LessonNavigation } from '@/components/lesson/LessonNavigation';
import { AchievementModal } from '@/components/achievement/AchievementModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons, useLesson, useQuizzes, useMarkLessonComplete, useMarkUnitComplete, useLessonProgress, useLessonScores } from '@/hooks/useLessons';
import { useLessonAccess, useDailyLessonLimit } from '@/hooks/useLessonAccess';
import { useConfetti } from '@/hooks/useConfetti';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  const { data: lessonScoresData } = useLessonScores(user?.user_id);
  const { data: lessonAccess, isLoading: accessLoading } = useLessonAccess(lessonId || undefined);
  const { data: dailyLimit } = useDailyLessonLimit();
  const markLessonComplete = useMarkLessonComplete();
  const markUnitComplete = useMarkUnitComplete();
  const { triggerSuccessConfetti, triggerLessonConfetti } = useConfetti();
  
  const [activeTab, setActiveTab] = useState('content');
  const hasTriggeredConfetti = useRef(false);
  const [achievementModal, setAchievementModal] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: '', description: '' });

  // Score tracking: video = 20%, quiz = 80%
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number; percentage: number } | null>(null);

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

  // Get lesson scores as a map
  const lessonScores = useMemo(() => {
    if (!lessonScoresData) return {};
    return lessonScoresData.reduce((acc, progress) => {
      acc[progress.lesson_id] = progress.score || 0;
      return acc;
    }, {} as Record<string, number>);
  }, [lessonScoresData]);

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

  // Mark current lesson as complete with scores
  const markCurrentLessonCompleteWithScore = useCallback(async (
    videoComplete: boolean = false,
    quizPercentage: number = 0
  ) => {
    if (currentLesson && user?.user_id) {
      try {
        const videoPoints = videoComplete ? 20 : 0;
        const quizPoints = Math.round((quizPercentage / 100) * 80);
        const totalScore = videoPoints + quizPoints;
        
        await markLessonComplete.mutateAsync({ 
          lessonId: currentLesson.id, 
          userId: user.user_id,
          score: totalScore,
          videoCompleted: videoComplete,
          quizScore: quizPercentage
        });
        hasInteracted.current = false;
        return true;
      } catch {
        toast.error('Progressni saqlashda xatolik');
        return false;
      }
    }
    return false;
  }, [currentLesson, user?.user_id, markLessonComplete]);

  // Save progress when lesson changes
  useEffect(() => {
    return () => {
      // When lessonId changes, save progress for previous lesson
      if (hasInteracted.current && videoCompleted) {
        markCurrentLessonCompleteWithScore(videoCompleted, quizScore?.percentage || 0);
        hasInteracted.current = false;
      }
    };
  }, [lessonId, markCurrentLessonCompleteWithScore, videoCompleted, quizScore]);

  // Count lessons that are completed with 80%+ score
  const passedLessonsCount = useMemo(() => {
    if (!lessons || !lessonScoresData) return 0;
    const lessonIds = lessons.map(l => l.id);
    return lessonScoresData.filter(p => 
      lessonIds.includes(p.lesson_id) && 
      p.video_completed === true &&
      (p.score || 0) >= 80
    ).length;
  }, [lessons, lessonScoresData]);

  // Trigger confetti and achievement modal when all lessons are completed with 80%+
  useEffect(() => {
    if (
      lessons && 
      lessons.length > 0 && 
      passedLessonsCount === lessons.length && 
      !hasTriggeredConfetti.current
    ) {
      hasTriggeredConfetti.current = true;
      triggerSuccessConfetti();
      setAchievementModal({
        open: true,
        title: "Unit tugallandi!",
        description: `Siz barcha ${lessons.length} ta darsni 80%+ ball bilan muvaffaqiyatli tugatdingiz. Ajoyib natija!`
      });
    }
  }, [passedLessonsCount, lessons, triggerSuccessConfetti]);

  // Set first lesson if none selected
  useEffect(() => {
    if (lessons && lessons.length > 0 && !lessonId) {
      setSearchParams({ lesson: lessons[0].id });
    }
  }, [lessons, lessonId, setSearchParams]);

  const handleSelectLesson = (lesson: { id: string }) => {
    // Reset scores when changing lesson
    setVideoCompleted(false);
    setQuizScore(null);
    setSearchParams({ lesson: lesson.id });
    setActiveTab('content');
  };

  const handleVideoComplete = async () => {
    if (!videoCompleted) {
      setVideoCompleted(true);
      toast.success('Video tugatildi! (+20 ball)');
    }
  };

  const handleQuizComplete = async (score: number, total: number, percentage: number) => {
    // Check if user can complete today (daily limit)
    if (dailyLimit && !dailyLimit.can_complete) {
      toast.error(`Bugun 1 ta dars limiti tugagan. Ertaga qaytib keling!`);
      return;
    }
    
    setQuizScore({ score, total, percentage });
    const quizPoints = Math.round((percentage / 100) * 80);
    const videoPoints = videoCompleted ? 20 : 0;
    const totalScore = videoPoints + quizPoints;
    
    // Mark lesson as complete with scores
    await markCurrentLessonCompleteWithScore(videoCompleted, percentage);
    
    // Show celebration if passed (80%+)
    if (totalScore >= 80) {
      triggerLessonConfetti();
      toast.success(`🎉 Ajoyib! Dars muvaffaqiyatli tugatildi: ${totalScore}/100 ball!`, {
        duration: 4000,
      });
    } else {
      toast.warning(`Test yakunlandi: ${totalScore}/100 ball. Keyingi darsni ochish uchun 80+ ball kerak.`, {
        duration: 4000,
      });
    }
  };

  const handleQuizRetry = () => {
    // Reset quiz score to allow retry
    setQuizScore(null);
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
      if (videoCompleted || quizScore) {
        await markCurrentLessonCompleteWithScore(videoCompleted, quizScore?.percentage || 0);
      }
      setSearchParams({ lesson: lessons[currentIndex - 1].id });
    }
  };

  const goToNext = async () => {
    if (lessons && hasNext) {
      // Save progress before navigating
      if (videoCompleted || quizScore) {
        await markCurrentLessonCompleteWithScore(videoCompleted, quizScore?.percentage || 0);
      }
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
                lessonScores={lessonScores}
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
              {/* Access Restriction Alert */}
              {lessonAccess && !lessonAccess.can_access && (
                <Alert variant="destructive">
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Dars qulflangan</AlertTitle>
                  <AlertDescription>
                    {lessonAccess.reason === 'previous_lesson_not_completed' && 
                      "Oldingi darsni tugatishingiz kerak."
                    }
                    {lessonAccess.reason === 'previous_video_not_watched' && 
                      "Oldingi darsning videosini to'liq ko'rishingiz kerak."
                    }
                    {lessonAccess.reason === 'previous_score_too_low' && 
                      `Oldingi darsda kamida 80% ball olishingiz kerak. Hozirgi: ${lessonAccess.current_score}%`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Daily Limit Warning */}
              {dailyLimit && !dailyLimit.can_complete && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-600">Kunlik limit</AlertTitle>
                  <AlertDescription className="text-amber-600">
                    Bugun 1 ta dars tugatish limiti tugagan. Yangi darsni ertaga tugatishingiz mumkin.
                  </AlertDescription>
                </Alert>
              )}

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

              {/* Score Progress Panel */}
              <Card variant="glass" className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Video className={cn("w-5 h-5", videoCompleted ? "text-emerald-500" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-medium", videoCompleted ? "text-emerald-500" : "text-muted-foreground")}>
                        Video: {videoCompleted ? "20" : "0"}/20
                      </span>
                      {videoCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <HelpCircle className={cn("w-5 h-5", quizScore ? "text-emerald-500" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-medium", quizScore ? "text-emerald-500" : "text-muted-foreground")}>
                        Test: {quizScore ? Math.round((quizScore.percentage / 100) * 80) : "0"}/80
                      </span>
                      {quizScore && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      Jami: {(videoCompleted ? 20 : 0) + (quizScore ? Math.round((quizScore.percentage / 100) * 80) : 0)}/100
                    </span>
                  </div>
                </div>
              </Card>

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
                      onRetry={handleQuizRetry}
                      minPassPercentage={80}
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