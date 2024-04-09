import { Serializer } from './Serializer';
import { SerializationError } from './SerializationError';

export class BooleanSerializer implements Serializer<boolean> {
  public fromSpreadsheetValue(value: string): boolean | undefined {
    switch (value?.toLowerCase()) {
      case 'true':
        return true;
      case 'false':
        return false;
      case '':
      case null:
      case undefined:
        return undefined;
      default:
        throw new SerializationError(`Invalid boolean value on database: ${value}`);
    }
  }

  

  public toSpreadsheetValue(value: boolean | undefined): string {
    return value === undefined || value === null ? '' : `${value}`;
  }
}
