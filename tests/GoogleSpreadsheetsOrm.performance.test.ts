import { mock, MockProxy } from 'jest-mock-extended';
import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetsOrm } from '../src';
import { FieldType } from '../src/serialization/FieldType';
import Resource$Spreadsheets = sheets_v4.Resource$Spreadsheets;
import Resource$Spreadsheets$Values = sheets_v4.Resource$Spreadsheets$Values;

import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

const SPREADSHEET_ID = 'spreadsheetId';
const SHEET = 'test_entities';

class TestEntity {
  constructor(
    public readonly id: string,
    public readonly age: number,
    public readonly createdAt: Date,
    public readonly enabled: boolean,
    public readonly jsonField: object,
  ) {}
}

describe('Performance ORM tests', () => {
  let sheetClient: MockProxy<sheets_v4.Sheets>;
  let sut: GoogleSpreadsheetsOrm<TestEntity>;

  beforeEach(() => {
    sheetClient = mock<sheets_v4.Sheets>();
    sheetClient.spreadsheets = mock<Resource$Spreadsheets>();
    sheetClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();

    sut = new GoogleSpreadsheetsOrm<TestEntity>({
      spreadsheetId: SPREADSHEET_ID,
      sheet: SHEET,
      sheetClients: [sheetClient],
      verbose: false,
      cacheEnabled: false,
      cacheTtlSeconds: 1,
      castings: {
        enabled: FieldType.BOOLEAN,
      },
      instantiator: row => new TestEntity(row.id, row.age, row.createdAt, row.enabled, row.jsonField),
    });
  });

  test('Performance testing for 1000 rows', async () => {
    const executionTimeMs = await runForRandomData(1000);
    expect(executionTimeMs).toBeLessThan(5);
  });

  test('Performance testing for 10000 rows', async () => {
    const executionTimeMs = await runForRandomData(10_000);
    expect(executionTimeMs).toBeLessThan(20);
  });

  test('Performance testing for 100000 rows', async () => {
    const executionTimeMs = await runForRandomData(100_000);
    expect(executionTimeMs).toBeLessThan(100);
  });

  async function runForRandomData(rows: number): Promise<number> {
    const rawValues = [
      ['id', 'age', 'createdAt', 'enabled', 'jsonField'],
      ...Array(rows)
        .fill(1)
        .map(_ => [
          faker.string.uuid(),
          faker.number.int().toString(),
          DateTime.fromJSDate(faker.date.past()).toFormat('d/M/yyyy H:mm:ss'),
          faker.datatype.boolean().toString(),
          '[1,2,3,4,5]',
        ]),
    ];

    (sheetClient.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>).get.mockResolvedValue({
      data: {
        values: rawValues,
      },
    } as never);

    const start = Date.now();
    await sut.all();
    const end = Date.now();

    return end - start;
  }
});
