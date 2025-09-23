import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { user, account } from './schema.js';

// User types
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;
export type UserUpdate = Partial<Omit<NewUser, 'id' | 'createdAt'>>;

// Account types
export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;
export type AccountUpdate = Partial<Omit<NewAccount, 'id' | 'createdAt'>>;

// Combined types for OAuth authentication
export type UserWithAccounts = {
  accounts: Account[];
} & User;

export type AccountWithUser = {
  user: User;
} & Account;

// OAuth-specific types
export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
};

export type GitLabAccount = {
  host: string;
  accessToken: string;
  refreshToken?: string;
  userId: string;
  accountId: string;
};

// Database operation result types
export type DatabaseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};
