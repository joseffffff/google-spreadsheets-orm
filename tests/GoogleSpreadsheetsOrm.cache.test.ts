import { mock, MockProxy } from 'jest-mock-extended';
import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetsOrm } from '../src';
import { FieldType } from '../src/serialization/FieldType';
import Resource$Spreadsheets = sheets_v4.Resource$Spreadsheets;
import Resource$Spreadsheets$Values = sheets_v4.Resource$Spreadsheets$Values;
import Mock = jest.Mock;

const SPREADSHEET_ID = 'spreadsheetId';
const SHEET = 'test_entities';

class TestEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly enabled: boolean,
  ) {}
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
      sheetClients: [sheetClient],
      verbose: false,
      cacheEnabled: true, // !!
      cacheTtlSeconds: 1,
      castings: {
        enabled: FieldType.BOOLEAN,
      },
      instantiator: row => new TestEntity(row.id, row.name, row.enabled),
    });
  });

  test('Should just call once to spreadsheets api if cache is enabled', async () => {
    const rawValues = [
      ['id', 'name', 'enabled'],
      ['ae222b54-182f-4958-b77f-26a3a04dff32', 'John Doe', 'false'],
      ['ae222b54-182f-4958-b77f-26a3a04dff33', 'Donh Joe', 'true'],
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

    await sleep(1000); // 1-second sleep

    await sut.all();
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(2); // New call again after ttl consumed
  });

  test('delete should correctly use cache and invalidate after write process', async () => {
    const rawValues = [
      ['id', 'name', 'enabled'],
      ['ae222b54-182f-4958-b77f-26a3a04dff32', 'John Doe', 'false'],
      ['ae222b54-182f-4958-b77f-26a3a04dff33', 'Donh Joe', 'true'],
    ];

    (sheetClient.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>).get.mockResolvedValue({
      data: {
        values: rawValues,
      },
    } as never);
    (sheetClient.spreadsheets as MockProxy<sheets_v4.Resource$Spreadsheets>).get.mockResolvedValue({
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

    await sut.all(); // content cached here

    await sut.deleteById('ae222b54-182f-4958-b77f-26a3a04dff32');
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(1); // create took headers from cache
    expect(sheetClient.spreadsheets.get).toHaveBeenCalledTimes(1); // fetch sheet details

    await sut.deleteById('ae222b54-182f-4958-b77f-26a3a04dff33');
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(2); // cache was invalidated in previous call
    expect(sheetClient.spreadsheets.get).toHaveBeenCalledTimes(1); // Sheet details still in cache
  });

  test('create should correctly use cache and invalidate after write process', async () => {
    // Configure table headers, so that save method can correctly match headers positions.
    const rawValues = [['id', 'createdAt', 'name', 'jsonField', 'current', 'year']];

    (sheetClient.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>).get.mockResolvedValue({
      data: {
        values: rawValues,
      },
    } as never);

    const entity = new TestEntity('ae222b54-182f-4958-b77f-26a3a04dff32', 'John Doe', false);

    await sut.all(); // headers cached here

    await sut.create(entity);

    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(1); // create took headers from cache

    await sut.all(); // Cache is invalidated on create, this should do another fetch
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(2);
  });

  test('update should correctly use cache and invalidate after write process', async () => {
    const rawValues = [
      ['id', 'name', 'enabled'],
      ['ae222b54-182f-4958-b77f-26a3a04dff32', 'John Doe', 'false'],
      ['ae222b54-182f-4958-b77f-26a3a04dff33', 'Donh Joe', 'true'],
    ];

    (sheetClient.spreadsheets.values as MockProxy<sheets_v4.Resource$Spreadsheets$Values>).get.mockResolvedValue({
      data: {
        values: rawValues,
      },
    } as never);

    const entity = new TestEntity(
      'ae222b54-182f-4958-b77f-26a3a04dff32',
      'John Doe 2', // updated
      true, // updated
    );

    await sut.all(); // content cached here

    await sut.update(entity);
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(1); // took data from cache

    await sut.all(); // Cache is invalidated on create, this should do another fetch
    expect(sheetClient.spreadsheets.values.get).toHaveBeenCalledTimes(2);
  });

  function sleep(millis: number): Promise<void> {
    return new Promise((resolve, reject) => setTimeout(resolve, millis));
  }
});
