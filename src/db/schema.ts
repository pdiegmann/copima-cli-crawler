// Schema definitions are now handled by types.ts
// This file is kept for backward compatibility but exports are from types.ts

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

// For backward compatibility, create mock table objects
export const user = {
  id: "id",
  name: "name",
  email: "email",
  emailVerified: "emailVerified",
  image: "image",
  role: "role",
  banned: "banned",
  banReason: "banReason",
  banExpires: "banExpires",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export const account = {
  id: "id",
  accountId: "accountId",
  providerId: "providerId",
  userId: "userId",
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  accessTokenExpiresAt: "accessTokenExpiresAt",
  refreshTokenExpiresAt: "refreshTokenExpiresAt",
  idToken: "idToken",
  scope: "scope",
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords
  password: "password", // This is a field name, not a hardcoded password
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;
