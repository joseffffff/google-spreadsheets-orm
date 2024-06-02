export enum MetricOperation {
  FETCH_SHEET_DATA = 'FETCH_SHEET_DATA',
  FETCH_SHEET_DETAILS = 'FETCH_SHEET_DETAILS',
  /**
   * Includes delete & deleteAll operations
   */
  FETCH_SHEET_HEADERS = 'FETCH_SHEET_HEADERS',
  /**
   * Includes create & createAll operations.
   */
  SHEET_APPEND = 'SHEET_APPEND',
  /**
   * Includes delete & deleteAll operations.
   */
  SHEET_DELETE = 'SHEET_DELETE',
  /**
   * Includes update & updateAll operations.
   */
  SHEET_UPDATE = 'SHEET_UPDATE',
}
