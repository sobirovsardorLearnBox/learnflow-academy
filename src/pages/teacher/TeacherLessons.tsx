import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, BookOpen, Video, FileText, Loader2 } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content: string | null;
  lesson_number: number;
  duration_minutes: number | null;
  is_active: boolean;
}

interface Unit {
  id: string;
  name: string;
  description: string | null;
  unit_number: number;
  lessons: Lesson[];
}

interface Level {
  id: string;
  name: string;
  description: string | null;
  level_number: number;
  units: Unit[];
}

interface Section {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  levels: Level[];
}

export default function TeacherLessons() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: sections, isLoading } = useQuery({
    queryKey: ['teacher-lessons-structure'],
    queryFn: async () => {
      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (sectionsError) throw sectionsError;

      // Fetch levels
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number');

      if (levelsError) throw levelsError;

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('unit_number');

      if (unitsError) throw unitsError;

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('is_active', true)
        .order('lesson_number');

      if (lessonsError) throw lessonsError;

      // Build structure
      const structure: Section[] = (sectionsData || []).map((section) => ({
        ...section,
        levels: (levelsData || [])
          .filter((level) => level.section_id === section.id)
          .map((level) => ({
            ...level,
            units: (unitsData || [])
              .filter((unit) => unit.level_id === level.id)
              .map((unit) => ({
                ...unit,
                lessons: (lessonsData || []).filter(
                  (lesson) => lesson.unit_id === unit.id
                ),
              })),
          })),
      }));

      return structure;
    },
  });

  // Filter lessons based on search
  const filteredSections = sections?.map((section) => ({
    ...section,
    levels: section.levels.map((level) => ({
      ...level,
      units: level.units.map((unit) => ({
        ...unit,
        lessons: unit.lessons.filter(
          (lesson) =>
            lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lesson.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((unit) => unit.lessons.length > 0 || !searchQuery),
    })).filter((level) => level.units.length > 0 || !searchQuery),
  })).filter((section) => section.levels.length > 0 || !searchQuery);

  const totalLessons = sections?.reduce(
    (acc, section) =>
      acc +
      section.levels.reduce(
        (acc2, level) =>
          acc2 + level.units.reduce((acc3, unit) => acc3 + unit.lessons.length, 0),
        0
      ),
    0
  ) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Darslar</h1>
          <p className="text-muted-foreground">
            Barcha mavjud darslarni ko'ring va o'rganing
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami bo'limlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sections?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami darslar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLessons}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami bo'limlar (darajalar)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sections?.reduce((acc, s) => acc + s.levels.length, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Darslarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {filteredSections?.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{section.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {section.levels.length} ta daraja
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {section.levels.map((level) => (
                      <Accordion key={level.id} type="multiple">
                        <AccordionItem value={level.id} className="border-l-2 border-primary/20 pl-4">
                          <AccordionTrigger className="hover:no-underline py-2">
                            <div className="text-left">
                              <h4 className="font-medium">
                                Daraja {level.level_number}: {level.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {level.units.length} ta bo'lim
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {level.units.map((unit) => (
                                <div
                                  key={unit.id}
                                  className="bg-muted/50 rounded-lg p-4"
                                >
                                  <h5 className="font-medium mb-3">
                                    Bo'lim {unit.unit_number}: {unit.name}
                                  </h5>
                                  <div className="space-y-2">
                                    {unit.lessons.map((lesson) => (
                                      <div
                                        key={lesson.id}
                                        className="flex items-center justify-between bg-background p-3 rounded-md"
                                      >
                                        <div className="flex items-center gap-3">
                                          {lesson.video_url ? (
                                            <Video className="w-4 h-4 text-primary" />
                                          ) : (
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                          )}
                                          <div>
                                            <p className="font-medium text-sm">
                                              {lesson.lesson_number}. {lesson.title}
                                            </p>
                                            {lesson.description && (
                                              <p className="text-xs text-muted-foreground line-clamp-1">
                                                {lesson.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {lesson.duration_minutes && (
                                            <Badge variant="secondary">
                                              {lesson.duration_minutes} daq
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {unit.lessons.length === 0 && (
                                      <p className="text-sm text-muted-foreground text-center py-2">
                                        Hali dars yo'q
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}

            {filteredSections?.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Hech narsa topilmadi"
                      : "Hali darslar yo'q"}
                  </p>
                </CardContent>
              </Card>
            )}
          </Accordion>
        )}
      </div>
    </DashboardLayout>
  );
}
