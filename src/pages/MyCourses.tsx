import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Code, BookOpen, Languages, Shield, Loader2, Lock, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { LevelCard } from '@/components/dashboard/LevelCard';
import { UnitCard } from '@/components/dashboard/UnitCard';
import { PaymentBanner } from '@/components/dashboard/PaymentBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSections, useLevels, useUnits, Section, Level } from '@/hooks/useSections';
import { useUnitProgress } from '@/hooks/useLessons';
import { useUserAccessibleUnits, useUserAccessibleSections } from '@/hooks/useGroupSections';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  Code,
  BookOpen,
  Languages,
  Shield,
};

type View = 'groups' | 'sections' | 'levels' | 'units';

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  teacher_name: string;
  sections_count: number;
}

export default function MyCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('groups');
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  // Fetch user's groups with assigned sections
  const { data: userGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['my-groups', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      
      // Get groups where user is an approved member
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            description,
            teacher_id
          )
        `)
        .eq('user_id', user.user_id)
        .eq('is_approved', true);
      
      if (membershipError) throw membershipError;
      
      const groupsWithDetails = await Promise.all(
        (memberships || []).map(async (m) => {
          const group = m.groups as any;
          if (!group) return null;
          
          // Get teacher name
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', group.teacher_id)
            .single();
          
          // Get sections count for this group
          const { count } = await supabase
            .from('group_sections')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            teacher_name: teacherProfile?.name || 'Ustoz',
            sections_count: count || 0,
          } as UserGroup;
        })
      );
      
      return groupsWithDetails.filter(Boolean) as UserGroup[];
    },
    enabled: !!user?.user_id,
  });

  // Fetch sections for selected group with progress
  const { data: groupSections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['group-sections-full', selectedGroup?.id, user?.user_id],
    queryFn: async () => {
      if (!selectedGroup?.id || !user?.user_id) return [];
      
      const { data: gs, error } = await supabase
        .from('group_sections')
        .select('section_id')
        .eq('group_id', selectedGroup.id);
      
      if (error) throw error;
      
      if (!gs || gs.length === 0) return [];
      
      const sectionIds = gs.map(s => s.section_id);
      
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .in('id', sectionIds)
        .eq('is_active', true)
        .order('display_order');
      
      if (sectionsError) throw sectionsError;
      
      // Calculate progress for each section
      const sectionsWithProgress = await Promise.all(
        (sections || []).map(async (section) => {
          // Get all levels in this section
          const { data: levelsData } = await supabase
            .from('levels')
            .select('id')
            .eq('section_id', section.id)
            .eq('is_active', true);
          
          if (!levelsData || levelsData.length === 0) {
            return { ...section, progress: 0, totalLessons: 0, completedLessons: 0, levelsCount: 0 };
          }
          
          const levelIds = levelsData.map(l => l.id);
          
          // Get all units in these levels
          const { data: unitsData } = await supabase
            .from('units')
            .select('id')
            .in('level_id', levelIds)
            .eq('is_active', true);
          
          if (!unitsData || unitsData.length === 0) {
            return { ...section, progress: 0, totalLessons: 0, completedLessons: 0, levelsCount: levelsData.length };
          }
          
          const unitIds = unitsData.map(u => u.id);
          
          // Get all lessons in these units
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id')
            .in('unit_id', unitIds)
            .eq('is_active', true);
          
          const totalLessons = lessonsData?.length || 0;
          
          if (totalLessons === 0) {
            return { ...section, progress: 0, totalLessons: 0, completedLessons: 0, levelsCount: levelsData.length };
          }
          
          const lessonIds = lessonsData!.map(l => l.id);
          
          // Get completed lessons for this user
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('completed', true)
            .in('lesson_id', lessonIds);
          
          const completedLessons = progressData?.length || 0;
          const progress = Math.round((completedLessons / totalLessons) * 100);
          
          return { 
            ...section, 
            progress, 
            totalLessons, 
            completedLessons, 
            levelsCount: levelsData.length 
          };
        })
      );
      
      return sectionsWithProgress;
    },
    enabled: !!selectedGroup?.id && !!user?.user_id,
  });

  const { data: levels, isLoading: levelsLoading } = useLevels(selectedSection?.id);
  const { data: units, isLoading: unitsLoading } = useUnits(selectedLevel?.id);
  const { data: accessibleUnitIds } = useUserAccessibleUnits(user?.id);
  
  const unitIds = useMemo(() => (units || []).map(u => u.id), [units]);
  const { data: unitProgress } = useUnitProgress(unitIds, user?.id);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleGroupClick = (group: UserGroup) => {
    setSelectedGroup(group);
    setView('sections');
  };

  const handleSectionClick = (section: any) => {
    setSelectedSection(section);
    setView('levels');
  };

  const handleLevelClick = (level: Level) => {
    setSelectedLevel(level);
    setView('units');
  };

  const handleUnitClick = (unitId: string, isLocked: boolean) => {
    if (isLocked) {
      toast.error("Bu darsga kirish uchun ruxsat yo'q");
      return;
    }
    navigate(`/lesson/${unitId}`);
  };

  const handleBack = () => {
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
  };

  const transformedSections = (groupSections || []).map((section: any) => ({
    id: section.id,
    title: section.name,
    description: section.description || '',
    icon: iconMap[section.icon || 'Code'] || Code,
    color: 'from-primary to-accent',
    progress: section.progress || 0,
    levelsCount: section.levelsCount || 0,
    isLocked: false,
    totalLessons: section.totalLessons || 0,
    completedLessons: section.completedLessons || 0,
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

  const transformedUnits = (units || []).map(unit => {
    const progress = unitProgress?.[unit.id];
    const progressPercent = progress ? Math.round((progress.completed / progress.total) * 100) : 0;
    const isCompleted = progress ? progress.completed === progress.total && progress.total > 0 : false;
    const hasAccess = (accessibleUnitIds || []).includes(unit.id);
    
    return {
      id: unit.id,
      levelId: unit.level_id,
      number: unit.unit_number,
      title: unit.name,
      isCompleted,
      isLocked: !hasAccess,
      subUnits: progress ? [`${progress.completed}/${progress.total} lessons`] : ['No lessons'],
      progress: progressPercent,
    };
  });

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
              {view === 'sections' && selectedGroup?.name}
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
                key={group.id}
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
                    <CardTitle className="mt-4">{group.name}</CardTitle>
                    <CardDescription>
                      {group.description || "Guruh ta'rifi yo'q"}
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
                  onClick={() => handleSectionClick(groupSections?.find(s => s.id === section.id))}
                  isLocked={false}
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
                onClick={() => handleLevelClick(levels!.find(l => l.id === level.id)!)}
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
                onClick={() => handleUnitClick(unit.id, unit.isLocked)}
              />
            ))}
          </div>
        )
      )}
    </DashboardLayout>
  );
}
