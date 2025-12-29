import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useQuizzes, useCreateQuiz, useUpdateQuiz, useDeleteQuiz, type QuizQuestion } from '@/hooks/useLessons';
import { toast } from 'sonner';

interface QuizManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string | null;
  lessonTitle?: string;
}

export function QuizManagerDialog({ open, onOpenChange, lessonId, lessonTitle }: QuizManagerDialogProps) {
  const { data: questions, isLoading } = useQuizzes(lessonId || undefined);
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const deleteQuiz = useDeleteQuiz();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setExplanation('');
    setEditingId(null);
    setIsEditing(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setQuestion(q.question);
    setOptions(q.options.length >= 2 ? [...q.options] : ['', '', '', '']);
    setCorrectAnswer(q.correctAnswer);
    setExplanation(q.explanation || '');
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId) return;

    const filteredOptions = options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      toast.error('Please add at least 2 options');
      return;
    }

    try {
      if (editingId) {
        await updateQuiz.mutateAsync({
          id: editingId,
          question,
          options: filteredOptions,
          correct_answer: correctAnswer,
          explanation: explanation || undefined,
        });
        toast.success('Question updated');
      } else {
        await createQuiz.mutateAsync({
          lesson_id: lessonId,
          question,
          options: filteredOptions,
          correct_answer: correctAnswer,
          explanation: explanation || undefined,
          question_order: (questions?.length || 0) + 1,
        });
        toast.success('Question added');
      }
      resetForm();
    } catch {
      toast.error('Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuiz.mutateAsync(id);
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (correctAnswer >= newOptions.length) {
        setCorrectAnswer(0);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quiz Manager {lessonTitle && `- ${lessonTitle}`}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Questions List */}
          <div className="flex flex-col min-h-0">
            <h3 className="font-medium mb-2 text-sm">Questions ({questions?.length || 0})</h3>
            <ScrollArea className="flex-1 border rounded-lg p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : questions?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No questions yet. Add your first question.
                </p>
              ) : (
                <div className="space-y-2">
                  {questions?.map((q, index) => (
                    <Card key={q.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {index + 1}. {q.question}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {q.options.length} options
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEdit(q)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleDelete(q.id)}
                              disabled={deleteQuiz.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Question Form */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            <h3 className="font-medium mb-2 text-sm">
              {editingId ? 'Edit Question' : 'Add Question'}
            </h3>
            <ScrollArea className="flex-1 border rounded-lg p-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question" className="text-xs">Question</Label>
                  <Textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter your question..."
                    required
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Options (select correct answer)</Label>
                    {options.length < 6 && (
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={addOption}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                  <RadioGroup
                    value={correctAnswer.toString()}
                    onValueChange={(v) => setCorrectAnswer(parseInt(v))}
                    className="space-y-2"
                  >
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <RadioGroupItem value={index.toString()} id={`opt-${index}`} />
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="flex-1 h-8 text-sm"
                        />
                        {options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeOption(index)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="explanation" className="text-xs">Explanation (optional)</Label>
                  <Textarea
                    id="explanation"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explain why this is correct..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-3">
              {editingId && (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!question.trim() || options.filter(o => o.trim()).length < 2 || createQuiz.isPending || updateQuiz.isPending}
              >
                {createQuiz.isPending || updateQuiz.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingId ? 'Update' : 'Add'} Question
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
