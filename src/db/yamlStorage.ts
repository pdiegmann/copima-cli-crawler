import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { parse, stringify } from "yaml";
import { createLogger } from "../logging";
import type { Account, NewAccount, NewUser, User } from "./types";

const logger = createLogger("YamlStorage");

export type YamlStorageData = {
  users: User[];
  accounts: Account[];
};

export class YamlStorage {
  private readonly filePath: string;
  private data: YamlStorageData;
  private isDirty: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = this.loadData();

    // Create the file if it doesn't exist
    if (!existsSync(this.filePath)) {
      this.saveData();
    }
  }

  private loadData(): YamlStorageData {
    if (!existsSync(this.filePath)) {
      logger.info(`YAML storage file not found at ${this.filePath}, creating new file`);
      return { users: [], accounts: [] };
    }

    try {
      const content = readFileSync(this.filePath, "utf8");
      const parsed = parse(content) as YamlStorageData;

      // Ensure the structure is valid
      if (!parsed || typeof parsed !== "object") {
        logger.warn("Invalid YAML storage file, initializing with empty data");
        return { users: [], accounts: [] };
      }

      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      };
    } catch (error) {
      logger.error(`Failed to load YAML storage from ${this.filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { users: [], accounts: [] };
    }
  }

  private saveData(): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const content = stringify(this.data, {
        lineWidth: 0, // Disable line wrapping
        indent: 2,
      });

      writeFileSync(this.filePath, content, "utf8");
      this.isDirty = false;
      logger.debug(`Saved YAML storage to ${this.filePath}`);
    } catch (error) {
      logger.error(`Failed to save YAML storage to ${this.filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // User operations
  insertUser(user: NewUser): void {
    const existingIndex = this.data.users.findIndex((u) => u.id === user.id);
    if (existingIndex !== -1) {
      throw new Error(`User with id ${user.id} already exists`);
    }

    this.data.users.push(user as User);
    this.isDirty = true;
    this.saveData();
  }

  upsertUser(user: NewUser, conflictField: keyof User = "email"): User {
    const existingIndex = this.data.users.findIndex((u) => u[conflictField] === user[conflictField]);

    if (existingIndex !== -1) {
      // Update existing user
      const existing = this.data.users[existingIndex]!;
      this.data.users[existingIndex] = {
        ...existing,
        ...user,
        id: existing.id, // Keep original ID
        createdAt: existing.createdAt, // Keep original creation time
        updatedAt: user.updatedAt || new Date(),
      };
      this.isDirty = true;
      this.saveData();
      return this.data.users[existingIndex]!;
    } else {
      // Insert new user
      const newUser = user as User;
      this.data.users.push(newUser);
      this.isDirty = true;
      this.saveData();
      return newUser;
    }
  }

  findUserById(id: string): User | null {
    return this.data.users.find((u) => u.id === id) || null;
  }

  findUserByEmail(email: string): User | null {
    return this.data.users.find((u) => u.email === email) || null;
  }

  deleteUser(id: string): void {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      this.data.users.splice(index, 1);
      // Delete associated accounts
      this.data.accounts = this.data.accounts.filter((a) => a.userId !== id);
      this.isDirty = true;
      this.saveData();
    }
  }

  // Account operations
  insertAccount(account: NewAccount): void {
    const existingIndex = this.data.accounts.findIndex((a) => a.id === account.id);
    if (existingIndex !== -1) {
      throw new Error(`Account with id ${account.id} already exists`);
    }

    // Verify user exists
    const userExists = this.data.users.some((u) => u.id === account.userId);
    if (!userExists) {
      throw new Error(`User with id ${account.userId} not found`);
    }

    this.data.accounts.push(account as Account);
    this.isDirty = true;
    this.saveData();
  }

  findAccountByAccountId(accountId: string): Account | null {
    return this.data.accounts.find((a) => a.accountId === accountId) || null;
  }

  findAccountsByUserId(userId: string): Account[] {
    return this.data.accounts.filter((a) => a.userId === userId);
  }

  getAllAccounts(): Account[] {
    return [...this.data.accounts];
  }

  updateAccount(accountId: string, updates: Partial<Account>): void {
    const index = this.data.accounts.findIndex((a) => a.accountId === accountId);
    if (index === -1) {
      throw new Error(`Account with accountId ${accountId} not found`);
    }

    this.data.accounts[index] = {
      ...this.data.accounts[index]!,
      ...updates,
      updatedAt: new Date(),
    };
    this.isDirty = true;
    this.saveData();
  }

  deleteAccount(accountId: string): void {
    const index = this.data.accounts.findIndex((a) => a.accountId === accountId);
    if (index !== -1) {
      this.data.accounts.splice(index, 1);
      this.isDirty = true;
      this.saveData();
    }
  }

  // Combined operations for joins
  getAccountsWithUsers(): Array<Account & { user: User }> {
    return this.data.accounts
      .map((account) => {
        const user = this.data.users.find((u) => u.id === account.userId);
        if (!user) return null;
        return { ...account, user };
      })
      .filter((item): item is Account & { user: User } => item !== null);
  }

  // Utility methods
  flush(): void {
    if (this.isDirty) {
      this.saveData();
    }
  }

  reload(): void {
    this.data = this.loadData();
    this.isDirty = false;
  }

  clear(): void {
    this.data = { users: [], accounts: [] };
    this.isDirty = true;
    this.saveData();
  }
}
