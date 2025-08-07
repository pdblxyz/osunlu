import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface FriendsListProps {
  selectedFriendId: Id<"users"> | null;
  onSelectFriend: (friendId: Id<"users">) => void;
}

export function FriendsList({ selectedFriendId, onSelectFriend }: FriendsListProps) {
  const friends = useQuery(api.friends.list) || [];
  const pendingRequests = useQuery(api.friends.getPendingRequests) || [];
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const rejectRequest = useMutation(api.friends.rejectRequest);
  const [showRequests, setShowRequests] = useState(false);
  const [previousRequestCount, setPreviousRequestCount] = useState(0);

  // Show notification when new friend request arrives
  useEffect(() => {
    if (pendingRequests.length > previousRequestCount && previousRequestCount > 0) {
      const newRequest = pendingRequests[pendingRequests.length - 1];
      toast(`${newRequest.requester.name} sent you a friend request!`, {
        action: {
          label: "View",
          onClick: () => setShowRequests(true),
        },
      });
    }
    setPreviousRequestCount(pendingRequests.length);
  }, [pendingRequests.length, previousRequestCount, acceptRequest, rejectRequest]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            Friends
          </h2>
          {pendingRequests.length > 0 && (
            <button
              onClick={() => setShowRequests(!showRequests)}
              className="glass-button px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              {pendingRequests.length} requests
            </button>
          )}
        </div>

        {showRequests && pendingRequests.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending Requests
            </h3>
            {pendingRequests.map((request) => (
              <div key={request._id} className="glass-button p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                    {request.requester.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{request.requester.name}</div>
                    <div className="text-xs text-gray-500">@{request.requester.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest({ friendshipId: request._id })}
                    className="btn-success px-3 py-1 text-xs"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectRequest({ friendshipId: request._id })}
                    className="btn-danger px-3 py-1 text-xs"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="space-y-1">
          {friends.map((friend) => (
            <button
              key={friend._id}
              onClick={() => onSelectFriend(friend._id)}
              className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                selectedFriendId === friend._id
                  ? "bg-white/30 text-gray-800"
                  : "text-gray-600 hover:bg-white/20 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {friend.avatarUrl ? (
                      <img 
                        src={friend.avatarUrl} 
                        alt={friend.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      friend.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white status-${friend.status}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="user-name-glow truncate">{friend.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    @{friend.username}
                  </div>
                  {friend.customStatus && (
                    <div className="text-xs text-gray-400 truncate">
                      {friend.customStatus}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {friends.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-sm">No friends yet</p>
            <p className="text-xs text-gray-400 mt-1">Click on users to send friend requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
