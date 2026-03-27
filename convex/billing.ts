import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const PLAN_CONFIG = {
  free: { monthlyCredits: 200 },
  pro: { monthlyCredits: 2000 },
  business: { monthlyCredits: 10000 },
} as const;

const FEATURE_COSTS: Record<string, number> = {
  dashboard_generation: 25,
  ai_copilot_message: 5,
  dataset_chat_message: 3,
};

async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const existing = await ctx.db
    .query('users')
    .withIndex('by_workos_id', (q: any) => q.eq('workosId', identity.subject))
    .first();

  if (existing) {
    return existing;
  }

  const email = identity.email || '';
  const name = identity.name || email.split('@')[0] || 'User';
  const now = Date.now();

  const userId = await ctx.db.insert('users', {
    workosId: identity.subject,
    email,
    name,
    createdAt: now,
    lastLoginAt: now,
  });

  return await ctx.db.get(userId);
}

async function getAccessibleTeams(ctx: any, userId: any) {
  const ownedTeams = (await ctx.db.query('teams').collect()).filter((team: any) => team.ownerId === userId);
  const memberships = await ctx.db
    .query('teamMembers')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect();

  const memberTeamIds = new Set(memberships.map((membership: any) => String(membership.teamId)));
  const memberTeams = (await ctx.db.query('teams').collect()).filter((team: any) => memberTeamIds.has(String(team._id)));

  const allTeams = [...ownedTeams, ...memberTeams];
  const seen = new Set<string>();
  return allTeams.filter((team: any) => {
    if (seen.has(String(team._id))) return false;
    seen.add(String(team._id));
    return true;
  });
}

function getCurrentPeriodBounds(now: number) {
  const date = new Date(now);
  const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
  return { start, end };
}

async function insertLedgerEntry(ctx: any, args: {
  billingAccountId: any;
  entryType: 'grant' | 'usage' | 'adjustment' | 'topup';
  amount: number;
  balanceAfter: number;
  source: string;
  description?: string;
  metadata?: any;
  createdAt: number;
}) {
  await ctx.db.insert('creditLedgers', args);
}

async function getOrCreatePersonalBillingAccount(ctx: any, user: any) {
  const now = Date.now();
  const { start, end } = getCurrentPeriodBounds(now);

  let account = await ctx.db
    .query('billingAccounts')
    .withIndex('by_owner', (q: any) => q.eq('ownerId', user._id))
    .first();

  if (!account) {
    const monthlyCredits = PLAN_CONFIG.free.monthlyCredits;
    const accountId = await ctx.db.insert('billingAccounts', {
      scopeType: 'personal',
      ownerId: user._id,
      displayName: user.name || user.email,
      plan: 'free',
      status: 'active',
      monthlyCredits,
      creditBalance: monthlyCredits,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      createdAt: now,
      updatedAt: now,
    });

    await insertLedgerEntry(ctx, {
      billingAccountId: accountId,
      entryType: 'grant',
      amount: monthlyCredits,
      balanceAfter: monthlyCredits,
      source: 'monthly_allocation',
      description: 'Monthly free plan credits',
      createdAt: now,
    });

    return await ctx.db.get(accountId);
  }

  if (account.currentPeriodEnd <= now) {
    const monthlyCredits = account.monthlyCredits || PLAN_CONFIG[account.plan as keyof typeof PLAN_CONFIG].monthlyCredits;
    await ctx.db.patch(account._id, {
      creditBalance: monthlyCredits,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      updatedAt: now,
    });

    await insertLedgerEntry(ctx, {
      billingAccountId: account._id,
      entryType: 'grant',
      amount: monthlyCredits,
      balanceAfter: monthlyCredits,
      source: 'monthly_reset',
      description: 'Monthly credit reset',
      createdAt: now,
    });

    account = await ctx.db.get(account._id);
  }

  return account;
}

async function getOrCreateTeamBillingAccount(ctx: any, team: any) {
  const now = Date.now();
  const { start, end } = getCurrentPeriodBounds(now);

  let account = team.billingAccountId ? await ctx.db.get(team.billingAccountId) : null;

  if (!account) {
    account = await ctx.db
      .query('billingAccounts')
      .withIndex('by_team', (q: any) => q.eq('teamId', team._id))
      .first();
  }

  if (!account) {
    const monthlyCredits = PLAN_CONFIG.free.monthlyCredits;
    const accountId = await ctx.db.insert('billingAccounts', {
      scopeType: 'team',
      teamId: team._id,
      displayName: team.name,
      plan: 'free',
      status: 'active',
      monthlyCredits,
      creditBalance: monthlyCredits,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(team._id, {
      billingAccountId: accountId,
    });

    await insertLedgerEntry(ctx, {
      billingAccountId: accountId,
      entryType: 'grant',
      amount: monthlyCredits,
      balanceAfter: monthlyCredits,
      source: 'monthly_allocation',
      description: 'Monthly team credits',
      createdAt: now,
    });

    return await ctx.db.get(accountId);
  }

  if (!team.billingAccountId) {
    await ctx.db.patch(team._id, { billingAccountId: account._id });
  }

  if (account.currentPeriodEnd <= now) {
    const monthlyCredits = account.monthlyCredits || PLAN_CONFIG[account.plan as keyof typeof PLAN_CONFIG].monthlyCredits;
    await ctx.db.patch(account._id, {
      creditBalance: monthlyCredits,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      updatedAt: now,
    });

    await insertLedgerEntry(ctx, {
      billingAccountId: account._id,
      entryType: 'grant',
      amount: monthlyCredits,
      balanceAfter: monthlyCredits,
      source: 'monthly_reset',
      description: 'Monthly team credit reset',
      createdAt: now,
    });

    account = await ctx.db.get(account._id);
  }

  return account;
}

async function buildScopeSummary(ctx: any, account: any) {
  const recentLedger = await ctx.db
    .query('creditLedgers')
    .withIndex('by_account', (q: any) => q.eq('billingAccountId', account._id))
    .order('desc')
    .take(10);

  const recentUsage = await ctx.db
    .query('usageEvents')
    .withIndex('by_account', (q: any) => q.eq('billingAccountId', account._id))
    .order('desc')
    .take(10);

  return {
    account,
    recentLedger,
    recentUsage,
  };
}

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const account = await ctx.db
      .query('billingAccounts')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .first();

    if (!account) {
      return {
        account: null,
        recentLedger: [],
        recentUsage: [],
        featureCosts: FEATURE_COSTS,
      };
    }

    const recentLedger = await ctx.db
      .query('creditLedgers')
      .withIndex('by_account', (q) => q.eq('billingAccountId', account._id))
      .order('desc')
      .take(10);

    const recentUsage = await ctx.db
      .query('usageEvents')
      .withIndex('by_account', (q) => q.eq('billingAccountId', account._id))
      .order('desc')
      .take(10);

    return {
      account,
      recentLedger,
      recentUsage,
      featureCosts: FEATURE_COSTS,
    };
  },
});

