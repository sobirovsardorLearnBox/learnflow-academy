import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronRight, GripVertical, BookOpen, Play, Code, Globe, Shield, Cpu, Database } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentDialog } from '@/components/admin/ContentDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import {
  useAdminSections,
  useAdminLevels,
  useAdminUnits,
  useAdminLessons,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useCreateLevel,
  useUpdateLevel,
  useDeleteLevel,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  Section,
  Level,
  Unit,
  Lesson,
} from '@/hooks/useContentManagement';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code,
  BookOpen,
  Globe,
  Shield,
  Cpu,
  Database,
};

const colorMap: Record<string, string> = {
  Code: 'from-blue-500/20 to-cyan-500/20',
  BookOpen: 'from-green-500/20 to-emerald-500/20',
  Globe: 'from-purple-500/20 to-pink-500/20',
  Shield: 'from-red-500/20 to-orange-500/20',
  Cpu: 'from-yellow-500/20 to-amber-500/20',
  Database: 'from-indigo-500/20 to-violet-500/20',
};

export default function AdminSections() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'section' | 'level' | 'unit' | 'lesson'>('section');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogData, setDialogData] = useState<any>(null);
  const [dialogParentId, setDialogParentId] = useState<string | undefined>();

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Data hooks
  const { data: sections, isLoading: sectionsLoading } = useAdminSections();
  const { data: levels } = useAdminLevels(expandedSection || undefined);
  const { data: units } = useAdminUnits(expandedLevel || undefined);
  const { data: lessons } = useAdminLessons(expandedUnit || undefined);

  // Mutations
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createLevel = useCreateLevel();
  const updateLevel = useUpdateLevel();
  const deleteLevel = useDeleteLevel();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  const openCreateDialog = (type: 'section' | 'level' | 'unit' | 'lesson', parentId?: string) => {
    setDialogType(type);
    setDialogMode('create');
    setDialogData(null);
    setDialogParentId(parentId);
    setDialogOpen(true);
  };

  const openEditDialog = (type: 'section' | 'level' | 'unit' | 'lesson', data: any) => {
    setDialogType(type);
    setDialogMode('edit');
    setDialogData(data);
    setDialogParentId(undefined);
    setDialogOpen(true);
  };

  const openDeleteDialog = (type: string, id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDialogSubmit = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        switch (dialogType) {
          case 'section':
            await createSection.mutateAsync(data);
            break;
          case 'level':
            await createLevel.mutateAsync(data);
            break;
          case 'unit':
            await createUnit.mutateAsync(data);
            break;
          case 'lesson':
            await createLesson.mutateAsync(data);
            break;
        }
      } else {
        switch (dialogType) {
          case 'section':
            await updateSection.mutateAsync(data);
            break;
          case 'level':
            await updateLevel.mutateAsync(data);
            break;
          case 'unit':
            await updateUnit.mutateAsync(data);
            break;
          case 'lesson':
            await updateLesson.mutateAsync(data);
            break;
        }
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      switch (deleteTarget.type) {
        case 'section':
          await deleteSection.mutateAsync(deleteTarget.id);
          break;
        case 'level':
          await deleteLevel.mutateAsync(deleteTarget.id);
          break;
        case 'unit':
          await deleteUnit.mutateAsync(deleteTarget.id);
          break;
        case 'lesson':
          await deleteLesson.mutateAsync(deleteTarget.id);
          break;
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getParentOptions = () => {
    switch (dialogType) {
      case 'level':
        return sections?.map(s => ({ id: s.id, name: s.name })) || [];
      case 'unit':
        return levels?.map(l => ({ id: l.id, name: l.name })) || [];
      case 'lesson':
        return units?.map(u => ({ id: u.id, name: u.name })) || [];
      default:
        return [];
    }
  };

  if (sectionsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Course Content</h1>
            <p className="text-muted-foreground mt-1">Manage sections, levels, units, and lessons</p>
          </div>
          <Button variant="premium" onClick={() => openCreateDialog('section')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Sections */}
        <div className="grid gap-4">
          {sections?.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No sections yet. Create your first section to get started.</p>
            </Card>
          )}

          {sections?.map((section, index) => {
            const IconComponent = iconMap[section.icon || 'BookOpen'] || BookOpen;
            const colorClass = colorMap[section.icon || 'BookOpen'] || 'from-gray-500/20 to-gray-600/20';
            const isExpanded = expandedSection === section.id;
            const sectionLevels = levels?.filter(l => l.section_id === section.id) || [];

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="interactive" className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Section Header */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                      
                      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', colorClass)}>
                        <IconComponent className="w-6 h-6 text-foreground" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{section.name}</h3>
                          {!section.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{section.description || 'No description'}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <p className="font-medium">{sectionLevels.length} Levels</p>
                        </div>

                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="icon" onClick={() => openEditDialog('section', section)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog('section', section.id, section.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                      </div>
                    </div>

                    {/* Levels */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t border-border bg-secondary/30"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Levels</h4>
                            <Button size="sm" variant="outline" onClick={() => openCreateDialog('level', section.id)}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Level
                            </Button>
                          </div>
                          
                          {sectionLevels.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">No levels in this section yet.</p>
                          )}

                          {sectionLevels.map((level) => {
                            const isLevelExpanded = expandedLevel === level.id;
                            const levelUnits = units?.filter(u => u.level_id === level.id) || [];

                            return (
                              <div key={level.id} className="rounded-lg bg-card border border-border overflow-hidden">
                                <div
                                  className="flex items-center justify-between p-3 cursor-pointer"
                                  onClick={() => setExpandedLevel(isLevelExpanded ? null : level.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                                      {level.level_number}
                                    </span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">{level.name}</p>
                                        {!level.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{levelUnits.length} Units</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog('level', level)}>
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-destructive"
                                      onClick={() => openDeleteDialog('level', level.id, level.name)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                    <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', isLevelExpanded && 'rotate-90')} />
                                  </div>
                                </div>

                                {/* Units */}
                                {isLevelExpanded && (
                                  <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Units</span>
                                      <Button size="sm" variant="ghost" onClick={() => openCreateDialog('unit', level.id)}>
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Unit
                                      </Button>
                                    </div>

                                    {levelUnits.length === 0 && (
                                      <p className="text-xs text-muted-foreground">No units in this level yet.</p>
                                    )}

                                    {levelUnits.map((unit) => {
                                      const isUnitExpanded = expandedUnit === unit.id;
                                      const unitLessons = lessons?.filter(l => l.unit_id === unit.id) || [];

                                      return (
                                        <div key={unit.id} className="rounded bg-background border border-border overflow-hidden">
                                          <div
                                            className="flex items-center justify-between p-2 cursor-pointer"
                                            onClick={() => setExpandedUnit(isUnitExpanded ? null : unit.id)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-medium">
                                                {unit.unit_number}
                                              </span>
                                              <span className="text-sm font-medium">{unit.name}</span>
                                              {!unit.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                            </div>
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog('unit', unit)}>
                                                <Edit2 className="w-3 h-3" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => openDeleteDialog('unit', unit.id, unit.name)}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                              <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', isUnitExpanded && 'rotate-90')} />
                                            </div>
                                          </div>

                                          {/* Lessons */}
                                          {isUnitExpanded && (
                                            <div className="border-t border-border bg-secondary/20 p-2 space-y-1">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium">Lessons</span>
                                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => openCreateDialog('lesson', unit.id)}>
                                                  <Plus className="w-3 h-3 mr-1" />
                                                  Add
                                                </Button>
                                              </div>

                                              {unitLessons.length === 0 && (
                                                <p className="text-xs text-muted-foreground">No lessons yet.</p>
                                              )}

                                              {unitLessons.map((lesson) => (
                                                <div
                                                  key={lesson.id}
                                                  className="flex items-center justify-between p-2 rounded bg-card border border-border"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <Play className="w-3 h-3 text-primary" />
                                                    <span className="text-xs font-medium">{lesson.lesson_number}. {lesson.title}</span>
                                                    {lesson.duration_minutes && (
                                                      <span className="text-xs text-muted-foreground">{lesson.duration_minutes}min</span>
                                                    )}
                                                    {!lesson.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                                  </div>
                                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditDialog('lesson', lesson)}>
                                                      <Edit2 className="w-2.5 h-2.5" />
                                                    </Button>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      className="h-5 w-5 text-destructive"
                                                      onClick={() => openDeleteDialog('lesson', lesson.id, lesson.title)}
                                                    >
                                                      <Trash2 className="w-2.5 h-2.5" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Content Dialog */}
      <ContentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        mode={dialogMode}
        data={dialogData}
        parentId={dialogParentId}
        parentOptions={getParentOptions()}
        onSubmit={handleDialogSubmit}
        isLoading={createSection.isPending || updateSection.isPending || createLevel.isPending || updateLevel.isPending || createUnit.isPending || updateUnit.isPending || createLesson.isPending || updateLesson.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${deleteTarget?.type}?`}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={deleteSection.isPending || deleteLevel.isPending || deleteUnit.isPending || deleteLesson.isPending}
      />
    </DashboardLayout>
  );
}
