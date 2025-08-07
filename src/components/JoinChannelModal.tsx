import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface JoinChannelModalProps {
  onClose: () => void;
}

export function JoinChannelModal({ onClose }: JoinChannelModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const joinByInvite = useMutation(api.channels.joinByInvite);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    
    try {
      await joinByInvite({ inviteCode: inviteCode.trim() });
      onClose();
    } catch (error) {
      console.error("Failed to join channel:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-card p-8 w-full max-w-md animate-scale-in">
        <h2 className="text-xl font-light text-gray-800 mb-6">Join Channel</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-field w-full"
              placeholder="Enter invite code"
              autoFocus
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inviteCode.trim()}
              className="btn-primary flex-1"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
