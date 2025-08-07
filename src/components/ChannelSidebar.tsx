import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Channel {
  _id: Id<"channels">;
  name: string;
  description?: string;
  memberCount: number;
  userRole: string;
  isPrivate?: boolean;
}

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannelId: Id<"channels"> | null;
  onSelectChannel: (channelId: Id<"channels">) => void;
  onCreateChannel: () => void;
}

export function ChannelSidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
}: ChannelSidebarProps) {
  const [showInvite, setShowInvite] = useState<Id<"channels"> | null>(null);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Channels
          </h2>
          <button
            onClick={onCreateChannel}
            className="glass-button p-1 text-gray-600 hover:text-gray-800"
            title="Create Channel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-1">
          {channels.map((channel) => (
            <div key={channel._id} className="group">
              <button
                onClick={() => onSelectChannel(channel._id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                  selectedChannelId === channel._id
                    ? "bg-slate-600/50 text-gray-200"
                    : "text-gray-400 hover:bg-slate-700/30 hover:text-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {channel.isPrivate ? "🔒" : "#"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate user-name-glow">{channel.name}</div>
                    {channel.description && (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {channel.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">
                      {channel.memberCount}
                    </div>
                    {(channel.userRole === "admin" || channel.userRole === "moderator") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInvite(channel._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 glass-button p-1 text-gray-500 hover:text-gray-700 transition-all"
                        title="Get Invite Link"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
        
        {channels.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">☁️</div>
            <p className="text-sm">No channels yet</p>
            <button
              onClick={onCreateChannel}
              className="text-indigo-500 hover:text-indigo-600 text-sm mt-2 underline"
            >
              Create your first channel
            </button>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal 
          channelId={showInvite} 
          onClose={() => setShowInvite(null)} 
        />
      )}
    </div>
  );
}

function InviteModal({ channelId, onClose }: { channelId: Id<"channels">; onClose: () => void }) {
  const inviteCode = useQuery(api.channels.getInviteCode, { channelId });
  const regenerateInvite = useMutation(api.channels.regenerateInvite);
  const [copied, setCopied] = useState(false);

  const inviteLink = inviteCode ? `${window.location.origin}?invite=${inviteCode}` : "";

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    await regenerateInvite({ channelId });
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-card p-8 w-full max-w-md animate-scale-in">
        <h2 className="text-xl font-light text-gray-800 mb-6">Invite Friends</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="btn-primary px-4"
                title="Copy Link"
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRegenerate}
              className="btn-secondary flex-1"
            >
              Regenerate
            </button>
            <button
              onClick={onClose}
              className="btn-primary flex-1"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
