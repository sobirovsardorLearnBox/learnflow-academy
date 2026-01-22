import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Youtube, Send, Upload, Link, ImageIcon, Loader2, CheckCircle2, X } from 'lucide-react';
import { VideoUploader } from './VideoUploader';
import { isYouTubeUrl, getBestYouTubeThumbnail, getYouTubeThumbnailUrl } from '@/lib/video-thumbnails';
import { toast } from 'sonner';

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
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

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

  // Fetch YouTube thumbnail when URL changes
  const fetchYouTubeThumbnail = useCallback(async (url: string) => {
    if (!url || !isYouTubeUrl(url)) return;
    
    setIsFetchingThumbnail(true);
    try {
      const thumbnailUrl = await getBestYouTubeThumbnail(url);
      if (thumbnailUrl) {
        updateField('thumbnail_url', thumbnailUrl);
        toast.success('YouTube thumbnail avtomatik olindi!');
      }
    } catch (error) {
      console.error('Failed to fetch YouTube thumbnail:', error);
      // Fallback to simple URL
      const fallback = getYouTubeThumbnailUrl(url, 'high');
      if (fallback) {
        updateField('thumbnail_url', fallback);
      }
    } finally {
      setIsFetchingThumbnail(false);
    }
  }, []);

  // Handle YouTube URL change with debounce
  const handleYouTubeUrlChange = useCallback((url: string) => {
    updateField('video_url', url);
    
    // Only auto-fetch if URL looks complete
    if (url && isYouTubeUrl(url) && (url.includes('watch?v=') || url.includes('youtu.be/'))) {
      // Small delay to avoid fetching on every keystroke
      const timeoutId = setTimeout(() => {
        fetchYouTubeThumbnail(url);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [fetchYouTubeThumbnail]);

  const clearThumbnail = () => {
    updateField('thumbnail_url', null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

                  <TabsContent value="youtube" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="video_url_youtube">YouTube havolasi</Label>
                      <Input
                        id="video_url_youtube"
                        type="url"
                        value={formData.video_url || ''}
                        onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... yoki youtu.be/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Ochiq yoki yashirin (unlisted) YouTube video havolasini kiriting. Thumbnail avtomatik olinadi.
                      </p>
                    </div>
                    
                    {/* YouTube Thumbnail Preview */}
                    {formData.video_type === 'youtube' && formData.video_url && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Thumbnail
                          {isFetchingThumbnail && (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          )}
                        </Label>
                        {formData.thumbnail_url ? (
                          <div className="relative inline-block">
                            <img 
                              src={formData.thumbnail_url} 
                              alt="Video thumbnail"
                              className="w-40 h-auto rounded-md border"
                            />
                            <div className="absolute top-1 right-1 flex gap-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-6 w-6"
                                onClick={clearThumbnail}
                                title="O'chirish"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="absolute bottom-1 left-1">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/90 text-white px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                Avtomatik
                              </span>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fetchYouTubeThumbnail(formData.video_url)}
                            disabled={isFetchingThumbnail}
                          >
                            {isFetchingThumbnail ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <ImageIcon className="w-4 h-4 mr-2" />
                            )}
                            Thumbnail olish
                          </Button>
                        )}
                      </div>
                    )}
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
                    <p className="text-xs text-amber-600">
                      ⚠️ Telegram videolar uchun thumbnail avtomatik olinmaydi.
                    </p>
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-3 mt-3">
                    <Label>Video yuklash</Label>
                    <VideoUploader
                      currentUrl={formData.video_type === 'upload' ? formData.video_url : undefined}
                      currentThumbnailUrl={formData.thumbnail_url}
                      onUploadComplete={(url, thumbnailUrl) => {
                        updateField('video_url', url);
                        updateField('video_type', 'upload');
                        if (thumbnailUrl) {
                          updateField('thumbnail_url', thumbnailUrl);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Video faylni to'g'ridan-to'g'ri yuklang. MP4, WebM, OGG yoki MOV formatlar qabul qilinadi. Maksimum 500MB. Thumbnail avtomatik yaratiladi.
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

              {/* Thumbnail Preview for non-YouTube videos */}
              {type === 'lesson' && formData.thumbnail_url && formData.video_type !== 'youtube' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Thumbnail
                  </Label>
                  <div className="relative inline-block">
                    <img 
                      src={formData.thumbnail_url} 
                      alt="Video thumbnail"
                      className="w-40 h-auto rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={clearThumbnail}
                      title="O'chirish"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

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
