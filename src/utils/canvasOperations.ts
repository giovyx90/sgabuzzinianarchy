
import { supabase } from '@/integrations/supabase/client';
import { PixelData, CANVAS_SIZE } from '@/types/canvas';

// Improved cache with debounced cache cleanup
const pixelCache = new Map<string, PixelData>();
const CACHE_TTL = 30000; // 30 secondi

// More efficient pixel fetching with batching
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
    
    // Update cache more efficiently
    if (data) {
      const now = Date.now();
      data.forEach((pixel: PixelData) => {
        const key = `${pixel.x}-${pixel.y}`;
        pixelCache.set(key, {
          ...pixel,
          timestamp: now, // Use the same timestamp for batch updates
        });
      });
    }
    
    return data as PixelData[];
  } catch (e) {
    console.error('Errore imprevisto durante il caricamento dei pixel:', e);
    return null;
  }
};

// Optimized pixel info retrieval
export const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
  try {
    // Check cache first with early return
    const cacheKey = `${x}-${y}`;
    const cachedPixel = pixelCache.get(cacheKey);
    
    if (cachedPixel && cachedPixel.timestamp && Date.now() - cachedPixel.timestamp < CACHE_TTL) {
      return cachedPixel;
    }
    
    // If not in cache or expired, fetch from database
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Errore nel recupero delle informazioni del pixel:', error);
      return null;
    }
    
    // Update cache
    if (data) {
      pixelCache.set(cacheKey, {
        ...data,
        timestamp: Date.now(),
      });
      return data as PixelData;
    }
    
    return null;
  } catch (e) {
    console.error('Errore imprevisto durante il recupero del pixel:', e);
    return null;
  }
};

// Optimized pixel placement with local cache update
export const placePixel = async (x: number, y: number, color: string, nickname: string | null) => {
  // Early validation to reduce unnecessary processing
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
    return false;
  }
  
  try {
    // Create the pixel data object
    const pixelData = {
      x,
      y,
      color,
      placed_by: nickname || null,
      placed_at: new Date().toISOString()
    };
    
    // Update local cache immediately for faster UI feedback
    const cacheKey = `${x}-${y}`;
    pixelCache.set(cacheKey, {
      ...pixelData,
      timestamp: Date.now(),
    });
    
    // Optimize database operation
    const { error } = await supabase
      .from('pixels')
      .upsert(pixelData, { onConflict: 'x,y' });
      
    if (error) {
      console.error('Errore nel posizionamento del pixel:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Errore imprevisto durante il posizionamento del pixel:', e);
    return false;
  }
};

// More efficient subscription management with prioritized user updates
export const subscribeToPixelUpdates = (onPixelUpdate: (pixel: PixelData) => void) => {
  // Use a queue to batch pixel updates for better performance
  let updateQueue: PixelData[] = [];
  let processingQueue = false;

  // Process updates in batches with higher priority for recent updates
  const processUpdateQueue = () => {
    if (updateQueue.length === 0) {
      processingQueue = false;
      return;
    }

    processingQueue = true;
    // Process current queue
    const currentQueue = [...updateQueue];
    updateQueue = [];
    
    // Update cache and trigger callbacks
    currentQueue.forEach(newPixel => {
      const cacheKey = `${newPixel.x}-${newPixel.y}`;
      pixelCache.set(cacheKey, {
        ...newPixel,
        timestamp: Date.now(),
      });
      
      // Immediately call the update callback for better responsiveness
      onPixelUpdate(newPixel);
    });
    
    // Check if there are new items in the queue
    if (updateQueue.length > 0) {
      requestAnimationFrame(processUpdateQueue);
    } else {
      processingQueue = false;
    }
  };

  // Subscribe to changes with optimized processing
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
          
          // Add to queue instead of directly updating
          updateQueue.push(newPixel);
          
          // Start processing immediately for better responsiveness
          if (!processingQueue) {
            requestAnimationFrame(processUpdateQueue);
          }
        }
      }
    )
    .subscribe();
    
  return channel;
};
