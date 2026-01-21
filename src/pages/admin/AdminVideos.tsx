import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Trash2, 
  Search, 
  Download, 
  Copy, 
  MoreVertical,
  Loader2,
  FileVideo,
  Calendar,
  HardDrive,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StorageFile {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getVideoType(mimetype: string): string {
  const types: Record<string, string> = {
    'video/mp4': 'MP4',
    'video/webm': 'WebM',
    'video/ogg': 'OGG',
    'video/quicktime': 'MOV',
  };
  return types[mimetype] || 'Video';
}

export default function AdminVideos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; file: StorageFile | null }>({
    open: false,
    file: null,
  });

  // Fetch all videos from storage
  const { data: videos, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('videos')
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      return data as StorageFile[];
    },
  });

  // Delete video mutation
  const deleteVideo = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase.storage.from('videos').remove([fileName]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success('Video muvaffaqiyatli o\'chirildi');
      setDeleteDialog({ open: false, file: null });
    },
    onError: (error: Error) => {
      toast.error('Video o\'chirishda xatolik: ' + error.message);
    },
  });

  // Filter videos by search term
  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    if (!searchTerm) return videos;
    return videos.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [videos, searchTerm]);

  // Calculate total storage used
  const totalSize = useMemo(() => {
    if (!videos) return 0;
    return videos.reduce((acc, v) => acc + (v.metadata?.size || 0), 0);
  }, [videos]);

  const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Havola nusxalandi');
  };

  const handleDelete = (file: StorageFile) => {
    setDeleteDialog({ open: true, file });
  };

  const confirmDelete = () => {
    if (deleteDialog.file) {
      deleteVideo.mutate(deleteDialog.file.name);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Video Kutubxonasi</h1>
            <p className="text-muted-foreground">Yuklangan videolarni boshqaring</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Yangilash
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileVideo className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{videos?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Jami videolar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <HardDrive className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
                  <p className="text-sm text-muted-foreground">Ishlatilgan joy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Video className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">500 MB</p>
                  <p className="text-sm text-muted-foreground">Maksimum fayl hajmi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Video qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-lg font-medium">Xatolik yuz berdi</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Qayta urinish
                </Button>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {searchTerm ? 'Natija topilmadi' : 'Videolar yo\'q'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm 
                    ? 'Qidiruv so\'rovingizga mos video topilmadi'
                    : 'Darslar bo\'limidan video yuklashingiz mumkin'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredVideos.map((file, index) => (
                    <motion.div
                      key={file.id || file.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                        <Video className="w-5 h-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getVideoType(file.metadata?.mimetype || '')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.metadata?.size || 0)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {file.created_at 
                              ? format(new Date(file.created_at), 'dd.MM.yyyy HH:mm')
                              : 'Noma\'lum'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(getPublicUrl(file.name))}
                          title="Havolani nusxalash"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.open(getPublicUrl(file.name), '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Brauzerda ochish
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(getPublicUrl(file.name))}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Havolani nusxalash
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={getPublicUrl(file.name)} download>
                                <Download className="w-4 h-4 mr-2" />
                                Yuklab olish
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(file)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, file: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Videoni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialog.file?.name}</strong> videosini o'chirmoqchimisiz?
              Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteVideo.isPending}
            >
              {deleteVideo.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
