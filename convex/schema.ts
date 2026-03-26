import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  datasets: defineTable({
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    storageId: v.optional(v.id('_storage')),
    status: v.union(
      v.literal('uploading'),
      v.literal('parsing'),
      v.literal('analyzing'),
      v.literal('ready'),
      v.literal('error')
    ),
    schema: v.optional(v.any()),
    rowCount: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }),

  dataRows: defineTable({
    datasetId: v.id('datasets'),
    chunkIndex: v.number(),
    rows: v.any(),
  }).index('by_dataset', ['datasetId', 'chunkIndex']),

  dashboards: defineTable({
    name: v.string(),
    datasetId: v.id('datasets'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  widgets: defineTable({
    dashboardId: v.id('dashboards'),
    chartType: v.string(),
    title: v.string(),
    config: v.any(),
    position: v.object({ x: v.number(), y: v.number() }),
    size: v.object({ w: v.number(), h: v.number() }),
    createdAt: v.number(),
  }).index('by_dashboard', ['dashboardId']),

  conversations: defineTable({
    dashboardId: v.id('dashboards'),
    messages: v.array(
      v.object({
        role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_dashboard', ['dashboardId']),
});
