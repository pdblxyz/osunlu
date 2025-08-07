import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface MemberListProps {
  channelId: Id<"channels">;
}

export function MemberList({ channelId }: MemberListProps) {
  const members = useQuery(api.channels.getMembers, { channelId }) || [];
  const sendFriendRequest = useMutation(api.friends.sendRequest);

  const onlineMembers = members.filter(m => m.profile?.status === "online");
  const offlineMembers = members.filter(m => m.profile?.status !== "online");

  const handleAddFriend = async (userId: Id<"users">) => {
    try {
      await sendFriendRequest({ recipientId: userId });
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  return (
    <div className="w-60 glass-panel flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
          Members — {members.length}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {onlineMembers.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Online — {onlineMembers.length}
            </h4>
            <div className="space-y-1">
              {onlineMembers.map((member) => (
                <MemberItem 
                  key={member._id} 
                  member={member} 
                  onAddFriend={handleAddFriend}
                />
              ))}
            </div>
          </div>
        )}

        {offlineMembers.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Offline — {offlineMembers.length}
            </h4>
            <div className="space-y-1">
              {offlineMembers.map((member) => (
                <MemberItem 
                  key={member._id} 
                  member={member} 
                  onAddFriend={handleAddFriend}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberItem({ member, onAddFriend }: { 
  member: any; 
  onAddFriend: (userId: Id<"users">) => void;
}) {
  const status = member.profile?.status || "offline";
  const role = member.role || "member";
  const roleColors = {
    admin: "text-red-500",
    moderator: "text-blue-500",
    member: "text-gray-500",
  };
  const roleColor = roleColors[role as keyof typeof roleColors] || "text-gray-500";

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/20 transition-colors group cursor-pointer"
         onClick={() => onAddFriend(member.userId)}>
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
          {member.profile?.avatarUrl ? (
            <img 
              src={member.profile.avatarUrl} 
              alt={member.profile.displayName || member.profile.username} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            (member.profile?.displayName || member.profile?.username || member.user?.name || "U")[0]?.toUpperCase()
          )}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white status-${status}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium user-name-glow truncate">
            {member.profile?.displayName || member.profile?.username || member.user?.name || "Anonymous"}
          </span>
          {member.role !== "member" && (
            <span className={`text-xs ${roleColor} font-semibold`}>
              {member.role?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">
          @{member.profile?.username || member.user?.email?.split("@")[0] || "user"}
        </div>
        {member.profile?.customStatus && (
          <div className="text-xs text-gray-400 truncate">
            {member.profile.customStatus}
          </div>
        )}
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddFriend(member.userId);
          }}
          className="glass-button p-1 text-gray-500 hover:text-gray-700"
          title="Add Friend"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
