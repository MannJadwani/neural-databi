import { Maximize2, MoreHorizontal } from 'lucide-react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  onMaximize?: () => void;
  onMore?: () => void;
}

export function ChartCard({ title, children, onMaximize, onMore }: ChartCardProps) {
  return (
    <div className="bg-brand-surface border border-brand-border flex flex-col min-h-[300px]">
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={onMaximize}
            className="p-1 hover:text-white transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onMore}
            className="p-1 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 min-h-[250px]">{children}</div>
    </div>
  );
}
