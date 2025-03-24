
import { PixelData, CANVAS_SIZE } from '@/types/canvas';

// Reduced TTL cache
const pixelCache = new Map<string, PixelData>();
const CACHE_TTL = 2000; // 2 seconds

// LocalStorage key
const CANVAS_STORAGE_KEY = 'pixel-canvas-data';

// Load pixels from localStorage
export const fetchAllPixels = async () => {
  try {
    const storedData = localStorage.getItem(CANVAS_STORAGE_KEY);
    let pixelData: PixelData[] = [];
    
    if (storedData) {
      pixelData = JSON.parse(storedData);
    }
    
    // Update cache
    const now = Date.now();
    pixelData.forEach((pixel: PixelData) => {
      const key = `${pixel.x}-${pixel.y}`;
      pixelCache.set(key, {
        ...pixel,
        timestamp: now,
      });
    });
    
    return pixelData;
  } catch (e) {
    return [];
  }
};

// Get pixel info
export const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
  const cacheKey = `${x}-${y}`;
  const cachedPixel = pixelCache.get(cacheKey);
  
  if (cachedPixel && cachedPixel.timestamp && Date.now() - cachedPixel.timestamp < CACHE_TTL) {
    return cachedPixel;
  }
  
  try {
    const storedData = localStorage.getItem(CANVAS_STORAGE_KEY);
    
    if (storedData) {
      const pixelData: PixelData[] = JSON.parse(storedData);
      const pixel = pixelData.find(p => p.x === x && p.y === y);
      
      if (pixel) {
        pixelCache.set(cacheKey, {
          ...pixel,
          timestamp: Date.now(),
        });
        return pixel;
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

// Place a pixel
export const placePixel = async (x: number, y: number, color: string, nickname: string | null) => {
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
    return false;
  }
  
  try {
    const pixelData = {
      x,
      y,
      color,
      placed_by: nickname || 'Anonimo',
      placed_at: new Date().toISOString()
    };
    
    // Update cache
    const cacheKey = `${x}-${y}`;
    pixelCache.set(cacheKey, {
      ...pixelData,
      timestamp: Date.now(),
    });
    
    // Load existing data
    const storedData = localStorage.getItem(CANVAS_STORAGE_KEY);
    let existingPixels: PixelData[] = [];
    
    if (storedData) {
      existingPixels = JSON.parse(storedData);
      // Remove existing pixel at the same position
      existingPixels = existingPixels.filter(p => !(p.x === x && p.y === y));
    }
    
    // Add new pixel
    existingPixels.push(pixelData);
    
    // Save to localStorage without awaiting
    setTimeout(() => {
      localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(existingPixels));
    }, 0);
    
    // Notify listeners immediately
    if (pixelUpdateListeners.length > 0) {
      pixelUpdateListeners.forEach(listener => listener(pixelData));
    }
    
    return true;
  } catch (e) {
    return false;
  }
};

// Pixel update listeners
const pixelUpdateListeners: ((pixel: PixelData) => void)[] = [];

// Subscribe to pixel updates
export const subscribeToPixelUpdates = (onPixelUpdate: (pixel: PixelData) => void) => {
  pixelUpdateListeners.push(onPixelUpdate);
  
  return {
    unsubscribe: () => {
      const index = pixelUpdateListeners.indexOf(onPixelUpdate);
      if (index !== -1) {
        pixelUpdateListeners.splice(index, 1);
      }
    }
  };
};
