import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetsOrm } from '../src/GoogleSpreadsheetsOrm';
import { FieldType } from '../src/serialization/FieldType';
import { mock, MockProxy } from 'jest-mock-extended';
import Resource$Spreadsheets$Values = sheets_v4.Resource$Spreadsheets$Values;
import Resource$Spreadsheets = sheets_v4.Resource$Spreadsheets;
import Schema$Spreadsheet = sheets_v4.Schema$Spreadsheet;

import Params$Resource$Spreadsheets$Values$Append = sheets_v4.Params$Resource$Spreadsheets$Values$Append;
import { GoogleSpreadsheetOrmError } from '../src/errors/GoogleSpreadsheetOrmError';
import { MetricOperation } from '../src';

const SPREADSHEET_ID = 'spreadsheetId';
const SHEET = 'test_entities';

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

    sheetClients = [firstClient, secondClient];
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
      ['id', 'createdAt', 'name', 'jsonField', 'current', 'year'],
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
      ['ae222b54-182f-4958-b77f-26a3a04dff34', '29/12/2023 17:47:04', 'Donh Joe 2', '{}', '', undefined],
      ['ae222b54-182f-4958-b77f-26a3a04dff35', '29/12/2023 17:47:04', 'Donh Joe 3', '{}', undefined, '2023'],
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
        jsonField: [1, 2, 3, 4, 5, 6],
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
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_DATA]: [
        expect.any(Number), // Just one call
      ],
    });
  });

  test('create method should insert a new row', async () => {
    // Configure table headers, so that save method can correctly match headers positions.
    const rawValues = [['id', 'createdAt', 'name', 'jsonField', 'current', 'year']];
    mockValuesResponse(rawValues);

    const entity: TestEntity = {
      id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
      createdAt: new Date('2023-12-29 17:47:04'),
      name: 'John Doe',
      jsonField: {
        a: 'b',
        c: [1, 2, 3],
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
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_HEADERS]: [
        expect.any(Number),
      ],
      [MetricOperation.SHEET_APPEND]: [
        expect.any(Number),
      ],
    });
  });

  test('createAll method should insert a new row per each entity provided', async () => {
    // Configure table headers, so that save method can correctly match headers positions.
    const rawValues = [['id', 'createdAt', 'name', 'jsonField', 'current', 'year']];
    mockValuesResponse(rawValues);

    const entities: TestEntity[] = [
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe',
        jsonField: {
          a: 'b',
          c: [1, 2, 3],
        },
        current: undefined,
        year: 2023,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff36',
        createdAt: new Date('2024-12-31 17:47:04'),
        name: 'John Doe 2',
        jsonField: [1, 2, 3],
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
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_HEADERS]: [
        expect.any(Number),
      ],
      [MetricOperation.SHEET_APPEND]: [
        expect.any(Number),
      ],
    });
  });

  test('createAll method should not persist anything if an empty array is passed', async () => {
    await sut.createAll([]);
    // @ts-ignore
    expect(sheetClients.every(client => client.spreadsheets.values.append.mock.calls.length === 0)).toBeTruthy();
    expect(sut.metrics.toObject()).toStrictEqual({});
  });

  test('createAll method should fail if some passed entity has undefined id', async () => {
    await expect(
      sut.createAll([
        {
          // @ts-ignore
          id: undefined,
          createdAt: new Date('2023-12-29 17:47:04'),
          name: 'John Doe',
          jsonField: {
            a: 'b',
            c: [1, 2, 3],
          },
          current: undefined,
          year: 2023,
        },
        {
          id: 'ae222b54-182f-4958-b77f-26a3a04dff36',
          createdAt: new Date('2024-12-31 17:47:04'),
          name: 'John Doe 2',
          jsonField: [1, 2, 3],
          current: false,
          year: 2000,
        },
      ]),
    ).rejects.toStrictEqual(new GoogleSpreadsheetOrmError('Cannot persist entities that have no id.'));
    expect(sut.metrics.toObject()).toStrictEqual({});
  });

  test('delete method should correctly delete the row with that id', async () => {
    mockValuesResponse([
      ['id', 'createdAt', 'name', 'jsonField', 'current', 'year'],
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
        c: [1, 2, 3],
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
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_DATA]: [
        expect.any(Number),
      ],
      [MetricOperation.FETCH_SHEET_DETAILS]: [
        expect.any(Number),
      ],
      [MetricOperation.SHEET_DELETE]: [
        expect.any(Number),
      ],
    })
  });

  test('delete method should fail if provided entity is not part of the sheet', async () => {
    mockValuesResponse([['id', 'createdAt', 'name', 'jsonField', 'current', 'year']]);

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
        c: [1, 2, 3],
      },
      current: true,
      year: 2023,
    };

    await expect(sut.delete(entity)).rejects.toStrictEqual(
      new GoogleSpreadsheetOrmError(`Provided entity is not part of '${SHEET}' sheet.`),
    );
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_DATA]: [
        expect.any(Number),
      ],
    })
  });

  test('deleteAll method should correctly delete many rows', async () => {
    mockValuesResponse([
      ['id', 'createdAt', 'name', 'jsonField', 'current', 'year'],
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

    const entitiesToDelete: TestEntity[] = [
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe',
        jsonField: {
          a: 'b',
          c: [1, 2, 3],
        },
        current: true,
        year: 2023,
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe',
        jsonField: {
          a: 'b',
          c: [1, 2, 3],
        },
        current: true,
        year: 2023,
      },
    ];

    await sut.deleteAll(entitiesToDelete);

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
          {
            deleteDimension: {
              range: {
                sheetId: 1234,
                dimension: 'ROWS',
                startIndex: 1, // row 3
                endIndex: 2,
              },
            },
          },
        ],
      },
    });
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_DATA]: [
        expect.any(Number),
      ],
      [MetricOperation.FETCH_SHEET_DETAILS]: [
        expect.any(Number),
      ],
      [MetricOperation.SHEET_DELETE]: [
        expect.any(Number),
      ],
    })
  });

  test('deleteAll does not delete anything if no entities are passed', async () => {
    await sut.deleteAll([]);
    // @ts-ignore
    expect(sheetClients.every(client => client.spreadsheets.batchUpdate.mock.calls.length === 0)).toBeTruthy();
  });

  test('update should correctly send a single request to batchUpdate endpoint', async () => {
    mockValuesResponse([
      ['id', 'createdAt', 'name', 'jsonField', 'current', 'year'],
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

    const entity: TestEntity = {
      id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
      createdAt: new Date('2023-12-29 17:47:04'),
      name: 'John Doe - Update', // changed
      jsonField: {
        a: 'c', // changed
        c: [1, 2, 3],
      },
      current: false, // changed
      year: 2023,
    };

    await sut.update(entity);

    expect(getValuesBatchUpdateUsedSheetClient()?.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        includeValuesInResponse: false,
        data: [
          {
            range: `${SHEET}!A3:F3`,
            values: [
              [
                'ae222b54-182f-4958-b77f-26a3a04dff35', // id
                '29/12/2023 17:47:04', // createdAt
                'John Doe - Update', // name
                // language=json
                '{"a":"c","c":[1,2,3]}', // jsonField
                'false', // current
                '2023', // year
              ],
            ],
          },
        ],
      },
    });
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_DATA]: [
        expect.any(Number),
      ],
      [MetricOperation.SHEET_UPDATE]: [
        expect.any(Number),
      ],
    });
  });

  test('update should fail if entity has no id', async () => {
    await expect(
      // @ts-ignore
      sut.update({
        /* no values */
      }),
    ).rejects.toStrictEqual(new GoogleSpreadsheetOrmError('Cannot persist entities that have no id.'));
    expect(sut.metrics.toObject()).toStrictEqual({});
  });

  test('updateAll should do nothing if empty array is passed', async () => {
    await sut.updateAll([]);
    expect(
      // @ts-ignore
      sheetClients.every(client => client.spreadsheets.values.batchUpdate.mock.calls.length === 0),
    ).toBeTruthy();
    expect(sut.metrics.toObject()).toStrictEqual({});
  });

  test('updateAll should correctly update many rows', async () => {
    mockValuesResponse([
      ['id', 'createdAt', 'name', 'jsonField', 'current', 'year'],
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

    const entities: TestEntity[] = [
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe - Update', // changed
        jsonField: {
          a: 'c', // changed
          c: [1, 2, 3],
        },
        current: false, // changed
        year: 2025, // changed
      },
      {
        id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
        createdAt: new Date('2023-12-29 17:47:04'),
        name: 'John Doe - Update', // changed
        jsonField: {
          a: 'c', // changed
          c: [1, 2, 3],
        },
        current: false, // changed
        year: 2023,
      },
    ];

    await sut.updateAll(entities);

    expect(getValuesBatchUpdateUsedSheetClient()?.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        includeValuesInResponse: false,
        data: [
          {
            range: `${SHEET}!A2:F2`,
            values: [
              [
                'ae222b54-182f-4958-b77f-26a3a04dff34', // id
                '29/12/2023 17:47:04', // createdAt
                'John Doe - Update', // name
                // language=json
                '{"a":"c","c":[1,2,3]}', // jsonField
                'false', // current
                '2025', // year
              ],
            ],
          },
          {
            range: `${SHEET}!A3:F3`,
            values: [
              [
                'ae222b54-182f-4958-b77f-26a3a04dff35', // id
                '29/12/2023 17:47:04', // createdAt
                'John Doe - Update', // name
                // language=json
                '{"a":"c","c":[1,2,3]}', // jsonField
                'false', // current
                '2023', // year
              ],
            ],
          },
        ],
      },
    });
    expect(sut.metrics.toObject()).toMatchObject({
      [MetricOperation.FETCH_SHEET_DATA]: [
        expect.any(Number),
      ],
      [MetricOperation.SHEET_UPDATE]: [
        expect.any(Number),
      ],
    })
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

  function getValuesBatchUpdateUsedSheetClient(): sheets_v4.Sheets | undefined {
    return (
      sheetClients
        // @ts-ignore
        .find(client => client.spreadsheets.values.batchUpdate.mock.calls.length > 0)
    );
  }
});
