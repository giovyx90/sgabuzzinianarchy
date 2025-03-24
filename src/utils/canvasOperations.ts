
import { supabase } from '@/integrations/supabase/client';
import { PixelData, CANVAS_SIZE } from '@/types/canvas';

// Simple cache with reduced TTL
const pixelCache = new Map<string, PixelData>();
const CACHE_TTL = 10000; // 10 secondi - reduced from 30

// Simplified pixel fetching
export const fetchAllPixels = async () => {
  try {
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .limit(2000);
    
    if (error) {
      console.error('Errore nel caricamento dei pixel:', error);
      return null;
    }
    
    // Update cache
    if (data) {
      const now = Date.now();
      data.forEach((pixel: PixelData) => {
        const key = `${pixel.x}-${pixel.y}`;
        pixelCache.set(key, {
          ...pixel,
          timestamp: now,
        });
      });
    }
    
    return data as PixelData[];
  } catch (e) {
    console.error('Errore imprevisto durante il caricamento dei pixel:', e);
    return null;
  }
};

// Simplified pixel info retrieval
export const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
  try {
    const cacheKey = `${x}-${y}`;
    const cachedPixel = pixelCache.get(cacheKey);
    
    if (cachedPixel && cachedPixel.timestamp && Date.now() - cachedPixel.timestamp < CACHE_TTL) {
      return cachedPixel;
    }
    
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      return null;
    }
    
    if (data) {
      pixelCache.set(cacheKey, {
        ...data,
        timestamp: Date.now(),
      });
      return data as PixelData;
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

// Simplified pixel placement
export const placePixel = async (x: number, y: number, color: string, nickname: string | null) => {
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
    return false;
  }
  
  try {
    const pixelData = {
      x,
      y,
      color,
      placed_by: nickname || null,
      placed_at: new Date().toISOString()
    };
    
    // Update cache immediately for faster UI feedback
    const cacheKey = `${x}-${y}`;
    pixelCache.set(cacheKey, {
      ...pixelData,
      timestamp: Date.now(),
    });
    
    const { error } = await supabase
      .from('pixels')
      .upsert(pixelData, { onConflict: 'x,y' });
      
    if (error) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
};

// Simplified subscription
export const subscribeToPixelUpdates = (onPixelUpdate: (pixel: PixelData) => void) => {
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pixels'
      },
      (payload) => {
        const newPixel = payload.new as PixelData;
        if (newPixel && typeof newPixel.x === 'number' && typeof newPixel.y === 'number' &&
            newPixel.x >= 0 && newPixel.x < CANVAS_SIZE && 
            newPixel.y >= 0 && newPixel.y < CANVAS_SIZE) {
          
          // Update cache
          const cacheKey = `${newPixel.x}-${newPixel.y}`;
          pixelCache.set(cacheKey, {
            ...newPixel,
            timestamp: Date.now(),
          });
          
          // Immediate callback
          onPixelUpdate(newPixel);
        }
      }
    )
    .subscribe();
    
  return channel;
};
