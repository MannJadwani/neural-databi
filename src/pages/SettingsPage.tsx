import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useWorkOSAuth } from '../lib/auth-helpers';
import { Users, Plus, Trash2, Crown, Shield, Eye, UserPlus, Loader2 } from 'lucide-react';
import type { Id } from '../../convex/_generated/dataModel';

const ROLE_META = {
  admin: { label: 'Admin', icon: Shield, color: 'text-amber-400' },
  editor: { label: 'Editor', icon: Users, color: 'text-blue-400' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-zinc-400' },
} as const;

type Role = keyof typeof ROLE_META;

export function SettingsPage() {
  const { user: authUser, accessToken, signIn } = useWorkOSAuth();
  const authEnabled = !!import.meta.env.VITE_WORKOS_CLIENT_ID;
  const canManageTeams = !!authUser && !!accessToken;
  const teams = useQuery(api.teams.list) || [];
  const billing = useQuery(api.billing.workspaceSummary, canManageTeams ? {} : 'skip');
  const createTeam = useMutation(api.teams.create);
  const ensureWorkspaceAccounts = useMutation(api.billing.ensureWorkspaceAccounts);

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState('');

  useEffect(() => {
    if (canManageTeams) {
      ensureWorkspaceAccounts().catch(() => {});
    }
  }, [canManageTeams, ensureWorkspaceAccounts]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    if (!canManageTeams) {
      setTeamError(authEnabled
        ? 'Sign in to create and manage teams.'
        : 'Team collaboration requires WorkOS auth to be configured.'
      );
      return;
    }

    try {
      setTeamError('');
      await createTeam({ name: newTeamName.trim() });
      setNewTeamName('');
      setCreatingTeam(false);
    } catch (err: any) {
      setTeamError(err?.message || 'Failed to create team');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-brand-bg">
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-zinc-600 mb-8">Manage your account and teams</p>

        {/* Profile section */}
        {authUser && (
          <section className="mb-10">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Profile</h2>
            <div className="border border-zinc-800/80 rounded-lg p-5 flex items-center gap-4">
              {authUser.profilePictureUrl ? (
                <img src={authUser.profilePictureUrl} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-lg font-bold text-white">
                  {(authUser.firstName?.[0] || authUser.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {[authUser.firstName, authUser.lastName].filter(Boolean).join(' ') || 'User'}
                </p>
                <p className="text-xs text-zinc-500">{authUser.email}</p>
              </div>
            </div>
          </section>
        )}

        {/* Teams section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Teams</h2>
            {!creatingTeam && canManageTeams && (
              <button
                onClick={() => { setCreatingTeam(true); setTeamError(''); }}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New team
              </button>
            )}
          </div>

          {!canManageTeams && (
            <div className="border border-dashed border-zinc-800 rounded-lg p-5 mb-4">
              <p className="text-sm text-zinc-300 mb-1">Team collaboration needs authentication</p>
              <p className="text-xs text-zinc-600 mb-4">
                {authEnabled
                  ? 'Sign in with WorkOS to create teams, invite members, and share dashboards.'
                  : 'Configure `VITE_WORKOS_CLIENT_ID` to enable team collaboration in this environment.'}
              </p>
              {authEnabled && (
                <button
                  onClick={signIn}
                  className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium hover:bg-zinc-200 transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          )}

          {/* Create team form */}
          {creatingTeam && canManageTeams && (
            <div className="border border-zinc-800/80 rounded-lg p-4 mb-4">
              <input
                autoFocus
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTeam(); if (e.key === 'Escape') { setCreatingTeam(false); setTeamError(''); } }}
                placeholder="Team name"
                className="w-full bg-transparent border border-zinc-800 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 mb-3"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setCreatingTeam(false); setTeamError(''); }}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
              {teamError && <p className="text-xs text-rose-400 mt-3">{teamError}</p>}
            </div>
          )}

          {teamError && (!creatingTeam || !canManageTeams) && (
            <p className="text-xs text-rose-400 mb-4">{teamError}</p>
          )}

          {teams.length === 0 && !creatingTeam ? (
            <div className="border border-dashed border-zinc-800 rounded-lg p-8 text-center">
              <Users className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-1">No teams yet</p>
              <p className="text-xs text-zinc-700">Create a team to collaborate on dashboards</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((team: any) => (
                <TeamCard key={team._id} teamId={team._id} name={team.name} ownerId={team.ownerId} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Credits & Billing</h2>
          </div>

          {!canManageTeams ? (
            <div className="border border-dashed border-zinc-800 rounded-lg p-5">
              <p className="text-sm text-zinc-300 mb-1">Sign in to view your credit balance</p>
              <p className="text-xs text-zinc-600 mb-4">
                Billing is attached to your authenticated workspace so usage can be tracked reliably.
              </p>
              {authEnabled && (
                <button
                  onClick={signIn}
                  className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium hover:bg-zinc-200 transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          ) : billing ? (
            <div className="space-y-4">
              {billing.personal && (
                <BillingScopeCard title="Personal workspace" summary={billing.personal} />
              )}

              {billing.teams.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Team workspaces</p>
                  {billing.teams.map((teamSummary: any) => (
                    <BillingScopeCard
                      key={teamSummary.team._id}
                      title={teamSummary.team.name}
                      subtitle="Team billing account"
                      summary={teamSummary}
                    />
                  ))}
                </div>
              )}

              <div className="border border-zinc-800/80 rounded-lg p-5">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Feature costs</p>
                <div className="space-y-2 text-sm text-zinc-300">
                  {Object.entries(billing.featureCosts).map(([feature, cost]) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-zinc-400">{feature.replace(/_/g, ' ')}</span>
                      <span className="text-white">{cost} credits</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-lg p-5 text-sm text-zinc-500">
              Initializing your billing account...
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BillingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800/80 rounded-lg p-4">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function BillingScopeCard({
  title,
  subtitle,
  summary,
}: {
  title: string;
  subtitle?: string;
  summary: { account: any; recentUsage: any[] };
}) {
  return (
    <div className="border border-zinc-800/80 rounded-lg p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-zinc-600 mt-1">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BillingMetric label="Plan" value={summary.account.plan.toUpperCase()} />
        <BillingMetric label="Credits left" value={summary.account.creditBalance.toLocaleString()} />
        <BillingMetric label="Monthly credits" value={summary.account.monthlyCredits.toLocaleString()} />
      </div>

      <div className="flex flex-col gap-2 text-sm text-zinc-300">
        <p>Status: <span className="text-white">{summary.account.status}</span></p>
        <p>Resets on: <span className="text-white">{new Date(summary.account.currentPeriodEnd).toLocaleDateString()}</span></p>
      </div>

      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent usage</p>
        {summary.recentUsage.length === 0 ? (
          <p className="text-sm text-zinc-500">No billable usage yet.</p>
        ) : (
          <div className="space-y-3">
            {summary.recentUsage.map((event: any) => (
              <div key={event._id} className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="text-white">{event.feature.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-zinc-600">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-zinc-300">-{event.costCredits} credits</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCard({ teamId, name, ownerId }: { teamId: Id<'teams'>; name: string; ownerId: Id<'users'> }) {
  const members = useQuery(api.teams.getMembers, { teamId }) || [];
  const addMember = useMutation(api.teams.addMember);
  const removeMember = useMutation(api.teams.removeMember);

  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await addMember({ teamId, email: email.trim(), role });
      setEmail('');
      setInviting(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: Id<'users'>) => {
    try {
      await removeMember({ teamId, userId });
    } catch {}
  };

  return (
    <div className="border border-zinc-800/80 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-[11px] text-zinc-600">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {!inviting && (
          <button
            onClick={() => setInviting(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        )}
      </div>

      {/* Invite form */}
      {inviting && (
        <div className="px-5 pb-4 border-t border-zinc-800/50 pt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); if (e.key === 'Escape') setInviting(false); }}
              placeholder="Email address"
              className="flex-1 bg-transparent border border-zinc-800 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={!email.trim() || loading}
              className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
            </button>
            <button
              onClick={() => { setInviting(false); setError(''); }}
              className="px-2 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
        </div>
      )}

      {/* Members list */}
      {members.length > 0 && (
        <div className="border-t border-zinc-800/50">
          {members.map((member: any) => {
            const meta = ROLE_META[member.role as Role] || ROLE_META.viewer;
            const RoleIcon = meta.icon;
            return (
              <div key={member._id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {(member.name?.[0] || member.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate">{member.name || member.email}</p>
                    <p className="text-[10px] text-zinc-600 truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${meta.color}`}>
                    <RoleIcon className="w-3 h-3" />
                    {meta.label}
                  </span>
                  <button
                    onClick={() => handleRemove(member.userId)}
                    className="p-1 text-zinc-700 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
