import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return null;

    const userId = args.userId || currentUserId;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      ...user,
      profile: profile || {
        username: user.email?.split("@")[0] || "user",
        displayName: user.name,
        status: "online" as const,
      },
    };
  },
});

export const update = mutation({
  args: {
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    status: v.optional(v.union(v.literal("online"), v.literal("away"), v.literal("busy"), v.literal("offline"))),
    customStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if username is taken
    if (args.username) {
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .unique();
      
      if (existing && existing.userId !== userId) {
        throw new Error("Username already taken");
      }
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const profileData = {
      userId,
      username: args.username || existingProfile?.username || "user",
      displayName: args.displayName,
      bio: args.bio,
      avatarUrl: args.avatarUrl,
      status: args.status,
      customStatus: args.customStatus,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
    } else {
      await ctx.db.insert("profiles", profileData);
    }
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profiles = await ctx.db
      .query("profiles")
      .filter((q) => 
        q.or(
          q.eq(q.field("username"), args.query),
          q.eq(q.field("displayName"), args.query)
        )
      )
      .take(10);

    return profiles;
  },
});
