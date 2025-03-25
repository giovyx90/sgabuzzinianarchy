
import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { CANVAS_SIZE } from '@/types/canvas';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Move } from 'lucide-react';

const Canvas = () => {
  const { canvas, setPixel, pixelSize, canPlace, getPixelInfo } = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number, y: number, info: any } | null>(null);
  const isMobile = useIsMobile();
  
  // Pixel hover handler
  const handlePixelHover = useCallback(async (x: number, y: number) => {
    if (!canvas[y]?.[x] || canvas[y][x] === '#FFFFFF') return;
    
    try {
      const info = await getPixelInfo(x, y);
      if (info && info.placed_by) {
        setHoveredPixel({ x, y, info });
      }
    } catch (error) {
      console.error("Error getting pixel info:", error);
    }
  }, [getPixelInfo, canvas]);

  // Pixel click handler
  const handlePixelClick = useCallback((x: number, y: number) => {
    if (canPlace) {
      setPixel(x, y);
    }
  }, [canPlace, setPixel]);

  // Mouse handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    }
  }, []);

  // Touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault(); // Prevent default scrolling
      const touch = e.touches[0];
      
      const dx = touch.clientX - lastMousePos.current.x;
      const dy = touch.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, []);

  // Pinch-to-zoom for mobile
  const touchDistance = useRef<number | null>(null);
  
  const handleTouchZoomStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Calculate initial distance between two fingers
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchZoomMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance.current !== null) {
      // Calculate new distance
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate zoom change
      const delta = (newDistance - touchDistance.current) * 0.01;
      touchDistance.current = newDistance;
      
      setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
    }
  }, []);

  const handleTouchZoomEnd = useCallback(() => {
    touchDistance.current = null;
  }, []);

  // Event listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseUp, handleTouchEnd]);

  // Initial centering
  useEffect(() => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        setPosition({
          x: (container.clientWidth - CANVAS_SIZE * pixelSize) / 2,
          y: (container.clientHeight - CANVAS_SIZE * pixelSize) / 2
        });
      }
    }
  }, [pixelSize]);

  // Reset view
  const resetZoomAndPosition = useCallback(() => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        setPosition({
          x: (container.clientWidth - CANVAS_SIZE * pixelSize) / 2,
          y: (container.clientHeight - CANVAS_SIZE * pixelSize) / 2
        });
        setZoom(1);
      }
    }
  }, [pixelSize]);

  // Direct render of pixels
  const renderPixels = () => {
    const pixels = [];
    
    for (let y = 0; y < canvas.length; y++) {
      for (let x = 0; x < canvas[y].length; x++) {
        const color = canvas[y][x];
        
        pixels.push(
          <div
            key={`${x}-${y}`}
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
          />
        );
      }
    }
    
    return pixels;
  };

  return (
    <TooltipProvider>
      <div 
        className="relative overflow-hidden w-full h-full bg-secondary rounded-lg shadow-inner select-none"
        onWheel={handleWheel}
      >
        {/* Mobile drag indicator */}
        {isMobile && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/30 text-white px-3 py-1.5 rounded-full flex items-center space-x-1.5 animate-pulse-subtle pointer-events-none">
            <Move size={14} />
            <span className="text-xs font-medium">Trascina per muoverti</span>
          </div>
        )}
        
        <div 
          ref={canvasRef}
          className="absolute cursor-grab touch-pan-y touch-pan-x"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="grid gap-[1px] bg-muted p-1 rounded-md shadow-md"
            style={{
              gridTemplateColumns: `repeat(${CANVAS_SIZE}, ${pixelSize}px)`,
              gridTemplateRows: `repeat(${CANVAS_SIZE}, ${pixelSize}px)`,
              width: `${CANVAS_SIZE * pixelSize + CANVAS_SIZE + 2}px`,
              height: `${CANVAS_SIZE * pixelSize + CANVAS_SIZE + 2}px`,
            }}
            onTouchStart={handleTouchZoomStart}
            onTouchMove={handleTouchZoomMove}
            onTouchEnd={handleTouchZoomEnd}
          >
            {renderPixels()}
          </div>
        </div>
        
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
              <p><strong>Autore:</strong> {hoveredPixel.info.placed_by}</p>
              <p><strong>Posizionato:</strong> {new Date(hoveredPixel.info.placed_at).toLocaleString('it-IT')}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Controls - adjusted for mobile */}
        <div className={`absolute ${isMobile ? 'bottom-4 right-4' : 'bottom-4 right-4'} bg-white p-2 rounded-full flex items-center space-x-2 z-10`}>
          <button 
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm"
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
          >
            <span className="text-xl font-bold">+</span>
          </button>
          <div className="text-sm font-medium">{Math.round(zoom * 100)}%</div>
          <button 
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          >
            <span className="text-xl font-bold">-</span>
          </button>
        </div>
        
        <button 
          className="absolute bottom-4 left-4 bg-white p-2 rounded-full flex items-center justify-center z-10"
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
