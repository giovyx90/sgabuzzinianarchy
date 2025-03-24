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

const createEmptyCanvas = () => Array(CANVAS_SIZE)
  .fill(null)
  .map(() => Array(CANVAS_SIZE).fill(DEFAULT_COLOR));

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
  
  const lastUpdateTime = useRef<number>(Date.now());
  const updateQueue = useRef<PixelData[]>([]);
  const updateTimerId = useRef<number | null>(null);

  const processUpdateQueue = useCallback(() => {
    if (updateQueue.current.length === 0) {
      updateTimerId.current = null;
      return;
    }
    
    setCanvas(prevCanvas => {
      const newCanvas = prevCanvas.map(row => [...row]);
      
      updateQueue.current.forEach(pixel => {
        if (pixel.x >= 0 && pixel.x < CANVAS_SIZE && 
            pixel.y >= 0 && pixel.y < CANVAS_SIZE) {
          newCanvas[pixel.y][pixel.x] = pixel.color;
        }
      });
      
      updateQueue.current = [];
      return newCanvas;
    });
    
    updateTimerId.current = null;
  }, []);

  const queuePixelUpdate = useCallback((pixel: PixelData) => {
    updateQueue.current.push(pixel);
    
    if (!updateTimerId.current) {
      updateTimerId.current = window.setTimeout(processUpdateQueue, 50);
    }
  }, [processUpdateQueue]);

  useEffect(() => {
    const loadInitialPixels = async () => {
      setIsLoading(true);
      
      try {
        const pixels = await fetchAllPixels();
        
        if (pixels && pixels.length > 0) {
          setCanvas(prevCanvas => {
            const newCanvas = prevCanvas.map(row => [...row]);
            
            pixels.forEach((pixel: PixelData) => {
              if (pixel.x >= 0 && pixel.x < CANVAS_SIZE && 
                  pixel.y >= 0 && pixel.y < CANVAS_SIZE) {
                newCanvas[pixel.y][pixel.x] = pixel.color;
              }
            });
            
            return newCanvas;
          });
        }
      } catch (error) {
        console.error("Errore durante il caricamento iniziale dei pixel:", error);
        toast({
          title: "Errore di caricamento",
          description: "Non è stato possibile caricare i pixel. Riprova più tardi.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialPixels();
    
    const channel = subscribeToPixelUpdates((newPixel) => {
      if (typeof newPixel.x === 'number' && typeof newPixel.y === 'number') {
        queuePixelUpdate(newPixel);
      }
    });
      
    return () => {
      if (updateTimerId.current) {
        clearTimeout(updateTimerId.current);
      }
      supabase.removeChannel(channel);
    };
  }, [queuePixelUpdate]);

  const getPixelInfo = useCallback(async (x: number, y: number): Promise<PixelData | null> => {
    return await fetchPixelInfo(x, y);
  }, []);

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

  const setPixel = useCallback(async (x: number, y: number) => {
    if (!canPlace) {
      toast({
        title: "Cooldown attivo",
        description: "Devi aspettare prima di posizionare un altro pixel",
        variant: "default",
      });
      return;
    }
    
    try {
      const success = await placePixel(x, y, selectedColor, nickname || null);
      
      if (success) {
        setCanvas((prevCanvas) => {
          const newCanvas = [...prevCanvas];
          newCanvas[y] = [...newCanvas[y]];
          newCanvas[y][x] = selectedColor;
          return newCanvas;
        });
        
        resetCooldown();
      }
    } catch (error) {
      console.error("Errore nel posizionare il pixel:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile posizionare il pixel. Riprova più tardi.",
        variant: "destructive",
      });
    }
  }, [canPlace, selectedColor, nickname]);

  const resetCooldown = useCallback(() => {
    setCooldown(5);
    setCanPlace(false);
  }, []);

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
