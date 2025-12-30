import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronRight, GripVertical, BookOpen, Play, Code, Globe, Shield, Cpu, Database, HelpCircle } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentDialog } from '@/components/admin/ContentDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { QuizManagerDialog } from '@/components/admin/QuizManagerDialog';
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
  useReorderSections,
  useReorderLevels,
  useReorderUnits,
  useReorderLessons,
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

// Sortable Section Item
function SortableSectionItem({ 
  section, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  levelsCount,
  children 
}: { 
  section: Section; 
  isExpanded: boolean; 
  onToggle: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
  levelsCount: number;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const IconComponent = iconMap[section.icon || 'BookOpen'] || BookOpen;
  const colorClass = colorMap[section.icon || 'BookOpen'] || 'from-gray-500/20 to-gray-600/20';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'z-50 opacity-90')}>
      <Card variant="interactive" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={onToggle}>
            <button {...attributes} {...listeners} className="cursor-grab touch-none" onClick={(e) => e.stopPropagation()}>
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', colorClass)}>
              <IconComponent className="w-6 h-6 text-foreground" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{section.name}</h3>
                {!section.is_active && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{section.description || 'No description'}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="font-medium">{levelsCount} Levels</p>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="icon" onClick={onEdit}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
            </div>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

// Sortable Level Item
function SortableLevelItem({ 
  level, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  unitsCount,
  children 
}: { 
  level: Level; 
  isExpanded: boolean; 
  onToggle: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
  unitsCount: number;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: level.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-lg bg-card border border-border overflow-hidden', isDragging && 'z-50 opacity-90 shadow-lg')}>
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab touch-none" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
            {level.level_number}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{level.name}</p>
              {!level.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{unitsCount} Units</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
          <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
        </div>
      </div>
      {children}
    </div>
  );
}

// Sortable Unit Item
function SortableUnitItem({ 
  unit, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete,
  children 
}: { 
  unit: Unit; 
  isExpanded: boolean; 
  onToggle: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded bg-background border border-border overflow-hidden', isDragging && 'z-50 opacity-90 shadow-lg')}>
      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab touch-none" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </button>
          <span className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-medium">
            {unit.unit_number}
          </span>
          <span className="text-sm font-medium">{unit.name}</span>
          {!unit.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
          <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
        </div>
      </div>
      {children}
    </div>
  );
}

// Sortable Lesson Item
function SortableLessonItem({ 
  lesson, 
  onEdit, 
  onDelete,
  onQuiz 
}: { 
  lesson: Lesson; 
  onEdit: () => void; 
  onDelete: () => void;
  onQuiz: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn('flex items-center justify-between p-2 rounded bg-card border border-border', isDragging && 'z-50 opacity-90 shadow-lg')}
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        <Play className="w-3 h-3 text-primary" />
        <span className="text-xs font-medium">{lesson.lesson_number}. {lesson.title}</span>
        {lesson.duration_minutes && (
          <span className="text-xs text-muted-foreground">{lesson.duration_minutes}min</span>
        )}
        {!lesson.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
      </div>
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onQuiz} title="Manage Quiz">
          <HelpCircle className="w-2.5 h-2.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit}>
          <Edit2 className="w-2.5 h-2.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={onDelete}>
          <Trash2 className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}

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

  // Quiz dialog states
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);

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
  const reorderSections = useReorderSections();
  const reorderLevels = useReorderLevels();
  const reorderUnits = useReorderUnits();
  const reorderLessons = useReorderLessons();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sections) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    
    reorderSections.mutate(reordered.map((s, i) => ({ id: s.id, display_order: i })));
  }, [sections, reorderSections]);

  const handleLevelDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !levels) return;

    const sectionLevels = levels.filter(l => l.section_id === expandedSection);
    const oldIndex = sectionLevels.findIndex(l => l.id === active.id);
    const newIndex = sectionLevels.findIndex(l => l.id === over.id);
    const reordered = arrayMove(sectionLevels, oldIndex, newIndex);
    
    reorderLevels.mutate(reordered.map((l, i) => ({ id: l.id, level_number: i + 1 })));
  }, [levels, expandedSection, reorderLevels]);

  const handleUnitDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !units) return;

    const levelUnits = units.filter(u => u.level_id === expandedLevel);
    const oldIndex = levelUnits.findIndex(u => u.id === active.id);
    const newIndex = levelUnits.findIndex(u => u.id === over.id);
    const reordered = arrayMove(levelUnits, oldIndex, newIndex);
    
    reorderUnits.mutate(reordered.map((u, i) => ({ id: u.id, unit_number: i + 1 })));
  }, [units, expandedLevel, reorderUnits]);

  const handleLessonDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !lessons) return;

    const unitLessons = lessons.filter(l => l.unit_id === expandedUnit);
    const oldIndex = unitLessons.findIndex(l => l.id === active.id);
    const newIndex = unitLessons.findIndex(l => l.id === over.id);
    const reordered = arrayMove(unitLessons, oldIndex, newIndex);
    
    reorderLessons.mutate(reordered.map((l, i) => ({ id: l.id, lesson_number: i + 1 })));
  }, [lessons, expandedUnit, reorderLessons]);

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

  const openQuizManager = (lessonId: string) => {
    setQuizLessonId(lessonId);
    setQuizDialogOpen(true);
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
            <p className="text-muted-foreground mt-1">Manage sections, levels, units, and lessons. Drag to reorder.</p>
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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={sections?.map(s => s.id) || []} strategy={verticalListSortingStrategy}>
              {sections?.map((section) => {
                const isExpanded = expandedSection === section.id;
                const sectionLevels = levels?.filter(l => l.section_id === section.id) || [];

                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <SortableSectionItem
                      section={section}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedSection(isExpanded ? null : section.id)}
                      onEdit={() => openEditDialog('section', section)}
                      onDelete={() => openDeleteDialog('section', section.id, section.name)}
                      levelsCount={sectionLevels.length}
                    >
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

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLevelDragEnd}>
                              <SortableContext items={sectionLevels.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                  {sectionLevels.map((level) => {
                                    const isLevelExpanded = expandedLevel === level.id;
                                    const levelUnits = units?.filter(u => u.level_id === level.id) || [];

                                    return (
                                      <SortableLevelItem
                                        key={level.id}
                                        level={level}
                                        isExpanded={isLevelExpanded}
                                        onToggle={() => setExpandedLevel(isLevelExpanded ? null : level.id)}
                                        onEdit={() => openEditDialog('level', level)}
                                        onDelete={() => openDeleteDialog('level', level.id, level.name)}
                                        unitsCount={levelUnits.length}
                                      >
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

                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUnitDragEnd}>
                                              <SortableContext items={levelUnits.map(u => u.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-2">
                                                  {levelUnits.map((unit) => {
                                                    const isUnitExpanded = expandedUnit === unit.id;
                                                    const unitLessons = lessons?.filter(l => l.unit_id === unit.id) || [];

                                                    return (
                                                      <SortableUnitItem
                                                        key={unit.id}
                                                        unit={unit}
                                                        isExpanded={isUnitExpanded}
                                                        onToggle={() => setExpandedUnit(isUnitExpanded ? null : unit.id)}
                                                        onEdit={() => openEditDialog('unit', unit)}
                                                        onDelete={() => openDeleteDialog('unit', unit.id, unit.name)}
                                                      >
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

                                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
                                                              <SortableContext items={unitLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                                                <div className="space-y-1">
                                                                  {unitLessons.map((lesson) => (
                                                                    <SortableLessonItem
                                                                      key={lesson.id}
                                                                      lesson={lesson}
                                                                      onEdit={() => openEditDialog('lesson', lesson)}
                                                                      onDelete={() => openDeleteDialog('lesson', lesson.id, lesson.title)}
                                                                      onQuiz={() => openQuizManager(lesson.id)}
                                                                    />
                                                                  ))}
                                                                </div>
                                                              </SortableContext>
                                                            </DndContext>
                                                          </div>
                                                        )}
                                                      </SortableUnitItem>
                                                    );
                                                  })}
                                                </div>
                                              </SortableContext>
                                            </DndContext>
                                          </div>
                                        )}
                                      </SortableLevelItem>
                                    );
                                  })}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        </motion.div>
                      )}
                    </SortableSectionItem>
                  </motion.div>
                );
              })}
            </SortableContext>
          </DndContext>
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

      {/* Quiz Manager */}
      <QuizManagerDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        lessonId={quizLessonId}
      />
    </DashboardLayout>
  );
}
