
import { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Create a more efficient empty canvas function
const createEmptyCanvas = () => {
  const canvas = new Array(CANVAS_SIZE);
  for (let i = 0; i < CANVAS_SIZE; i++) {
    canvas[i] = new Array(CANVAS_SIZE).fill(DEFAULT_COLOR);
  }
  return canvas;
};

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const defaultCanvas = useMemo(() => createEmptyCanvas(), []);
  const [canvas, setCanvas] = useState<string[][]>(defaultCanvas);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [pixelSize, setPixelSize] = useState<number>(DEFAULT_PIXEL_SIZE);
  const [cooldown, setCooldown] = useState<number>(0);
  const [canPlace, setCanPlace] = useState<boolean>(true);
  const [nickname, setNickname] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Use refs for better performance with animation frames
  const lastUpdateTime = useRef<number>(Date.now());
  const updateQueue = useRef<PixelData[]>([]);
  const updateTimerId = useRef<number | null>(null);
  const isUpdatingCanvas = useRef<boolean>(false);

  // Optimized batch processing of pixel updates
  const processUpdateQueue = useCallback(() => {
    if (updateQueue.current.length === 0) {
      updateTimerId.current = null;
      isUpdatingCanvas.current = false;
      return;
    }
    
    isUpdatingCanvas.current = true;
    
    setCanvas(prevCanvas => {
      // Create a new canvas only if we need to update it
      const newCanvas = [...prevCanvas];
      let updated = false;
      
      updateQueue.current.forEach(pixel => {
        if (pixel.x >= 0 && pixel.x < CANVAS_SIZE && 
            pixel.y >= 0 && pixel.y < CANVAS_SIZE) {
          // Only create new row array if we're actually modifying it
          if (newCanvas[pixel.y][pixel.x] !== pixel.color) {
            if (!updated) {
              // Create a new copy of the canvas for immutability
              for (let i = 0; i < newCanvas.length; i++) {
                newCanvas[i] = [...newCanvas[i]];
              }
              updated = true;
            }
            newCanvas[pixel.y][pixel.x] = pixel.color;
          }
        }
      });
      
      updateQueue.current = [];
      return updated ? newCanvas : prevCanvas; // Only return new canvas if we made changes
    });
    
    updateTimerId.current = null;
    isUpdatingCanvas.current = false;
  }, []);

  // More efficient queueing mechanism
  const queuePixelUpdate = useCallback((pixel: PixelData) => {
    updateQueue.current.push(pixel);
    
    if (!updateTimerId.current && !isUpdatingCanvas.current) {
      updateTimerId.current = window.requestAnimationFrame(processUpdateQueue);
    }
  }, [processUpdateQueue]);

  // Optimized initial loading and subscription
  useEffect(() => {
    let isMounted = true;
    const loadInitialPixels = async () => {
      setIsLoading(true);
      
      try {
        const pixels = await fetchAllPixels();
        
        if (pixels && pixels.length > 0 && isMounted) {
          // Batch update all pixels at once
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
        if (isMounted) {
          toast({
            title: "Errore di caricamento",
            description: "Non è stato possibile caricare i pixel. Riprova più tardi.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialPixels();
    
    const channel = subscribeToPixelUpdates((newPixel) => {
      if (isMounted && typeof newPixel.x === 'number' && typeof newPixel.y === 'number') {
        queuePixelUpdate(newPixel);
      }
    });
      
    return () => {
      isMounted = false;
      if (updateTimerId.current) {
        cancelAnimationFrame(updateTimerId.current);
        updateTimerId.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queuePixelUpdate]);

  // Optimized pixel info retrieval with local cache check first
  const getPixelInfo = useCallback(async (x: number, y: number): Promise<PixelData | null> => {
    // Check if we already have this pixel in our canvas first
    const colorInCanvas = canvas[y]?.[x];
    if (!colorInCanvas || colorInCanvas === DEFAULT_COLOR) {
      return null; // No pixel data needed if it's the default color
    }
    
    return await fetchPixelInfo(x, y);
  }, [canvas]);

  // Define resetCooldown before it's used in setPixel
  const resetCooldown = useCallback(() => {
    setCooldown(5);
    setCanPlace(false);
  }, []);

  // Optimized pixel placement with immediate UI feedback
  const setPixel = useCallback(async (x: number, y: number) => {
    if (!canPlace) {
      toast({
        title: "Cooldown attivo",
        description: "Devi aspettare prima di posizionare un altro pixel",
        variant: "default",
      });
      return;
    }
    
    // Immediate UI update for better responsiveness
    setCanvas((prevCanvas) => {
      const newCanvas = [...prevCanvas];
      newCanvas[y] = [...newCanvas[y]];
      newCanvas[y][x] = selectedColor;
      return newCanvas;
    });
    
    // Start cooldown immediately
    resetCooldown();
    
    // Send to server in background
    try {
      await placePixel(x, y, selectedColor, nickname || null);
    } catch (error) {
      console.error("Errore nel posizionare il pixel:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile posizionare il pixel. Riprova più tardi.",
        variant: "destructive",
      });
      
      // Revert UI if server operation failed
      setCanvas((prevCanvas) => {
        const newCanvas = [...prevCanvas];
        newCanvas[y] = [...newCanvas[y]];
        // Reset to original color or default if we don't know it
        newCanvas[y][x] = DEFAULT_COLOR;
        return newCanvas;
      });
    }
  }, [canPlace, selectedColor, nickname, resetCooldown]);

  // Cooldown effect with efficient timer
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

  // Memoized context value to prevent unnecessary re-renders
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
            <p className="text-sm text-gray-500">Stiamo caricando i pixel...</p>
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
