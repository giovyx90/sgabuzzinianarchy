
import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define the canvas size and initial pixel size
const CANVAS_SIZE = 50; // 50x50 pixels
const DEFAULT_PIXEL_SIZE = 14;
const DEFAULT_COLOR = '#FFFFFF';

// Define colors for the palette
const COLORS = [
  '#FF4136', // Red
  '#FF851B', // Orange
  '#FFDC00', // Yellow
  '#7FDB6A', // Lime
  '#2ECC40', // Green
  '#39CCCC', // Teal
  '#0074D9', // Blue
  '#001F3F', // Navy
  '#B10DC9', // Purple
  '#F012BE', // Magenta
  '#FF80CC', // Pink
  '#85144b', // Maroon
  '#A52A2A', // Brown
  '#111111', // Black
  '#AAAAAA', // Gray
  '#FFFFFF', // White
];

interface CanvasContextType {
  canvas: string[][];
  selectedColor: string;
  pixelSize: number;
  cooldown: number;
  canPlace: boolean;
  setPixel: (x: number, y: number) => void;
  setSelectedColor: (color: string) => void;
  setPixelSize: (size: number) => void;
  resetCooldown: () => void;
}

const defaultCanvas = Array(CANVAS_SIZE)
  .fill(null)
  .map(() => Array(CANVAS_SIZE).fill(DEFAULT_COLOR));

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [canvas, setCanvas] = useState<string[][]>(defaultCanvas);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[13]); // Default to black
  const [pixelSize, setPixelSize] = useState<number>(DEFAULT_PIXEL_SIZE);
  const [cooldown, setCooldown] = useState<number>(0);
  const [canPlace, setCanPlace] = useState<boolean>(true);

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
  const setPixel = (x: number, y: number) => {
    if (canPlace && x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      setCanvas((prevCanvas) => {
        const newCanvas = prevCanvas.map((row) => [...row]);
        newCanvas[y][x] = selectedColor;
        return newCanvas;
      });
      resetCooldown();
    }
  };

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
        setPixel,
        setSelectedColor,
        setPixelSize,
        resetCooldown,
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
export { COLORS, CANVAS_SIZE };
