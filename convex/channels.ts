import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get channels where user is a member
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const channels = await Promise.all(
      memberships.map(async (membership) => {
        const channel = await ctx.db.get(membership.channelId);
        if (!channel) return null;
        
        // Get member count
        const memberCount = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .collect();

        return {
          ...channel,
          memberCount: memberCount.length,
          userRole: membership.role || "member",
        };
      })
    );

    return channels.filter(Boolean);
  },
});

export const getMembers = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is member of channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) => 
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) return [];

    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const membersWithProfiles = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", member.userId))
          .unique();

        return {
          ...member,
          user,
          profile: profile || {
            username: user?.email?.split("@")[0] || "user",
            displayName: user?.name,
            status: "online" as const,
          },
        };
      })
    );

    return membersWithProfiles;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const inviteCode = generateInviteCode();

    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      description: args.description,
      isPrivate: args.isPrivate || false,
      createdBy: userId,
      inviteCode,
    });

    // Add creator as admin
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      joinedAt: Date.now(),
      role: "admin",
    });

    return channelId;
  },
});

export const join = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already a member
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) => 
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (existing) return;

    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId,
      joinedAt: Date.now(),
      role: "member",
    });
  },
});

export const joinByInvite = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!channel) throw new Error("Invalid invite code");

    // Check if already a member
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) => 
        q.eq("channelId", channel._id).eq("userId", userId)
      )
      .unique();

    if (existing) return channel._id;

    await ctx.db.insert("channelMembers", {
      channelId: channel._id,
      userId,
      joinedAt: Date.now(),
      role: "member",
    });

    return channel._id;
  },
});

export const getInviteCode = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if user is member of channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) => 
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) return null;

    const channel = await ctx.db.get(args.channelId);
    return channel?.inviteCode || null;
  },
});

export const regenerateInvite = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin or moderator
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) => 
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership || (membership.role !== "admin" && membership.role !== "moderator")) {
      throw new Error("Not authorized");
    }

    const newInviteCode = generateInviteCode();
    await ctx.db.patch(args.channelId, { inviteCode: newInviteCode });
    
    return newInviteCode;
  },
});
