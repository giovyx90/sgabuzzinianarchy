
import { useState, useEffect } from 'react';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Update header style on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-10 transition-all duration-300 ${isScrolled ? 'glass-panel py-2 shadow-md' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md mr-3 shadow-md"></div>
          <h1 className="text-xl font-medium tracking-tight">r/place clone</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium bg-white bg-opacity-50 px-3 py-1 rounded-full shadow-sm hidden md:block">
            Collaborative Canvas
          </span>
          
          <button className="glass-panel px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-opacity-80">
            About
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
