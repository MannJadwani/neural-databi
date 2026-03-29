import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { generateApiKeySecret, getApiKeyPrefix, hashApiKey, maskApiKey } from './apiKeyUtils';

const DEFAULT_SCOPES = ['csv_import'];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .order('desc')
      .collect();

    return keys.map((key) => ({
      _id: key._id,
      label: key.label,
      keyPreview: maskApiKey(key.keyPrefix),
      scopes: key.scopes,
      status: key.status,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      lastUsedAt: key.lastUsedAt,
    }));
  },
});

export const create = mutation({
  args: {
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const label = args.label.trim();
    if (!label) {
      throw new Error('API key label is required');
    }

    const secret = generateApiKeySecret();
    const now = Date.now();
    const keyId = await ctx.db.insert('apiKeys', {
      ownerId: userId,
      label,
      keyPrefix: getApiKeyPrefix(secret),
      keyHash: await hashApiKey(secret),
      scopes: DEFAULT_SCOPES,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: keyId,
      label,
      key: secret,
      keyPreview: maskApiKey(getApiKeyPrefix(secret)),
      scopes: DEFAULT_SCOPES,
      createdAt: now,
    };
  },
});

export const revoke = mutation({
  args: {
    id: v.id('apiKeys'),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.ownerId !== userId) {
      throw new Error('API key not found');
    }

    await ctx.db.patch(args.id, {
      status: 'revoked',
      updatedAt: Date.now(),
    });
  },
});

export const getActiveByHash = internalQuery({
  args: {
    keyHash: v.string(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query('apiKeys')
      .withIndex('by_key_hash', (q) => q.eq('keyHash', args.keyHash))
      .unique();

    if (!key || key.status !== 'active' || !key.scopes.includes(args.scope)) {
      return null;
    }

    return {
      _id: key._id,
      ownerId: key.ownerId,
      label: key.label,
    };
  },
});

export const markUsed = internalMutation({
  args: {
    id: v.id('apiKeys'),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.id);
    if (!key) return;

    await ctx.db.patch(args.id, {
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

async function requireCurrentUserId(ctx: {
  auth: { getUserIdentity: () => Promise<any> };
  db: {
    query: (table: 'users') => any;
  };
}): Promise<Id<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  const user: Doc<'users'> | null = await ctx.db
    .query('users')
    .withIndex('by_workos_id', (q: any) => q.eq('workosId', identity.subject))
    .first();

  if (!user) {
    throw new Error('User record not found');
  }

  return user._id;
}
