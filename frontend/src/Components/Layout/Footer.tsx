const Footer = () => {
  return (
    <footer className="glass-panel backdrop-blur-md border-t border-white/5 py-4 px-6 mt-auto">
      <div className="container mx-auto text-center flex flex-col items-center justify-center gap-2">
        <div className="flex justify-center space-x-6">
          <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">About</a>
          <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">LinkedIn</a>
          <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">GitHub</a>
        </div>
        <p className="text-gray-600 text-xs text-center mx-auto">© 2025 Local-PVE by Gil Shwartz. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;