import { Code, Globe, Shield, BookOpen, LucideIcon } from 'lucide-react';

export interface Section {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  levelsCount: number;
  progress?: number;
}

export interface Level {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  unitsCount: number;
  isLocked: boolean;
  progress?: number;
}

export interface Unit {
  id: string;
  levelId: string;
  title: string;
  subUnits: string[];
  isLocked: boolean;
  isCompleted: boolean;
  progress?: number;
}

export const sections: Section[] = [
  {
    id: 'programming',
    title: 'Programming',
    description: 'Master coding from basics to advanced',
    icon: Code,
    color: 'from-cyan-500 to-blue-600',
    levelsCount: 5,
    progress: 35,
  },
  {
    id: 'english',
    title: 'English',
    description: 'Improve your English language skills',
    icon: Globe,
    color: 'from-emerald-500 to-teal-600',
    levelsCount: 6,
    progress: 20,
  },
  {
    id: 'russian',
    title: 'Russian',
    description: 'Learn Russian from scratch',
    icon: BookOpen,
    color: 'from-rose-500 to-pink-600',
    levelsCount: 5,
    progress: 0,
  },
  {
    id: 'ethical-hacking',
    title: 'Ethical Hacking',
    description: 'Cybersecurity and penetration testing',
    icon: Shield,
    color: 'from-violet-500 to-purple-600',
    levelsCount: 4,
    progress: 10,
  },
];

export const levels: Level[] = [
  // Programming Levels
  { id: 'prog-1', sectionId: 'programming', title: 'Level 1 - Basics', description: 'Introduction to programming concepts', unitsCount: 12, isLocked: false, progress: 75 },
  { id: 'prog-2', sectionId: 'programming', title: 'Level 2 - Variables', description: 'Working with data and variables', unitsCount: 12, isLocked: false, progress: 40 },
  { id: 'prog-3', sectionId: 'programming', title: 'Level 3 - Functions', description: 'Creating reusable code blocks', unitsCount: 12, isLocked: true },
  { id: 'prog-4', sectionId: 'programming', title: 'Level 4 - OOP', description: 'Object-Oriented Programming', unitsCount: 12, isLocked: true },
  { id: 'prog-5', sectionId: 'programming', title: 'Level 5 - Projects', description: 'Real-world projects', unitsCount: 12, isLocked: true },
  
  // English Levels
  { id: 'eng-1', sectionId: 'english', title: 'Level 1 - Beginner', description: 'Basic vocabulary and grammar', unitsCount: 12, isLocked: false, progress: 60 },
  { id: 'eng-2', sectionId: 'english', title: 'Level 2 - Elementary', description: 'Everyday conversations', unitsCount: 12, isLocked: false, progress: 20 },
  { id: 'eng-3', sectionId: 'english', title: 'Level 3 - Intermediate', description: 'Complex sentences and tenses', unitsCount: 12, isLocked: true },
  { id: 'eng-4', sectionId: 'english', title: 'Level 4 - Upper-Intermediate', description: 'Advanced grammar', unitsCount: 12, isLocked: true },
  { id: 'eng-5', sectionId: 'english', title: 'Level 5 - Advanced', description: 'Professional English', unitsCount: 12, isLocked: true },
  { id: 'eng-6', sectionId: 'english', title: 'Level 6 - Mastery', description: 'Native-level fluency', unitsCount: 12, isLocked: true },
];

export const generateUnits = (levelId: string): Unit[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `${levelId}-unit-${i + 1}`,
    levelId,
    title: `Unit ${i + 1}`,
    subUnits: [`${i + 1}.1`, `${i + 1}.2`, `${i + 1}.3`],
    isLocked: i > 2,
    isCompleted: i < 2,
    progress: i < 2 ? 100 : i === 2 ? 60 : 0,
  }));
};
