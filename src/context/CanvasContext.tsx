
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { 
  CANVAS_SIZE, DEFAULT_COLOR, DEFAULT_PIXEL_SIZE, COLORS,
  CanvasContextType, PixelData 
} from '@/types/canvas';
import { 
  fetchAllPixels, getPixelInfo as fetchPixelInfo, 
  placePixel, subscribeToPixelUpdates 
} from '@/utils/canvasOperations';

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
    const loadInitialPixels = async () => {
      const pixels = await fetchAllPixels();
      
      if (pixels && pixels.length > 0) {
        const newCanvas = [...defaultCanvas];
        pixels.forEach((pixel: PixelData) => {
          if (pixel.x >= 0 && pixel.x < CANVAS_SIZE && pixel.y >= 0 && pixel.y < CANVAS_SIZE) {
            newCanvas[pixel.y][pixel.x] = pixel.color;
          }
        });
        setCanvas(newCanvas);
      }
    };
    
    loadInitialPixels();
    
    // Sottoscrizione per aggiornamenti in tempo reale
    const channel = subscribeToPixelUpdates((newPixel) => {
      setCanvas(prevCanvas => {
        const newCanvas = [...prevCanvas];
        newCanvas[newPixel.y][newPixel.x] = newPixel.color;
        return newCanvas;
      });
    });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Gestore delle informazioni sui pixel
  const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
    return await fetchPixelInfo(x, y);
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
    if (canPlace) {
      const success = await placePixel(x, y, selectedColor, nickname || null);
      
      if (success) {
        // Aggiorna lo stato locale
        setCanvas((prevCanvas) => {
          const newCanvas = prevCanvas.map((row) => [...row]);
          newCanvas[y][x] = selectedColor;
          return newCanvas;
        });
        
        resetCooldown();
      }
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

// Fix missing import
import { supabase } from '@/integrations/supabase/client';

// Export constants for use in other components
export { COLORS, CANVAS_SIZE };
