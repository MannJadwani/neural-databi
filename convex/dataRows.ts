import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const insertChunk = mutation({
  args: {
    datasetId: v.id('datasets'),
    chunkIndex: v.number(),
    rows: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('dataRows', args);
  },
});

export const getByDataset = query({
  args: { datasetId: v.id('datasets') },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query('dataRows')
      .withIndex('by_dataset', (q) => q.eq('datasetId', args.datasetId))
      .collect();
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    return chunks.flatMap((c) => c.rows as Record<string, unknown>[]);
  },
});

export const deleteByDataset = mutation({
  args: { datasetId: v.id('datasets') },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query('dataRows')
      .withIndex('by_dataset', (q) => q.eq('datasetId', args.datasetId))
      .collect();
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
  },
});
