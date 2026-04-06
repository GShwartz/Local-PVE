import { useState } from 'react';
import { LayoutDashboard, Users, ClipboardList, Settings, Plus, Github, Linkedin, Globe, ChevronDown, Monitor, type LucideIcon } from 'lucide-react';

export type Page = 'dashboard' | 'users' | 'audit' | 'settings';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onCreateClick: () => void;
  isOpen: boolean;
  pageTitle: string;
}

const navItems: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard },
  { page: 'users',     label: 'User Management', icon: Users           },
  { page: 'audit',     label: 'Audit Log',        icon: ClipboardList   },
  { page: 'settings',  label: 'Settings',         icon: Settings        },
];

const Sidebar = ({ activePage, onNavigate, onCreateClick, isOpen, pageTitle }: SidebarProps) => {
  const [vmMenuOpen, setVmMenuOpen] = useState(true);

  return (
    <aside className={`flex flex-col bg-white border-r border-gray-200 h-full overflow-hidden
                       transition-[width,min-width] duration-200 ease-in-out
                       ${isOpen ? 'w-60 min-w-[240px]' : 'w-0 min-w-0'}`}>

      {/* ── Page title ── */}
      <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-100 flex-shrink-0">
        <span className="text-base font-bold text-gray-900 tracking-tight truncate">{pageTitle}</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto sidebar-scroll space-y-4">

        {/* VM Management collapsible section */}
        <div>
          <button
            onClick={() => setVmMenuOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors focus:outline-none"
          >
            <span className="flex items-center gap-1.5">
              <Monitor size={11} />
              VM Management
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${vmMenuOpen ? '' : '-rotate-90'}`}
            />
          </button>

          {vmMenuOpen && (
            <ul className="mt-1 space-y-0.5">
              <li>
                <button
                  onClick={onCreateClick}
                  className="w-full flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm font-medium
                             text-gray-600 hover:bg-gray-100 hover:text-gray-900
                             transition-all duration-150 group focus:outline-none"
                >
                  <Plus size={16} strokeWidth={2} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                  Create VM
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* Navigate section */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2 mt-1">
            Navigate
          </p>
          <ul className="space-y-0.5">
            {navItems.map(({ page, label, icon: Icon }) => {
              const isActive = activePage === page;
              return (
                <li key={page}>
                  <button
                    onClick={() => onNavigate(page)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                               transition-all duration-150 group focus:outline-none
                               ${isActive
                                 ? 'bg-blue-50 text-blue-700'
                                 : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                               }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    />
                    {label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

      </nav>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="https://gilshwartz.vercel.app/" target="_blank" rel="noopener noreferrer"
             title="About" className="text-gray-400 hover:text-blue-500 transition-colors">
            <Globe size={15} />
          </a>
          <a href="https://www.linkedin.com/in/gilshwartz/" target="_blank" rel="noopener noreferrer"
             title="LinkedIn" className="text-gray-400 hover:text-blue-500 transition-colors">
            <Linkedin size={15} />
          </a>
          <a href="https://github.com/GShwartz" target="_blank" rel="noopener noreferrer"
             title="GitHub" className="text-gray-400 hover:text-gray-700 transition-colors">
            <Github size={15} />
          </a>
        </div>
        <p className="text-[11px] text-gray-400 text-center">© 2025 Gil Shwartz</p>
      </div>
    </aside>
  );
};

export default Sidebar;
