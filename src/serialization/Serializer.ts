
export interface Serializer<T> {
  toSpreadsheetValue(value: T | undefined): string;
  fromSpreadsheetValue(value: string | undefined): T | undefined;
}
