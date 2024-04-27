import { ParsedSpreadsheetCellValue } from './Query';
import { Serializer } from './serialization/Serializer';
import { GoogleSheetClientProvider } from './GoogleSheetClientProvider';
import { Logger } from './utils/Logger';
import { google, sheets_v4 } from 'googleapis';
import { FieldType } from './serialization/FieldType';
import { JsonFieldSerializer } from './serialization/JsonFieldSerializer';
import { DateFieldSerializer } from './serialization/DateFieldSerializer';
import { BooleanSerializer } from './serialization/BooleanSerializer';
import { NumberSerializer } from './serialization/NumberSerializer';
import { GaxiosResponse } from 'gaxios';
import { GoogleSpreadsheetOrmError } from './errors/GoogleSpreadsheetOrmError';
import { Options } from './Options';
import Schema$ValueRange = sheets_v4.Schema$ValueRange;

export class GoogleSpreadsheetOrm<T extends { readonly id: string } = { id: string }> {
  private readonly logger: Logger;
  private readonly sheetsClientProvider: GoogleSheetClientProvider;
  private readonly serializers: Map<string, Serializer<unknown>> = new Map();

  private readonly instantiator: (rawRowObject: object) => T;

  constructor(
    private readonly spreadsheetId: string,
    private readonly sheet: string,
    private readonly options: Options<T>,
  ) {
    this.logger = new Logger(options.verbose);

    const auths = Array.isArray(options.auth) ? options.auth : !!options.auth ? [ options.auth ] : [];
    const sheetClients: sheets_v4.Sheets[] =
      Array.isArray(options.sheetClients) && options.sheetClients.length > 0
        ? options.sheetClients
        : auths.map(auth => google.sheets({
          version: 'v4',
          auth,
        }));

    if (sheetClients.length === 0) {
      // throw
    }

    this.sheetsClientProvider = new GoogleSheetClientProvider(sheetClients, this.logger);

    this.serializers.set(FieldType.JSON, new JsonFieldSerializer());
    this.serializers.set(FieldType.DATE, new DateFieldSerializer(this.logger));
    this.serializers.set(FieldType.BOOLEAN, new BooleanSerializer());
    this.serializers.set(FieldType.NUMBER, new NumberSerializer());

    this.instantiator = options.instantiator ?? (r => r as T);
  }

  public async findAll(): Promise<T[]> {
    const { data, headers } = await this.findTableData();
    return this.rowsToEntities(data, headers);
  }

  // public async findByColumns(query: Query<T>): Promise<T[]> {
  //   return (
  //     (await this.findAll())
  //       // @ts-ignore
  //       .filter(row => Object.entries(query).every(([ column, queryValue ]) => row[column] === queryValue))
  //   );
  // }
  //
  // public async findByColumnsIn(query: InQuery<T>): Promise<T[]> {
  //   const entities = await this.findAll();
  //   return entities.filter(
  //     entity =>
  //       // @ts-ignore
  //       Object.entries(query).every(([ key, inValues ]) => inValues.includes(entity[key])),
  //   );
  // }
  //
  // public save(entity: T): Promise<boolean> {
  //   entity.updatedAt = new Date();
  //
  //   if (!entity.id) {
  //     this.logger.log('Entity has no id, creating new row.');
  //     entity.id = this.uuidGenerator.generate();
  //     entity.createdAt = new Date();
  //     return this.create(entity);
  //   }
  //
  //   this.logger.log('Entity has id, updating row.');
  //   return this.update(entity);
  // }
  //
  // public async createAll(entities: T[]): Promise<boolean> {
  //   if (entities.length === 0) {
  //     return true;
  //   }
  //
  //   if (entities.some(entity => !entity.id)) {
  //     throw new GoogleSpreadsheetOrmError('Cannot persist entities that have no id.');
  //   }
  //
  //   const { headers } = await this.findTableData();
  //
  //   const entitiesDatabaseArrays: ParsedSpreadsheetCellValue[][] = entities.map(entity =>
  //     this.toDatabaseArrayFromHeaders(entity, headers),
  //   );
  //
  //   await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
  //     sheetsClient.spreadsheets.values.append({
  //       spreadsheetId: this.spreadsheetId,
  //       range: this.sheet,
  //       insertDataOption: 'INSERT_ROWS',
  //       valueInputOption: 'USER_ENTERED',
  //       requestBody: {
  //         values: entitiesDatabaseArrays,
  //       },
  //     }),
  //   );
  //
  //   return true;
  // }

