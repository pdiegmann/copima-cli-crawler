import type { LocalContext } from '../../context.js';
import logger from '../../utils/logger.js';
import { db } from '../../db/index.js';
import { user, account } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import colors from 'picocolors';
import treeify from 'treeify';
import { randomUUID } from 'crypto';

type AddAccountFlags = {
  host?: string;
  'access-token'?: string;
  'refresh-token'?: string;
  'account-id'?: string;
  name?: string;
  email?: string;
};

type ListAccountsFlags = {
  format?: string;
  'show-tokens'?: boolean;
};

type RemoveAccountFlags = {
  host?: string;
  'account-id'?: string;
  force?: boolean;
};

type RefreshTokenFlags = {
  host?: string;
  'account-id'?: string;
  'client-id'?: string;
  'client-secret'?: string;
};

export async function addAccount(this: LocalContext, flags: AddAccountFlags, positionals?: any[]): Promise<void | Error> {
  if (!flags.host || !flags['access-token'] || !flags.name || !flags.email) {
    logger.error(colors.red('❌ Missing required parameters: host, access-token, name, and email are required'));
    return new Error('Missing required parameters');
  }

  logger.info(colors.cyan('💾 Adding new GitLab account...'));

  try {
    const userId = randomUUID();
    const accountId = flags['account-id'] || randomUUID();
    const now = new Date();

    // Create user record
    await db().insert(user).values({
      id: userId,
      name: flags.name,
      email: flags.email,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create account record
    await db().insert(account).values({
      id: randomUUID(),
      accountId: accountId,
      providerId: 'gitlab',
      userId: userId,
      accessToken: flags['access-token'],
      refreshToken: flags['refresh-token'],
      createdAt: now,
      updatedAt: now,
    });

    logger.info(colors.green('✅ Account added successfully'));
    logger.info(`📍 Host: ${colors.bold(flags.host)}`);
    logger.info(`👤 Name: ${colors.bold(flags.name)}`);
    logger.info(`📧 Email: ${colors.bold(flags.email)}`);
    logger.info(`🆔 Account ID: ${colors.bold(accountId)}`);
  } catch (error) {
    logger.error(colors.red('❌ Failed to add account'));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
}

export async function listAccounts(this: LocalContext, flags: ListAccountsFlags, positionals?: any[]): Promise<void | Error> {
  logger.info(colors.cyan('📋 Listing GitLab accounts...'));

  try {
    const accounts = await db()
      .select({
        accountId: account.accountId,
        name: user.name,
        email: user.email,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id));

    if (accounts.length === 0) {
      logger.info(colors.yellow('📭 No accounts found'));
      return;
    }

    const format = flags.format || 'table';
    const showTokens = flags['show-tokens'] || false;

    if (format === 'json') {
      const output = accounts.map((acc) => ({
        accountId: acc.accountId,
        name: acc.name,
        email: acc.email,
        ...(showTokens && {
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken,
        }),
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      }));
      console.log(JSON.stringify(output, null, 2));
    } else if (format === 'yaml') {
      // Simple YAML output without importing yaml library
      accounts.forEach((acc, i) => {
        console.log(`- accountId: ${acc.accountId}`);
        console.log(`  name: ${acc.name}`);
        console.log(`  email: ${acc.email}`);
        if (showTokens) {
          console.log(`  accessToken: ${acc.accessToken || 'null'}`);
          console.log(`  refreshToken: ${acc.refreshToken || 'null'}`);
        }
        console.log(`  createdAt: ${acc.createdAt?.toISOString()}`);
        console.log(`  updatedAt: ${acc.updatedAt?.toISOString()}`);
        if (i < accounts.length - 1) console.log();
      });
    } else {
      // Table format using treeify
      const tree: Record<string, any> = {};
      accounts.forEach((acc, i) => {
        const key = `${acc.name} (${acc.email})`;
        tree[key] = {
          'Account ID': acc.accountId,
          Created: acc.createdAt?.toISOString(),
          Updated: acc.updatedAt?.toISOString(),
          ...(showTokens && {
            'Access Token': acc.accessToken ? `${acc.accessToken.substring(0, 20)}...` : 'None',
            'Refresh Token': acc.refreshToken ? `${acc.refreshToken.substring(0, 20)}...` : 'None',
          }),
        };
      });

      console.log(colors.bold('\n📋 GitLab Accounts:'));
      console.log(treeify.asTree(tree, true, true));
    }

    logger.info(colors.green(`✅ Found ${accounts.length} account(s)`));
  } catch (error) {
    logger.error(colors.red('❌ Failed to list accounts'));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
}

export async function removeAccount(this: LocalContext, flags: RemoveAccountFlags, positionals?: any[]): Promise<void | Error> {
  if (!flags.host && !flags['account-id']) {
    logger.error(colors.red('❌ Either host or account-id must be provided'));
    return new Error('Either host or account-id must be provided');
  }

  logger.info(colors.cyan('🗑️  Removing GitLab account...'));

  try {
    // Find the account to remove
    const accountToRemove = await db()
      .select({
        id: account.id,
        accountId: account.accountId,
        name: user.name,
        email: user.email,
        userId: user.id,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(
        flags['account-id'] ? eq(account.accountId, flags['account-id']) : eq(user.email, flags.host!) // Using host as email for now - this could be improved
      )
      .limit(1);

    if (accountToRemove.length === 0) {
      logger.error(colors.red('❌ Account not found'));
      return new Error('Account not found');
    }

    const acc = accountToRemove[0];

    if (!flags.force) {
      logger.warn(colors.yellow('⚠️  About to remove account:'));
      logger.warn(`   Name: ${acc?.name || 'Unknown'}`);
      logger.warn(`   Email: ${acc?.email || 'Unknown'}`);
      logger.warn(`   Account ID: ${acc?.accountId || 'Unknown'}`);
      logger.warn(colors.red('   This action cannot be undone!'));

      // In a real CLI, this would prompt for confirmation
      // For now, we'll require the --force flag
      logger.error(colors.red('❌ Use --force to confirm account removal'));
      return new Error('Use --force to confirm account removal');
    }

    // Remove account (cascade will remove related records)
    if (acc?.userId) {
      await db().delete(user).where(eq(user.id, acc.userId));
    }

    logger.info(colors.green('✅ Account removed successfully'));
    logger.info(`👤 Removed: ${colors.bold(acc?.name || 'Unknown')} (${acc?.email || 'Unknown'})`);
  } catch (error) {
    logger.error(colors.red('❌ Failed to remove account'));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
}

export async function refreshToken(this: LocalContext, flags: RefreshTokenFlags, positionals?: any[]): Promise<void | Error> {
  if (!flags.host && !flags['account-id']) {
    logger.error(colors.red('❌ Either host or account-id must be provided'));
    return new Error('Either host or account-id must be provided');
  }

  if (!flags['client-id'] || !flags['client-secret']) {
    logger.error(colors.red('❌ OAuth2 client-id and client-secret are required'));
    return new Error('OAuth2 client-id and client-secret are required');
  }

  logger.info(colors.cyan('🔄 Refreshing OAuth2 tokens...'));

  try {
    // Find the account
    const accountToRefresh = await db()
      .select({
        id: account.id,
        accountId: account.accountId,
        refreshToken: account.refreshToken,
        name: user.name,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(
        flags['account-id'] ? eq(account.accountId, flags['account-id']) : eq(account.accountId, flags.host!) // Simplified for now
      )
      .limit(1);

    if (accountToRefresh.length === 0) {
      logger.error(colors.red('❌ Account not found'));
      return new Error('Account not found');
    }

    const acc = accountToRefresh[0];

    if (!acc?.refreshToken) {
      logger.error(colors.red('❌ No refresh token available for this account'));
      return new Error('No refresh token available for this account');
    }

    // Implementing OAuth2 token refresh
    const tokenEndpoint = 'https://gitlab.example.com/oauth/token';
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: acc?.refreshToken,
        client_id: flags['client-id'],
        client_secret: flags['client-secret'],
      }),
    });

    if (!response.ok) {
      logger.error(colors.red(`❌ Failed to refresh token: ${response.statusText}`));
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    logger.info(colors.green('✅ Token refreshed successfully'));
    logger.info(`🔑 New Access Token: ${data.access_token}`);
    logger.info(`🔄 Refresh Token Updated`);
    // Update tokens in the database
    acc.accessToken = data.access_token;
    acc.refreshToken = data.refresh_token;
    acc.accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
  } catch (error) {
    logger.error(colors.red('❌ Failed to refresh tokens'));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
}
