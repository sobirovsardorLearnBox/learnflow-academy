import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronRight, GripVertical } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sections as courseSections } from '@/data/courseData';
import { cn } from '@/lib/utils';

export default function AdminSections() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Course Sections</h1>
            <p className="text-muted-foreground mt-1">Manage your course structure</p>
          </div>
          <Button variant="premium">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Sections Grid */}
        <div className="grid gap-4">
          {courseSections.map((section, index) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="interactive" className="overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                      
                      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', section.color)}>
                        <Icon className="w-6 h-6 text-foreground" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{section.title}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <p className="font-medium">{section.levelsCount} Levels</p>
                          <p className="text-xs text-muted-foreground">60 Units</p>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <ChevronRight
                          className={cn(
                            'w-5 h-5 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border bg-secondary/30"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Levels</h4>
                            <Button size="sm" variant="outline">
                              <Plus className="w-4 h-4 mr-1" />
                              Add Level
                            </Button>
                          </div>
                          
                          {Array.from({ length: section.levelsCount }, (_, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="font-medium">Level {i + 1}</p>
                                  <p className="text-xs text-muted-foreground">12 Units</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">Edit</Button>
                                <Button variant="ghost" size="sm">View Units</Button>
                              </div>
                            </div>
                          ))}
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
    </DashboardLayout>
  );
}
