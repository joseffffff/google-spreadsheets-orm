import { Options } from '../Options';
import { BaseModel } from '../BaseModel';
import { CacheProvider } from './CacheProvider';
import { InMemoryNodeCacheProvider } from './InMemoryNodeCacheProvider';
import { sheets_v4 } from 'googleapis';
import { GaxiosResponse } from 'gaxios';

export class CacheManager<T extends BaseModel> {
  private readonly cacheEnabled: boolean;
  private readonly cacheProvider: CacheProvider;

  private readonly headersKey: string;
  private readonly contentKey: string;
  private readonly sheetDetailsKey: string;

  constructor(options: Options<T>) {
    this.headersKey = `headers-${options.sheet}`;
    this.contentKey = `content-${options.sheet}`;
    this.sheetDetailsKey = `details-${options.sheet}`;
    this.cacheEnabled = !!options.cacheEnabled;
    this.cacheProvider = options.cacheProvider ?? new InMemoryNodeCacheProvider(options.cacheTtlSeconds);
  }

  public getHeadersOr(func: () => Promise<string[]>): Promise<string[]> {
    return this.getOr(this.headersKey, func);
  }

  public cacheHeaders(headers: string[]): Promise<void> {
    return this.cacheProvider.set(this.headersKey, headers);
  }

  public getContentOr<T>(func: () => Promise<T[]>): Promise<T[]> {
    return this.getOr(this.contentKey, func);
  }

  public async getSheetDetailsOr(
    func: () => Promise<GaxiosResponse<sheets_v4.Schema$Spreadsheet>>,
  ): Promise<GaxiosResponse<sheets_v4.Schema$Spreadsheet>> {
    return this.getOr(this.sheetDetailsKey, func);
  }

  public invalidate(): Promise<void> {
    return this.cacheProvider.invalidate([
      this.headersKey,
      this.contentKey,
      // not removing details key
    ]);
  }

  private async getOr<T>(key: string, func: () => Promise<T>): Promise<T> {
    if (!this.cacheEnabled) {
      return func();
    }

    const cacheData = await this.cacheProvider.get<T>(key);

    if (!!cacheData) {
      return cacheData;
    }

    const data = await func();

    await this.cacheProvider.set<T>(key, data);

    return data;
  }
}
