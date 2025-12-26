import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Users, BookOpen, CreditCard, Code, Shield, Languages, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { LevelCard } from '@/components/dashboard/LevelCard';
import { UnitCard } from '@/components/dashboard/UnitCard';
import { PaymentBanner } from '@/components/dashboard/PaymentBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSections, useLevels, useUnits, Section, Level } from '@/hooks/useSections';

const iconMap: Record<string, any> = {
  Code,
  BookOpen,
  Languages,
  Shield,
};

type View = 'sections' | 'levels' | 'units';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('sections');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  const { data: sections, isLoading: sectionsLoading } = useSections();
  const { data: levels, isLoading: levelsLoading } = useLevels(selectedSection?.id);
  const { data: units, isLoading: unitsLoading } = useUnits(selectedLevel?.id);

  if (!user) {
    navigate('/');
    return null;
  }

  const isContentLocked = user.paymentStatus !== 'approved' && user.role === 'student';

  const handleSectionClick = (section: Section) => {
    setSelectedSection(section);
    setView('levels');
  };

  const handleLevelClick = (level: Level) => {
    setSelectedLevel(level);
    setView('units');
  };

  const handleBack = () => {
    if (view === 'units') {
      setView('levels');
      setSelectedLevel(null);
    } else if (view === 'levels') {
      setView('sections');
      setSelectedSection(null);
    }
  };

  const stats = [
    { label: 'Courses in Progress', value: sections?.length || 0, icon: BookOpen, color: 'from-cyan-500 to-blue-600' },
    { label: 'Completed Lessons', value: '0', icon: TrendingUp, color: 'from-emerald-500 to-teal-600' },
    { label: 'Study Hours', value: '0', icon: Users, color: 'from-violet-500 to-purple-600' },
    { label: 'Achievements', value: '0', icon: CreditCard, color: 'from-rose-500 to-pink-600' },
  ];

  const transformedSections = (sections || []).map(section => ({
    id: section.id,
    title: section.name,
    description: section.description || '',
    icon: iconMap[section.icon || 'Code'] || Code,
    color: 'from-primary to-accent',
    progress: 0,
    levelsCount: 5,
  }));

  const transformedLevels = (levels || []).map(level => ({
    id: level.id,
    sectionId: level.section_id,
    title: level.name,
    description: level.description || '',
    progress: 0,
    isLocked: false,
    unitsCount: 12,
  }));

  const transformedUnits = (units || []).map(unit => ({
    id: unit.id,
    levelId: unit.level_id,
    number: unit.unit_number,
    title: unit.name,
    isCompleted: false,
    isLocked: false,
    subUnits: ['1.1', '1.2', '1.3'],
    progress: 0,
  }));

  return (
    <DashboardLayout>
      {/* Payment Banner */}
      {user.role === 'student' && <PaymentBanner status={user.paymentStatus} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {view !== 'sections' && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <motion.h1
              key={view}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl lg:text-3xl font-bold"
            >
              {view === 'sections' && `Welcome back, ${user.name}!`}
              {view === 'levels' && selectedSection?.name}
              {view === 'units' && selectedLevel?.name}
            </motion.h1>
            <p className="text-muted-foreground mt-1">
              {view === 'sections' && 'Continue your learning journey'}
              {view === 'levels' && `${levels?.length || 0} levels available`}
              {view === 'units' && `${units?.length || 0} units in this level`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats (only on sections view) */}
      {view === 'sections' && user.role === 'student' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Content */}
      {view === 'sections' && (
        sectionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformedSections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sections available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {transformedSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SectionCard
                  section={section}
                  onClick={() => handleSectionClick(sections!.find(s => s.id === section.id)!)}
                  isLocked={isContentLocked}
                />
              </motion.div>
            ))}
          </div>
        )
      )}

      {view === 'levels' && (
        levelsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformedLevels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No levels available for this section yet.</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-3">
            {transformedLevels.map((level, index) => (
              <LevelCard
                key={level.id}
                level={level}
                index={index}
                onClick={() => handleLevelClick(levels!.find(l => l.id === level.id)!)}
              />
            ))}
          </div>
        )
      )}

      {view === 'units' && (
        unitsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformedUnits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No units available for this level yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transformedUnits.map((unit, index) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                index={index}
                onClick={() => {}}
              />
            ))}
          </div>
        )
      )}
    </DashboardLayout>
  );
}
