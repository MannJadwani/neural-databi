import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('datasets').order('desc').collect();
  },
});

export const get = query({
  args: { id: v.id('datasets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    storageId: v.optional(v.id('_storage')),
    schema: v.optional(v.any()),
    rowCount: v.number(),
    status: v.union(
      v.literal('uploading'),
      v.literal('parsing'),
      v.literal('analyzing'),
      v.literal('ready'),
      v.literal('error')
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('datasets', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id('datasets'),
    status: v.union(
      v.literal('uploading'),
      v.literal('parsing'),
      v.literal('analyzing'),
      v.literal('ready'),
      v.literal('error')
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const updateSchema = mutation({
  args: {
    id: v.id('datasets'),
    schema: v.any(),
    rowCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      schema: args.schema,
      rowCount: args.rowCount,
      status: 'ready',
    });
  },
});

export const remove = mutation({
  args: { id: v.id('datasets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
