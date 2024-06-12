import { ParsedSpreadsheetCellValue } from './Query';
import { Serializer } from './serialization/Serializer';
import { GoogleSheetClientProvider } from './GoogleSheetClientProvider';
import { Logger } from './utils/Logger';
import { sheets_v4 } from 'googleapis';
import { FieldType } from './serialization/FieldType';
import { JsonFieldSerializer } from './serialization/JsonFieldSerializer';
import { DateFieldSerializer } from './serialization/DateFieldSerializer';
import { BooleanSerializer } from './serialization/BooleanSerializer';
import { NumberSerializer } from './serialization/NumberSerializer';
import { GaxiosResponse } from 'gaxios';
import { GoogleSpreadsheetOrmError } from './errors/GoogleSpreadsheetOrmError';
import { Options } from './Options';
import { BaseModel } from './BaseModel';
import { Metrics, MilliSecondsByOperation } from './metrics/Metrics';
import { MetricOperation } from './metrics/MetricOperation';
import Schema$ValueRange = sheets_v4.Schema$ValueRange;
import { CacheManager } from './cache/CacheManager';
import { Plain } from './utils/Plain';

export class GoogleSpreadsheetsOrm<T extends BaseModel> {
  private readonly logger: Logger;
  private readonly sheetsClientProvider: GoogleSheetClientProvider;
  private readonly serializers: Map<string, Serializer<unknown>>;

  private readonly instantiator: (rawRowObject: Plain<T>) => T;
  private readonly metricsCollector: Metrics;

  private readonly cacheManager: CacheManager<T>;

  constructor(private readonly options: Options<T>) {
    this.logger = new Logger(options.verbose);
    this.sheetsClientProvider = GoogleSheetClientProvider.fromOptions(options, this.logger);

    this.serializers = new Map<string, Serializer<unknown>>();
    this.serializers.set(FieldType.JSON, new JsonFieldSerializer());
    this.serializers.set(FieldType.DATE, new DateFieldSerializer(this.logger));
    this.serializers.set(FieldType.BOOLEAN, new BooleanSerializer());
    this.serializers.set(FieldType.NUMBER, new NumberSerializer());

    this.instantiator = options.instantiator ?? (r => r as T);
    this.metricsCollector = new Metrics();

    this.cacheManager = new CacheManager(options);
  }

  /**
   * Retrieves all entities from the specified sheet, parsing and serializing them according to the field types defined in the Castings configuration.
   *
   * @remarks
   * This method fetches all rows from the specified sheet in the associated spreadsheet.
   * It then parses the retrieved data and serializes it into entities according to the field types defined in the Castings configuration.
   *
   * @returns A Promise that resolves to an array of entities of type T, representing all rows retrieved from the sheet.
   */
  public async all(): Promise<T[]> {
    const { data, headers } = await this.findSheetData();
    return this.rowsToEntities(data, headers);
  }

  /**
   * Creates a new row in the specified sheet with the provided entity data.
   *
   * @param entity - The entity object to persist as a new row in the sheet.
   *
   * @remarks
   * This method appends a new row at the end of the specified sheet in the associated spreadsheet.
   * It retrieves the headers of the sheet to ensure proper alignment of data.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when the row creation process is completed successfully.
   */
  public async create(entity: T): Promise<void> {
    return this.createAll([entity]);
  }

  /**
   * Deletes the row associated with the provided entity in the specified sheet.
   *
   * @param entity - The entity object to delete
   *
   * @remarks
   * It internally retrieves all data from the specified sheet.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when the row deletion process is completed successfully.
   */
  public delete(entity: T): Promise<void> {
    return this.deleteById(entity.id);
  }

  /**
   * Deletes the row associated with the provided entity in the specified sheet.
   *
   * @param entityId - Ids of the row to delete
   *
   * @remarks
   * It internally retrieves all data from the specified sheet.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when the row deletion process is completed successfully.
   */
  public deleteById(entityId: string): Promise<void> {
    return this.deleteAllByIdIn([entityId]);
  }

  /**
   * Updates the row in the specified sheet matching by id. All values are replaced with the ones in the entity param.
   *
   * @param entity - An entity object to update in the sheet.
   *
   * @remarks
   * It retrieves sheet data to ensure proper alignment of data and checking which row needs to update.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when the row update process is completed successfully.
   */
  public async update(entity: T): Promise<void> {
    return this.updateAll([entity]);
  }

