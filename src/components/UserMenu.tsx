import { useState } from 'react';
import { useWorkOSAuth } from '../lib/auth-helpers';
import { LogOut, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { user, signOut } = useWorkOSAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '') || user.email?.[0]?.toUpperCase() || '?';
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 transition-colors rounded-sm"
      >
        {user.profilePictureUrl ? (
          <img src={user.profilePictureUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
        ) : (
          <div className="w-6 h-6 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {initials}
          </div>
        )}
        <span className="hidden lg:block flex-1 text-left text-xs text-zinc-400 truncate">{displayName}</span>
        <ChevronDown className="hidden lg:block w-3 h-3 text-zinc-600" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-900 border border-zinc-700 z-50 shadow-xl">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-xs text-white font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
