import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getByDashboard = query({
  args: { dashboardId: v.id('dashboards') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversations')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.dashboardId))
      .first();
  },
});

export const addMessage = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.dashboardId))
      .first();

    const message = {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: [...existing.messages, message],
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      const now = Date.now();
      return await ctx.db.insert('conversations', {
        dashboardId: args.dashboardId,
        messages: [message],
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
