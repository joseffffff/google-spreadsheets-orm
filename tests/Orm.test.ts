import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetOrm } from '../src/GoogleSpreadsheetOrm';
import { FieldType } from '../src/serialization/FieldType';
import { mock, MockProxy } from 'jest-mock-extended';
import Resource$Spreadsheets$Values = sheets_v4.Resource$Spreadsheets$Values;
import Resource$Spreadsheets = sheets_v4.Resource$Spreadsheets;

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

describe(GoogleSpreadsheetOrm.name, () => {
  let sheetClients: MockProxy<sheets_v4.Sheets>[];
  let sut: GoogleSpreadsheetOrm<TestEntity>;

  beforeEach(() => {
    const firstClient = mock<sheets_v4.Sheets>();
    firstClient.spreadsheets = mock<Resource$Spreadsheets>();
    firstClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();

    const secondClient = mock<sheets_v4.Sheets>();
    secondClient.spreadsheets = mock<Resource$Spreadsheets>();
    secondClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();

    sheetClients = [firstClient, secondClient];
    sut = new GoogleSpreadsheetOrm<TestEntity>({
      spreadsheetId: SPREADSHEET_ID,
      sheet: SHEET,
      sheetClients,
      castings: {
        createdAt: FieldType.DATE,
        jsonField: FieldType.JSON,
        current: FieldType.BOOLEAN,
        year: FieldType.NUMBER,
      },
    });
  });

  test('findAll should correctly parse all values', async () => {
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

    const entities = await sut.findAll();

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
  });
});
