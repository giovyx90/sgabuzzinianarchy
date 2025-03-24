
import { useState, useEffect } from 'react';
import AboutModal from './AboutModal';
import Leaderboard from './Leaderboard';

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
          <img 
            src="/lovable-uploads/73734ad6-5d27-4a83-be6f-2ee40ef7b519.png" 
            alt="SgabuzziniAnarchy Logo" 
            className="h-8 mr-2" 
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium bg-white bg-opacity-50 px-3 py-1 rounded-full shadow-sm hidden md:block">
            Tela Collaborativa
          </span>
          
          <Leaderboard />
          <AboutModal />
        </div>
      </div>
    </header>
  );
};

export default Header;
