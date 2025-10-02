// User types
export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserUpdate = Partial<Omit<NewUser, "id" | "createdAt">>;

// Account types
export type Account = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  idToken: string | null;
  scope: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewAccount = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  idToken?: string | null;
  scope?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountUpdate = Partial<Omit<NewAccount, "id" | "createdAt">>;

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