export const workspaceSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const personalAccount = await ctx.db
      .query('billingAccounts')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .first();

    const teams = await getAccessibleTeams(ctx, user._id);
    const teamSummaries = [];
    for (const team of teams) {
      const account = team.billingAccountId
        ? await ctx.db.get(team.billingAccountId)
        : await ctx.db.query('billingAccounts').withIndex('by_team', (q: any) => q.eq('teamId', team._id)).first();

      if (!account) continue;

      teamSummaries.push({
        team,
        ...(await buildScopeSummary(ctx, account)),
      });
    }

    return {
      personal: personalAccount ? await buildScopeSummary(ctx, personalAccount) : null,
      teams: teamSummaries,
      featureCosts: FEATURE_COSTS,
    };
  },
});

export const ensurePersonalAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error('Not authenticated');

    const account = await getOrCreatePersonalBillingAccount(ctx, user);
    return account;
  },
});

export const ensureWorkspaceAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error('Not authenticated');

    const personal = await getOrCreatePersonalBillingAccount(ctx, user);
    const teams = await getAccessibleTeams(ctx, user._id);
    const teamAccounts = [];

    for (const team of teams) {
      const account = await getOrCreateTeamBillingAccount(ctx, team);
      teamAccounts.push(account);
    }

    return { personal, teamAccounts };
  },
});

export const consumeCredits = mutation({
  args: {
    feature: v.string(),
    units: v.optional(v.number()),
    teamId: v.optional(v.id('teams')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error('Not authenticated');

    let account;
    let scopeLabel = 'personal';
    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (!team) throw new Error('Team not found');
      const teams = await getAccessibleTeams(ctx, user._id);
      const hasAccess = teams.some((candidate: any) => String(candidate._id) === String(args.teamId));
      if (!hasAccess) throw new Error('You do not have access to this billing account.');
      account = await getOrCreateTeamBillingAccount(ctx, team);
      scopeLabel = `team:${team.name}`;
    } else {
      account = await getOrCreatePersonalBillingAccount(ctx, user);
    }

    if (!account) throw new Error('Billing account not found');

    const units = Math.max(1, args.units || 1);
    const unitCost = FEATURE_COSTS[args.feature] || 0;
    const totalCost = unitCost * units;

    if (totalCost <= 0) {
      return {
        success: true,
        remainingCredits: account.creditBalance,
        costCredits: 0,
      };
    }

    if (account.creditBalance < totalCost) {
      throw new Error(`Not enough credits. Need ${totalCost}, have ${account.creditBalance}.`);
    }

    const newBalance = account.creditBalance - totalCost;
    const now = Date.now();

    await ctx.db.patch(account._id, {
      creditBalance: newBalance,
      updatedAt: now,
    });

    await insertLedgerEntry(ctx, {
      billingAccountId: account._id,
      entryType: 'usage',
      amount: -totalCost,
      balanceAfter: newBalance,
      source: args.feature,
      description: `Usage for ${args.feature} (${scopeLabel})`,
      metadata: args.metadata,
      createdAt: now,
    });

    await ctx.db.insert('usageEvents', {
      billingAccountId: account._id,
      ownerId: user._id,
      feature: args.feature,
      units,
      costCredits: totalCost,
      metadata: args.metadata,
      createdAt: now,
    });

    return {
      success: true,
      remainingCredits: newBalance,
      costCredits: totalCost,
    };
  },
});

export const grantCredits = mutation({
  args: {
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error('Not authenticated');

    const account = await getOrCreatePersonalBillingAccount(ctx, user);
    if (!account) throw new Error('Billing account not found');

    const now = Date.now();
    const newBalance = account.creditBalance + args.amount;

    await ctx.db.patch(account._id, {
      creditBalance: newBalance,
      updatedAt: now,
    });

    await insertLedgerEntry(ctx, {
      billingAccountId: account._id,
      entryType: args.amount >= 0 ? 'adjustment' : 'usage',
      amount: args.amount,
      balanceAfter: newBalance,
      source: 'manual_adjustment',
      description: args.description,
      createdAt: now,
    });

    return { success: true, remainingCredits: newBalance };
  },
});
