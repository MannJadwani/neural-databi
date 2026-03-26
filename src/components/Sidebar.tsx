import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, MessageSquare, Settings, Share2, HelpCircle, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../lib/app-store';

const secondaryItems = [
  { icon: Settings, label: 'Settings', to: '#' },
  { icon: HelpCircle, label: 'Support', to: '#' },
];

export function Sidebar({ onUploadClick }: { onUploadClick: () => void }) {
  const { dashboards } = useApp();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    { icon: Database, label: 'Data Sources', to: '/data', badge: undefined as number | undefined },
    { icon: MessageSquare, label: 'AI Agent', to: '#' },
    { icon: Share2, label: 'Collaboration', to: '#' },
  ];

  return (
    <aside className="w-16 lg:w-64 border-r border-brand-border h-screen flex flex-col bg-brand-surface shrink-0">
      <NavLink to="/" className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
          <div className="w-4 h-4 bg-black" />
        </div>
        <span className="hidden lg:block font-bold text-white tracking-tight">NEXUS AI</span>
      </NavLink>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-sm",
              isActive ? "bg-white/5 text-white" : "hover:bg-white/5"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="hidden lg:block flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="hidden lg:block text-[9px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {/* Upload button */}
        <button
          onClick={onUploadClick}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-sm mt-4 border border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-white/5"
        >
          <Upload className="w-5 h-5" />
          <span className="hidden lg:block">Upload CSV</span>
        </button>

        {/* Recent dashboards */}
        {dashboards.length > 0 && (
          <div className="mt-6 pt-4 border-t border-brand-border">
            <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Recent</p>
            {dashboards.slice(0, 5).map((d) => (
              <NavLink
                key={d.id}
                to={`/dashboard/${d.id}`}
                className={({ isActive }) => cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors rounded-sm truncate",
                  isActive ? "bg-white/5 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                <span className="hidden lg:block truncate">{d.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="px-3 py-6 border-t border-brand-border space-y-1">
        {secondaryItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 transition-colors rounded-sm"
          >
            <item.icon className="w-5 h-5" />
            <span className="hidden lg:block">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
