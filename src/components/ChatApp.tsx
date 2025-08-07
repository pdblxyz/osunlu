import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChannelSidebar } from "./ChannelSidebar";
import { ChatArea } from "./ChatArea";
import { UserPanel } from "./UserPanel";
import { MemberList } from "./MemberList";
import { ProfileModal } from "./ProfileModal";
import { JoinChannelModal } from "./JoinChannelModal";
import { FriendsList } from "./FriendsList";
import { DirectMessageArea } from "./DirectMessageArea";

interface ChatAppProps {
  user: any;
}

export function ChatApp({ user }: ChatAppProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<Id<"users"> | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showJoinChannel, setShowJoinChannel] = useState(false);
  const [activeTab, setActiveTab] = useState<"channels" | "friends">("channels");
  
  const channelsData = useQuery(api.channels.list) || [];
  const channels = channelsData.filter((channel): channel is NonNullable<typeof channel> => channel !== null);
  
  // Auto-select first channel if none selected and on channels tab
  if (!selectedChannelId && channels.length > 0 && activeTab === "channels") {
    setSelectedChannelId(channels[0]._id);
  }

  const selectedChannel = channels.find(c => c._id === selectedChannelId);

  const handleTabChange = (tab: "channels" | "friends") => {
    setActiveTab(tab);
    if (tab === "channels") {
      setSelectedFriendId(null);
    } else {
      setSelectedChannelId(null);
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <div className="w-80 flex flex-col glass-panel m-4 mr-2">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-xl font-light glow-text">osunlu.xyz</h1>
          <button
            onClick={() => setShowJoinChannel(true)}
            className="glass-button p-2 text-gray-600 hover:text-gray-800"
            title="Join Channel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-4 gap-2">
          <button
            onClick={() => handleTabChange("channels")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "channels" 
                ? "bg-slate-600/50 text-gray-200" 
                : "text-gray-400 hover:bg-slate-700/30"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => handleTabChange("friends")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "friends" 
                ? "bg-slate-600/50 text-gray-200" 
                : "text-gray-400 hover:bg-slate-700/30"
            }`}
          >
            Friends
          </button>
        </div>
        
        {activeTab === "channels" ? (
          <ChannelSidebar
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={setSelectedChannelId}
            onCreateChannel={() => setShowCreateChannel(true)}
          />
        ) : (
          <FriendsList
            selectedFriendId={selectedFriendId}
            onSelectFriend={setSelectedFriendId}
          />
        )}
        
        <UserPanel 
          user={user} 
          onEditProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex m-4 ml-2 gap-4">
        <div className="flex-1 flex flex-col glass-panel">
          {selectedChannelId ? (
            <ChatArea 
              channelId={selectedChannelId} 
              channelName={selectedChannel?.name || ""}
            />
          ) : selectedFriendId ? (
            <DirectMessageArea friendId={selectedFriendId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">☁️</div>
                <h2 className="text-2xl font-light mb-2 text-gray-200">Welcome to osunlu.xyz</h2>
                <p>Select a channel or friend to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {/* Member List */}
        {selectedChannelId && (
          <MemberList channelId={selectedChannelId} />
        )}
      </div>

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal onClose={() => setShowCreateChannel(false)} />
      )}
      
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}

      {showJoinChannel && (
        <JoinChannelModal onClose={() => setShowJoinChannel(false)} />
      )}
    </div>
  );
}

function CreateChannelModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const createChannel = useMutation(api.channels.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await createChannel({
      name: name.trim(),
      description: description.trim() || undefined,
      isPrivate,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-card p-8 w-full max-w-md animate-scale-in">
        <h2 className="text-xl font-light text-gray-200 mb-6">Create Channel</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              placeholder="general"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              placeholder="What's this channel about?"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-white/50 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="private" className="text-sm text-gray-300">
              Private Channel
            </label>
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
              disabled={!name.trim()}
              className="btn-primary flex-1"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
