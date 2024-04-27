export type ParsedSpreadsheetCellValue = string | number | boolean | Date | object;

export type Query<T> = {
  [column in keyof T]?: ParsedSpreadsheetCellValue;
};

export type InQuery<T> = {
  [column in keyof T]?: ParsedSpreadsheetCellValue[];
};
