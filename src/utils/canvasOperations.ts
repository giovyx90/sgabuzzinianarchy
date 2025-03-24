
import { supabase } from '@/integrations/supabase/client';
import { PixelData, CANVAS_SIZE } from '@/types/canvas';

// Function to fetch all pixels from database
export const fetchAllPixels = async () => {
  const { data, error } = await supabase
    .from('pixels')
    .select('*');
  
  if (error) {
    console.error('Errore nel caricamento dei pixel:', error);
    return null;
  }
  
  return data as PixelData[];
};

// Function to get info about a specific pixel
export const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
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
  
  return data as PixelData | null;
};

// Function to place a pixel
export const placePixel = async (x: number, y: number, color: string, nickname: string | null) => {
  if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
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
    
    return true;
  }
  
  return false;
};

// Function to subscribe to real-time pixel updates
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
        if (newPixel && newPixel.x >= 0 && newPixel.x < CANVAS_SIZE && 
            newPixel.y >= 0 && newPixel.y < CANVAS_SIZE) {
          onPixelUpdate(newPixel);
        }
      }
    )
    .subscribe();
    
  return channel;
};
