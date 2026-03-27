import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listByDataset = query({
  args: { datasetId: v.id('datasets') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('chatConversations')
      .withIndex('by_dataset', (q) => q.eq('datasetId', args.datasetId))
      .order('desc')
      .collect();
  },
});

export const get = query({
  args: { id: v.id('chatConversations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { datasetId: v.id('datasets'), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert('chatConversations', {
      datasetId: args.datasetId,
      title: args.title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const saveMessages = mutation({
  args: {
    id: v.id('chatConversations'),
    messages: v.array(v.any()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      messages: args.messages,
      updatedAt: Date.now(),
      ...(args.title ? { title: args.title } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('chatConversations') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
