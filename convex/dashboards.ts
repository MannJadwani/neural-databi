import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { getCurrentUserId } from './users';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('dashboards').order('desc').collect();
  },
});

export const get = query({
  args: { id: v.id('dashboards') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    datasetId: v.id('datasets'),
    insights: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert('dashboards', {
      ...args,
      ownerId: userId as any || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createImported = internalMutation({
  args: {
    name: v.string(),
    datasetId: v.id('datasets'),
    insights: v.optional(v.string()),
    ownerId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('dashboards', {
      name: args.name,
      datasetId: args.datasetId,
      insights: args.insights,
      ownerId: args.ownerId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('dashboards'),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('dashboards') },
  handler: async (ctx, args) => {
    // Delete associated widgets
    const widgets = await ctx.db
      .query('widgets')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.id))
      .collect();
    for (const widget of widgets) {
      await ctx.db.delete(widget._id);
    }
    // Delete shares
    const shares = await ctx.db
      .query('dashboardShares')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.id))
      .collect();
    for (const share of shares) {
      await ctx.db.delete(share._id);
    }
    // Delete conversations
    const conversations = await ctx.db
      .query('conversations')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.id))
      .collect();
    for (const convo of conversations) {
      await ctx.db.delete(convo._id);
    }
    await ctx.db.delete(args.id);
  },
});
