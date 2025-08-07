import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    channelId: v.optional(v.id("channels")),
    recipientId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let messages;

    if (args.channelId) {
      // Channel messages
      const membership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) => 
          q.eq("channelId", args.channelId!).eq("userId", userId)
        )
        .unique();

      if (!membership) return [];

      messages = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", args.channelId!))
        .order("asc")
        .take(100);
    } else if (args.recipientId) {
      // Direct messages
      messages = await ctx.db
        .query("messages")
        .withIndex("by_direct_message", (q) => 
          q.eq("isDirectMessage", true)
        )
        .filter((q) => 
          q.or(
            q.and(q.eq(q.field("authorId"), userId), q.eq(q.field("recipientId"), args.recipientId!)),
            q.and(q.eq(q.field("authorId"), args.recipientId!), q.eq(q.field("recipientId"), userId))
          )
        )
        .order("asc")
        .take(100);
    } else {
      return [];
    }

    const messagesWithData = await Promise.all(
      messages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", message.authorId))
          .unique();

        // Get reactions
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        const reactionCounts: Record<string, { count: number; users: string[] }> = {};
        reactions.forEach(reaction => {
          if (!reactionCounts[reaction.emoji]) {
            reactionCounts[reaction.emoji] = { count: 0, users: [] };
          }
          reactionCounts[reaction.emoji].count++;
          reactionCounts[reaction.emoji].users.push(reaction.userId);
        });

        // Get image URL if exists
        let imageUrl = message.imageUrl;
        if (message.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(message.imageStorageId) || undefined;
        }

        return {
          ...message,
          imageUrl,
          author: author ? {
            name: profile?.displayName || profile?.username || author.name || author.email || "Anonymous",
            username: profile?.username || author.email?.split("@")[0] || "user",
            email: author.email,
            avatarUrl: profile?.avatarUrl,
            status: profile?.status || "online",
          } : null,
          reactions: reactionCounts,
        };
      })
    );

    return messagesWithData;
  },
});

export const send = mutation({
  args: {
    content: v.string(),
    channelId: v.optional(v.id("channels")),
    recipientId: v.optional(v.id("users")),
    replyTo: v.optional(v.id("messages")),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.channelId) {
      // Channel message
      const membership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) => 
          q.eq("channelId", args.channelId!).eq("userId", userId)
        )
        .unique();

      if (!membership) throw new Error("Not a member of this channel");

      await ctx.db.insert("messages", {
        content: args.content,
        channelId: args.channelId,
        authorId: userId,
        replyTo: args.replyTo,
        imageStorageId: args.imageStorageId,
      });
    } else if (args.recipientId) {
      // Direct message
      await ctx.db.insert("messages", {
        content: args.content,
        authorId: userId,
        recipientId: args.recipientId,
        isDirectMessage: true,
        imageStorageId: args.imageStorageId,
      });
    }
  },
});

export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if reaction already exists
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_user", (q) => 
        q.eq("messageId", args.messageId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .unique();

    if (existing) {
      // Remove reaction
      await ctx.db.delete(existing._id);
    } else {
      // Add reaction
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
      });
    }
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
