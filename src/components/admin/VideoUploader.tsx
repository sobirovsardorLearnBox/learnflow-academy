import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Video, CheckCircle, AlertCircle, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoUploaderProps {
  onUploadComplete: (url: string, thumbnailUrl?: string) => void;
  currentUrl?: string;
  currentThumbnailUrl?: string;
}

// Generate thumbnail from video file
async function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of the video, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      // Set canvas size to 16:9 aspect ratio with max width of 640px
      const aspectRatio = video.videoWidth / video.videoHeight;
      let width = Math.min(video.videoWidth, 640);
      let height = width / aspectRatio;

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            resolve(blob);
          },
          'image/jpeg',
          0.8
        );
      } else {
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    // Set a timeout for thumbnail generation
    setTimeout(() => {
      if (!video.seekable.length) {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }
    }, 10000);

    video.src = URL.createObjectURL(file);
  });
}

// Upload thumbnail to storage
async function uploadThumbnail(blob: Blob, videoFileName: string): Promise<string | null> {
  try {
    const thumbnailName = `thumb_${videoFileName.replace(/\.[^/.]+$/, '')}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('Thumbnail upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (err) {
    console.error('Thumbnail upload error:', err);
    return null;
  }
}

export function VideoUploader({ onUploadComplete, currentUrl, currentThumbnailUrl }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(currentThumbnailUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  const maxSizeBytes = 500 * 1024 * 1024; // 500MB

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError('Faqat MP4, WebM, OGG yoki MOV formatlar qabul qilinadi');
      return;
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`Fayl hajmi 500MB dan oshmasligi kerak. Joriy: ${formatFileSize(file.size)}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Thumbnail yaratilmoqda...');

    try {
      // Generate thumbnail first
      let generatedThumbnailUrl: string | null = null;
      const thumbnailBlob = await generateThumbnail(file);
      
      if (thumbnailBlob) {
        setUploadStatus('Thumbnail yuklanmoqda...');
        setUploadProgress(10);
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        generatedThumbnailUrl = await uploadThumbnail(thumbnailBlob, `${timestamp}_${sanitizedName}`);
        if (generatedThumbnailUrl) {
          setThumbnailUrl(generatedThumbnailUrl);
        }
      }

      setUploadStatus('Video yuklanmoqda...');
      setUploadProgress(20);

      // Generate unique file name
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;

      // Simulate progress for better UX (Supabase doesn't provide real upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 8;
        });
      }, 200);

      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      setUploadProgress(100);
      setUploadStatus('Yuklash tugadi!');
      setUploadedUrl(publicUrl);
      onUploadComplete(publicUrl, generatedThumbnailUrl || undefined);
      toast.success('Video muvaffaqiyatli yuklandi!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Video yuklashda xatolik yuz berdi');
      toast.error('Video yuklashda xatolik');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUploadComplete]);

  const removeVideo = async () => {
    if (uploadedUrl) {
      try {
        // Extract file path from URL
        const urlParts = uploadedUrl.split('/videos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('videos').remove([filePath]);
        }
      } catch (err) {
        console.error('Error removing video:', err);
      }
    }

    // Also remove thumbnail if exists
    if (thumbnailUrl) {
      try {
        const urlParts = thumbnailUrl.split('/thumbnails/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('thumbnails').remove([filePath]);
        }
      } catch (err) {
        console.error('Error removing thumbnail:', err);
      }
    }

    setUploadedUrl(null);
    setThumbnailUrl(null);
    setUploadProgress(0);
    onUploadComplete('', undefined);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {uploadedUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start gap-3">
              {/* Thumbnail preview */}
              {thumbnailUrl ? (
                <div className="flex-shrink-0 w-20 h-12 rounded-md overflow-hidden bg-muted">
                  <img 
                    src={thumbnailUrl} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                  <Video className="w-6 h-6 text-primary" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Video yuklandi</p>
                <p className="text-xs text-muted-foreground truncate">{uploadedUrl}</p>
                {thumbnailUrl && (
                  <div className="flex items-center gap-1 mt-1">
                    <ImageIcon className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">Thumbnail yaratildi</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={removeVideo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                isUploading && "pointer-events-none"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              
              <div className="flex flex-col items-center justify-center text-center">
                {isUploading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                    <p className="text-sm font-medium mb-1">{uploadStatus || 'Yuklanmoqda...'}</p>
                    <div className="w-full max-w-xs">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(uploadProgress)}%</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">
                      Video faylni bu yerga tashlang
                    </p>
                    <p className="text-xs text-muted-foreground">
                      yoki tanlash uchun bosing
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      MP4, WebM, OGG, MOV • Maksimum 500MB
                    </p>
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Thumbnail avtomatik yaratiladi
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/10"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
