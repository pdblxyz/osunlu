import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";

interface UserPanelProps {
  user: any;
  onEditProfile: () => void;
}

export function UserPanel({ user, onEditProfile }: UserPanelProps) {
  const [showMenu, setShowMenu] = useState(false);
  const profile = useQuery(api.profiles.get, {});

  const statusColor = {
    online: "status-online",
    away: "status-away",
    busy: "status-busy",
    offline: "status-offline",
  }[profile?.profile?.status || "online"];

  return (
    <div className="p-4 border-t border-white/10 relative">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
            {(profile?.profile as any)?.avatarUrl ? (
              <img 
                src={(profile?.profile as any)?.avatarUrl} 
                alt={profile?.profile?.displayName || profile?.profile?.username} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              (profile?.profile?.displayName || profile?.profile?.username || user?.name || user?.email || "U")[0]?.toUpperCase()
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium user-name-glow truncate">
            {profile?.profile?.displayName || profile?.profile?.username || user?.name || "Anonymous"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            @{profile?.profile?.username || user?.email?.split("@")[0] || "user"}
          </div>
          {(profile?.profile as any)?.customStatus && (
            <div className="text-xs text-gray-400 truncate">
              {(profile?.profile as any)?.customStatus}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="glass-button p-2 text-gray-600 hover:text-gray-800"
            title="User Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <SignOutButton />
        </div>
      </div>

      {showMenu && (
        <div className="absolute bottom-full left-4 right-4 mb-2 glass-card p-2 animate-scale-in">
          <button
            onClick={() => {
              onEditProfile();
              setShowMenu(false);
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/20 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
}
