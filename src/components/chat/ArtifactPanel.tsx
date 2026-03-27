import { X, Plus, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ChatArtifact } from '../../lib/types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { useApp } from '../../lib/app-store';
import { useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

interface Props {
  artifact: ChatArtifact;
  onClose: () => void;
}

export function ArtifactPanel({ artifact, onClose }: Props) {
  const { dashboards, addWidget } = useApp();
  const [showDashPicker, setShowDashPicker] = useState(false);
  const [addedTo, setAddedTo] = useState<string | null>(null);

  const handleAddToDashboard = async (dashboardId: string) => {
    try {
      await addWidget(dashboardId as Id<'dashboards'>, artifact.spec);
      setAddedTo(dashboardId);
      setShowDashPicker(false);
      setTimeout(() => setAddedTo(null), 2000);
    } catch (err) {
      console.error('Failed to add to dashboard:', err);
    }
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: '100%', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-40 md:static md:inset-auto md:z-auto border-l border-brand-border bg-brand-surface shrink-0 overflow-hidden flex flex-col h-full md:max-w-[520px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border shrink-0">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate flex-1 mr-2">
          {artifact.spec.title}
        </h3>
        <div className="flex items-center gap-1">
          {/* Add to Dashboard */}
          <div className="relative">
            <button
              onClick={() => setShowDashPicker((v) => !v)}
              className="p-1.5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              title="Add to dashboard"
            >
              <Plus className="w-4 h-4" />
            </button>

            {showDashPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDashPicker(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
                  <p className="px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Add to dashboard</p>
                  {dashboards && dashboards.length > 0 ? (
                    dashboards.map((d: any) => (
                      <button
                        key={d._id}
                        onClick={() => handleAddToDashboard(d._id)}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer truncate"
                      >
                        {d.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-zinc-600">No dashboards yet</p>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Added confirmation */}
      {addedTo && (
        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs">
          Added to dashboard
        </div>
      )}

      {/* Full-size chart */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full w-full">
          <ChartRenderer spec={artifact.spec} />
        </div>
      </div>

      {/* Chart info */}
      <div className="px-4 py-3 border-t border-brand-border text-[10px] text-zinc-600">
        {artifact.spec.chartType} &middot; {artifact.spec.data?.length || 0} data points
      </div>
    </motion.div>
  );
}
