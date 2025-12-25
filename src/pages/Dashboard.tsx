import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Users, BookOpen, CreditCard } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { LevelCard } from '@/components/dashboard/LevelCard';
import { UnitCard } from '@/components/dashboard/UnitCard';
import { PaymentBanner } from '@/components/dashboard/PaymentBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { sections, levels, generateUnits, Section, Level } from '@/data/courseData';

type View = 'sections' | 'levels' | 'units';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('sections');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

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

  const filteredLevels = selectedSection
    ? levels.filter((l) => l.sectionId === selectedSection.id)
    : [];

  const units = selectedLevel ? generateUnits(selectedLevel.id) : [];

  const stats = [
    { label: 'Courses in Progress', value: '4', icon: BookOpen, color: 'from-cyan-500 to-blue-600' },
    { label: 'Completed Lessons', value: '24', icon: TrendingUp, color: 'from-emerald-500 to-teal-600' },
    { label: 'Study Hours', value: '48', icon: Users, color: 'from-violet-500 to-purple-600' },
    { label: 'Achievements', value: '12', icon: CreditCard, color: 'from-rose-500 to-pink-600' },
  ];

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
              {view === 'levels' && selectedSection?.title}
              {view === 'units' && selectedLevel?.title}
            </motion.h1>
            <p className="text-muted-foreground mt-1">
              {view === 'sections' && 'Continue your learning journey'}
              {view === 'levels' && `${filteredLevels.length} levels available`}
              {view === 'units' && `${units.length} units in this level`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <SectionCard
                section={section}
                onClick={() => handleSectionClick(section)}
                isLocked={isContentLocked}
              />
            </motion.div>
          ))}
        </div>
      )}

      {view === 'levels' && (
        <div className="max-w-2xl space-y-3">
          {filteredLevels.map((level, index) => (
            <LevelCard
              key={level.id}
              level={level}
              index={index}
              onClick={() => handleLevelClick(level)}
            />
          ))}
        </div>
      )}

      {view === 'units' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit, index) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              index={index}
              onClick={() => {}}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
