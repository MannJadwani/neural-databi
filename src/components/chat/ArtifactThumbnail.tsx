import type { ChatArtifact } from '../../lib/types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { Maximize2 } from 'lucide-react';

interface Props {
  artifact: ChatArtifact;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ArtifactThumbnail({ artifact, isSelected, onSelect }: Props) {
  return (
    <div
      onClick={() => onSelect(artifact.id)}
      className={`
        group relative my-3 border rounded-lg overflow-hidden cursor-pointer transition-all duration-200
        ${isSelected ? 'border-white/30 bg-white/[0.04]' : 'border-zinc-800 bg-brand-surface hover:border-zinc-600'}
      `}
    >
      {/* Chart title bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">
          {artifact.spec.title}
        </span>
        <Maximize2 className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
      </div>

      {/* Chart preview */}
      <div className="h-[200px] p-2 pointer-events-none">
        <ChartRenderer spec={artifact.spec} />
      </div>
    </div>
  );
}
