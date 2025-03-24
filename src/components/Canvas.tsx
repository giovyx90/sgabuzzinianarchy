
import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { CANVAS_SIZE } from '@/types/canvas';
import { toast } from '@/components/ui/use-toast';

const Canvas = () => {
  const { canvas, setPixel, pixelSize, canPlace, getPixelInfo } = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [pixelInfo, setPixelInfo] = useState<any>(null);
  const [infoPosition, setInfoPosition] = useState({ x: 0, y: 0 });
  const renderCount = useRef(0);

  // Incrementiamo il contatore di rendering per debug
  useEffect(() => {
    renderCount.current += 1;
    console.log(`Canvas renderizzato: ${renderCount.current} volte`);
  });

  // Ottimizziamo la funzione di click sui pixel
  const handlePixelClick = useCallback(async (x: number, y: number) => {
    if (canPlace) {
      setPixel(x, y);
    } else {
      toast({
        title: "Cooldown attivo",
        description: "Devi aspettare prima di posizionare un altro pixel",
        variant: "default",
      });
    }
    
    // Ottieni informazioni sul pixel
    try {
      const info = await getPixelInfo(x, y);
      if (info) {
        setPixelInfo(info);
        setInfoPosition({ x, y });
        
        // Nascondi le informazioni dopo 3 secondi
        setTimeout(() => setPixelInfo(null), 3000);
      }
    } catch (error) {
      console.error("Errore nel recuperare info sul pixel:", error);
    }
  }, [canPlace, setPixel, getPixelInfo]);

  // Ottimizziamo i gestori del mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      lastMousePos.current = { x: e.clientX, y: e.clientY };
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

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Ottimizziamo lo zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, []);

  // Aggiungiamo event listeners solo quando necessario
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  // Memoizziamo la griglia dei pixel per evitare rendering inutili
  const renderPixelGrid = useCallback(() => {
    return canvas.map((row, y) =>
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
    );
  }, [canvas, pixelSize, canPlace, handlePixelClick]);

  // Centratura iniziale
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

  // Funzione per riscalare l'effetto zoom
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
          {renderPixelGrid()}
        </div>
      </div>
      
      {/* Informazioni sul pixel */}
      {pixelInfo && (
        <div 
          className="absolute z-20 bg-white p-2 rounded-md shadow-lg text-xs"
          style={{
            left: `${infoPosition.x * pixelSize * zoom + position.x}px`,
            top: `${infoPosition.y * pixelSize * zoom + position.y - 40}px`,
          }}
        >
          <p><strong>Coordinate:</strong> {pixelInfo.x}, {pixelInfo.y}</p>
          {pixelInfo.placed_by && <p><strong>Autore:</strong> {pixelInfo.placed_by}</p>}
          <p><strong>Posizionato:</strong> {new Date(pixelInfo.placed_at).toLocaleString('it-IT')}</p>
        </div>
      )}
      
      {/* Controlli zoom */}
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
  );
};

export default memo(Canvas);
