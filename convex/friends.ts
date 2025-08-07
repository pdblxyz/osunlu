import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const friendships = await ctx.db
      .query("friendships")
      .filter((q) => 
        q.and(
          q.or(q.eq(q.field("userId1"), userId), q.eq(q.field("userId2"), userId)),
          q.eq(q.field("status"), "accepted")
        )
      )
      .collect();

    const friends = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId = friendship.userId1 === userId ? friendship.userId2 : friendship.userId1;
        const friend = await ctx.db.get(friendId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", friendId))
          .unique();

        return {
          _id: friendId,
          name: profile?.displayName || profile?.username || friend?.name || "Anonymous",
          username: profile?.username || friend?.email?.split("@")[0] || "user",
          avatarUrl: profile?.avatarUrl,
          status: profile?.status || "offline",
          customStatus: profile?.customStatus,
        };
      })
    );

    return friends;
  },
});

export const sendRequest = mutation({
  args: { recipientId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.recipientId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if friendship already exists
    const existing = await ctx.db
      .query("friendships")
      .filter((q) => 
        q.or(
          q.and(q.eq(q.field("userId1"), userId), q.eq(q.field("userId2"), args.recipientId)),
          q.and(q.eq(q.field("userId1"), args.recipientId), q.eq(q.field("userId2"), userId))
        )
      )
      .unique();

    if (existing) {
      throw new Error("Friendship already exists");
    }

    await ctx.db.insert("friendships", {
      userId1: userId,
      userId2: args.recipientId,
      status: "pending",
      requestedBy: userId,
    });
  },
});

export const acceptRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error("Friendship not found");

    if (friendship.userId2 !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.friendshipId, { status: "accepted" });
  },
});

export const rejectRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error("Friendship not found");

    if (friendship.userId2 !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.friendshipId);
  },
});

export const getPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("friendships")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId2"), userId),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.requestedBy);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", request.requestedBy))
          .unique();

        return {
          ...request,
          requester: {
            name: profile?.displayName || profile?.username || requester?.name || "Anonymous",
            username: profile?.username || requester?.email?.split("@")[0] || "user",
            avatarUrl: profile?.avatarUrl,
          },
        };
      })
    );

    return requestsWithUsers;
  },
});
