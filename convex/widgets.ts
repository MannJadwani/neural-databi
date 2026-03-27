import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listByDashboard = query({
  args: { dashboardId: v.id('dashboards') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('widgets')
      .withIndex('by_dashboard', (q) => q.eq('dashboardId', args.dashboardId))
      .collect();
  },
});

export const create = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    chartType: v.string(),
    title: v.string(),
    config: v.any(),
    chartData: v.any(),
    position: v.object({ x: v.number(), y: v.number() }),
    size: v.object({ w: v.number(), h: v.number() }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('widgets', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const createBatch = mutation({
  args: {
    widgets: v.array(v.object({
      dashboardId: v.id('dashboards'),
      chartType: v.string(),
      title: v.string(),
      config: v.any(),
      chartData: v.any(),
      position: v.object({ x: v.number(), y: v.number() }),
      size: v.object({ w: v.number(), h: v.number() }),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const widget of args.widgets) {
      const id = await ctx.db.insert('widgets', {
        ...widget,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const update = mutation({
  args: {
    id: v.id('widgets'),
    chartType: v.optional(v.string()),
    title: v.optional(v.string()),
    config: v.optional(v.any()),
    chartData: v.optional(v.any()),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
    size: v.optional(v.object({ w: v.number(), h: v.number() })),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id('widgets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
