// YouTube thumbnail extraction - no API key needed
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

export function getYouTubeThumbnailUrl(videoUrl: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string | null {
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) return null;
  
  // YouTube provides several thumbnail qualities:
  // default.jpg (120x90)
  // mqdefault.jpg (320x180)
  // hqdefault.jpg (480x360)
  // sddefault.jpg (640x480)
  // maxresdefault.jpg (1280x720) - may not exist for all videos
  
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

// Check if URL is a YouTube URL
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

// Check if URL is a Telegram URL
export function isTelegramUrl(url: string): boolean {
  return /t\.me/.test(url);
}

// Get Telegram embed URL (for reference, thumbnails not available publicly)
export function getTelegramVideoId(url: string): { channelId: string; messageId: string } | null {
  // Format: https://t.me/c/CHANNEL_ID/MESSAGE_ID or https://t.me/USERNAME/MESSAGE_ID
  const privateMatch = url.match(/t\.me\/c\/(\d+)\/(\d+)/);
  if (privateMatch) {
    return { channelId: privateMatch[1], messageId: privateMatch[2] };
  }
  
  const publicMatch = url.match(/t\.me\/([^\/]+)\/(\d+)/);
  if (publicMatch) {
    return { channelId: publicMatch[1], messageId: publicMatch[2] };
  }
  
  return null;
}

// Generate a placeholder thumbnail for Telegram videos
export function getTelegramPlaceholderUrl(): string {
  // We'll use a data URL for a Telegram-themed placeholder
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect fill="#0088cc" width="320" height="180"/>
      <text x="160" y="90" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
        Telegram Video
      </text>
      <path fill="white" opacity="0.3" d="M160 60 L180 90 L160 85 L140 90 Z" transform="translate(0, 10)"/>
    </svg>
  `.trim());
}

// Fetch and validate YouTube thumbnail exists
export async function validateYouTubeThumbnail(thumbnailUrl: string): Promise<boolean> {
  try {
    const response = await fetch(thumbnailUrl, { method: 'HEAD' });
    // YouTube returns 404 for non-existent thumbnails but still sends a placeholder
    // We check content-length to detect the placeholder (usually small)
    const contentLength = response.headers.get('content-length');
    return response.ok && contentLength !== null && parseInt(contentLength) > 1000;
  } catch {
    return false;
  }
}

// Get best available YouTube thumbnail
export async function getBestYouTubeThumbnail(videoUrl: string): Promise<string | null> {
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) return null;
  
  // Try maxres first, then fall back to lower qualities
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const;
  
  for (const quality of qualities) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    const isValid = await validateYouTubeThumbnail(url);
    if (isValid) {
      return url;
    }
  }
  
  // Default fallback - always exists
  return `https://img.youtube.com/vi/${videoId}/default.jpg`;
}

// Main function to get thumbnail for any video type
export async function getVideoThumbnail(
  videoUrl: string,
  videoType: 'youtube' | 'telegram' | 'upload' | 'direct'
): Promise<string | null> {
  if (!videoUrl) return null;
  
  switch (videoType) {
    case 'youtube':
      if (isYouTubeUrl(videoUrl)) {
        return await getBestYouTubeThumbnail(videoUrl);
      }
      break;
    case 'telegram':
      // Telegram doesn't expose thumbnails publicly
      // Return null - thumbnail will be generated when video is played or manually set
      return null;
    case 'upload':
    case 'direct':
      // For uploaded/direct videos, thumbnail is generated during upload
      return null;
  }
  
  return null;
}
