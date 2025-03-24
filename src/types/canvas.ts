
// Define the canvas size and initial pixel size
export const CANVAS_SIZE = 200; // 200x200 pixels
export const DEFAULT_PIXEL_SIZE = 3;
export const DEFAULT_COLOR = '#FFFFFF';

// Define a type for pixel data
export interface PixelData {
  x: number;
  y: number;
  color: string;
  placed_by?: string | null;
  placed_at?: string | null;
  timestamp?: number; // Added timestamp for cache management
}

// Define the context type
export interface CanvasContextType {
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
  getPixelInfo: (x: number, y: number) => Promise<PixelData | null>;
}

// Define colors for the palette
export const COLORS = [
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
  '#FFFFFF', // Bianco
];
