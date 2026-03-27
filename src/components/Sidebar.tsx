import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, MessageSquare, Settings, HelpCircle, Upload, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../lib/app-store';
import { UserMenu } from './UserMenu';

interface SidebarProps {
  onUploadClick: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ onUploadClick, mobileOpen, onMobileClose }: SidebarProps) {
  const { dashboards } = useApp();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboards', to: '/dashboards' },
    { icon: Database, label: 'Data Sources', to: '/data' },
    { icon: MessageSquare, label: 'Chat', to: '/chat' },
  ];

  const secondaryLinks = [
    { icon: Settings, label: 'Settings', to: '/settings' },
  ];

  const secondaryItems = [
    { icon: HelpCircle, label: 'Support' },
  ];

  const handleNavClick = () => {
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      <div className="p-4 md:p-6 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm shrink-0">
            <div className="w-4 h-4 bg-black" />
          </div>
          <span className="font-bold text-white tracking-tight">NeuralBi</span>
        </NavLink>
        {/* Mobile close button */}
        <button onClick={onMobileClose} className="md:hidden p-1 text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-md",
              isActive ? "bg-white/5 text-white" : "hover:bg-white/5"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
          </NavLink>
        ))}

        {/* Upload button */}
        <button
          onClick={() => { onUploadClick(); handleNavClick(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-md mt-4 border border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-white/5"
        >
          <Upload className="w-5 h-5 shrink-0" />
          <span>Upload CSV</span>
        </button>

        {/* Recent dashboards */}
        {dashboards && dashboards.length > 0 && (
          <div className="mt-6 pt-4 border-t border-brand-border">
            <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Recent</p>
            {dashboards.slice(0, 5).map((d: any) => (
              <NavLink
                key={d._id}
                to={`/dashboard/${d._id}`}
                onClick={handleNavClick}
                className={({ isActive }) => cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors rounded-sm truncate",
                  isActive ? "bg-white/5 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                <span className="truncate">{d.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-brand-border space-y-1">
        {secondaryLinks.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-md",
              isActive ? "bg-white/5 text-white" : "hover:bg-white/5"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {secondaryItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors rounded-md"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
        <UserMenu />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-brand-border h-screen flex-col bg-brand-surface shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 w-72 z-50 flex flex-col bg-brand-surface border-r border-brand-border md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
