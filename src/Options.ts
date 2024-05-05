import { Castings } from './Castings';
import { BaseExternalAccountClient, GoogleAuth, OAuth2Client } from 'google-auth-library';
import { sheets_v4 } from 'googleapis';
import { BaseModel } from './BaseModel';

export type AuthOptions = GoogleAuth | OAuth2Client | BaseExternalAccountClient | string;

export interface Options<T extends BaseModel> {
  /**
   * ID of the spreadsheet.
   *
   * This ID can be found in the URL of the spreadsheet:
   * `https://docs.google.com/spreadsheets/d/<SpreadsheetId>/edit`
   */
  readonly spreadsheetId: string;

  /**
   * The name of the sheet within the spreadsheet.
   *
   * This name corresponds to the tab name visible in the UI.
   */
  readonly sheet: string;

  /**
   * Optional key-value pairs to define types for properties of the provided type.
   * If a field is not provided, it will default to being treated as a string.
   */
  readonly castings?: Castings<T>;

  /**
   * An array of {@link sheets_v4.Sheets} instances to use.
   *
   * GoogleSpreadsheetORM will load-balance operations between the provided clients.
   *
   * Quota retries for API rate limiting are automatically handled when using multiple clients.
   *
   * This option can be ignored if {@link auth} is provided.
   */
  readonly sheetClients?: sheets_v4.Sheets[];

  /**
   * An instance or an array of authentication options allowed in Google APIs libraries.
   *
   * GoogleSpreadsheetsORM will create a {@link sheets_v4.Sheets} instance for each authentication object provided.
   * Any internal operation will load-balanced across these clients.
   *
   * Quota retries for API rate limiting are automatically handled when multiple authentication options are provided.
   *
   * If you already have some {@link sheets_v4.Sheets} instances, you can pass them in {@link sheetClients} and ignore this property.
   */
  readonly auth?: AuthOptions | AuthOptions[];

  /**
   * Verbose mode flag.
   *
   * If set to `true`, debugging logs will be printed to stdout.
   */
  readonly verbose?: boolean;

  /**
   * Custom function to instantiate objects of the provided type.
   *
   * This function is useful for performing custom instantiation logic, especially with class-based objects.
   */
  readonly instantiator?: (values: object) => T;
}