  // public updateAll(entities: T[]): boolean {
  //   if (entities.length === 0) {
  //     return true;
  //   }
  //
  //   if (entities.some(entity => entity.id === undefined)) {
  //     throw new InternalServerErrorException('Cannot update entities without id.');
  //   }
  //
  //   entities.forEach(entity => (entity.updatedAt = new Date()));
  //
  //   const sheet = this.sheet();
  //
  //   const data = this.allSheetDataFromSheet(sheet);
  //   const headers = data.shift() as string[];
  //
  //   this.ioTimingsReporter.measureTime(InputOutputOperation.DB_UPDATE_ALL, () =>
  //     entities.forEach(entity => this.replaceValues(this.rowNumber(data, entity), headers, sheet, entity)),
  //   );
  //
  //   return true;
  // }

  // public async delete(entity: T): Promise<boolean> {
  //   const { data } = await this.findTableData();
  //   const rowNumber = this.rowNumber(data, entity);
  //
  //   const sheetId = await this.fetchSheetDetails()
  //     .then(sheetDetails => sheetDetails.properties?.sheetId);
  //
  //   await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
  //     sheetsClient.spreadsheets.batchUpdate({
  //       spreadsheetId: this.spreadsheetId,
  //       requestBody: {
  //         requests: [
  //           {
  //             deleteDimension: {
  //               range: {
  //                 sheetId,
  //                 dimension: 'ROWS',
  //                 startIndex: rowNumber - 1, // index, not a rowNumber here
  //                 endIndex: rowNumber, // exclusive, to delete just one row
  //               },
  //             },
  //           },
  //         ],
  //       },
  //     }),
  //   );
  //
  //   return true;
  // }
  //
  // private async fetchSheetDetails(): Promise<sheets_v4.Schema$Sheet> {
  //   const sheets = await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
  //     sheetsClient.spreadsheets.get({
  //       spreadsheetId: this.spreadsheetId,
  //     }),
  //   );
  //
  //   const sheetDetails: sheets_v4.Schema$Sheet | undefined = sheets.data.sheets?.find(
  //     sheet => sheet.properties?.title === this.sheet,
  //   );
  //
  //   if (!sheetDetails) {
  //     throw new GoogleSpreadsheetOrmError(`Could not find sheet details for sheet ${this.sheet}`);
  //   }
  //
  //   return sheetDetails;
  // }
  //
  // public deleteAll(entities: T[]): boolean {
  //   if (entities.length === 0) {
  //     return true;
  //   }
  //
  //   const sheet = this.sheet();
  //
  //   const data = this.allSheetDataFromSheet(sheet);
  //   data.shift(); // Delete headers
  //
  //   const rowNumbers = entities.map(entity => this.rowNumber(data, entity)).sort((a, b) => b - a);
  //
  //   this.ioTimingsReporter.measureTime(InputOutputOperation.DB_DELETE_ALL, () =>
  //     rowNumbers.forEach(rowNumber => sheet.deleteRow(rowNumber)),
  //   );
  //
  //   return true;
  // }
  //
  // private rowNumber(data: ParsedSpreadsheetCellValue[][], entity: T): number {
  //   for (let i = 0; i < data.length; i++) {
  //     if (data[i][0] === entity.id) {
  //       // +1 because no headers in array and +1 because row positions starts at 1
  //       return i + 2;
  //     }
  //   }
  //
  //   throw new GoogleSpreadsheetOrmError('Not found');
  // }
  //
  // private toDatabaseArrayFromHeaders(entity: T, tableHeaders: string[]): ParsedSpreadsheetCellValue[] {
  //   return tableHeaders.map(header => {
  //     const castingType: string | undefined = this.options.castings[header as keyof T];
  //     const entityValue = entity[header as keyof T] as ParsedSpreadsheetCellValue | undefined;
  //
  //     if (!!castingType) {
  //       const serializer = this.serializers.get(castingType);
  //
  //       if (!serializer) {
  //         throw new GoogleSpreadsheetOrmError(`Serializer for type ${castingType} not found.`);
  //       }
  //
  //       return serializer.toSpreadsheetValue(entityValue);
  //     }
  //
  //     return entityValue || '';
  //   });
  // }

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

