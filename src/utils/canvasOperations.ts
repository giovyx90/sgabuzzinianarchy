
import { PixelData, CANVAS_SIZE } from '@/types/canvas';

// Cache con TTL ridotto
const pixelCache = new Map<string, PixelData>();
const CACHE_TTL = 5000; // 5 secondi

// Chiave per localStorage
const CANVAS_STORAGE_KEY = 'pixel-canvas-data';

// Carica i pixel dal localStorage
export const fetchAllPixels = async () => {
  try {
    // Recupera i dati da localStorage
    const storedData = localStorage.getItem(CANVAS_STORAGE_KEY);
    let pixelData: PixelData[] = [];
    
    if (storedData) {
      pixelData = JSON.parse(storedData);
    }
    
    // Aggiorna la cache
    const now = Date.now();
    pixelData.forEach((pixel: PixelData) => {
      const key = `${pixel.x}-${pixel.y}`;
      pixelCache.set(key, {
        ...pixel,
        timestamp: now,
      });
    });
    
    return pixelData;
  } catch (e) {
    console.error('Errore nel caricamento dei pixel:', e);
    return [];
  }
};

// Ottieni info di un pixel
export const getPixelInfo = async (x: number, y: number): Promise<PixelData | null> => {
  try {
    const cacheKey = `${x}-${y}`;
    const cachedPixel = pixelCache.get(cacheKey);
    
    if (cachedPixel && cachedPixel.timestamp && Date.now() - cachedPixel.timestamp < CACHE_TTL) {
      return cachedPixel;
    }
    
    // Cerca nei dati salvati localmente
    const storedData = localStorage.getItem(CANVAS_STORAGE_KEY);
    let pixelData: PixelData[] = [];
    
    if (storedData) {
      pixelData = JSON.parse(storedData);
      const pixel = pixelData.find(p => p.x === x && p.y === y);
      
      if (pixel) {
        pixelCache.set(cacheKey, {
          ...pixel,
          timestamp: Date.now(),
        });
        return pixel;
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

// Posiziona un pixel
export const placePixel = async (x: number, y: number, color: string, nickname: string | null) => {
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
    return false;
  }
  
  try {
    const pixelData = {
      x,
      y,
      color,
      placed_by: nickname || 'Anonimo',
      placed_at: new Date().toISOString()
    };
    
    // Aggiorna la cache
    const cacheKey = `${x}-${y}`;
    pixelCache.set(cacheKey, {
      ...pixelData,
      timestamp: Date.now(),
    });
    
    // Carica i dati esistenti
    const storedData = localStorage.getItem(CANVAS_STORAGE_KEY);
    let existingPixels: PixelData[] = [];
    
    if (storedData) {
      existingPixels = JSON.parse(storedData);
      // Rimuovi il pixel esistente nella stessa posizione (se presente)
      existingPixels = existingPixels.filter(p => !(p.x === x && p.y === y));
    }
    
    // Aggiungi il nuovo pixel
    existingPixels.push(pixelData);
    
    // Salva nel localStorage
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(existingPixels));
    
    // Notifica gli ascoltatori
    if (pixelUpdateListeners.length > 0) {
      pixelUpdateListeners.forEach(listener => listener(pixelData));
    }
    
    return true;
  } catch (e) {
    return false;
  }
};

// Lista di ascoltatori per gli aggiornamenti dei pixel
const pixelUpdateListeners: ((pixel: PixelData) => void)[] = [];

// Sottoscrizione agli aggiornamenti dei pixel
export const subscribeToPixelUpdates = (onPixelUpdate: (pixel: PixelData) => void) => {
  pixelUpdateListeners.push(onPixelUpdate);
  
  // Restituisci una funzione per annullare la sottoscrizione
  return {
    unsubscribe: () => {
      const index = pixelUpdateListeners.indexOf(onPixelUpdate);
      if (index !== -1) {
        pixelUpdateListeners.splice(index, 1);
      }
    }
  };
};
