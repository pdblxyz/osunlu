import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥"];

interface MessageBubbleProps {
  message: any;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const addReaction = useMutation(api.messages.addReaction);

  const handleReaction = async (emoji: string) => {
    await addReaction({ messageId: message._id, emoji });
    setShowReactions(false);
  };

  return (
    <div className="message-bubble animate-slide-up group relative">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {message.author?.avatarUrl ? (
            <img 
              src={message.author.avatarUrl} 
              alt={message.author.name} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            message.author?.name?.[0]?.toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium user-name-glow">
              {message.author?.name || "Anonymous"}
            </span>
            <span className="text-xs text-indigo-500">
              @{message.author?.username || "user"}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message._creationTime).toLocaleTimeString()}
            </span>
            {message.author?.status && (
              <div className={`w-2 h-2 rounded-full status-${message.author.status}`} />
            )}
          </div>
          
          {message.content && (
            <div className="text-gray-700 break-words mb-2">
              {message.content}
            </div>
          )}
          
          {message.imageUrl && (
            <div className="mb-2">
              <img 
                src={message.imageUrl} 
                alt="Uploaded image" 
                className="max-w-sm rounded-xl shadow-lg"
              />
            </div>
          )}

          {/* Reactions */}
          {Object.keys(message.reactions || {}).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(message.reactions).map(([emoji, data]: [string, any]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="glass-button px-2 py-1 text-xs flex items-center gap-1 hover:bg-white/40"
                >
                  <span>{emoji}</span>
                  <span>{data.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reaction button */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="glass-button p-2 text-gray-500 hover:text-gray-700"
            title="Add Reaction"
          >
            😊
          </button>
        </div>
      </div>

      {/* Reaction picker */}
      {showReactions && (
        <div className="absolute right-0 top-0 mt-12 reaction-picker p-3 z-10">
          <div className="flex gap-2">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="hover:bg-white/50 p-2 rounded-lg transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
