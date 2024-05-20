import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetsOrm } from '../src/GoogleSpreadsheetsOrm';
import { FieldType } from '../src/serialization/FieldType';
import { mock, MockProxy } from 'jest-mock-extended';
import Resource$Spreadsheets$Values = sheets_v4.Resource$Spreadsheets$Values;
import Resource$Spreadsheets = sheets_v4.Resource$Spreadsheets;
import Schema$Spreadsheet = sheets_v4.Schema$Spreadsheet;

import Params$Resource$Spreadsheets$Values$Append = sheets_v4.Params$Resource$Spreadsheets$Values$Append;
import { GoogleSpreadsheetOrmError } from '../src/errors/GoogleSpreadsheetOrmError';

const SPREADSHEET_ID = 'spreadsheetId';
const SHEET = 'test_entities';
const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const DATE_REGEX =
  /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2])\/\d{4} (0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;

interface TestEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly name: string;
  readonly jsonField: object;
  readonly current?: boolean;
  readonly year?: number;
}

describe(GoogleSpreadsheetsOrm.name, () => {
  let sheetClients: MockProxy<sheets_v4.Sheets>[];
  let sut: GoogleSpreadsheetsOrm<TestEntity>;

  beforeEach(() => {
    const firstClient = mock<sheets_v4.Sheets>();
    firstClient.spreadsheets = mock<Resource$Spreadsheets>();
    firstClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();

    const secondClient = mock<sheets_v4.Sheets>();
    secondClient.spreadsheets = mock<Resource$Spreadsheets>();
    secondClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();

    sheetClients = [ firstClient, secondClient ];
    sut = new GoogleSpreadsheetsOrm<TestEntity>({
      spreadsheetId: SPREADSHEET_ID,
      sheet: SHEET,
      sheetClients,
      verbose: false,
      castings: {
        createdAt: FieldType.DATE,
        jsonField: FieldType.JSON,
        current: FieldType.BOOLEAN,
        year: FieldType.NUMBER,
      },
    });
  });

  test('all should correctly parse all values', async () => {
    const rawValues = [
      [ 'id', 'createdAt', 'name', 'jsonField', 'current', 'year' ],
      [
        'ae222b54-182f-4958-b77f-26a3a04dff32',
        '13/10/2022 08:11:23',
        'John Doe',
        '[1, 2, 3, 4, 5, 6]',
        'false',
        '2023',
      ],
      [
        'ae222b54-182f-4958-b77f-26a3a04dff33',
        '29/12/2023 17:47:04',
        'Donh Joe',
        // language=json
        '{ "a": { "b": "c" } }',
        'true',
        '',
      ],
      [ 'ae222b54-182f-4958-b77f-26a3a04dff34', '29/12/2023 17:47:04', 'Donh Joe 2', '{}', '', undefined ],
      [ 'ae222b54-182f-4958-b77f-26a3a04dff35', '29/12/2023 17:47:04', 'Donh Joe 3', '{}', undefined, '2023' ],
    ];

    sheetClients
      .map(s => s.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>)
      .forEach(mockValuesClient =>
        mockValuesClient.get.mockResolvedValue({
          data: {
            values: rawValues,
          },
        } as never),
      );

    const entities = await sut.all();

    const expectedValues: TestEntity[] = [
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
        createdAt: new Date('2022-10-13 08:11:23'),
        name: 'John Doe',
        jsonField: [ 1, 2, 3, 4, 5, 6 ],
        current: false,
        year: 2023,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff33',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'Donh Joe',
        jsonField: { a: { b: 'c' } },
        current: true,
        year: undefined,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'Donh Joe 2',
        jsonField: {},
        current: undefined,
        year: undefined,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'Donh Joe 3',
        jsonField: {},
        current: undefined,
        year: 2023,
      },
    ];
    expect(entities).toStrictEqual(expectedValues);
  });

  test('create method should insert a new row', async () => {
    // Configure table headers, so that save method can correctly match headers positions.
    const rawValues = [ [ 'id', 'createdAt', 'name', 'jsonField', 'current', 'year' ] ];
    mockValuesResponse(rawValues);

    const entity: TestEntity = {
      id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
      createdAt: new Date('2023-12-29 17:47:04'),
      name: 'John Doe',
      jsonField: {
        a: 'b',
        c: [ 1, 2, 3 ],
      },
      current: undefined,
      year: 2023,
    };

    await sut.create(entity);

    expect(getValuesUsedSheetClient()?.spreadsheets.values.append).toHaveBeenCalledWith({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET,
      insertDataOption: 'INSERT_ROWS',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'ae222b54-182f-4958-b77f-26a3a04dff35', // id
            '29/12/2023 17:47:04', // createdAt
            'John Doe', // name
            // language=json
            '{"a":"b","c":[1,2,3]}', // jsonField
            '', // current
            '2023', // year
          ],
        ],
      },
    } as Params$Resource$Spreadsheets$Values$Append);
  });

  test('createAll method should insert a new row per each entity provided', async () => {
    // Configure table headers, so that save method can correctly match headers positions.
    const rawValues = [ [ 'id', 'createdAt', 'name', 'jsonField', 'current', 'year' ] ];
    mockValuesResponse(rawValues);

    const entities: TestEntity[] = [
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe',
        jsonField: {
          a: 'b',
          c: [ 1, 2, 3 ],
        },
        current: undefined,
        year: 2023,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff36',
        createdAt: new Date('2024-12-31 17:47:04'),
        name: 'John Doe 2',
        jsonField: [ 1, 2, 3 ],
        current: false,
        year: 2000,
      },
    ];

    await sut.createAll(entities);

    expect(getValuesUsedSheetClient()?.spreadsheets.values.append).toHaveBeenCalledWith({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET,
      insertDataOption: 'INSERT_ROWS',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'ae222b54-182f-4958-b77f-26a3a04dff35', // id
            '29/12/2023 17:47:04', // createdAt
            'John Doe', // name
            // language=json
            '{"a":"b","c":[1,2,3]}', // jsonField
            '', // current
            '2023', // year
          ],
          [
            'ae222b54-182f-4958-b77f-26a3a04dff36', // id
            '31/12/2024 17:47:04', // createdAt
            'John Doe 2', // name
            // language=json
            '[1,2,3]', // jsonField
            'false', // current
            '2000', // year
          ],
        ],
      },
    } as Params$Resource$Spreadsheets$Values$Append);
  });

  test('createAll method should not persist anything if an empty array is passed', async () => {
    await sut.createAll([]);
    // @ts-ignore
    expect(sheetClients.every(client => client.spreadsheets.values.append.mock.calls.length === 0)).toBeTruthy();
  });

  test('createAll method should fail if some passed entity has undefined id', async () => {
    await expect(sut.createAll([
      {
        // @ts-ignore
        id: undefined,
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe',
        jsonField: {
          a: 'b',
          c: [ 1, 2, 3 ],
        },
        current: undefined,
        year: 2023,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff36',
        createdAt: new Date('2024-12-31 17:47:04'),
        name: 'John Doe 2',
        jsonField: [ 1, 2, 3 ],
        current: false,
        year: 2000,
      },
    ])).rejects.toStrictEqual(new GoogleSpreadsheetOrmError('Cannot persist entities that have no id.'));
  });

  test('delete method should correctly delete the row with that id', async () => {
    mockValuesResponse([
      [ 'id', 'createdAt', 'name', 'jsonField', 'current', 'year' ],
      [
        'ae222b54-182f-4958-b77f-26a3a04dff34', // id
        '29/12/2023 17:47:04', // createdAt
        'John Doe', // name
        // language=json
        '{"a":"b","c":[1,2,3]}', // jsonField
        'true', // current
        '2023', // year
      ],
      [
        'ae222b54-182f-4958-b77f-26a3a04dff35', // id
        '29/12/2023 17:47:04', // createdAt
        'John Doe', // name
        // language=json
        '{"a":"b","c":[1,2,3]}', // jsonField
        'true', // current
        '2023', // year
      ],
    ]);

    mockSpreadsheetDetailsResponse({
      data: {
        sheets: [
          {
            properties: {
              title: SHEET,
              sheetId: 1234,
            },
          },
        ],
      },
    } as never);

    const entity: TestEntity = {
      id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
      createdAt: new Date('2023-12-29 17:47:04'),
      name: 'John Doe',
      jsonField: {
        a: 'b',
        c: [ 1, 2, 3 ],
      },
      current: true,
      year: 2023,
    };

    await sut.delete(entity);

    expect(getBatchUpdateUsedSheetClient()?.spreadsheets.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 1234,
                dimension: 'ROWS',
                startIndex: 2, // row 3
                endIndex: 3,
              },
            },
          },
        ],
      },
    });
  });

  test('delete method should fail if provided entity is not part of the sheet', async () => {
    mockValuesResponse([ [ 'id', 'createdAt', 'name', 'jsonField', 'current', 'year' ] ]);

    mockSpreadsheetDetailsResponse({
      data: {
        sheets: [
          {
            properties: {
              title: SHEET,
              sheetId: 1234,
            },
          },
        ],
      },
    } as never);

    const entity: TestEntity = {
      id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
      createdAt: new Date('2023-12-29 17:47:04'),
      name: 'John Doe',
      jsonField: {
        a: 'b',
        c: [ 1, 2, 3 ],
      },
      current: true,
      year: 2023,
    };

    await expect(sut.delete(entity)).rejects.toStrictEqual(new GoogleSpreadsheetOrmError(`Provided entity is not part of '${SHEET}' sheet.`));
  });

  function mockValuesResponse(rawValues: string[][]): void {
    sheetClients
      .map(s => s.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>)
      .forEach(mockValuesClient =>
        mockValuesClient.get.mockResolvedValue({
          data: {
            values: rawValues,
          },
        } as never),
      );
  }

  function mockSpreadsheetDetailsResponse(values: Schema$Spreadsheet): void {
    sheetClients
      .map(s => s.spreadsheets as MockProxy<sheets_v4.Resource$Spreadsheets>)
      .forEach(mockSpreadsheetClients => mockSpreadsheetClients.get.mockResolvedValue(values as never));
  }

  function getValuesUsedSheetClient(): sheets_v4.Sheets | undefined {
    return (
      sheetClients
        // @ts-ignore
        .find(client => client.spreadsheets.values.append.mock.calls.length > 0)
    );
  }

  function getBatchUpdateUsedSheetClient(): sheets_v4.Sheets | undefined {
    return (
      sheetClients
        // @ts-ignore
        .find(client => client.spreadsheets.batchUpdate.mock.calls.length > 0)
    );
  }
});
