/**
 * Local type declarations for better-sqlite3 v12.
 * Overrides @types/better-sqlite3 v7 which targets an older API.
 */

declare module 'better-sqlite3' {
  interface DatabaseOptions {
    readonly?: boolean;
    timeout?: number;
    verbose?: null;
    nativeBinding?: string;
  }

  interface Statement<_BindArgs extends unknown[] = unknown[]> {
    run(...params: BindArgs): Record<string, unknown>;
    get(...params: BindArgs): Record<string, unknown> | undefined;
    all(...params: BindArgs): Record<string, unknown>[];
    expandParams(): Statement<BindArgs>;
    raw<T>(enabled?: boolean): this;
    bind(...params: BindArgs): this;
    iterate(...params: BindArgs): IterableIterator<Record<string, unknown>>;
    pragma(value: string, options?: { simple?: boolean }): string | Record<string, string> | undefined;
  }

  interface Database {
     
    prepare<T extends any[] = any[]>(sql: string): Statement<T>;
    exec(sql: string): this;
    transaction<T extends (...args: unknown[]) => unknown>(fn: T): T;
    serialize<T extends (...args: unknown[]) => unknown>(fn: T): T;
    backup(target: string | Database, options?: { progress?: (n: number) => void }): this;
    pragma(value: string, options?: { simple?: boolean }): string | Record<string, string> | undefined;
    close(): void;
    readonly: boolean;
  }

  interface Factory {
    new (location: string, options?: DatabaseOptions): Database;
    (location: string, options?: DatabaseOptions): Database;
  }

  const Database: Factory & ((location: string, options?: DatabaseOptions) => Database);
  export default Database;
}
