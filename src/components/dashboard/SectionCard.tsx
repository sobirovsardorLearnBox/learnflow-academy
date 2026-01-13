import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Section } from '@/data/courseData';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  section: Section;
  onClick: () => void;
  isLocked?: boolean;
}

export function SectionCard({ section, onClick, isLocked = false }: SectionCardProps) {
  const Icon = section.icon;

  return (
    <motion.div
      whileHover={{ scale: isLocked ? 1 : 1.02, y: isLocked ? 0 : -4 }}
      whileTap={{ scale: isLocked ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card
        variant="interactive"
        className={cn(
          'relative overflow-hidden group',
          isLocked && 'opacity-60 cursor-not-allowed'
        )}
        onClick={isLocked ? undefined : onClick}
      >
        {/* Gradient Background */}
        <div
          className={cn(
            'absolute inset-0 opacity-10 transition-opacity duration-300',
            'group-hover:opacity-20',
            `bg-gradient-to-br ${section.color}`
          )}
        />

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Kirish uchun guruhga qo'shiling</p>
            </div>
          </div>
        )}

        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                `bg-gradient-to-br ${section.color}`
              )}
            >
              <Icon className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">
              {section.levelsCount} Levels
            </span>
          </div>
          <CardTitle className="mt-4">{section.title}</CardTitle>
          <CardDescription>{section.description}</CardDescription>
        </CardHeader>

        <CardContent className="relative">
          {section.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-primary">{section.progress}%</span>
              </div>
              <div className="progress-bar h-2">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${section.progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
