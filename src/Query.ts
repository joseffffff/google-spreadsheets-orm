export type ParsedSpreadsheetCellValue = string | number | boolean | Date;


export type Query<T> = {
  filter?: {
    [column in keyof T]?: ParsedSpreadsheetCellValue | ParsedSpreadsheetCellValue[];
  };
  // paging?: PagingQuery;
};

// export type PagingQuery = {
//   from?: number;
//   to?: number;
// };
