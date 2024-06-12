import { mock, MockProxy } from 'jest-mock-extended';
import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetsOrm } from '../src';
import { FieldType } from '../src/serialization/FieldType';
import Resource$Spreadsheets = sheets_v4.Resource$Spreadsheets;
import Resource$Spreadsheets$Values = sheets_v4.Resource$Spreadsheets$Values;

const SPREADSHEET_ID = 'spreadsheetId';
const SHEET = 'test_entities';

class TestEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly enabled: boolean,
  ) {
  }
}

describe('Cached ORM tests', () => {
  let sheetClient: MockProxy<sheets_v4.Sheets>;
  let sut: GoogleSpreadsheetsOrm<TestEntity>;

  beforeEach(() => {
    sheetClient = mock<sheets_v4.Sheets>();
    sheetClient.spreadsheets = mock<Resource$Spreadsheets>();
    sheetClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();

    sut = new GoogleSpreadsheetsOrm<TestEntity>({
      spreadsheetId: SPREADSHEET_ID,
      sheet: SHEET,
      sheetClients: [ sheetClient ],
      verbose: false,
      cacheEnabled: true, // !!
      castings: {
        enabled: FieldType.BOOLEAN,
      },
      instantiator: row => new TestEntity(row.id, row.name, row.enabled),
    });
  });

  test('Should just call once to spreadsheets api if cache is enabled', async () => {
    const rawValues = [
      [ 'id', 'name', 'enabled' ],
      [
        'ae222b54-182f-4958-b77f-26a3a04dff32',
        'John Doe',
        'false',
      ],
      [
        'ae222b54-182f-4958-b77f-26a3a04dff33',
        'Donh Joe',
        'true',
      ],
    ];

    (sheetClient.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>).get.mockResolvedValue({
      data: {
        values: rawValues,
      },
    } as never);

    const firstResult = await sut.all();
    const secondResult = await sut.all();

    expect(firstResult).toStrictEqual([
      new TestEntity('ae222b54-182f-4958-b77f-26a3a04dff32', 'John Doe', false),
      new TestEntity('ae222b54-182f-4958-b77f-26a3a04dff33', 'Donh Joe', true),
    ]);
    expect(firstResult).toStrictEqual(secondResult);
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(1); // just one call
  });
});