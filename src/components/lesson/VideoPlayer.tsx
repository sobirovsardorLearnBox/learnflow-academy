import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onComplete?: () => void;
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

// Main VideoPlayer Component
export function VideoPlayer({ videoUrl, title, onComplete }: VideoPlayerProps) {
  if (isYouTubeUrl(videoUrl)) {
    return <YouTubePlayer videoUrl={videoUrl} title={title} onComplete={onComplete} />;
  }

  return <NativeVideoPlayer videoUrl={videoUrl} title={title} onComplete={onComplete} />;
}
