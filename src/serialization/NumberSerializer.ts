import { Serializer } from './Serializer';
import { SerializationError } from './SerializationError';

export class NumberSerializer implements Serializer<number> {

  public fromSpreadsheetValue(value: string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (isNaN(Number(value))) {
      throw new SerializationError(`Not a number on database: ${value}`);
    }

    return !isNaN(Number(value)) && !isNaN(parseFloat(value)) ? Number(value) : undefined;
  }

  public toSpreadsheetValue(value: number | undefined): string {
    return value ? value.toString() : '';
  }
}
