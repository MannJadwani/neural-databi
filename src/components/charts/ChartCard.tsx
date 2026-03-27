import { useState } from 'react';
import { Maximize2, Minimize2, MoreHorizontal, X } from 'lucide-react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  onMaximize?: () => void;
  onMore?: () => void;
}

export function ChartCard({ title, children }: ChartCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (isFullscreen) {
    return (
      <>
        {/* Placeholder to keep grid layout stable */}
        <div className="bg-brand-surface border border-brand-border flex items-center justify-center h-full">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Viewing fullscreen</p>
        </div>

        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-[100] bg-brand-bg/95 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-brand-border flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h3>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-6 min-h-0">
            {children}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-brand-surface border border-brand-border flex flex-col h-full">
      <div className="p-3 border-b border-brand-border flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-white">{title}</h3>
        <button
          onClick={() => setIsFullscreen(true)}
          className="p-1 hover:text-white transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 p-3 relative min-h-0">
        {children}
      </div>
    </div>
  );
}
