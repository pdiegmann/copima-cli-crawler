// Mock for bun:sqlite module
export class Database {
  constructor(_path: string, _options?: any) {
    // Mock implementation
  }

  exec(_sql: string): any {
    // Mock implementation
    return {};
  }

  query(_sql: string): any {
    // Mock implementation
    return {
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    };
  }

  close(): void {
    // Mock implementation
  }
}
