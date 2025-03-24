
import { useRef, useEffect, useState } from 'react';
import { useCanvas, CANVAS_SIZE } from '../context/CanvasContext';

const Canvas = () => {
  const { canvas, setPixel, pixelSize, canPlace } = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle pixel click
  const handlePixelClick = (x: number, y: number) => {
    if (canPlace) {
      setPixel(x, y);
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel event for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  };

  // Add event listeners to document
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div 
      className="relative overflow-hidden w-full h-full bg-secondary rounded-lg shadow-inner"
      onWheel={handleWheel}
    >
      <div 
        ref={canvasRef}
        className="absolute cursor-grab transition-transform duration-100 ease-out"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: 'center',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <div 
          className="grid gap-[1px] bg-muted p-1 rounded-md shadow-md animate-fade-in"
          style={{
            gridTemplateColumns: `repeat(${CANVAS_SIZE}, ${pixelSize}px)`,
            width: `${CANVAS_SIZE * pixelSize + CANVAS_SIZE}px`,
            height: `${CANVAS_SIZE * pixelSize + CANVAS_SIZE}px`,
          }}
        >
          {canvas.map((row, y) =>
            row.map((color, x) => (
              <div
                key={`${x}-${y}`}
                className="pixel relative"
                style={{
                  backgroundColor: color,
                  width: `${pixelSize}px`,
                  height: `${pixelSize}px`,
                }}
                onClick={() => handlePixelClick(x, y)}
              >
                <div 
                  className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${canPlace ? 'opacity-0' : 'opacity-40'}`}
                  style={{ backgroundColor: "#000000" }}
                />
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Zoom controls */}
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
      
      {/* Center button */}
      <button 
        className="absolute bottom-4 left-4 glass-panel p-2 rounded-full flex items-center justify-center z-10 animate-fade-in hover:bg-opacity-80 transition-all"
        onClick={() => {
          setPosition({ x: 0, y: 0 });
          setZoom(1);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 3H3v18h18V3z"></path>
          <path d="M21 3v18H3"></path>
          <path d="M12 8v8"></path>
          <path d="M8 12h8"></path>
        </svg>
      </button>
    </div>
  );
};

export default Canvas;
