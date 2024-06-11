import { Options } from '../Options';
import { BaseModel } from '../BaseModel';
import { CacheProvider } from './CacheProvider';
import { InMemoryNodeCacheProvider } from './InMemoryNodeCacheProvider';
import { sheets_v4 } from 'googleapis';
import { GaxiosResponse } from 'gaxios';

export class CacheManager<T extends BaseModel> {
  private readonly sheet: string;
  private readonly cacheEnabled: boolean;
  private readonly cacheProvider: CacheProvider;

  constructor(options: Options<T>) {
    this.sheet = options.sheet;
    this.cacheEnabled = !!options.cacheEnabled;
    this.cacheProvider = options.cacheProvider ?? new InMemoryNodeCacheProvider(options.cacheTtlSeconds);
  }

  public getTableHeadersOr(func: () => Promise<string[]>): Promise<string[]> {
    return this.getOr(`headers-${this.sheet}`, func);
  }

  public cacheHeaders(headers: string[]): Promise<void> {
    return this.cacheProvider.set(`headers-${this.sheet}`, headers);
  }

  public getTableContentOr<T>(func: () => Promise<T[]>): Promise<T[]> {
    return this.getOr(`content-${this.sheet}`, func);
  }

  public async getSheetDetailsOr(
    func: () => Promise<GaxiosResponse<sheets_v4.Schema$Spreadsheet>>,
  ): Promise<GaxiosResponse<sheets_v4.Schema$Spreadsheet>> {
    return this.getOr(`details-${this.sheet}`, func);
  }

  public invalidate(): Promise<void> {
    return this.cacheProvider.invalidate();
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
