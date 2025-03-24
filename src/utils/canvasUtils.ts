
// Canvas utility functions

// Get a random color in hex format
export const getRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Get a color name from a hex value (approximate)
export const getColorName = (hex: string): string => {
  const colors: Record<string, string> = {
    '#FF4136': 'Red',
    '#FF851B': 'Orange',
    '#FFDC00': 'Yellow',
    '#7FDB6A': 'Lime',
    '#2ECC40': 'Green',
    '#39CCCC': 'Teal',
    '#0074D9': 'Blue',
    '#001F3F': 'Navy',
    '#B10DC9': 'Purple',
    '#F012BE': 'Magenta',
    '#FF80CC': 'Pink',
    '#85144b': 'Maroon',
    '#A52A2A': 'Brown',
    '#111111': 'Black',
    '#AAAAAA': 'Gray',
    '#FFFFFF': 'White',
  };
  
  return colors[hex] || 'Custom';
};

// Export a canvas to an image
export const exportCanvasToImage = (canvas: string[][], pixelSize: number): string => {
  // Create a canvas element
  const canvasElement = document.createElement('canvas');
  const ctx = canvasElement.getContext('2d');
  
  if (!ctx) return '';
  
  // Set canvas dimensions
  const width = canvas[0].length;
  const height = canvas.length;
  canvasElement.width = width * pixelSize;
  canvasElement.height = height * pixelSize;
  
  // Draw each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = canvas[y][x];
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
  
  // Return as data URL
  return canvasElement.toDataURL('image/png');
};

// Import a canvas from a JSON string
export const importCanvasFromJSON = (jsonString: string): string[][] | null => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse canvas JSON:', error);
    return null;
  }
};

// Clear the canvas to a specific color
export const clearCanvas = (canvas: string[][], color: string = '#FFFFFF'): string[][] => {
  return canvas.map(row => row.map(() => color));
};
