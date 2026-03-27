import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============================================================
  // Auth & Identity
  // ============================================================

  users: defineTable({
    workosId: v.string(),        // WorkOS user ID (sub claim)
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.number(),
  })
    .index('by_workos_id', ['workosId'])
    .index('by_email', ['email']),

  teams: defineTable({
    name: v.string(),
    ownerId: v.id('users'),
    createdAt: v.number(),
  }),

  teamMembers: defineTable({
    teamId: v.id('teams'),
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    joinedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_user', ['userId'])
    .index('by_team_user', ['teamId', 'userId']),

  // ============================================================
  // Dashboard sharing
  // ============================================================

  dashboardShares: defineTable({
    dashboardId: v.id('dashboards'),
    userId: v.optional(v.id('users')),     // specific user share
    teamId: v.optional(v.id('teams')),     // team-wide share
    email: v.optional(v.string()),          // invite by email (before they sign up)
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    sharedBy: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_dashboard', ['dashboardId'])
    .index('by_user', ['userId'])
    .index('by_email', ['email'])
    .index('by_team', ['teamId']),

  // ============================================================
  // Data
  // ============================================================

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
    ownerId: v.optional(v.id('users')),
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),

  dataRows: defineTable({
    datasetId: v.id('datasets'),
    chunkIndex: v.number(),
    rows: v.any(),
  }).index('by_dataset', ['datasetId', 'chunkIndex']),

  dashboards: defineTable({
    name: v.string(),
    datasetId: v.id('datasets'),
    insights: v.optional(v.string()),
    ownerId: v.optional(v.id('users')),
    isPublic: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerId']),

  widgets: defineTable({
    dashboardId: v.id('dashboards'),
    chartType: v.string(),
    title: v.string(),
    config: v.any(),
    chartData: v.any(),
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

  chatConversations: defineTable({
    datasetId: v.id('datasets'),
    title: v.optional(v.string()),
    messages: v.array(v.any()),      // ChatMessage[] with artifacts
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_dataset', ['datasetId']),
});
