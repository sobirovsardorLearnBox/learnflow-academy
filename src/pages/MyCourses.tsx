import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Code, BookOpen, Languages, Shield, Loader2, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { LevelCard } from '@/components/dashboard/LevelCard';
import { UnitCard } from '@/components/dashboard/UnitCard';
import { PaymentBanner } from '@/components/dashboard/PaymentBanner';
import { AchievementModal } from '@/components/achievement/AchievementModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLevels, useUnits, Section, Level } from '@/hooks/useSections';
import { useUserAccessibleUnits, useGroupSectionsWithDetails } from '@/hooks/useGroupSections';
import { useSectionProgressBatch, useLevelProgressBatch, useUnitProgressBatch, useUserCoursesOptimized } from '@/hooks/useBatchProgress';
import { useConfetti } from '@/hooks/useConfetti';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  Code,
  BookOpen,
  Languages,
  Shield,
};

type View = 'groups' | 'sections' | 'levels' | 'units';

interface UserGroup {
  group_id: string;
  group_name: string;
  group_description: string | null;
  teacher_id: string;
  teacher_name: string;
  sections_count: number;
  total_progress: number;
}

export default function MyCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('groups');
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const { triggerSuccessConfetti } = useConfetti();
  const confettiTriggeredFor = useRef<Set<string>>(new Set());
  const [achievementModal, setAchievementModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    type: "section" | "level" | "unit";
  }>({ open: false, title: '', description: '', type: 'unit' });

  // OPTIMIZED: Single RPC call for user groups
  const { data: userGroups, isLoading: groupsLoading } = useUserCoursesOptimized(user?.user_id);

  // OPTIMIZED: Get sections for selected group with JOIN
  const { data: groupSections, isLoading: sectionsLoading } = useGroupSectionsWithDetails(selectedGroup?.group_id);

  // Extract section IDs for batch progress query
  const sectionIds = useMemo(() => 
    (groupSections || []).map(s => s.id), 
    [groupSections]
  );

  // OPTIMIZED: Single RPC call for all section progress
  const { data: sectionProgressMap } = useSectionProgressBatch(sectionIds, user?.user_id);

  // Get levels for selected section
  const { data: levels, isLoading: levelsLoading } = useLevels(selectedSection?.id);

  // Extract level IDs for batch progress query
  const levelIds = useMemo(() => 
    (levels || []).map(l => l.id), 
    [levels]
  );

  // OPTIMIZED: Single RPC call for all level progress
  const { data: levelProgressMap } = useLevelProgressBatch(levelIds, user?.user_id);

  // Get units for selected level
  const { data: units, isLoading: unitsLoading } = useUnits(selectedLevel?.id);
  const { data: accessibleUnitIds } = useUserAccessibleUnits(user?.user_id);

  // Extract unit IDs for batch progress query
  const unitIds = useMemo(() => 
    (units || []).map(u => u.id), 
    [units]
  );

  // OPTIMIZED: Single RPC call for all unit progress
  const { data: unitProgressMap } = useUnitProgressBatch(unitIds, user?.user_id);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleGroupClick = useCallback((group: UserGroup) => {
    setSelectedGroup(group);
    setView('sections');
  }, []);

  const handleSectionClick = useCallback((section: any, isLocked?: boolean, isLockedByProgress?: boolean) => {
    if (isLocked) {
      if (isLockedByProgress) {
        toast.error("Oldingi bo'limni kamida 80% bajaring");
      }
      return;
    }
    setSelectedSection(section);
    setView('levels');
  }, []);

  const handleLevelClick = useCallback((level: Level, isLocked: boolean, isLockedByProgress?: boolean) => {
    if (isLocked) {
      if (isLockedByProgress) {
        toast.error("Oldingi levelni kamida 80% bajaring");
      }
      return;
    }
    setSelectedLevel(level);
    setView('units');
  }, []);

  const handleUnitClick = useCallback((unitId: string, isLocked: boolean, isLockedByProgress?: boolean) => {
    if (isLocked) {
      if (isLockedByProgress) {
        toast.error("Oldingi unitni kamida 80% bajaring");
      } else {
        toast.error("Bu darsga kirish uchun ruxsat yo'q");
      }
      return;
    }
    navigate(`/lesson/${unitId}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (view === 'units') {
      setView('levels');
      setSelectedLevel(null);
    } else if (view === 'levels') {
      setView('sections');
      setSelectedSection(null);
    } else if (view === 'sections') {
      setView('groups');
      setSelectedGroup(null);
    }
  }, [view]);

  // Transform sections with progress from batch query
  const transformedSections = useMemo(() => {
    const sortedSections = [...(groupSections || [])].sort((a, b) => 
      (a.display_order || 0) - (b.display_order || 0)
    );
    
    return sortedSections.map((section, index) => {
      const progress = sectionProgressMap?.[section.id];
      const progressPercent = progress?.progress_percent || 0;
      
      let isLockedByProgress = false;
      let prevProgressPercent = 0;
      
      if (index > 0) {
        const prevSection = sortedSections[index - 1];
        const prevProgress = sectionProgressMap?.[prevSection.id];
        prevProgressPercent = prevProgress?.progress_percent || 0;
        isLockedByProgress = prevProgressPercent < 80;
      }
      
      const unlockProgressNeeded = isLockedByProgress ? 80 - prevProgressPercent : 0;
      
      return {
        id: section.id,
        title: section.name,
        description: section.description || '',
        icon: iconMap[section.icon || 'Code'] || Code,
        color: 'from-primary to-accent',
        progress: progressPercent,
        levelsCount: progress?.levels_count || 0,
        isLocked: isLockedByProgress,
        isLockedByProgress,
        unlockProgressNeeded,
        totalLessons: Number(progress?.total_lessons || 0),
        completedLessons: Number(progress?.completed_lessons || 0),
      };
    });
  }, [groupSections, sectionProgressMap]);

  // Transform levels with progress from batch query
  const transformedLevels = useMemo(() => {
    const sortedLevels = [...(levels || [])].sort((a, b) => a.level_number - b.level_number);
    
    return sortedLevels.map((level, index) => {
      const progress = levelProgressMap?.[level.id];
      const progressPercent = progress?.progress_percent || 0;
      
      let isLockedByProgress = false;
      let prevProgressPercent = 0;
      
      if (index > 0) {
        const prevLevel = sortedLevels[index - 1];
        const prevProgress = levelProgressMap?.[prevLevel.id];
        prevProgressPercent = prevProgress?.progress_percent || 0;
        isLockedByProgress = prevProgressPercent < 80;
      }
      
      const unlockProgressNeeded = isLockedByProgress ? 80 - prevProgressPercent : 0;
      
      return {
        id: level.id,
        sectionId: level.section_id,
        title: level.name,
        description: level.description || '',
        progress: progressPercent,
        isLocked: isLockedByProgress,
        isLockedByProgress,
        unlockProgressNeeded,
        unitsCount: progress?.units_count || 0,
        totalLessons: Number(progress?.total_lessons || 0),
        completedLessons: Number(progress?.completed_lessons || 0),
      };
    });
  }, [levels, levelProgressMap]);

  // Transform units with progress from batch query
  const transformedUnits = useMemo(() => {
    const sortedUnits = [...(units || [])].sort((a, b) => Number(a.unit_number) - Number(b.unit_number));
    
    return sortedUnits.map((unit, index) => {
      const progress = unitProgressMap?.[unit.id];
      const progressPercent = progress?.progress_percent || 0;
      const isCompleted = progress?.is_completed || false;
      const hasAccess = (accessibleUnitIds || []).includes(unit.id);
      
      let isLockedByProgress = false;
      let prevProgressPercent = 0;
      
      if (index > 0) {
        const prevUnit = sortedUnits[index - 1];
        const prevProgress = unitProgressMap?.[prevUnit.id];
        prevProgressPercent = prevProgress?.progress_percent || 0;
        isLockedByProgress = prevProgressPercent < 80;
      }
      
      const isFirstUnit = index === 0;
      const unlockProgressNeeded = isLockedByProgress && !isFirstUnit ? 80 - prevProgressPercent : 0;
      
      const totalLessons = Number(progress?.total_lessons || 0);
      const completedLessons = Number(progress?.completed_lessons || 0);
      
      return {
        id: unit.id,
        levelId: unit.level_id,
        number: unit.unit_number,
        title: unit.name,
        isCompleted,
        isLocked: isFirstUnit ? false : (!hasAccess || isLockedByProgress),
        isLockedByProgress: isFirstUnit ? false : isLockedByProgress,
        unlockProgressNeeded,
        subUnits: totalLessons > 0 ? [`${completedLessons}/${totalLessons} dars`] : ['Darslar yo\'q'],
        progress: progressPercent,
        totalLessons,
        completedLessons,
        averageScore: progress?.average_score || 0,
        passedCount: completedLessons,
      };
    });
  }, [units, unitProgressMap, accessibleUnitIds]);

  // Achievement confetti effects
  useEffect(() => {
    transformedSections.forEach((section) => {
      if (section.progress === 100 && !confettiTriggeredFor.current.has(`section-${section.id}`)) {
        confettiTriggeredFor.current.add(`section-${section.id}`);
        triggerSuccessConfetti();
        setAchievementModal({
          open: true,
          title: `"${section.title}" bo'limi tugallandi!`,
          description: "Siz ushbu bo'limni muvaffaqiyatli tugatdingiz. Yangi yutuqlaringiz kutmoqda!",
          type: 'section'
        });
      }
    });
  }, [transformedSections, triggerSuccessConfetti]);

  useEffect(() => {
    transformedLevels.forEach((level) => {
      if (level.progress === 100 && !confettiTriggeredFor.current.has(`level-${level.id}`)) {
        confettiTriggeredFor.current.add(`level-${level.id}`);
        triggerSuccessConfetti();
        setAchievementModal({
          open: true,
          title: `"${level.title}" darajasi tugallandi!`,
          description: "Ajoyib natija! Siz ushbu darajani muvaffaqiyatli o'tdingiz.",
          type: 'level'
        });
      }
    });
  }, [transformedLevels, triggerSuccessConfetti]);

  useEffect(() => {
    transformedUnits.forEach((unit) => {
      if (unit.progress === 100 && !confettiTriggeredFor.current.has(`unit-${unit.id}`)) {
        confettiTriggeredFor.current.add(`unit-${unit.id}`);
        triggerSuccessConfetti();
        setAchievementModal({
          open: true,
          title: `"${unit.title}" uniti tugallandi!`,
          description: "Zo'r! Siz barcha darslarni muvaffaqiyatli yakunladingiz.",
          type: 'unit'
        });
      }
    });
  }, [transformedUnits, triggerSuccessConfetti]);

  return (
    <DashboardLayout>
      {/* Payment Banner */}
      {user.role === 'student' && <PaymentBanner status={user.paymentStatus} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {view !== 'groups' && (
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
              {view === 'groups' && 'Mening Kurslarim'}
              {view === 'sections' && selectedGroup?.group_name}
              {view === 'levels' && selectedSection?.name}
              {view === 'units' && selectedLevel?.name}
            </motion.h1>
            <p className="text-muted-foreground mt-1">
              {view === 'groups' && `${userGroups?.length || 0} ta guruhga a'zosiz`}
              {view === 'sections' && `${groupSections?.length || 0} ta bo'lim mavjud`}
              {view === 'levels' && `${levels?.length || 0} ta daraja mavjud`}
              {view === 'units' && `${units?.length || 0} ta unit mavjud`}
            </p>
          </div>
        </div>
      </div>

      {/* Groups View */}
      {view === 'groups' && (
        groupsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !userGroups || userGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Hali guruhga qo'shilmagansiz</h3>
            <p className="text-muted-foreground">Kurslarni ko'rish uchun guruhga qo'shiling</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userGroups.map((group, index) => (
              <motion.div
                key={group.group_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  variant="interactive"
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => handleGroupClick(group)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <Badge variant="secondary">
                        {group.sections_count} bo'lim
                      </Badge>
                    </div>
                    <CardTitle className="mt-4">{group.group_name}</CardTitle>
                    <CardDescription>
                      {group.group_description || "Guruh ta'rifi yo'q"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Ustoz:</span>
                      <span className="font-medium text-foreground">{group.teacher_name}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Sections View */}
      {view === 'sections' && (
        sectionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformedSections.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Bo'limlar topilmadi</h3>
            <p className="text-muted-foreground">Bu guruhga hali bo'lim tayinlanmagan</p>
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
                  onClick={() => handleSectionClick(
                    groupSections?.find(s => s.id === section.id),
                    section.isLocked,
                    section.isLockedByProgress
                  )}
                  isLocked={section.isLocked}
                />
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Levels View */}
      {view === 'levels' && (
        levelsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformedLevels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Bu bo'limda hali darajalar yo'q</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-3">
            {transformedLevels.map((level, index) => (
              <LevelCard
                key={level.id}
                level={level}
                index={index}
                onClick={() => handleLevelClick(
                  levels!.find(l => l.id === level.id)!, 
                  level.isLocked, 
                  level.isLockedByProgress
                )}
              />
            ))}
          </div>
        )
      )}

      {/* Units View */}
      {view === 'units' && (
        unitsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformedUnits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Bu darajada hali unitlar yo'q</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transformedUnits.map((unit, index) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                index={index}
                onClick={() => handleUnitClick(unit.id, unit.isLocked, unit.isLockedByProgress)}
              />
            ))}
          </div>
        )
      )}

      {/* Achievement Modal */}
      <AchievementModal
        open={achievementModal.open}
        onClose={() => setAchievementModal(prev => ({ ...prev, open: false }))}
        title={achievementModal.title}
        description={achievementModal.description}
        type={achievementModal.type}
      />
    </DashboardLayout>
  );
}
