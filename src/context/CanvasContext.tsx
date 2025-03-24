
import { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { 
  CANVAS_SIZE, DEFAULT_COLOR, DEFAULT_PIXEL_SIZE, COLORS,
  CanvasContextType, PixelData 
} from '@/types/canvas';
import { 
  fetchAllPixels, getPixelInfo as fetchPixelInfo, 
  placePixel, subscribeToPixelUpdates 
} from '@/utils/canvasOperations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Simplified empty canvas function
const createEmptyCanvas = () => {
  const canvas = new Array(CANVAS_SIZE);
  for (let i = 0; i < CANVAS_SIZE; i++) {
    canvas[i] = new Array(CANVAS_SIZE).fill(DEFAULT_COLOR);
  }
  return canvas;
};

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [canvas, setCanvas] = useState<string[][]>(createEmptyCanvas());
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [pixelSize, setPixelSize] = useState<number>(DEFAULT_PIXEL_SIZE);
  const [cooldown, setCooldown] = useState<number>(0);
  const [canPlace, setCanPlace] = useState<boolean>(true);
  const [nickname, setNickname] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Define resetCooldown before it's used
  const resetCooldown = useCallback(() => {
    setCooldown(5);
    setCanPlace(false);
  }, []);

  // Simplified pixel info retrieval
  const getPixelInfo = useCallback(async (x: number, y: number): Promise<PixelData | null> => {
    const colorInCanvas = canvas[y]?.[x];
    if (!colorInCanvas || colorInCanvas === DEFAULT_COLOR) {
      return null;
    }
    
    return await fetchPixelInfo(x, y);
  }, [canvas]);

  // Simplified initial loading
  useEffect(() => {
    let isMounted = true;
    
    const loadPixels = async () => {
      setIsLoading(true);
      
      try {
        const pixels = await fetchAllPixels();
        
        if (pixels && pixels.length > 0 && isMounted) {
          const newCanvas = createEmptyCanvas();
          
          pixels.forEach((pixel: PixelData) => {
            if (pixel.x >= 0 && pixel.x < CANVAS_SIZE && 
                pixel.y >= 0 && pixel.y < CANVAS_SIZE) {
              newCanvas[pixel.y][pixel.x] = pixel.color;
            }
          });
          
          setCanvas(newCanvas);
        }
      } catch (error) {
        console.error("Errore durante il caricamento iniziale dei pixel:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadPixels();
    
    // Subscribe to updates
    const channel = subscribeToPixelUpdates((newPixel) => {
      if (isMounted && typeof newPixel.x === 'number' && typeof newPixel.y === 'number') {
        // Direct update for simplicity and speed
        setCanvas(prev => {
          const newCanvas = [...prev];
          newCanvas[newPixel.y] = [...newCanvas[newPixel.y]];
          newCanvas[newPixel.y][newPixel.x] = newPixel.color;
          return newCanvas;
        });
      }
    });
      
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Simplified pixel placement
  const setPixel = useCallback(async (x: number, y: number) => {
    if (!canPlace) {
      toast({
        title: "Cooldown attivo",
        description: "Devi aspettare prima di posizionare un altro pixel",
        variant: "default",
      });
      return;
    }
    
    // Immediate UI update
    setCanvas((prevCanvas) => {
      const newCanvas = [...prevCanvas];
      newCanvas[y] = [...newCanvas[y]];
      newCanvas[y][x] = selectedColor;
      return newCanvas;
    });
    
    // Start cooldown
    resetCooldown();
    
    // Send to server in background
    try {
      await placePixel(x, y, selectedColor, nickname || null);
    } catch (error) {
      console.error("Errore nel posizionare il pixel:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile posizionare il pixel.",
        variant: "destructive",
      });
    }
  }, [canPlace, selectedColor, nickname, resetCooldown]);

  // Cooldown effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldown === 0 && !canPlace) {
      setCanPlace(true);
    }
  }, [cooldown, canPlace]);

  // Context value
  const contextValue = useMemo(() => ({
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
  }), [
    canvas, 
    selectedColor, 
    pixelSize, 
    cooldown, 
    canPlace, 
    nickname, 
    setPixel, 
    setSelectedColor,
    setPixelSize,
    resetCooldown,
    getPixelInfo
  ]);

  return (
    <CanvasContext.Provider value={contextValue}>
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium">Caricamento in corso...</p>
          </div>
        </div>
      ) : children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}

export { COLORS, CANVAS_SIZE };
