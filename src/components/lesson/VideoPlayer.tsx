import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onComplete?: () => void;
  durationMinutes?: number; // Lesson duration in minutes for progress tracking
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Check if URL is YouTube
const isYouTubeUrl = (url: string): boolean => {
  return url?.includes('youtube.com') || url?.includes('youtu.be');
};

// Check if URL is Telegram
const isTelegramUrl = (url: string): boolean => {
  return url?.includes('t.me/') || url?.includes('telegram.me/');
};

// Extract Telegram video embed URL
const getTelegramEmbedUrl = (url: string): string | null => {
  // Format: https://t.me/channel/messageId or https://t.me/c/channelId/messageId
  const match = url.match(/t\.me\/(c\/)?([^\/]+)\/(\d+)/);
  if (match) {
    const isPrivate = !!match[1];
    const channel = match[2];
    const messageId = match[3];
    if (isPrivate) {
      // Private channel format
      return `https://t.me/${channel}/${messageId}?embed=1`;
    }
    // Public channel format
    return `https://t.me/${channel}/${messageId}?embed=1`;
  }
  return null;
};

// YouTube Player Component
function YouTubePlayer({ videoUrl, title, onComplete }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const videoId = getYouTubeVideoId(videoUrl);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = initPlayer;
    };

    const initPlayer = () => {
      if (!playerContainerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume());
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              if (!hasCompletedRef.current) {
                hasCompletedRef.current = true;
                onCompleteRef.current?.();
              }
            }
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Update current time periodically and check for 90% completion
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      timeUpdateRef.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
          const current = playerRef.current.getCurrentTime();
          const total = playerRef.current.getDuration();
          setCurrentTime(current);
          
          // Mark as complete when 90% of video is watched
          if (total > 0 && current / total >= 0.9 && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onCompleteRef.current?.();
          }
        }
      }, 250);
    } else if (timeUpdateRef.current) {
      clearInterval(timeUpdateRef.current);
    }

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, isReady]);

  const handleSeek = useCallback((value: number[]) => {
    if (!playerRef.current || !isReady) return;
    playerRef.current.seekTo(value[0], true);
    setCurrentTime(value[0]);
  }, [isReady]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!playerRef.current || !isReady) return;
    const vol = value[0] * 100;
    playerRef.current.setVolume(vol);
    setVolume(vol);
    if (vol === 0) {
      playerRef.current.mute();
      setIsMuted(true);
    } else {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  }, [isReady]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted, isReady]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const skipTime = useCallback((seconds: number) => {
    if (!playerRef.current || !isReady) return;
    const newTime = Math.min(Math.max(currentTime + seconds, 0), duration);
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [currentTime, duration, isReady]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!videoId) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
        <p className="text-white">Invalid video URL</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* YouTube Player Container - slightly scaled up to hide any YouTube UI elements at edges */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div 
          ref={playerContainerRef} 
          className="absolute pointer-events-none"
          style={{
            top: '-10%',
            left: '-10%',
            width: '120%',
            height: '120%',
          }}
        />
      </div>

      {/* Cover any YouTube branding that might appear at top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
      
      {/* Cover any YouTube branding that might appear at bottom corners */}
      <div className="absolute bottom-16 right-0 w-32 h-12 bg-black/80 z-10 pointer-events-none rounded-tl-lg" />
      <div className="absolute bottom-16 left-0 w-32 h-12 bg-black/80 z-10 pointer-events-none rounded-tr-lg" />

      {/* Clickable overlay */}
      <div 
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
      />

      {/* Loading state */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Play button overlay */}
      {!isPlaying && isReady && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 pointer-events-none"
        >
          <Button
            size="lg"
            variant="ghost"
            className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground pointer-events-auto"
            onClick={togglePlay}
          >
            <Play className="w-10 h-10 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity z-30",
          !showControls && "pointer-events-none"
        )}
      >
        {/* Progress bar */}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-3"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => skipTime(-10)}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => skipTime(10)}>
              <SkipForward className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume / 100]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={toggleFullscreen}>
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Native Video Player Component
function NativeVideoPlayer({ videoUrl, title, onComplete }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value[0];
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), duration);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      {/* Play button overlay */}
      {!isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <Button
            size="lg"
            variant="ghost"
            className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground"
            onClick={togglePlay}
          >
            <Play className="w-10 h-10 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
          !showControls && "pointer-events-none"
        )}
      >
        {/* Progress bar */}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-3"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => skipTime(-10)}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => skipTime(10)}>
              <SkipForward className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={toggleFullscreen}>
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Telegram Player Component with Progress Tracking
function TelegramPlayer({ videoUrl, title, onComplete, durationMinutes }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  
  const [isLoading, setIsLoading] = useState(true);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Use provided duration or default to 5 minutes
  const estimatedDuration = durationMinutes ? durationMinutes * 60 : 300; // Convert to seconds
  const completionThreshold = 0.6; // 60% completion triggers onComplete
  
  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Track watching time when user is actively watching
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isWatching && !hasCompletedRef.current) {
      interval = setInterval(() => {
        setWatchedSeconds(prev => {
          const newValue = prev + 1;
          
          // Check if completion threshold reached
          if (newValue >= estimatedDuration * completionThreshold && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onCompleteRef.current?.();
          }
          
          return newValue;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWatching, estimatedDuration]);

  // Auto-start watching when iframe loads
  useEffect(() => {
    if (!isLoading) {
      // Start tracking after a small delay to ensure user is engaged
      const timer = setTimeout(() => {
        setIsWatching(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.min((watchedSeconds / estimatedDuration) * 100, 100);
  const embedUrl = getTelegramEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[#0088cc]/20 to-[#0088cc]/5 flex items-center justify-center border border-[#0088cc]/30">
        <div className="text-center p-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#0088cc]/20 flex items-center justify-center">
            <Send className="w-10 h-10 text-[#0088cc]" />
          </div>
          <p className="text-lg font-semibold text-foreground">Telegram Video</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Bu video Telegram platformasida joylashgan. Tomosha qilish uchun quyidagi tugmani bosing.
          </p>
          <a 
            href={videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#0088cc] text-white rounded-xl font-medium hover:bg-[#0077b5] transition-colors shadow-lg shadow-[#0088cc]/25"
          >
            <Send className="w-4 h-4" />
            Telegramda ochish
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isWatching && setShowControls(false)}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0088cc]/20 to-black z-20">
          <div className="w-16 h-16 rounded-full bg-[#0088cc]/20 flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-[#0088cc] animate-pulse" />
          </div>
          <div className="w-12 h-12 border-4 border-[#0088cc] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/80 mt-4 text-sm">Video yuklanmoqda...</p>
        </div>
      )}
      
      {/* Telegram Embed */}
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
        style={{ border: 'none' }}
      />

      {/* Telegram Branding Overlay */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0088cc] flex items-center justify-center">
            <Send className="w-3 h-3 text-white" />
          </div>
          <span className="text-white/90 text-sm font-medium">Telegram Video</span>
        </div>
      </div>

      {/* Controls Overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity z-30",
          !showControls && "pointer-events-none"
        )}
      >
        {/* Progress Bar */}
        <div className="relative h-1.5 bg-white/20 rounded-full mb-3 overflow-hidden">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-[#0088cc] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
          {/* Completion marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white/50"
            style={{ left: `${completionThreshold * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Left side - Time info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isWatching ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-xs font-medium">LIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-white/70 text-xs">Kutilmoqda</span>
                </div>
              )}
            </div>
            <span className="text-white text-sm">
              {formatTime(watchedSeconds)} / ~{formatTime(estimatedDuration)}
            </span>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Completion indicator */}
            {hasCompletedRef.current && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-green-400 text-xs font-medium">Tugatildi</span>
              </div>
            )}
            
            {/* Open in Telegram */}
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc]/80 hover:bg-[#0088cc] text-white text-xs font-medium rounded-full transition-colors"
            >
              <Send className="w-3 h-3" />
              Telegramda
            </a>
            
            {/* Fullscreen */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:text-white hover:bg-white/20 w-8 h-8" 
              onClick={toggleFullscreen}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress percentage */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-white/50 text-xs">
            Video progress: {Math.round(progress)}%
          </span>
          <span className="text-white/50 text-xs">
            {Math.round(completionThreshold * 100)}% da tugatilgan hisoblanadi
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// Main VideoPlayer Component
export function VideoPlayer({ videoUrl, title, onComplete, durationMinutes }: VideoPlayerProps) {
  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Video mavjud emas</p>
      </div>
    );
  }

  if (isYouTubeUrl(videoUrl)) {
    return <YouTubePlayer videoUrl={videoUrl} title={title} onComplete={onComplete} durationMinutes={durationMinutes} />;
  }

  if (isTelegramUrl(videoUrl)) {
    return <TelegramPlayer videoUrl={videoUrl} title={title} onComplete={onComplete} durationMinutes={durationMinutes} />;
  }

  return <NativeVideoPlayer videoUrl={videoUrl} title={title} onComplete={onComplete} durationMinutes={durationMinutes} />;
}