  /**
   * Creates a new row in the specified sheet for each entity provided in the *entities* array.
   *
   * @param entities - An array of entities objects to persist as a new row in the sheet.
   *
   * @remarks
   * This method appends a new row for each entity provided at the end of the specified sheet in the associated spreadsheet.
   * It retrieves the headers of the sheet to ensure proper alignment of data.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when the row creation process is completed successfully.
   */
  public async createAll(entities: T[]): Promise<void> {
    if (entities.length === 0) {
      return;
    }

    if (entities.some(entity => !entity.id)) {
      throw new GoogleSpreadsheetOrmError('Cannot persist entities that have no id.');
    }

    const headers = await this.sheetHeaders();

    const entitiesDatabaseArrays: ParsedSpreadsheetCellValue[][] = entities.map(entity =>
      this.toSheetArrayFromHeaders(entity, headers),
    );

    await this.cacheManager.invalidate();

    await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
      this.metricsCollector.trackExecutionTime(MetricOperation.SHEET_APPEND, () =>
        sheetsClient.spreadsheets.values.append({
          spreadsheetId: this.options.spreadsheetId,
          range: this.options.sheet,
          insertDataOption: 'INSERT_ROWS',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: entitiesDatabaseArrays,
          },
        }),
      ),
    );
  }

  /**
   * Deletes the rows associated with the provided entities in the specified sheet.
   *
   * @param entities - An array of entities objects to delete
   *
   * @remarks
   * It internally retrieves all data from the specified sheet.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when all the row deletion processes are completed successfully.
   */
  public deleteAll(entities: T[]): Promise<void> {
    return this.deleteAllByIdIn(entities.map(entity => entity.id));
  }

  /**
   * Deletes the rows associated with the provided IDs in the specified sheet.
   *
   * @param entityIds - Ids of the rows to delete
   *
   * @remarks
   * It internally retrieves all data from the specified sheet.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when all the row deletion processes are completed successfully.
   */
  public async deleteAllByIdIn(entityIds: string[]): Promise<void> {
    if (entityIds.length === 0) {
      return;
    }

    const { data } = await this.findSheetData();
    const rowNumbers = entityIds
      .map(entityId => this.rowNumber(data, entityId))
      // rows are deleted from bottom to top
      .sort((a, b) => b - a);

    const sheetId = await this.fetchSheetDetails().then(sheetDetails => sheetDetails.properties?.sheetId);

    await this.cacheManager.invalidate();

    await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
      this.metricsCollector.trackExecutionTime(MetricOperation.SHEET_DELETE, () =>
        sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: this.options.spreadsheetId,
          requestBody: {
            requests: rowNumbers.map(rowNumber => ({
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1, // index, not a rowNumber here, so -1
                  endIndex: rowNumber, // exclusive, to delete just one row
                },
              },
            })),
          },
        }),
      ),
    );
  }

  /**
   * Updates the rows in the specified sheet matching by id. All values are replaced with the ones in the entities param.
   *
   * @param entities - An array of entities objects to update in the sheet.
   *
   * @remarks
   * It retrieves sheet data to ensure proper alignment of data and checking which row needs to update.
   * Quota retries are automatically handled to manage API rate limits.
   *
   * @returns A Promise that resolves when the row update process is completed successfully.
   */
  public async updateAll(entities: T[]): Promise<void> {
    if (entities.length === 0) {
      return;
    }

    if (entities.some(entity => !entity.id)) {
      throw new GoogleSpreadsheetOrmError('Cannot persist entities that have no id.');
    }

    const { headers, data } = await this.findSheetData();

    await this.cacheManager.invalidate();

    await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
      this.metricsCollector.trackExecutionTime(MetricOperation.SHEET_UPDATE, () =>
        sheetsClient.spreadsheets.values.batchUpdate({
          spreadsheetId: this.options.spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            includeValuesInResponse: false,
            data: entities.map(entity => {
              const rowNumber = this.rowNumber(data, entity.id);
              const range = this.buildRangeToUpdate(headers, rowNumber);
              const entityAsSheetArray = this.toSheetArrayFromHeaders(entity, headers);

              return {
                range,
                values: [entityAsSheetArray],
              };
            }),
          },
        }),
      ),
    );
  }

  /**
   * Returns an object that contains request latencies, grouped by type of request.
   *
   * @returns An object that contains request latencies of the different requests performed to sheets API,
   * grouped by type of request.
   *
   * @see {@link MetricOperation}
   *
   * @example
   * ```ts
   * {
   *   FETCH_SHEET_DATA: [432, 551, 901],
   *   SHEET_APPEND: [302, 104]
   * }
   * ```
   */
  public metrics(): MilliSecondsByOperation {
    return this.metricsCollector.toObject();
  }

  private async fetchSheetDetails(): Promise<sheets_v4.Schema$Sheet> {
    const sheets: GaxiosResponse<sheets_v4.Schema$Spreadsheet> = await this.cacheManager.getSheetDetailsOr(() =>
      this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
        this.metricsCollector.trackExecutionTime(MetricOperation.FETCH_SHEET_DETAILS, () =>
          sheetsClient.spreadsheets.get({
            spreadsheetId: this.options.spreadsheetId,
          }),
        ),
      ),
    );

    const sheetDetails: sheets_v4.Schema$Sheet | undefined = sheets.data.sheets?.find(
      sheet => sheet.properties?.title === this.options.sheet,
    );

    if (!sheetDetails) {
      throw new GoogleSpreadsheetOrmError(`Could not find sheet details for sheet ${this.options.sheet}`);
    }

    return sheetDetails;
  }

  private rowNumber(data: ParsedSpreadsheetCellValue[][], entityId: string): number {
    const index = data.findIndex(row => row[0] === entityId);

    if (index === -1) {
      throw new GoogleSpreadsheetOrmError(`Provided entity is not part of '${this.options.sheet}' sheet.`);
    }

    // +1 because no headers in array and +1 because row numbers starts at 1
    return index + 2;
  }

  private toSheetArrayFromHeaders(entity: T, headers: string[]): ParsedSpreadsheetCellValue[] {
    return headers.map(header => {
      const castingType: string | undefined = this.options?.castings?.[header as keyof T];
      const entityValue = entity[header as keyof T] as ParsedSpreadsheetCellValue | undefined;

      if (!!castingType) {
        const serializer = this.serializers.get(castingType);

        if (!serializer) {
          throw new GoogleSpreadsheetOrmError(`Serializer for type ${castingType} not found.`);
        }

        return serializer.toSpreadsheetValue(entityValue);
      }

      return entityValue || '';
    });
  }

  private rowsToEntities(spreadsheetDataRows: string[][], headers: string[]): T[] {
    return spreadsheetDataRows.map(row => this.rowToEntity(row, headers));
  }

  private rowToEntity(entityRow: string[], headers: string[]): T {
    const entity: { [x: string]: ParsedSpreadsheetCellValue | undefined } = {};

    headers.forEach((header, index) => {
      const castingType: FieldType | undefined = this.options.castings?.[header as keyof T];
      const cellValue: string = entityRow[index];

      if (!!castingType) {
        const serializer: Serializer<unknown> | undefined = this.serializers.get(castingType);

        if (!serializer) {
          throw new GoogleSpreadsheetOrmError(`Serializer for type ${castingType} not found.`);
        }

        entity[header] = serializer.fromSpreadsheetValue(cellValue) as ParsedSpreadsheetCellValue | undefined;
      } else {
        entity[header] = cellValue === '' ? undefined : cellValue;
      }
    });

    return this.instantiator(entity as Plain<T>);
  }

  private async findSheetData(): Promise<{ headers: string[]; data: string[][] }> {
    const data: string[][] = await this.allSheetData();
    const headers: string[] = data.shift() as string[];
    await this.cacheManager.cacheHeaders(headers);
    return { headers, data };
  }

  private async allSheetData(): Promise<string[][]> {
    return this.cacheManager.getContentOr(() =>
      this.sheetsClientProvider.handleQuotaRetries(async sheetsClient =>
        this.metricsCollector.trackExecutionTime(MetricOperation.FETCH_SHEET_DATA, async () => {
          this.logger.log(`Querying all sheet data sheet=${this.options.sheet}`);
          const db: GaxiosResponse<Schema$ValueRange> = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: this.options.spreadsheetId,
            range: this.options.sheet,
          });
          return db.data.values as string[][];
        }),
      ),
    );
  }

  private async sheetHeaders(): Promise<string[]> {
    return this.cacheManager.getHeadersOr(() =>
      this.sheetsClientProvider.handleQuotaRetries(async sheetsClient =>
        this.metricsCollector.trackExecutionTime(MetricOperation.FETCH_SHEET_HEADERS, async () => {
          this.logger.log(`Reading headers from sheet=${this.options.sheet}`);

          const db: GaxiosResponse<Schema$ValueRange> = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: this.options.spreadsheetId,
            range: `${this.options.sheet}!A1:1`, // Example: users!A1:1
          });

          const values = db.data.values;

          if (values && values.length > 0) {
            return values[0] as string[];
          }

          throw new GoogleSpreadsheetOrmError(`Headers row not present in sheet ${this.options.sheet}`);
        }),
      ),
    );
  }

  private buildRangeToUpdate(headers: string[], rowNumber: number): string {
    // Transform header indexes into letters, to build the range. Example: 0 -> A, 1 -> B
    const columns = headers.map((_, index) => (index + 10).toString(36).toUpperCase());
    const initialRange = `${columns[0]}${rowNumber}`; // Example A2
    const endingRange = `${columns[columns.length - 1]}${rowNumber}`; // Example F2
    return `${this.options.sheet}!${initialRange}:${endingRange}`; // Example users!A2:F2
  }
}
