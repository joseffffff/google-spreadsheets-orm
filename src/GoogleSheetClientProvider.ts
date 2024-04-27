import { sheets_v4 } from 'googleapis';
import { Logger } from './utils/Logger';
import { GoogleSpreadsheetOrmError } from './errors/GoogleSpreadsheetOrmError';

export class GoogleSheetClientProvider {
  private readonly QUOTA_EXCEEDED_ERROR: string = 'Quota exceeded for quota metric';

  public constructor(
    private readonly clientsPool: sheets_v4.Sheets[],
    private readonly logger: Logger,
  ) {
  }

  public async handleQuotaRetries<T>(func: (sheetsClient: sheets_v4.Sheets) => Promise<T>): Promise<T> {
    const blacklist = new Set<sheets_v4.Sheets>();

    for (let tryNum = 1; tryNum <= this.clientsPool.length; tryNum++) {
      const randomClientIndex = Math.floor(Math.random() * (this.clientsPool.length - blacklist.size));
      const client = this.clientsPool.filter(client => !blacklist.has(client)).at(randomClientIndex);

      if (!client) {
        continue;
      }

      try {
        this.logger.log(`GoogleSheetClientProvider - Starting try number ${tryNum}`);
        const result = await func(client);
        this.logger.log(`GoogleSheetClientProvider - Try number ${tryNum} worked properly`);
        return result;
      } catch (e) {
        if (e instanceof Error) {
          this.logger.log(`GoogleSheetClientProvider - Try number ${tryNum} failed (${e.constructor.name} - ${e.message})`);
          if (e.message.includes(this.QUOTA_EXCEEDED_ERROR)) {
            blacklist.add(client);
          } else {
            throw e;
          }
        }
      }
    }

    throw new GoogleSpreadsheetOrmError('Quota error on database read.');
  }
}
