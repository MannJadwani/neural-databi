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
    billingAccountId: v.optional(v.id('billingAccounts')),
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

  billingAccounts: defineTable({
    scopeType: v.union(v.literal('personal'), v.literal('team')),
    ownerId: v.optional(v.id('users')),
    teamId: v.optional(v.id('teams')),
    displayName: v.string(),
    plan: v.union(v.literal('free'), v.literal('pro'), v.literal('business')),
    status: v.union(v.literal('active'), v.literal('past_due'), v.literal('cancelled'), v.literal('trialing')),
    monthlyCredits: v.number(),
    creditBalance: v.number(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    razorpayCustomerId: v.optional(v.string()),
    razorpaySubscriptionId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_team', ['teamId']),

  creditLedgers: defineTable({
    billingAccountId: v.id('billingAccounts'),
    entryType: v.union(v.literal('grant'), v.literal('usage'), v.literal('adjustment'), v.literal('topup')),
    amount: v.number(),
    balanceAfter: v.number(),
    source: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_account', ['billingAccountId', 'createdAt']),

  usageEvents: defineTable({
    billingAccountId: v.id('billingAccounts'),
    ownerId: v.id('users'),
    feature: v.string(),
    units: v.number(),
    costCredits: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_account', ['billingAccountId', 'createdAt'])
    .index('by_owner', ['ownerId', 'createdAt']),

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
