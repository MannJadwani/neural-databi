import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { X, UserPlus, Globe, Lock, Trash2, Copy, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ShareModalProps {
  dashboardId: Id<'dashboards'>;
  dashboardName: string;
  isPublic?: boolean;
  onClose: () => void;
}

export function ShareModal({ dashboardId, dashboardName, isPublic, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [tab, setTab] = useState<'people' | 'link'>('people');

  const shares = useQuery(api.sharing.getShares, { dashboardId });
  const shareMut = useMutation(api.sharing.shareDashboard);
  const removeShareMut = useMutation(api.sharing.removeShare);
  const togglePublicMut = useMutation(api.sharing.togglePublic);
  const teams = useQuery(api.teams.list);
  const shareWithTeamMut = useMutation(api.sharing.shareWithTeam);

  const handleShare = async () => {
    if (!email.trim()) return;
    try {
      await shareMut({ dashboardId, email: email.trim(), role });
      setEmail('');
      toast.success(`Shared with ${email}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to share');
    }
  };

  const handleShareWithTeam = async (teamId: Id<'teams'>) => {
    try {
      await shareWithTeamMut({ dashboardId, teamId, role: 'viewer' });
      toast.success('Shared with team');
    } catch (err: any) {
      toast.error(err.message || 'Failed to share');
    }
  };

  const previewUrl = `${window.location.origin}/preview/${dashboardId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-surface border border-brand-border w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Share Dashboard</h2>
          <button onClick={onClose} className="p-1 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-border">
          <button
            onClick={() => setTab('people')}
            className={cn(
              'flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5',
              tab === 'people' ? 'text-white border-b-2 border-white' : 'text-zinc-500'
            )}
          >
            <UserPlus className="w-3 h-3" /> People
          </button>
          <button
            onClick={() => setTab('link')}
            className={cn(
              'flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5',
              tab === 'link' ? 'text-white border-b-2 border-white' : 'text-zinc-500'
            )}
          >
            <Globe className="w-3 h-3" /> Link
          </button>
        </div>

        <div className="p-4">
          {tab === 'people' && (
            <div className="space-y-4">
              {/* Invite by email */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Invite by email</label>
                <div className="flex gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                    placeholder="colleague@company.com"
                    className="flex-1 bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="bg-brand-bg border border-brand-border px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleShare}
                    className="px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
                  >
                    Invite
                  </button>
                </div>
              </div>

              {/* Share with team */}
              {teams && teams.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Share with team</label>
                  <div className="space-y-1">
                    {teams.map((team: any) => (
                      <button
                        key={team._id}
                        onClick={() => handleShareWithTeam(team._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-brand-bg border border-brand-border hover:border-zinc-600 transition-colors text-left"
                      >
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-white">{team.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current shares */}
              {shares && shares.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Shared with ({shares.length})
                  </label>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {shares.map((share: any) => (
                      <div key={share._id} className="flex items-center justify-between px-3 py-2 bg-brand-bg border border-brand-border">
                        <div>
                          <p className="text-xs text-white">{share.displayName}</p>
                          <p className="text-[9px] text-zinc-600 uppercase">{share.role}</p>
                        </div>
                        <button
                          onClick={() => removeShareMut({ shareId: share._id })}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'link' && (
            <div className="space-y-4">
              {/* Public toggle */}
              <div className="flex items-center justify-between p-3 bg-brand-bg border border-brand-border">
                <div className="flex items-center gap-2">
                  {isPublic ? <Globe className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-zinc-500" />}
                  <div>
                    <p className="text-xs text-white">{isPublic ? 'Public' : 'Private'}</p>
                    <p className="text-[9px] text-zinc-500">
                      {isPublic ? 'Anyone with the link can view' : 'Only shared users can access'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => togglePublicMut({ dashboardId })}
                  className={cn(
                    'w-10 h-5 rounded-full transition-colors relative',
                    isPublic ? 'bg-emerald-600' : 'bg-zinc-700'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
                    isPublic ? 'left-5.5' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Preview link */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Preview link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={previewUrl}
                    className="flex-1 bg-brand-bg border border-brand-border px-3 py-2 text-xs text-zinc-400 focus:outline-none"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(previewUrl); toast.success('Link copied'); }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
