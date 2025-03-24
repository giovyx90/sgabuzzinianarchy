
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
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

// Crea un canvas vuoto come valore predefinito
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carica i pixel dal database all'avvio in modo ottimizzato
  useEffect(() => {
    const loadInitialPixels = async () => {
      setIsLoading(true);
      
      try {
        const pixels = await fetchAllPixels();
        
        if (pixels && pixels.length > 0) {
          // Utilizziamo un approccio più efficiente per aggiornare il canvas
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
    
    // Sottoscrizione ottimizzata per aggiornamenti in tempo reale
    const channel = subscribeToPixelUpdates((newPixel) => {
      if (typeof newPixel.x === 'number' && typeof newPixel.y === 'number') {
        setCanvas(prevCanvas => {
          const newCanvas = [...prevCanvas];
          newCanvas[newPixel.y][newPixel.x] = newPixel.color;
          return newCanvas;
        });
      }
    });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Gestore delle informazioni sui pixel
  const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
    return await fetchPixelInfo(x, y);
  };

  // Timer per il cooldown
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

  // Funzione ottimizzata per posizionare un pixel
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
        // Aggiorna lo stato locale immediatamente per una risposta più veloce
        setCanvas((prevCanvas) => {
          const newCanvas = prevCanvas.map((row) => [...row]);
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

// Custom hook to use the Canvas context
export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}

// Export constants for use in other components
export { COLORS, CANVAS_SIZE };
