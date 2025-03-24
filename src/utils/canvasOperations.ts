
import { supabase } from '@/integrations/supabase/client';
import { PixelData, CANVAS_SIZE } from '@/types/canvas';

// Cache per i pixel per evitare richieste ridondanti
const pixelCache = new Map<string, PixelData>();
const CACHE_TTL = 30000; // 30 secondi

// Funzione ottimizzata per caricare tutti i pixel dal database in batch
export const fetchAllPixels = async () => {
  try {
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .limit(2000); // Limitiamo il numero di pixel per richiesta per prestazioni migliori
    
    if (error) {
      console.error('Errore nel caricamento dei pixel:', error);
      return null;
    }
    
    // Aggiorniamo la cache con i pixel ricevuti
    if (data) {
      data.forEach((pixel: PixelData) => {
        const key = `${pixel.x}-${pixel.y}`;
        pixelCache.set(key, {
          ...pixel,
          timestamp: Date.now(),
        });
      });
    }
    
    return data as PixelData[];
  } catch (e) {
    console.error('Errore imprevisto durante il caricamento dei pixel:', e);
    return null;
  }
};

// Function to get info about a specific pixel
export const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
  try {
    // Verifichiamo se il pixel è in cache e non è scaduto
    const cacheKey = `${x}-${y}`;
    const cachedPixel = pixelCache.get(cacheKey) as (PixelData & { timestamp?: number }) | undefined;
    
    if (cachedPixel && Date.now() - (cachedPixel.timestamp || 0) < CACHE_TTL) {
      return cachedPixel;
    }
    
    // Se non è in cache o è scaduto, lo richiediamo dal database
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 è "no rows returned"
      console.error('Errore nel recupero delle informazioni del pixel:', error);
      return null;
    }
    
    // Aggiorniamo la cache
    if (data) {
      pixelCache.set(cacheKey, {
        ...data,
        timestamp: Date.now(),
      });
    }
    
    return data as PixelData | null;
  } catch (e) {
    console.error('Errore imprevisto durante il recupero del pixel:', e);
    return null;
  }
};

// Ottimizzata funzione per posizionare pixel
export const placePixel = async (x: number, y: number, color: string, nickname: string | null) => {
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('pixels')
      .upsert({
        x,
        y,
        color,
        placed_by: nickname || null,
      });
      
    if (error) {
      console.error('Errore nel posizionamento del pixel:', error);
      return false;
    }
    
    // Aggiorniamo immediatamente la cache locale
    const cacheKey = `${x}-${y}`;
    pixelCache.set(cacheKey, {
      x, y, color, 
      placed_by: nickname || null,
      placed_at: new Date().toISOString(),
      timestamp: Date.now(),
    });
    
    return true;
  } catch (e) {
    console.error('Errore imprevisto durante il posizionamento del pixel:', e);
    return false;
  }
};

// Funzione ottimizzata per abbonarsi agli aggiornamenti in tempo reale
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
          
          // Aggiorniamo la cache con il nuovo pixel
          const cacheKey = `${newPixel.x}-${newPixel.y}`;
          pixelCache.set(cacheKey, {
            ...newPixel,
            timestamp: Date.now(),
          });
          
          onPixelUpdate(newPixel);
        }
      }
    )
    .subscribe();
    
  return channel;
};
