const Navbar = ({ onCreateClick }: { onCreateClick: () => void }) => {
  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-2xl font-bold text-white">Local-PVE</span>
        </div>
        <div className="space-x-6">
          <a href="#" className="text-white hover:text-blue-400">Notifications</a>
          <button onClick={onCreateClick} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md">Create VM</button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;