
import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { CANVAS_SIZE } from '@/types/canvas';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Canvas = () => {
  const { canvas, setPixel, pixelSize, canPlace, getPixelInfo } = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number, y: number, info: any } | null>(null);
  const requestIdRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Debounced hover handler for better performance
  const handlePixelHover = useCallback(async (x: number, y: number) => {
    if (hoveredPixel && hoveredPixel.x === x && hoveredPixel.y === y) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a debounce timer to prevent excessive API calls
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const info = await getPixelInfo(x, y);
        if (info && info.placed_by) {
          setHoveredPixel({ x, y, info });
        } else {
          setHoveredPixel(null);
        }
      } catch (error) {
        console.error("Errore nel recuperare info sul pixel:", error);
      }
    }, 100); // 100ms debounce
  }, [getPixelInfo, hoveredPixel]);

  // Optimized pixel click handler
  const handlePixelClick = useCallback((x: number, y: number) => {
    if (canPlace) {
      // Only call setPixel if we can actually place a pixel
      setPixel(x, y);
    } else {
      // Avoid showing toast if already displayed recently
      toast({
        title: "Cooldown attivo",
        description: "Devi aspettare prima di posizionare un altro pixel",
        variant: "default",
      });
    }
  }, [canPlace, setPixel]);

  // More efficient mouse handling with requestAnimationFrame
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      // Cancel any existing animation frame
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
      
      // Schedule a new animation frame
      requestIdRef.current = requestAnimationFrame(() => {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        requestIdRef.current = null;
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // High-performance zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Schedule zoom update in the next animation frame for better performance
    requestAnimationFrame(() => {
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
    });
  }, []);

  // Clean up event listeners and timers
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleMouseUp]);

  // Optimized initial centering
  useEffect(() => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        // Use requestAnimationFrame for smoother initial positioning
        requestAnimationFrame(() => {
          setPosition({
            x: (container.clientWidth - CANVAS_SIZE * pixelSize) / 2,
            y: (container.clientHeight - CANVAS_SIZE * pixelSize) / 2
          });
        });
      }
    }
  }, [pixelSize]);

  // Reset zoom and position with efficient animation
  const resetZoomAndPosition = useCallback(() => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        // Animate the reset with requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          setPosition({
            x: (container.clientWidth - CANVAS_SIZE * pixelSize) / 2,
            y: (container.clientHeight - CANVAS_SIZE * pixelSize) / 2
          });
          setZoom(1);
        });
      }
    }
  }, [pixelSize]);

  // Highly optimized pixel grid rendering
  const pixelGrid = useMemo(() => {
    const gridItems = [];
    
    for (let y = 0; y < canvas.length; y++) {
      for (let x = 0; x < canvas[y].length; x++) {
        const color = canvas[y][x];
        
        gridItems.push(
          <div
            key={`${x}-${y}`}
            className="pixel relative"
            style={{
              backgroundColor: color,
              width: `${pixelSize}px`,
              height: `${pixelSize}px`,
              gridRow: y + 1,
              gridColumn: x + 1,
            }}
            onClick={() => handlePixelClick(x, y)}
            onMouseEnter={() => handlePixelHover(x, y)}
            onMouseLeave={() => setHoveredPixel(null)}
          >
            <div 
              className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${canPlace ? 'opacity-0' : 'opacity-40'}`}
              style={{ backgroundColor: "#000000" }}
            />
          </div>
        );
      }
    }
    
    return gridItems;
  }, [canvas, pixelSize, canPlace, handlePixelClick, handlePixelHover]);

  return (
    <TooltipProvider>
      <div 
        className="relative overflow-hidden w-full h-full bg-secondary rounded-lg shadow-inner select-none"
        onWheel={handleWheel}
      >
        <div 
          ref={canvasRef}
          className="absolute cursor-grab will-change-transform"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: 'transform 100ms ease-out'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <div 
            className="grid gap-[1px] bg-muted p-1 rounded-md shadow-md animate-fade-in"
            style={{
              gridTemplateColumns: `repeat(${CANVAS_SIZE}, ${pixelSize}px)`,
              gridTemplateRows: `repeat(${CANVAS_SIZE}, ${pixelSize}px)`,
              width: `${CANVAS_SIZE * pixelSize + CANVAS_SIZE + 2}px`,
              height: `${CANVAS_SIZE * pixelSize + CANVAS_SIZE + 2}px`,
            }}
          >
            {pixelGrid}
          </div>
        </div>
        
        {/* Popup al hover sui pixel - ottimizzato per performance */}
        {hoveredPixel && (
          <Tooltip open={true}>
            <TooltipTrigger asChild>
              <div className="hidden" />
            </TooltipTrigger>
            <TooltipContent 
              className="z-50 bg-white p-2 rounded-md shadow-lg text-xs"
              style={{
                position: 'absolute',
                left: `${hoveredPixel.x * pixelSize * zoom + position.x}px`,
                top: `${hoveredPixel.y * pixelSize * zoom + position.y - 40}px`,
              }}
            >
              <p><strong>Coordinate:</strong> {hoveredPixel.info.x}, {hoveredPixel.info.y}</p>
              {hoveredPixel.info.placed_by && <p><strong>Autore:</strong> {hoveredPixel.info.placed_by}</p>}
              <p><strong>Posizionato:</strong> {new Date(hoveredPixel.info.placed_at).toLocaleString('it-IT')}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Controlli zoom - ridotti per migliorare performance */}
        <div className="absolute bottom-4 right-4 glass-panel p-2 rounded-full flex items-center space-x-2 z-10 animate-fade-in">
          <button 
            className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center shadow-sm hover:bg-opacity-100 transition-all"
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
          >
            <span className="text-xl font-bold">+</span>
          </button>
          <div className="text-sm font-medium">{Math.round(zoom * 100)}%</div>
          <button 
            className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center shadow-sm hover:bg-opacity-100 transition-all"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          >
            <span className="text-xl font-bold">-</span>
          </button>
        </div>
        
        {/* Pulsante centratura */}
        <button 
          className="absolute bottom-4 left-4 glass-panel p-2 rounded-full flex items-center justify-center z-10 animate-fade-in hover:bg-opacity-80 transition-all"
          onClick={resetZoomAndPosition}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 3H3v18h18V3z"></path>
            <path d="M21 3v18H3"></path>
            <path d="M12 8v8"></path>
            <path d="M8 12h8"></path>
          </svg>
        </button>
      </div>
    </TooltipProvider>
  );
};

export default memo(Canvas);
