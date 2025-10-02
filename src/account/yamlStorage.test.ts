// src/db/yamlStorage.test.ts

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import type { NewAccount, NewUser } from "./types";
import { YamlStorage } from "./yamlStorage";

const TEST_DIR = join(__dirname, "../../test-tmp");
const TEST_FILE = join(TEST_DIR, "test-storage.yaml");

describe("YamlStorage", () => {
  let storage: YamlStorage;

  beforeEach(() => {
    // Ensure test directory exists
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }

    // Remove test file if it exists
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }

    storage = new YamlStorage(TEST_FILE);
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
  });

  describe("initialization", () => {
    it("should create empty storage when file does not exist", () => {
      expect(storage.getAllAccounts()).toEqual([]);
    });

    it("should load existing data from file", () => {
      const testData = {
        users: [
          {
            id: "user1",
            name: "Test User",
            email: "test@example.com",
            emailVerified: true,
            image: null,
            role: null,
            banned: null,
            banReason: null,
            banExpires: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ],
        accounts: [],
      };

      writeFileSync(TEST_FILE, JSON.stringify(testData), "utf8");
      const newStorage = new YamlStorage(TEST_FILE);
      expect(newStorage.findUserById("user1")).toBeTruthy();
    });

    it("should handle corrupted YAML file gracefully", () => {
      writeFileSync(TEST_FILE, "invalid: yaml: content: :::::", "utf8");
      const newStorage = new YamlStorage(TEST_FILE);
      expect(newStorage.getAllAccounts()).toEqual([]);
    });
  });

  describe("user operations", () => {
    const testUser: NewUser = {
      id: "user123",
      name: "John Doe",
      email: "john@example.com",
      emailVerified: true,
      image: "https://example.com/avatar.jpg",
      role: "admin",
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    describe("insertUser", () => {
      it("should insert a new user", () => {
        storage.insertUser(testUser);
        const found = storage.findUserById(testUser.id);
        expect(found).toBeTruthy();
        expect(found?.email).toBe(testUser.email);
      });

      it("should throw error when inserting duplicate user ID", () => {
        storage.insertUser(testUser);
        expect(() => storage.insertUser(testUser)).toThrow("User with id user123 already exists");
      });

      it("should persist user to file", () => {
        storage.insertUser(testUser);
        const newStorage = new YamlStorage(TEST_FILE);
        expect(newStorage.findUserById(testUser.id)).toBeTruthy();
      });
    });

    describe("upsertUser", () => {
      it("should insert new user when not exists", () => {
        const result = storage.upsertUser(testUser);
        expect(result.id).toBe(testUser.id);
        expect(storage.findUserById(testUser.id)).toBeTruthy();
      });

      it("should update existing user by email", () => {
        storage.insertUser(testUser);
        const updated = storage.upsertUser({
          ...testUser,
          name: "Jane Doe",
        });
        expect(updated.name).toBe("Jane Doe");
        expect(updated.id).toBe(testUser.id); // ID should remain the same
      });

      it("should keep original createdAt when updating", () => {
        storage.insertUser(testUser);
        const updated = storage.upsertUser({
          ...testUser,
          name: "Updated Name",
          updatedAt: new Date("2024-02-01"),
        });
        expect(updated.createdAt).toEqual(testUser.createdAt);
      });
    });

    describe("findUserById", () => {
      it("should find user by ID", () => {
        storage.insertUser(testUser);
        const found = storage.findUserById(testUser.id);
        expect(found?.email).toBe(testUser.email);
      });

      it("should return null when user not found", () => {
        expect(storage.findUserById("nonexistent")).toBeNull();
      });
    });

    describe("findUserByEmail", () => {
      it("should find user by email", () => {
        storage.insertUser(testUser);
        const found = storage.findUserByEmail(testUser.email);
        expect(found?.id).toBe(testUser.id);
      });

      it("should return null when user not found", () => {
        expect(storage.findUserByEmail("nonexistent@example.com")).toBeNull();
      });
    });

    describe("deleteUser", () => {
      it("should delete user and associated accounts", () => {
        storage.insertUser(testUser);
        const account: NewAccount = {
          id: "acc1",
          accountId: "gitlab:1",
          providerId: "gitlab",
          userId: testUser.id,
          accessToken: "token123",
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          idToken: null,
          scope: null,
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        storage.insertAccount(account);

        storage.deleteUser(testUser.id);
        expect(storage.findUserById(testUser.id)).toBeNull();
        expect(storage.findAccountsByUserId(testUser.id)).toHaveLength(0);
      });
    });
  });

  describe("account operations", () => {
    const testUser: NewUser = {
      id: "user456",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      role: null,
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const testAccount: NewAccount = {
      id: "acc123",
      accountId: "gitlab:123",
      providerId: "gitlab",
      userId: testUser.id,
      accessToken: "token123",
      refreshToken: "refresh123",
      accessTokenExpiresAt: new Date("2024-12-31"),
      refreshTokenExpiresAt: new Date("2025-01-31"),
      idToken: "id123",
      scope: "api read_user",
      password: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    beforeEach(() => {
      storage.insertUser(testUser);
    });

    describe("insertAccount", () => {
      it("should insert a new account", () => {
        storage.insertAccount(testAccount);
        const found = storage.findAccountByAccountId(testAccount.accountId);
        expect(found).toBeTruthy();
        expect(found?.accessToken).toBe(testAccount.accessToken);
      });

      it("should throw error when user does not exist", () => {
        const invalidAccount = { ...testAccount, userId: "nonexistent" };
        expect(() => storage.insertAccount(invalidAccount)).toThrow("User with id nonexistent not found");
      });

      it("should throw error when inserting duplicate account ID", () => {
        storage.insertAccount(testAccount);
        expect(() => storage.insertAccount(testAccount)).toThrow("Account with id acc123 already exists");
      });
    });

    describe("findAccountByAccountId", () => {
      it("should find account by accountId", () => {
        storage.insertAccount(testAccount);
        const found = storage.findAccountByAccountId(testAccount.accountId);
        expect(found?.userId).toBe(testUser.id);
      });

      it("should return null when account not found", () => {
        expect(storage.findAccountByAccountId("nonexistent")).toBeNull();
      });
    });

    describe("findAccountsByUserId", () => {
      it("should find all accounts for a user", () => {
        const account2: NewAccount = {
          ...testAccount,
          id: "acc456",
          accountId: "github:456",
          providerId: "github",
        };
        storage.insertAccount(testAccount);
        storage.insertAccount(account2);

        const accounts = storage.findAccountsByUserId(testUser.id);
        expect(accounts).toHaveLength(2);
      });

      it("should return empty array when user has no accounts", () => {
        expect(storage.findAccountsByUserId(testUser.id)).toEqual([]);
      });
    });

    describe("updateAccount", () => {
      it("should update account fields", () => {
        storage.insertAccount(testAccount);
        storage.updateAccount(testAccount.accountId, {
          accessToken: "newtoken",
          refreshToken: "newrefresh",
        });

        const updated = storage.findAccountByAccountId(testAccount.accountId);
        expect(updated?.accessToken).toBe("newtoken");
        expect(updated?.refreshToken).toBe("newrefresh");
      });

      it("should update updatedAt timestamp", () => {
        storage.insertAccount(testAccount);
        const before = new Date();
        storage.updateAccount(testAccount.accountId, { accessToken: "updated" });
        const updated = storage.findAccountByAccountId(testAccount.accountId);
        expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it("should throw error when account not found", () => {
        expect(() => storage.updateAccount("nonexistent", { accessToken: "new" })).toThrow(
          "Account with accountId nonexistent not found"
        );
      });
    });

    describe("deleteAccount", () => {
      it("should delete account", () => {
        storage.insertAccount(testAccount);
        storage.deleteAccount(testAccount.accountId);
        expect(storage.findAccountByAccountId(testAccount.accountId)).toBeNull();
      });

      it("should not throw error when account does not exist", () => {
        expect(() => storage.deleteAccount("nonexistent")).not.toThrow();
      });
    });

    describe("getAccountsWithUsers", () => {
      it("should return accounts with user data", () => {
        storage.insertAccount(testAccount);
        const result = storage.getAccountsWithUsers();
        expect(result).toHaveLength(1);
        expect(result[0]?.user.id).toBe(testUser.id);
        expect(result[0]?.accessToken).toBe(testAccount.accessToken);
      });

      it("should filter out accounts with missing users", () => {
        storage.insertAccount(testAccount);
        // Manually corrupt data to have orphaned account
        storage.deleteUser(testUser.id);
        const result = storage.getAccountsWithUsers();
        expect(result).toHaveLength(0);
      });
    });
  });

  describe("utility methods", () => {
    it("should flush pending changes", () => {
      const testUser: NewUser = {
        id: "user789",
        name: "Test",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: null,
        banned: false,
        banReason: null,
        banExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storage.insertUser(testUser);
      storage.flush();
      const newStorage = new YamlStorage(TEST_FILE);
      expect(newStorage.findUserById(testUser.id)).toBeTruthy();
    });

    it("should reload data from file", () => {
      const testUser: NewUser = {
        id: "user999",
        name: "Test",
        email: "reload@example.com",
        emailVerified: true,
        image: null,
        role: null,
        banned: false,
        banReason: null,
        banExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storage.insertUser(testUser);

      // Create new storage instance and add data
      const storage2 = new YamlStorage(TEST_FILE);
      const newUser: NewUser = {
        id: "user888",
        name: "New User",
        email: "new@example.com",
        emailVerified: true,
        image: null,
        role: null,
        banned: false,
        banReason: null,
        banExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      storage2.insertUser(newUser);

      // Reload original storage
      storage.reload();
      expect(storage.findUserById(newUser.id)).toBeTruthy();
    });

    it("should clear all data", () => {
      const testUser: NewUser = {
        id: "user111",
        name: "Test",
        email: "clear@example.com",
        emailVerified: true,
        image: null,
        role: null,
        banned: false,
        banReason: null,
        banExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storage.insertUser(testUser);
      storage.clear();
      expect(storage.findUserById(testUser.id)).toBeNull();
      expect(storage.getAllAccounts()).toEqual([]);
    });
  });
});
