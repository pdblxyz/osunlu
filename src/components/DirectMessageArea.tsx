import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MessageBubble } from "./MessageBubble";

interface DirectMessageAreaProps {
  friendId: Id<"users">;
}

export function DirectMessageArea({ friendId }: DirectMessageAreaProps) {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messages = useQuery(api.messages.list, { recipientId: friendId }) || [];
  const friend = useQuery(api.profiles.get, { userId: friendId });
  const sendMessage = useMutation(api.messages.send);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedImage) return;

    let imageStorageId;
    if (selectedImage) {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });
      const json = await result.json();
      if (!result.ok) {
        throw new Error(`Upload failed: ${JSON.stringify(json)}`);
      }
      imageStorageId = json.storageId;
    }

    await sendMessage({
      content: message.trim() || "",
      recipientId: friendId,
      imageStorageId,
    });

    setMessage("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
              {(friend?.profile as any)?.avatarUrl ? (
                <img 
                  src={(friend?.profile as any)?.avatarUrl} 
                  alt={friend?.profile?.displayName || friend?.profile?.username} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (friend?.profile?.displayName || friend?.profile?.username || friend?.name || "U")[0]?.toUpperCase()
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white status-${friend?.profile?.status || "offline"}`} />
          </div>
          <div>
            <h2 className="text-lg font-medium user-name-glow">
              {friend?.profile?.displayName || friend?.profile?.username || friend?.name || "Anonymous"}
            </h2>
            <div className="text-sm text-gray-500">
              @{friend?.profile?.username || friend?.email?.split("@")[0] || "user"}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <p>Start your conversation with {friend?.profile?.displayName || friend?.name || "this user"}!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="glass-button p-3 text-gray-600 hover:text-gray-800"
            title="Upload Image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${friend?.profile?.displayName || friend?.name || "user"}`}
            className="flex-1 input-field"
            autoFocus
          />
          <button
            type="submit"
            disabled={!message.trim() && !selectedImage}
            className="btn-primary px-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        {selectedImage && (
          <div className="mt-3 p-3 glass-button flex items-center justify-between">
            <span className="text-sm text-gray-600">📷 {selectedImage.name}</span>
            <button
              onClick={() => {
                setSelectedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
