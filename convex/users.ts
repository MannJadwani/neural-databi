import { v } from 'convex/values';
import { mutation, query, QueryCtx } from './_generated/server';

/**
 * Get or create user from WorkOS identity.
 * Called on every login to ensure user record exists.
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const workosId = identity.subject;
    const email = identity.email || '';
    const name = identity.name || email.split('@')[0];

    // Check if user exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_workos_id', (q) => q.eq('workosId', workosId))
      .first();

    if (existing) {
      // Update last login
      await ctx.db.patch(existing._id, { lastLoginAt: Date.now(), name });
      return existing._id;
    }

    // Create new user
    return await ctx.db.insert('users', {
      workosId,
      email,
      name,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  },
});

/**
 * Get the current logged-in user record.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query('users')
      .withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
      .first();
  },
});

/**
 * Search users by email for sharing.
 */
export const searchByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const users = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .collect();

    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
    }));
  },
});

/**
 * Helper: get user ID from auth context. Used internally.
 */
export async function getCurrentUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query('users')
    .withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
    .first();

  return user?._id || null;
}
