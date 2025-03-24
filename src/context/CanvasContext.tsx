
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define the canvas size and initial pixel size
export const CANVAS_SIZE = 500; // 500x500 pixels
const DEFAULT_PIXEL_SIZE = 3; // Ridotto per supportare una griglia più grande
const DEFAULT_COLOR = '#FFFFFF';

// Define colors for the palette
const COLORS = [
  '#FF4136', // Rosso
  '#FF851B', // Arancione
  '#FFDC00', // Giallo
  '#7FDB6A', // Lime
  '#2ECC40', // Verde
  '#39CCCC', // Teal
  '#0074D9', // Blu
  '#001F3F', // Navy
  '#B10DC9', // Viola
  '#F012BE', // Magenta
];

interface CanvasContextType {
  canvas: string[][];
  selectedColor: string;
  pixelSize: number;
  cooldown: number;
  canPlace: boolean;
  nickname: string;
  setNickname: (name: string) => void;
  setPixel: (x: number, y: number) => void;
  setSelectedColor: (color: string) => void;
  setPixelSize: (size: number) => void;
  resetCooldown: () => void;
  getPixelInfo: (x: number, y: number) => Promise<any>;
}

const defaultCanvas = Array(CANVAS_SIZE)
  .fill(null)
  .map(() => Array(CANVAS_SIZE).fill(DEFAULT_COLOR));

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [canvas, setCanvas] = useState<string[][]>(defaultCanvas);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [pixelSize, setPixelSize] = useState<number>(DEFAULT_PIXEL_SIZE);
  const [cooldown, setCooldown] = useState<number>(0);
  const [canPlace, setCanPlace] = useState<boolean>(true);
  const [nickname, setNickname] = useState<string>('');

  // Carica i pixel dal database all'avvio
  useEffect(() => {
    const fetchPixels = async () => {
      const { data, error } = await supabase
        .from('pixels')
        .select('*');
      
      if (error) {
        console.error('Errore nel caricamento dei pixel:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const newCanvas = [...defaultCanvas];
        data.forEach(pixel => {
          if (pixel.x >= 0 && pixel.x < CANVAS_SIZE && pixel.y >= 0 && pixel.y < CANVAS_SIZE) {
            newCanvas[pixel.y][pixel.x] = pixel.color;
          }
        });
        setCanvas(newCanvas);
      }
    };
    
    fetchPixels();
    
    // Sottoscrizione per aggiornamenti in tempo reale
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
          const { new: newPixel } = payload;
          if (newPixel && newPixel.x >= 0 && newPixel.x < CANVAS_SIZE && newPixel.y >= 0 && newPixel.y < CANVAS_SIZE) {
            setCanvas(prevCanvas => {
              const newCanvas = [...prevCanvas];
              newCanvas[newPixel.y][newPixel.x] = newPixel.color;
              return newCanvas;
            });
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Ottieni informazioni su un pixel specifico
  const getPixelInfo = async (x: number, y: number) => {
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
    
    return data;
  };

  // Start the cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldown === 0 && !canPlace) {
      setCanPlace(true);
    }
  }, [cooldown, canPlace]);

  // Function to place a pixel
  const setPixel = useCallback(async (x: number, y: number) => {
    if (canPlace && x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      // Aggiorna il database
      const { error } = await supabase
        .from('pixels')
        .upsert({
          x,
          y,
          color: selectedColor,
          placed_by: nickname || null,
        });
        
      if (error) {
        console.error('Errore nel posizionamento del pixel:', error);
        return;
      }
      
      // Aggiorna lo stato locale
      setCanvas((prevCanvas) => {
        const newCanvas = prevCanvas.map((row) => [...row]);
        newCanvas[y][x] = selectedColor;
        return newCanvas;
      });
      
      resetCooldown();
    }
  }, [canPlace, selectedColor, nickname]);

  // Reset cooldown after placing a pixel
  const resetCooldown = () => {
    setCooldown(5); // 5 seconds cooldown
    setCanPlace(false);
  };

  return (
    <CanvasContext.Provider
      value={{
        canvas,
        selectedColor,
        pixelSize,
        cooldown,
        canPlace,
        nickname,
        setNickname,
        setPixel,
        setSelectedColor,
        setPixelSize,
        resetCooldown,
        getPixelInfo,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

// Custom hook to use the Canvas context
export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}

// Export colors for use in other components
export { COLORS };
