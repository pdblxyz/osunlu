import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  profiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    status: v.optional(v.union(v.literal("online"), v.literal("away"), v.literal("busy"), v.literal("offline"))),
    customStatus: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_username", ["username"]),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    createdBy: v.id("users"),
    inviteCode: v.optional(v.string()),
  }).index("by_created_by", ["createdBy"])
    .index("by_invite_code", ["inviteCode"]),

  messages: defineTable({
    content: v.string(),
    channelId: v.optional(v.id("channels")),
    authorId: v.id("users"),
    edited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    replyTo: v.optional(v.id("messages")),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    isDirectMessage: v.optional(v.boolean()),
    recipientId: v.optional(v.id("users")),
  }).index("by_channel", ["channelId"])
    .index("by_author", ["authorId"])
    .index("by_direct_message", ["isDirectMessage", "authorId", "recipientId"]),

  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    joinedAt: v.number(),
    role: v.optional(v.union(v.literal("admin"), v.literal("moderator"), v.literal("member"))),
  }).index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  friendships: defineTable({
    userId1: v.id("users"),
    userId2: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("blocked")),
    requestedBy: v.id("users"),
  }).index("by_user1", ["userId1"])
    .index("by_user2", ["userId2"])
    .index("by_users", ["userId1", "userId2"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  }).index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_and_user", ["messageId", "userId"]),

  voiceChannels: defineTable({
    channelId: v.id("channels"),
    participants: v.array(v.id("users")),
    isActive: v.boolean(),
  }).index("by_channel", ["channelId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
