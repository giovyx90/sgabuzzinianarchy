
import { PixelData, CANVAS_SIZE } from '@/types/canvas';
import { supabase } from '@/integrations/supabase/client';

// Reduced TTL cache
const pixelCache = new Map<string, PixelData>();
const CACHE_TTL = 2000; // 2 seconds

// Fetch all pixels from Supabase
export const fetchAllPixels = async () => {
  try {
    const { data, error } = await supabase
      .from('pixels')
      .select('*');
    
    if (error) {
      console.error('Error fetching pixels:', error);
      return [];
    }
    
    // Update cache
    const now = Date.now();
    data.forEach((pixel: PixelData) => {
      const key = `${pixel.x}-${pixel.y}`;
      pixelCache.set(key, {
        ...pixel,
        timestamp: now,
      });
    });
    
    return data;
  } catch (e) {
    console.error('Error in fetchAllPixels:', e);
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
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching pixel info:', error);
      return null;
    }
    
    if (data) {
      pixelCache.set(cacheKey, {
        ...data,
        timestamp: Date.now(),
      });
      return data;
    }
    
    return null;
  } catch (e) {
    console.error('Error in getPixelInfo:', e);
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
    
    // Check if pixel exists at this position
    const { data: existingPixel } = await supabase
      .from('pixels')
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .maybeSingle();
    
    let result;
    
    if (existingPixel) {
      // Update existing pixel
      result = await supabase
        .from('pixels')
        .update({
          color,
          placed_by: nickname || 'Anonimo',
          placed_at: new Date().toISOString()
        })
        .eq('x', x)
        .eq('y', y);
    } else {
      // Insert new pixel
      result = await supabase
        .from('pixels')
        .insert(pixelData);
    }
    
    if (result.error) {
      console.error('Error placing pixel:', result.error);
      return false;
    }
    
    // Notify listeners immediately
    if (pixelUpdateListeners.length > 0) {
      pixelUpdateListeners.forEach(listener => listener(pixelData));
    }
    
    return true;
  } catch (e) {
    console.error('Error in placePixel:', e);
    return false;
  }
};

// Set up real-time subscriptions
let realtimeSubscription: any = null;

export const setupRealtimeUpdates = () => {
  if (realtimeSubscription) return;
  
  realtimeSubscription = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pixels'
      },
      (payload) => {
        const pixelData = payload.new as PixelData;
        if (pixelUpdateListeners.length > 0) {
          pixelUpdateListeners.forEach(listener => listener(pixelData));
        }
      }
    )
    .subscribe();
};

// Cleanup function for realtime subscription
export const cleanupRealtimeUpdates = () => {
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }
};

// Pixel update listeners
const pixelUpdateListeners: ((pixel: PixelData) => void)[] = [];

// Subscribe to pixel updates
export const subscribeToPixelUpdates = (onPixelUpdate: (pixel: PixelData) => void) => {
  pixelUpdateListeners.push(onPixelUpdate);
  
  // Setup realtime updates if not already set up
  setupRealtimeUpdates();
  
  return {
    unsubscribe: () => {
      const index = pixelUpdateListeners.indexOf(onPixelUpdate);
      if (index !== -1) {
        pixelUpdateListeners.splice(index, 1);
      }
      
      // If no more listeners, cleanup the realtime subscription
      if (pixelUpdateListeners.length === 0) {
        cleanupRealtimeUpdates();
      }
    }
  };
};
