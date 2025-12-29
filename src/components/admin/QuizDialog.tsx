import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    question: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
    question_order: number;
  }) => void;
  editData?: {
    question: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
    question_order: number;
  };
  nextOrder: number;
}

export function QuizDialog({ open, onOpenChange, onSubmit, editData, nextOrder }: QuizDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (editData) {
      setQuestion(editData.question);
      setOptions(editData.options.length >= 2 ? editData.options : ['', '', '', '']);
      setCorrectAnswer(editData.correct_answer);
      setExplanation(editData.explanation || '');
    } else {
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setExplanation('');
    }
  }, [editData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredOptions = options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      return;
    }
    onSubmit({
      question,
      options: filteredOptions,
      correct_answer: correctAnswer,
      explanation: explanation || undefined,
      question_order: editData?.question_order ?? nextOrder,
    });
    onOpenChange(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question..."
              required
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
            <RadioGroup 
              value={correctAnswer.toString()} 
              onValueChange={(v) => setCorrectAnswer(parseInt(v))}
            >
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Select the radio button next to the correct answer
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (optional)</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why this answer is correct..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!question.trim() || options.filter(o => o.trim()).length < 2}>
              {editData ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
