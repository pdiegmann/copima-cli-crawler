// src/db/schema.test.ts

import { describe, expect, it } from "@jest/globals";
import * as schema from "./schema";

describe("db/schema", () => {
  it("should export User type definition", () => {
    expect(typeof schema).toBe("object");
    expect(schema.user).toBeDefined();
  });

  it("should export Account type definition", () => {
    expect(schema.account).toBeDefined();
  });

  it("should have correct user field mappings", () => {
    expect(schema.user.id).toBe("id");
    expect(schema.user.name).toBe("name");
    expect(schema.user.email).toBe("email");
    expect(schema.user.emailVerified).toBe("emailVerified");
  });

  it("should have correct account field mappings", () => {
    expect(schema.account.id).toBe("id");
    expect(schema.account.accountId).toBe("accountId");
    expect(schema.account.providerId).toBe("providerId");
    expect(schema.account.userId).toBe("userId");
    expect(schema.account.accessToken).toBe("accessToken");
    expect(schema.account.refreshToken).toBe("refreshToken");
  });

  it("should have all required user fields", () => {
    const expectedFields = ["id", "name", "email", "emailVerified", "image", "role", "banned", "banReason", "banExpires", "createdAt", "updatedAt"];
    const actualFields = Object.keys(schema.user);
    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });

  it("should have all required account fields", () => {
    const expectedFields = [
      "id",
      "accountId",
      "providerId",
      "userId",
      "accessToken",
      "refreshToken",
      "accessTokenExpiresAt",
      "refreshTokenExpiresAt",
      "idToken",
      "scope",
      "password",
      "createdAt",
      "updatedAt",
    ];
    const actualFields = Object.keys(schema.account);
    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
