
import { CanvasProvider } from '../context/CanvasContext';
import Canvas from '../components/Canvas';
import ColorPalette from '../components/ColorPalette';
import Header from '../components/Header';

const Index = () => {
  return (
    <CanvasProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
        <Header />
        
        <main className="flex-1 pt-20 pb-6 px-4 flex flex-col">
          {/* Title section */}
          <div className="text-center mb-6 animate-fade-in">
            <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Collaborative Canvas</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Place a pixel. Create together.</h1>
            <p className="mt-2 text-gray-500 max-w-2xl mx-auto">
              Select a color, place pixels on the canvas, and watch the collaborative artwork grow.
              Each pixel placement has a 5-second cooldown.
            </p>
          </div>
          
          {/* Canvas container */}
          <div className="flex-1 max-w-5xl mx-auto w-full relative animate-scale-in">
            <div className="aspect-square w-full h-full rounded-xl overflow-hidden shadow-lg">
              <Canvas />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="mt-6 text-center max-w-2xl mx-auto text-sm text-gray-600 animate-fade-in">
            <p>
              <strong>Instructions:</strong> Drag to pan the canvas • Scroll to zoom • Click to place a pixel
            </p>
          </div>
        </main>
        
        <ColorPalette />
      </div>
    </CanvasProvider>
  );
};

export default Index;
