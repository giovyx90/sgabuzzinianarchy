
import { COLORS, useCanvas } from '../context/CanvasContext';
import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ColorPalette = () => {
  const { selectedColor, setSelectedColor, cooldown, canPlace, nickname, setNickname } = useCanvas();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [inputNickname, setInputNickname] = useState('');

  // Check if mobile and set the initial state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsExpanded(false);
    }
  }, [isMobile]);

  // Carica il nickname salvato
  useEffect(() => {
    const savedNickname = localStorage.getItem('sgabuzziniAnarchyNickname');
    if (savedNickname) {
      setInputNickname(savedNickname);
      setNickname(savedNickname);
    }
  }, [setNickname]);

  // Gestisci il salvataggio del nickname
  const handleNicknameSave = () => {
    setNickname(inputNickname);
    localStorage.setItem('sgabuzziniAnarchyNickname', inputNickname);
  };

  return (
    <div 
      className={`glass-panel fixed z-20 transition-all duration-300 ease-in-out shadow-lg rounded-xl 
                  ${isMobile ? 
                    (isExpanded ? 'bottom-4 left-1/2 -translate-x-1/2' : 'bottom-4 left-1/2 -translate-x-1/2 translate-y-[calc(100%-3rem)]') :
                    (isExpanded ? 'left-4 top-1/2 -translate-y-1/2' : 'left-0 top-1/2 -translate-y-1/2 translate-x-[calc(-100%+2rem)]')
                  }`}
    >
      {/* Toggle button */}
      <button 
        className={`absolute ${isMobile ? 'top-2 left-1/2 -translate-x-1/2' : 'top-1/2 right-2 -translate-y-1/2'} bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm transition-all hover:bg-opacity-90`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isMobile ? (isExpanded ? 'rotate-180' : 'rotate-0') : (isExpanded ? 'rotate-0' : 'rotate-180')}`}
        >
          <polyline points={isMobile ? "18 15 12 9 6 15" : "15 18 9 12 15 6"}></polyline>
        </svg>
      </button>

      <div className="p-4">
        <h2 className="text-md font-medium text-center mb-3">Tavolozza Colori</h2>
        
        <div className={`grid ${isMobile ? 'grid-cols-5' : 'grid-cols-5'} gap-2 mb-4`}>
          {COLORS.map((color) => (
            <button
              key={color}
              className={`palette-color w-8 h-8 rounded-md transition-all duration-200 ${selectedColor === color ? 'active ring-2 ring-primary' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              aria-label={`Seleziona colore ${color}`}
            />
          ))}
        </div>
        
        {/* Nickname input */}
        <div className="mb-4">
          <Label htmlFor="nickname" className="text-sm font-medium mb-1">Il tuo nickname (opzionale)</Label>
          <div className="flex space-x-2">
            <Input 
              id="nickname" 
              value={inputNickname} 
              onChange={(e) => setInputNickname(e.target.value)} 
              placeholder="Inserisci nickname"
              className="text-sm"
            />
            <button 
              onClick={handleNicknameSave}
              className="bg-primary text-white px-2 py-1 rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              Salva
            </button>
          </div>
        </div>
        
        {/* Cooldown timer */}
        <div className="flex flex-col items-center">
          <div className="text-sm font-medium text-center mb-1">
            {canPlace ? 'Pronto per posizionare' : `Cooldown: ${cooldown}s`}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${canPlace ? 'bg-green-500' : 'bg-orange-500 animate-pulse-subtle'}`}
              style={{ width: canPlace ? '100%' : `${(cooldown / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPalette;
