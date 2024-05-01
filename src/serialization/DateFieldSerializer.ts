import { DateTime } from 'luxon';
import { Logger } from '../utils/Logger';
import { Serializer } from './Serializer';

const DATE_FORMAT = 'd/M/yyyy H:mm:ss';

export class DateFieldSerializer implements Serializer<Date> {
  constructor(private readonly logger: Logger) {}

  public fromSpreadsheetValue(value: string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsedDate = DateTime.fromFormat(value, DATE_FORMAT).toJSDate();
    this.logger.log(`Database date ${value} parsed as ${parsedDate}`);
    return parsedDate;
  }

  public toSpreadsheetValue(value: Date | undefined): string {
    if (!value) {
      return '';
    }

    const rawDate = DateTime.fromJSDate(value).toFormat(DATE_FORMAT);
    this.logger.log(`JS Date ${value} serialised as ${rawDate}`);
    return rawDate;
  }
}
