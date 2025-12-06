const Footer = () => {
  return (
    <footer className="glass-panel backdrop-blur-md border-t border-white/5 py-4 px-6 mt-auto relative z-40">
      <div className="container mx-auto text-center flex flex-col items-center justify-center gap-2">
        <div className="flex justify-center space-x-6">
          <a 
            href="https://gilshwartz.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-blue-400 transition-colors text-sm cursor-pointer"
          >
            About
          </a>
          <a 
            href="https://www.linkedin.com/in/gilshwartz/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-blue-400 transition-colors text-sm cursor-pointer"
          >
            LinkedIn
          </a>
          <a 
            href="https://github.com/GShwartz" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-blue-400 transition-colors text-sm cursor-pointer"
          >
            GitHub
          </a>
        </div>
        <p className="text-gray-600 text-xs text-center mx-auto">© 2025 Local-PVE by Gil Shwartz. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;