import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Video, FileText, HelpCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VideoPlayer } from '@/components/lesson/VideoPlayer';
import { QuizComponent } from '@/components/lesson/QuizComponent';
import { LessonNavigation } from '@/components/lesson/LessonNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons, useLesson, useMarkLessonComplete } from '@/hooks/useLessons';
import { toast } from 'sonner';

// Sample quiz data - in production this would come from the database
const sampleQuizQuestions = [
  {
    id: '1',
    question: 'What is the main purpose of this lesson?',
    options: [
      'To introduce basic concepts',
      'To provide advanced techniques',
      'To review previous material',
      'To prepare for exams'
    ],
    correctAnswer: 0,
    explanation: 'This lesson focuses on introducing the fundamental concepts that will be built upon in later lessons.'
  },
  {
    id: '2',
    question: 'Which approach is recommended for beginners?',
    options: [
      'Jump straight to advanced topics',
      'Skip the fundamentals',
      'Start with basics and progress gradually',
      'Focus only on practice'
    ],
    correctAnswer: 2,
    explanation: 'A gradual approach starting with basics ensures a solid foundation for more complex topics.'
  },
  {
    id: '3',
    question: 'What should you do after completing a lesson?',
    options: [
      'Immediately move to the next one',
      'Review and practice what you learned',
      'Skip the exercises',
      'None of the above'
    ],
    correctAnswer: 1,
    explanation: 'Reviewing and practicing reinforces learning and helps retain information better.'
  }
];

export default function Lesson() {
  const { unitId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const lessonId = searchParams.get('lesson');
  
  const { data: lessons, isLoading: lessonsLoading } = useLessons(unitId);
  const { data: currentLesson, isLoading: lessonLoading } = useLesson(lessonId || undefined);
  const markComplete = useMarkLessonComplete();
  
  const [activeTab, setActiveTab] = useState('content');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

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

  const handleVideoComplete = () => {
    if (currentLesson && !completedLessons.includes(currentLesson.id)) {
      setCompletedLessons(prev => [...prev, currentLesson.id]);
      toast.success('Video completed!');
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    if (currentLesson) {
      setCompletedLessons(prev => 
        prev.includes(currentLesson.id) ? prev : [...prev, currentLesson.id]
      );
      toast.success(`Quiz completed! Score: ${score}/${total}`);
    }
  };

  const handleMarkComplete = async () => {
    if (!unitId || !user?.id) return;
    try {
      await markComplete.mutateAsync({ unitId, userId: user.id });
      toast.success('Unit marked as complete!');
    } catch {
      toast.error('Failed to mark as complete');
    }
  };

  const currentIndex = lessons?.findIndex(l => l.id === lessonId) ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (lessons?.length ?? 0) - 1;

  const goToPrev = () => {
    if (lessons && hasPrev) {
      setSearchParams({ lesson: lessons[currentIndex - 1].id });
    }
  };

  const goToNext = () => {
    if (lessons && hasNext) {
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
          <p className="text-muted-foreground text-lg">No lessons available in this unit yet.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Units
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
                  <span className="text-muted-foreground">Progress</span>
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
                {completedLessons.length === lessons.length && (
                  <Button 
                    className="w-full mt-4" 
                    size="sm"
                    onClick={handleMarkComplete}
                    disabled={markComplete.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Unit Complete
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
                  <span>Lesson {currentLesson.lesson_number}</span>
                  {currentLesson.duration_minutes && (
                    <>
                      <span>•</span>
                      <span>{currentLesson.duration_minutes} min</span>
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
                    <span className="hidden sm:inline">Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Quiz</span>
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
                        <p className="text-muted-foreground">No video available for this lesson</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Lesson Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentLesson.content ? (
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No notes available for this lesson</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="quiz" className="mt-6">
                  <QuizComponent
                    questions={sampleQuizQuestions}
                    onComplete={handleQuizComplete}
                  />
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
                  Previous
                </Button>
                <Button
                  onClick={goToNext}
                  disabled={!hasNext}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Select a lesson to begin</p>
            </div>
          )}
        </motion.main>
      </div>
    </DashboardLayout>
  );
}
