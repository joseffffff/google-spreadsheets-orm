import { Serializer } from './Serializer';

export class JsonFieldSerializer implements Serializer<object> {
  public fromSpreadsheetValue(value: string | undefined): object | undefined {
    if (!value) {
      return undefined;
    }

    return JSON.parse(value);
  }

  public toSpreadsheetValue(value: object | undefined): string {
    return JSON.stringify(value);
  }
}
