const Footer = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-700 p-6">
      <div className="container mx-auto text-center">
        <div className="flex justify-center space-x-6">
          <a href="#" className="text-white hover:text-blue-400">About</a>
          <a href="#" className="text-white hover:text-blue-400">LinkedIn</a>
          <a href="#" className="text-white hover:text-blue-400">GitHub</a>
        </div>
        <p className="text-gray-400 mb-4">© 2025 Local-PVE by Gil Shwartz. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;