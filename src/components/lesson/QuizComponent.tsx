import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useCheckQuizAnswer } from '@/hooks/useLessons';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizComponentProps {
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
}

export function QuizComponent({ questions, onComplete }: QuizComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState<number | null>(null);
  const [revealedExplanation, setRevealedExplanation] = useState<string | null>(null);
  
  const checkAnswer = useCheckQuizAnswer();

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) return;
    
    // Check if we have the correct answer client-side (admin/teacher)
    // or need to validate server-side (student - correctAnswer is -1)
    const hasClientSideAnswer = currentQuestion.correctAnswer !== -1;
    
    if (hasClientSideAnswer) {
      // Admin/teacher mode - use client-side validation
      setIsAnswered(true);
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      setLastAnswerCorrect(isCorrect);
      setRevealedCorrectAnswer(currentQuestion.correctAnswer);
      setRevealedExplanation(currentQuestion.explanation || null);
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
    } else {
      // Student mode - validate server-side
      try {
        const result = await checkAnswer.mutateAsync({
          quizId: currentQuestion.id,
          selectedAnswer,
        });
        
        setIsAnswered(true);
        setLastAnswerCorrect(result.is_correct);
        setRevealedCorrectAnswer(result.correct_answer);
        setRevealedExplanation(result.explanation);
        if (result.is_correct) {
          setScore(prev => prev + 1);
        }
      } catch (error) {
        console.error('Failed to validate answer:', error);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setLastAnswerCorrect(false);
      setRevealedCorrectAnswer(null);
      setRevealedExplanation(null);
    } else {
      setIsCompleted(true);
      onComplete?.(score + (lastAnswerCorrect ? 1 : 0), questions.length);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setIsCompleted(false);
    setLastAnswerCorrect(false);
    setRevealedCorrectAnswer(null);
    setRevealedExplanation(null);
  };

  if (isCompleted) {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    const isPassed = percentage >= 70;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card variant="glass" className="text-center">
          <CardHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={cn(
                "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4",
                isPassed ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}
            >
              {isPassed ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              ) : (
                <XCircle className="w-12 h-12 text-amber-500" />
              )}
            </motion.div>
            <CardTitle className="text-2xl">
              {isPassed ? "Congratulations!" : "Keep Practicing!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground">
                {finalScore} out of {questions.length} correct
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Use revealed correct answer if available (from server), otherwise use client-side
  const correctAnswerIndex = revealedCorrectAnswer ?? currentQuestion.correctAnswer;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-muted-foreground">
            Score: {score}/{currentIndex}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg leading-relaxed">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === correctAnswerIndex;
                const showResult = isAnswered;

                return (
                  <motion.button
                    key={index}
                    whileHover={!isAnswered ? { scale: 1.01 } : {}}
                    whileTap={!isAnswered ? { scale: 0.99 } : {}}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={isAnswered}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      "flex items-center gap-3",
                      !isAnswered && isSelected && "border-primary bg-primary/10",
                      !isAnswered && !isSelected && "border-border hover:border-primary/50 hover:bg-secondary/50",
                      showResult && isCorrect && "border-emerald-500 bg-emerald-500/10",
                      showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                      isAnswered && "cursor-default"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                        !isAnswered && isSelected && "bg-primary text-primary-foreground",
                        !isAnswered && !isSelected && "bg-secondary text-secondary-foreground",
                        showResult && isCorrect && "bg-emerald-500 text-white",
                        showResult && isSelected && !isCorrect && "bg-destructive text-white"
                      )}
                    >
                      {showResult ? (
                        isCorrect ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isSelected ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          String.fromCharCode(65 + index)
                        )
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </div>
                    <span className="flex-1">{option}</span>
                  </motion.button>
                );
              })}

              {/* Explanation - use revealed or client-side explanation */}
              {isAnswered && (revealedExplanation || currentQuestion.explanation) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border"
                >
                  <p className="text-sm text-muted-foreground">
                    <strong>Explanation:</strong> {revealedExplanation || currentQuestion.explanation}
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!isAnswered ? (
          <Button 
            onClick={handleSubmitAnswer} 
            disabled={selectedAnswer === null || checkAnswer.isPending}
          >
            {checkAnswer.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Answer'
            )}
          </Button>
        ) : (
          <Button onClick={handleNextQuestion}>
            {currentIndex < questions.length - 1 ? (
              <>
                Next Question
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'See Results'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
