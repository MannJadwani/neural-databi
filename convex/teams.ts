import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getCurrentUserId } from './users';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // Teams I own
    const owned = await ctx.db.query('teams').collect();
    const myOwned = owned.filter((t) => t.ownerId === userId);

    // Teams I'm a member of
    const memberships = await ctx.db
      .query('teamMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId as any))
      .collect();

    const memberTeamIds = new Set(memberships.map((m) => m.teamId));
    const memberTeams = owned.filter((t) => memberTeamIds.has(t._id));

    // Combine and deduplicate
    const allTeams = [...myOwned, ...memberTeams];
    const seen = new Set<string>();
    return allTeams.filter((t) => {
      if (seen.has(t._id)) return false;
      seen.add(t._id);
      return true;
    });
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const now = Date.now();
    const periodStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const periodEnd = new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 1).getTime();

    const billingAccountId = await ctx.db.insert('billingAccounts', {
      scopeType: 'team',
      teamId: undefined,
      displayName: args.name,
      plan: 'free',
      status: 'active',
      monthlyCredits: 200,
      creditBalance: 200,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
    });

    const teamId = await ctx.db.insert('teams', {
      name: args.name,
      ownerId: userId as any,
      billingAccountId,
      createdAt: now,
    });

    await ctx.db.patch(billingAccountId, { teamId });
    await ctx.db.insert('creditLedgers', {
      billingAccountId,
      entryType: 'grant',
      amount: 200,
      balanceAfter: 200,
      source: 'monthly_allocation',
      description: 'Monthly team credits',
      createdAt: now,
    });

    return teamId;
  },
});

export const addMember = mutation({
  args: {
    teamId: v.id('teams'),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Verify ownership/admin
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error('Team not found');
    if (team.ownerId !== userId) {
      const membership = await ctx.db
        .query('teamMembers')
        .withIndex('by_team_user', (q) => q.eq('teamId', args.teamId).eq('userId', userId as any))
        .first();
      if (!membership || membership.role !== 'admin') {
        throw new Error('Only team owners and admins can add members');
      }
    }

    // Find user by email
    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
    if (!targetUser) throw new Error('User not found. They need to sign up first.');

    // Check if already a member
    const existing = await ctx.db
      .query('teamMembers')
      .withIndex('by_team_user', (q) => q.eq('teamId', args.teamId).eq('userId', targetUser._id))
      .first();
    if (existing) throw new Error('Already a team member');

    return await ctx.db.insert('teamMembers', {
      teamId: args.teamId,
      userId: targetUser._id,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: { teamId: v.id('teams'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    if (!currentUserId) throw new Error('Not authenticated');

    const team = await ctx.db.get(args.teamId);
    if (!team || team.ownerId !== currentUserId) throw new Error('Only team owners can remove members');

    const membership = await ctx.db
      .query('teamMembers')
      .withIndex('by_team_user', (q) => q.eq('teamId', args.teamId).eq('userId', args.userId))
      .first();
    if (membership) await ctx.db.delete(membership._id);
  },
});

export const getMembers = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query('teamMembers')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .collect();

    // Resolve user details
    const result = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user) {
        result.push({
          _id: m._id,
          userId: m.userId,
          email: user.email,
          name: user.name,
          role: m.role,
          joinedAt: m.joinedAt,
        });
      }
    }
    return result;
  },
});
