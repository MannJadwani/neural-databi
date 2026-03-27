import { v } from 'convex/values';
import { mutation, query, QueryCtx } from './_generated/server';
import { getCurrentUserId } from './users';
import type { Id } from './_generated/dataModel';

// ============================================================
// Permission check helper
// ============================================================

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Check what role a user has on a dashboard.
 * Returns null if no access.
 */
export async function getDashboardRole(
  ctx: QueryCtx,
  dashboardId: Id<'dashboards'>,
  userId: string
): Promise<Role | null> {
  const dashboard = await ctx.db.get(dashboardId);
  if (!dashboard) return null;

  // Owner
  if (dashboard.ownerId === userId) return 'owner';

  // Public dashboards — viewer access
  if (dashboard.isPublic) return 'viewer';

  // Direct share
  const directShare = await ctx.db
    .query('dashboardShares')
    .withIndex('by_dashboard', (q) => q.eq('dashboardId', dashboardId))
    .collect();

  const userShare = directShare.find((s) => s.userId === userId);
  if (userShare) return userShare.role as Role;

  // Email-based share (for invited users who just signed up)
  const user = await ctx.db.get(userId as Id<'users'>);
  if (user) {
    const emailShare = directShare.find((s) => s.email === user.email);
    if (emailShare) return emailShare.role as Role;
  }

  // Team-based share
  const teamShares = directShare.filter((s) => s.teamId);
  for (const ts of teamShares) {
    if (!ts.teamId) continue;
    const membership = await ctx.db
      .query('teamMembers')
      .withIndex('by_team_user', (q) => q.eq('teamId', ts.teamId!).eq('userId', userId as any))
      .first();
    if (membership) {
      // Use the higher of team share role and member role
      return ts.role as Role;
    }
  }

  return null;
}

/**
 * Check if user can edit (owner, admin, or editor).
 */
export function canEdit(role: Role | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

// ============================================================
// Sharing mutations
// ============================================================

export const shareDashboard = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Check current user has admin/owner access
    const myRole = await getDashboardRole(ctx, args.dashboardId, userId);
    if (myRole !== 'owner' && myRole !== 'admin') {
      throw new Error('Only owners and admins can share dashboards');
    }

    // Find user by email
    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    // Check for existing share
    const existing = await ctx.db
      .query('dashboardShares')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.dashboardId))
      .collect();

    const existingShare = existing.find((s) =>
      (targetUser && s.userId === targetUser._id) || s.email === args.email
    );

    if (existingShare) {
      // Update role
      await ctx.db.patch(existingShare._id, { role: args.role });
      return existingShare._id;
    }

    // Create share
    return await ctx.db.insert('dashboardShares', {
      dashboardId: args.dashboardId,
      userId: targetUser?._id,
      email: args.email,
      role: args.role,
      sharedBy: userId as any,
      createdAt: Date.now(),
    });
  },
});

export const shareWithTeam = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    teamId: v.id('teams'),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const myRole = await getDashboardRole(ctx, args.dashboardId, userId);
    if (myRole !== 'owner' && myRole !== 'admin') {
      throw new Error('Only owners and admins can share dashboards');
    }

    return await ctx.db.insert('dashboardShares', {
      dashboardId: args.dashboardId,
      teamId: args.teamId,
      role: args.role,
      sharedBy: userId as any,
      createdAt: Date.now(),
    });
  },
});

export const removeShare = mutation({
  args: { shareId: v.id('dashboardShares') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const share = await ctx.db.get(args.shareId);
    if (!share) return;

    const myRole = await getDashboardRole(ctx, share.dashboardId, userId);
    if (myRole !== 'owner' && myRole !== 'admin') {
      throw new Error('Only owners and admins can remove shares');
    }

    await ctx.db.delete(args.shareId);
  },
});

export const togglePublic = mutation({
  args: { dashboardId: v.id('dashboards') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const myRole = await getDashboardRole(ctx, args.dashboardId, userId);
    if (myRole !== 'owner') throw new Error('Only owners can toggle public access');

    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    await ctx.db.patch(args.dashboardId, { isPublic: !dashboard.isPublic });
  },
});

export const getShares = query({
  args: { dashboardId: v.id('dashboards') },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query('dashboardShares')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.dashboardId))
      .collect();

    // Resolve user/team names
    const result = [];
    for (const s of shares) {
      let name = s.email || 'Unknown';
      if (s.userId) {
        const user = await ctx.db.get(s.userId);
        if (user) name = user.name || user.email;
      }
      if (s.teamId) {
        const team = await ctx.db.get(s.teamId);
        if (team) name = `Team: ${team.name}`;
      }
      result.push({ ...s, displayName: name });
    }
    return result;
  },
});

/**
 * Get all dashboards accessible to the current user.
 */
export const myDashboards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // Owned dashboards
    const owned = await ctx.db
      .query('dashboards')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId as any))
      .collect();

    // Directly shared
    const directShares = await ctx.db
      .query('dashboardShares')
      .withIndex('by_user', (q) => q.eq('userId', userId as any))
      .collect();

    // Email shares
    const user = await ctx.db.get(userId as Id<'users'>);
    const emailShares = user
      ? await ctx.db
          .query('dashboardShares')
          .withIndex('by_email', (q) => q.eq('email', user.email))
          .collect()
      : [];

    // Team shares
    const teamMemberships = await ctx.db
      .query('teamMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId as any))
      .collect();

    let teamSharedIds: Id<'dashboards'>[] = [];
    for (const tm of teamMemberships) {
      const teamShares = await ctx.db
        .query('dashboardShares')
        .withIndex('by_team', (q) => q.eq('teamId', tm.teamId))
        .collect();
      teamSharedIds.push(...teamShares.map((s) => s.dashboardId));
    }

    // Collect all dashboard IDs
    const allIds = new Set<string>();
    owned.forEach((d) => allIds.add(d._id));
    directShares.forEach((s) => allIds.add(s.dashboardId));
    emailShares.forEach((s) => allIds.add(s.dashboardId));
    teamSharedIds.forEach((id) => allIds.add(id));

    // Fetch all dashboards
    const dashboards = [];
    for (const id of allIds) {
      const d = await ctx.db.get(id as Id<'dashboards'>);
      if (d) {
        const isOwner = d.ownerId === userId;
        dashboards.push({ ...d, isOwner });
      }
    }

    return dashboards.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
