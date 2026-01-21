import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Youtube, Send, Upload, Link } from 'lucide-react';
interface ContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'section' | 'level' | 'unit' | 'lesson';
  mode: 'create' | 'edit';
  data?: any;
  parentId?: string;
  parentOptions?: { id: string; name: string }[];
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

const iconOptions = [
  { value: 'Code', label: '💻 Code' },
  { value: 'BookOpen', label: '📖 Book' },
  { value: 'Globe', label: '🌐 Globe' },
  { value: 'Shield', label: '🛡️ Shield' },
  { value: 'Cpu', label: '🔧 CPU' },
  { value: 'Database', label: '🗄️ Database' },
];

export function ContentDialog({
  open,
  onOpenChange,
  type,
  mode,
  data,
  parentId,
  parentOptions,
  onSubmit,
  isLoading,
}: ContentDialogProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (mode === 'edit' && data) {
      setFormData(data);
    } else {
      // Initialize with defaults based on type
      const defaults: any = { is_active: true };
      if (parentId) {
        if (type === 'level') defaults.section_id = parentId;
        if (type === 'unit') defaults.level_id = parentId;
        if (type === 'lesson') defaults.unit_id = parentId;
      }
      setFormData(defaults);
    }
  }, [mode, data, type, parentId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const getTitle = () => {
    const action = mode === 'create' ? 'Create' : 'Edit';
    return `${action} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name/Title field */}
          <div className="space-y-2">
            <Label htmlFor="name">{type === 'lesson' ? 'Title' : 'Name'}</Label>
            <Input
              id="name"
              value={formData[type === 'lesson' ? 'title' : 'name'] || ''}
              onChange={(e) => updateField(type === 'lesson' ? 'title' : 'name', e.target.value)}
              placeholder={`Enter ${type} ${type === 'lesson' ? 'title' : 'name'}`}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>

          {/* Section-specific fields */}
          {type === 'section' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon || ''}
                  onValueChange={(value) => updateField('icon', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order || 0}
                  onChange={(e) => updateField('display_order', parseInt(e.target.value))}
                  min={0}
                />
              </div>
            </>
          )}

          {/* Level-specific fields */}
          {type === 'level' && (
            <>
              {parentOptions && parentOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={formData.section_id || ''}
                    onValueChange={(value) => updateField('section_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="level_number">Level Number</Label>
                <Input
                  id="level_number"
                  type="number"
                  value={formData.level_number || 1}
                  onChange={(e) => updateField('level_number', parseInt(e.target.value))}
                  min={1}
                  required
                />
              </div>
            </>
          )}

          {/* Unit-specific fields */}
          {type === 'unit' && (
            <>
              {parentOptions && parentOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select
                    value={formData.level_id || ''}
                    onValueChange={(value) => updateField('level_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a level" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="unit_number">Unit Number</Label>
                <Input
                  id="unit_number"
                  type="number"
                  value={formData.unit_number || 1}
                  onChange={(e) => updateField('unit_number', parseInt(e.target.value))}
                  min={1}
                  required
                />
              </div>
            </>
          )}

          {/* Lesson-specific fields */}
          {type === 'lesson' && (
            <>
              {parentOptions && parentOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={formData.unit_id || ''}
                    onValueChange={(value) => updateField('unit_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="lesson_number">Lesson Number</Label>
                <Input
                  id="lesson_number"
                  type="number"
                  value={formData.lesson_number || 1}
                  onChange={(e) => updateField('lesson_number', parseInt(e.target.value))}
                  min={1}
                  required
                />
              </div>

              {/* Video Source Type Selection */}
              <div className="space-y-3">
                <Label>Video manbasi</Label>
                <Tabs 
                  value={formData.video_type || 'youtube'} 
                  onValueChange={(value) => updateField('video_type', value)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="youtube" className="flex items-center gap-1.5">
                      <Youtube className="w-4 h-4" />
                      <span className="hidden sm:inline">YouTube</span>
                    </TabsTrigger>
                    <TabsTrigger value="telegram" className="flex items-center gap-1.5">
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Telegram</span>
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-1.5">
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Yuklash</span>
                    </TabsTrigger>
                    <TabsTrigger value="direct" className="flex items-center gap-1.5">
                      <Link className="w-4 h-4" />
                      <span className="hidden sm:inline">URL</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="youtube" className="space-y-2 mt-3">
                    <Label htmlFor="video_url_youtube">YouTube havolasi</Label>
                    <Input
                      id="video_url_youtube"
                      type="url"
                      value={formData.video_url || ''}
                      onChange={(e) => updateField('video_url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=... yoki youtu.be/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Ochiq yoki yashirin (unlisted) YouTube video havolasini kiriting
                    </p>
                  </TabsContent>

                  <TabsContent value="telegram" className="space-y-2 mt-3">
                    <Label htmlFor="video_url_telegram">Telegram video havolasi</Label>
                    <Input
                      id="video_url_telegram"
                      type="url"
                      value={formData.video_url || ''}
                      onChange={(e) => updateField('video_url', e.target.value)}
                      placeholder="https://t.me/c/123456789/123"
                    />
                    <p className="text-xs text-muted-foreground">
                      Telegram kanal yoki guruhdan video havolasini kiriting. Video ochiq bo'lishi kerak.
                    </p>
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-2 mt-3">
                    <Label htmlFor="video_url_upload">Video fayl URL</Label>
                    <Input
                      id="video_url_upload"
                      type="url"
                      value={formData.video_url || ''}
                      onChange={(e) => updateField('video_url', e.target.value)}
                      placeholder="https://example.com/video.mp4"
                    />
                    <p className="text-xs text-muted-foreground">
                      MP4, WebM yoki OGV formatidagi video fayl havolasini kiriting. 
                      Faylni oldindan xostingga yuklang.
                    </p>
                  </TabsContent>

                  <TabsContent value="direct" className="space-y-2 mt-3">
                    <Label htmlFor="video_url_direct">To'g'ridan-to'g'ri video URL</Label>
                    <Input
                      id="video_url_direct"
                      type="url"
                      value={formData.video_url || ''}
                      onChange={(e) => updateField('video_url', e.target.value)}
                      placeholder="https://example.com/video.mp4"
                    />
                    <p className="text-xs text-muted-foreground">
                      Istalgan video xizmatidan to'g'ridan-to'g'ri havola kiriting
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_minutes" className="flex items-center gap-2">
                  Video davomiyligi (daqiqa) 
                  <span className="text-xs text-muted-foreground font-normal">
                    *Telegram uchun muhim
                  </span>
                </Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => updateField('duration_minutes', parseInt(e.target.value) || null)}
                  min={1}
                  placeholder="Masalan: 15"
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Video davomiyligini kiriting. Telegram videolar uchun bu qiymat progress hisoblash uchun ishlatiladi.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                  placeholder="Lesson content or notes..."
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active ?? true}
              onCheckedChange={(checked) => updateField('is_active', checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