    return this.instantiator(entity);
  }

  // private async update(entity: T): Promise<boolean> {
  //   const { headers, data } = await this.findTableData();
  //
  //   const rowNumber = this.rowNumber(data, entity);
  //
  //   await this.replaceValues(rowNumber, headers, entity);
  //
  //   return true;
  // }
  //
  // private async create(entity: T): Promise<boolean> {
  //   const headers: string[] = await this.sheetHeaders();
  //   const toSave: ParsedSpreadsheetCellValue[] = this.toDatabaseArrayFromHeaders(entity, headers);
  //
  //   await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
  //     sheetsClient.spreadsheets.values.append({
  //       spreadsheetId: this.spreadsheetId,
  //       range: this.sheet,
  //       insertDataOption: 'INSERT_ROWS',
  //       valueInputOption: 'USER_ENTERED',
  //       requestBody: {
  //         values: [ toSave ],
  //       },
  //     }),
  //   );
  //
  //   return true;
  // }

  private async findTableData(): Promise<{ headers: string[]; data: string[][] }> {
    const data: string[][] = await this.allSheetData();
    const headers: string[] = data.shift() as string[];
    return { headers, data };
  }

  private async allSheetData(): Promise<string[][]> {
    return this.sheetsClientProvider.handleQuotaRetries(async sheetsClient => {
      this.logger.log(`Querying all sheet data table=${this.sheet}`);
      const db: GaxiosResponse<Schema$ValueRange> = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.sheet,
      });
      return db.data.values as string[][];
    });
  }

  // private async sheetHeaders(): Promise<string[]> {
  //   return this.sheetsClientProvider.handleQuotaRetries(async sheetsClient => {
  //     this.logger.log(`Reading headers from table=${this.sheet}`);
  //     const db: GaxiosResponse<Schema$ValueRange> = await sheetsClient.spreadsheets.values.get({
  //       spreadsheetId: this.spreadsheetId,
  //       range: `${this.sheet}!A1:1`, // users!A1:1
  //     });
  //
  //     const values = db.data.values;
  //
  //     if (values && values.length > 0) {
  //       return values[0] as string[];
  //     }
  //
  //     return []; // throw?
  //   });
  // }
  //
  // private async replaceValues(rowNumber: number, headers: string[], entity: T): Promise<void> {
  //   const values = this.toDatabaseArrayFromHeaders(entity, headers);
  //
  //   // Transform header indexes into letters, to build the range. Example: 0 -> A, 1 -> B
  //   const columns = headers.map((_, index) => (index + 10).toString(36).toUpperCase());
  //   const initialRange = `${columns[0]}${rowNumber}`; // Example A2
  //   const endingRange = `${columns[columns.length - 1]}${rowNumber}`; // Example F2
  //   const range = `${this.sheet}!${initialRange}:${endingRange}`; // Example users!A2:F2
  //
  //   this.logger.log(`Range: ${range}`);
  //
  //   await this.sheetsClientProvider.handleQuotaRetries(sheetsClient =>
  //     sheetsClient.spreadsheets.values.update({
  //       spreadsheetId: this.spreadsheetId,
  //       range,
  //       valueInputOption: 'USER_ENTERED',
  //       requestBody: {
  //         values: [ values ],
  //       },
  //     }),
  //   );
  // }
}
