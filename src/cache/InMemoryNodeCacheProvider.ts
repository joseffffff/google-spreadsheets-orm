import { CacheProvider } from './CacheProvider';
import NodeCache from 'node-cache';

const DEFAULT_CACHE_TTL_SECONDS: number = 10;

export class InMemoryNodeCacheProvider implements CacheProvider {
  private readonly innerCache: NodeCache;

  public constructor(ttlSeconds: number | undefined) {
    this.innerCache = new NodeCache({
      stdTTL: ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS,
    });
  }

  public async get<T>(key: string): Promise<T | undefined> {
    return this.innerCache.get(key);
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.innerCache.set(key, value);
  }

  public async invalidate(keys: string[]): Promise<void> {
    this.innerCache.del(keys);
  }
}
