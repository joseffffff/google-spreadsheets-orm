import { sheets_v4 } from 'googleapis';
import { GoogleSpreadsheetOrm } from '../src/GoogleSpreadsheetOrm';

import jest from 'jest';

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
  readonly current: boolean;
  readonly age: number;
}

describe(GoogleSpreadsheetOrm.name, () => {
  let sut: GoogleSpreadsheetOrm<TestEntity>;

  beforeEach(() => {
    sut = new GoogleSpreadsheetOrm<TestEntity>(SPREADSHEET_ID, SHEET, )
  });


  it('dummy', () => {
    expect(1).toBe(1);
  });
});
//
// const instantiator = (row: object) => new TestEntity(row as TestEntity);
//
// describe(GoogleSpreadsheetOrm, () => {
//   let sheetsClient: MockProxy<sheets_v4.Sheets>;
//   let ioTimingsReporter: IOTimingsReporter;
//   let orm: Orm<TestEntity>;
//   let requestId: RequestId;
//
//   beforeEach(() => {
//     sheetsClient = mock<sheets_v4.Sheets>();
//     sheetsClient.spreadsheets = mock<Resource$Spreadsheets>();
//     sheetsClient.spreadsheets.values = mock<Resource$Spreadsheets$Values>();
//
//     orm = new GoogleSpreadsheetOrm<TestEntity>(
//       ioTimingsReporter,
//       DATABASE_ID,
//       TABLE,
//       instantiator,
//       {
//         createdAt: CastingName.DATE,
//         updatedAt: CastingName.DATE,
//         jsonField: CastingName.JSON,
//         current: CastingName.BOOLEAN,
//         course: CastingName.NUMBER,
//       },
//       {
//         cacheContent: false,
//       },
//       new GoogleSheetClientProvider([ sheetsClient ]),
//     );
//   });
//
//   test('findAll should correctly parse all values', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff33',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe',
//         // language=json
//         '{ "a": { "b": "c" } }',
//         'true',
//         '',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         '',
//         undefined,
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff35',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 3',
//         '{}',
//         undefined,
//         '666',
//       ],
//     ];
//
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entities = await orm.findAll();
//
//     expect(entities).toStrictEqual([
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//         createdAt: new Date('2022-10-13 08:11:23'),
//         updatedAt: new Date('2022-10-13 08:11:23'),
//         name: 'John Doe',
//         jsonField: [ 1, 2, 3, 4, 5, 6 ],
//         current: false,
//         course: 2023,
//       }),
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff33',
//         createdAt: new Date('2023-12-29 17:47:04'),
//         updatedAt: new Date('2023-12-29 17:47:04'),
//         name: 'Donh Joe',
//         jsonField: { a: { b: 'c' } },
//         current: true,
//         course: undefined,
//       }),
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
//         createdAt: new Date('2023-12-29 17:47:04'),
//         updatedAt: new Date('2023-12-29 17:47:04'),
//         name: 'Donh Joe 2',
//         jsonField: {},
//         current: undefined,
//         course: undefined,
//       }),
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff35',
//         createdAt: new Date('2023-12-29 17:47:04'),
//         updatedAt: new Date('2023-12-29 17:47:04'),
//         name: 'Donh Joe 3',
//         jsonField: {},
//         current: undefined,
//         course: 666,
//       }),
//     ]);
//   });
//
//   test('findAll should throw InternalServerError if a boolean field contains an invalid boolean value', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         // language=json
//         '[1, 2, 3, 4, 5, 6]',
//         'this is not a valid boolean', // <-- !!
//         '2023',
//       ],
//     ];
//
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     await expect(orm.findAll()).rejects.toBeInstanceOf(InternalServerErrorException);
//   });
//
//   test('findAll should throw InternalServerError if a number field contains an invalid number value', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'true',
//         'this is not a valid number', // <-- !!
//       ],
//     ];
//
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     await expect(orm.findAll()).rejects.toBeInstanceOf(InternalServerErrorException);
//   });
//
//   test('findByColumn should correctly filter values by single column', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff33',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe',
//         '{ "a": { "b": "c" } }',
//         'true',
//         '',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         undefined,
//       ],
//     ];
//
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entities = await orm.findByColumn('current', false);
//
//     expect(entities).toStrictEqual([
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//         createdAt: new Date('2022-10-13 08:11:23'),
//         updatedAt: new Date('2022-10-13 08:11:23'),
//         name: 'John Doe',
//         jsonField: [ 1, 2, 3, 4, 5, 6 ],
//         current: false,
//         course: 2023,
//       }),
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
//         createdAt: new Date('2023-12-29 17:47:04'),
//         updatedAt: new Date('2023-12-29 17:47:04'),
//         name: 'Donh Joe 2',
//         jsonField: {},
//         current: false,
//         course: undefined,
//       }),
//     ]);
//   });
//
//   test('findOneByColumn should find first row with match', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         undefined,
//       ],
//     ];
//
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = await orm.findOneByColumn('id', 'ae222b54-182f-4958-b77f-26a3a04dff34');
//
//     expect(entity).toStrictEqual(
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
//         createdAt: new Date('2023-12-29 17:47:04'),
//         updatedAt: new Date('2023-12-29 17:47:04'),
//         name: 'Donh Joe 2',
//         jsonField: {},
//         current: false,
//         course: undefined,
//       }),
//     );
//   });
//
//   test('findOneByColumn should return undefined if there is no match', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         undefined,
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = await orm.findOneByColumn('id', 'non-existing-id');
//     expect(entity).toBeUndefined();
//   });
//
//   test('findByColumns should return empty array if there is no match', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         undefined,
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = await orm.findByColumns({
//       id: 'non-existing-id',
//       name: 'John Doe',
//     });
//     expect(entity).toStrictEqual([]);
//   });
//
//   test('findByColumns should return entities with all the matches', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         undefined,
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = await orm.findByColumns({
//       name: 'John Doe',
//       current: false,
//     });
//     expect(entity).toStrictEqual([
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//         createdAt: new Date('2022-10-13 08:11:23'),
//         updatedAt: new Date('2022-10-13 08:11:23'),
//         name: 'John Doe',
//         jsonField: [ 1, 2, 3, 4, 5, 6 ],
//         current: false,
//         course: 2023,
//       }),
//     ]);
//   });
//
//   test('findByAllColumnsIn should return entities with all the matches', async () => {
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '13/10/2022 08:11:23',
//         '13/10/2022 08:11:23',
//         'John Doe',
//         '[1, 2, 3, 4, 5, 6]',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff34',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         '2023',
//       ],
//       [
//         'ae222b54-182f-4958-b77f-26a3a04dff35',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'Donh Joe 2',
//         '{}',
//         'false',
//         '2023',
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = await orm.findByColumnIn('id', [
//       'ae222b54-182f-4958-b77f-26a3a04dff32',
//       'ae222b54-182f-4958-b77f-26a3a04dff34',
//     ]);
//     expect(entity).toStrictEqual([
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//         createdAt: new Date('2022-10-13 08:11:23'),
//         updatedAt: new Date('2022-10-13 08:11:23'),
//         name: 'John Doe',
//         jsonField: [ 1, 2, 3, 4, 5, 6 ],
//         current: false,
//         course: 2023,
//       }),
//       new TestEntity({
//         id: 'ae222b54-182f-4958-b77f-26a3a04dff34',
//         createdAt: new Date('2023-12-29 17:47:04'),
//         updatedAt: new Date('2023-12-29 17:47:04'),
//         name: 'Donh Joe 2',
//         jsonField: {},
//         current: false,
//         course: 2023,
//       }),
//     ]);
//   });
//
//   test('create method should insert a new row if the entity has no id', async () => {
//     // Configure table headers, so that save method can correctly match headers positions.
//     const rawValues = [ [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ] ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = new TestEntity({
//       name: 'John Doe',
//       jsonField: {
//         a: 'b',
//         c: [ 1, 2, 3 ],
//       },
//       current: false,
//       course: 2025,
//     });
//
//     const saved = await orm.save(entity);
//
//     expect(saved).toBeTruthy();
//
//     const appendArgument = sheetsClient.spreadsheets.values.append.mock
//       .calls[0][0] as Params$Resource$Spreadsheets$Values$Append;
//
//     expect(appendArgument.spreadsheetId).toBe(DATABASE_ID);
//     expect(appendArgument.range).toBe(TABLE);
//     expect(appendArgument.insertDataOption).toBe('INSERT_ROWS');
//     expect(appendArgument.valueInputOption).toBe('USER_ENTERED');
//
//     const rawInsertedRow = appendArgument.requestBody.values[0] as DatabaseRowValue[];
//
//     expect(rawInsertedRow[0]).toMatch(UUID_REGEX); // id
//     expect(rawInsertedRow[1]).toMatch(DATE_REGEX); // createdAt
//     expect(rawInsertedRow[2]).toMatch(DATE_REGEX); // updatedAt
//     expect(rawInsertedRow[3]).toBe('John Doe'); // name
//     // language=json
//     expect(rawInsertedRow[4]).toBe('{"a":"b","c":[1,2,3]}'); // jsonField
//     expect(rawInsertedRow[5]).toBe('false'); // current
//     expect(rawInsertedRow[6]).toBe('2025'); // course
//   });
//
//   test('create method should update the row if the entity has id', async () => {
//     // Configure table headers, so that save method can correctly match headers positions.
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         // row to update
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'John Doe',
//         '{"a":"b","c":[1,2,3]}',
//         'false',
//         '2025',
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const entity = new TestEntity({
//       id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//       createdAt: new Date('2023-12-29 17:47:04'),
//       updatedAt: new Date('2023-12-29 17:47:04'),
//       name: 'John Doe 2',
//       jsonField: {
//         a: 'b',
//         c: [ 1, 2, 3 ],
//       },
//       current: false,
//       course: 2025,
//     });
//
//     const saved = await orm.save(entity);
//
//     expect(saved).toBeTruthy();
//
//     const updateArgument = sheetsClient.spreadsheets.values.update.mock
//       .calls[0][0] as Params$Resource$Spreadsheets$Values$Update;
//
//     expect(updateArgument.spreadsheetId).toBe(DATABASE_ID);
//     expect(updateArgument.range).toBe('test_entities!A2:G2');
//     expect(updateArgument.valueInputOption).toBe('USER_ENTERED');
//
//     const rawInsertedRow = updateArgument.requestBody.values[0] as DatabaseRowValue[];
//
//     expect(rawInsertedRow[0]).toBe('ae222b54-182f-4958-b77f-26a3a04dff32');
//     expect(rawInsertedRow[1]).toBe('29/12/2023 17:47:04'); // createdAt
//
//     // updatedAt is updated
//     expect(rawInsertedRow[2]).not.toBe('29/12/2023 17:47:04');
//     expect(rawInsertedRow[2]).toMatch(DATE_REGEX);
//
//     expect(rawInsertedRow[3]).toBe('John Doe 2'); // name (updated)
//     expect(rawInsertedRow[4]).toBe('{"a":"b","c":[1,2,3]}'); // jsonField
//     expect(rawInsertedRow[5]).toBe('false'); // current
//     expect(rawInsertedRow[6]).toBe('2025'); // course
//   });
//
//   test('createAll method should insert many rows at once', async () => {
//     const rawValues = [ [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ] ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     const testEntities: TestEntity[] = [
//       new TestEntity({
//         name: 'John Doe',
//         jsonField: {
//           a: 'b',
//           c: [ 1, 2, 3 ],
//         },
//         current: false,
//         course: 2025,
//       }),
//       new TestEntity({
//         name: 'Jane Doe',
//         jsonField: {
//           a: 'c',
//           c: [ 4, 5, 6 ],
//         },
//         current: true,
//         course: 2026,
//       }),
//       new TestEntity({
//         name: 'Jack Doe',
//         jsonField: {
//           a: 'd',
//           c: [ 7, 8, 9 ],
//         },
//         current: false,
//         course: 2027,
//       }),
//     ];
//
//     const saved = await orm.createAll(testEntities);
//
//     expect(saved).toBeTruthy();
//
//     const appendArgument = sheetsClient.spreadsheets.values.append.mock
//       .calls[0][0] as Params$Resource$Spreadsheets$Values$Append;
//
//     expect(appendArgument.spreadsheetId).toBe(DATABASE_ID);
//     expect(appendArgument.range).toBe(TABLE);
//     expect(appendArgument.insertDataOption).toBe('INSERT_ROWS');
//     expect(appendArgument.valueInputOption).toBe('USER_ENTERED');
//
//     const rawInsertedRows = appendArgument.requestBody.values as DatabaseRowValue[][];
//
//     expect(rawInsertedRows.length).toBe(3);
//
//     expect(rawInsertedRows[0][0]).toMatch(UUID_REGEX); // id
//     expect(rawInsertedRows[0][1]).toMatch(DATE_REGEX); // createdAt
//     expect(rawInsertedRows[0][2]).toMatch(DATE_REGEX); // updatedAt
//     expect(rawInsertedRows[0][3]).toBe('John Doe'); // name
//     // language=json
//     expect(rawInsertedRows[0][4]).toBe('{"a":"b","c":[1,2,3]}'); // jsonField
//     expect(rawInsertedRows[0][5]).toBe('false'); // current
//     expect(rawInsertedRows[0][6]).toBe('2025'); // course
//
//     expect(rawInsertedRows[1][0]).toMatch(UUID_REGEX); // id
//     expect(rawInsertedRows[1][1]).toMatch(DATE_REGEX); // createdAt
//     expect(rawInsertedRows[1][2]).toMatch(DATE_REGEX); // updatedAt
//     expect(rawInsertedRows[1][3]).toBe('Jane Doe'); // name
//     // language=json
//     expect(rawInsertedRows[1][4]).toBe('{"a":"c","c":[4,5,6]}'); // jsonField
//     expect(rawInsertedRows[1][5]).toBe('true'); // current
//     expect(rawInsertedRows[1][6]).toBe('2026'); // course
//
//     expect(rawInsertedRows[2][0]).toMatch(UUID_REGEX); // id
//     expect(rawInsertedRows[2][1]).toMatch(DATE_REGEX); // createdAt
//     expect(rawInsertedRows[2][2]).toMatch(DATE_REGEX); // updatedAt
//     expect(rawInsertedRows[2][3]).toBe('Jack Doe'); // name
//     // language=json
//     expect(rawInsertedRows[2][4]).toBe('{"a":"d","c":[7,8,9]}'); // jsonField
//     expect(rawInsertedRows[2][5]).toBe('false'); // current
//   });
//
//   test('delete should correctly delete a row', async () => {
//     // Configure table headers, so that save method can correctly match headers positions.
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         // row to delete
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'John Doe',
//         '{"a":"b","c":[1,2,3]}',
//         'false',
//         '2025',
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     sheetsClient.spreadsheets.get.mockResolvedValue({
//       data: {
//         sheets: [
//           {
//             properties: {
//               title: TABLE,
//               sheetId: 1234,
//             },
//           },
//         ],
//       },
//     } as never);
//
//     const entity = new TestEntity({
//       id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//       createdAt: new Date('2023-12-29 17:47:04'),
//       updatedAt: new Date('2023-12-29 17:47:04'),
//       name: 'John Doe 2',
//       jsonField: {
//         a: 'b',
//         c: [ 1, 2, 3 ],
//       },
//       current: false,
//       course: 2025,
//     });
//
//     const saved = await orm.delete(entity);
//
//     expect(saved).toBeTruthy();
//
//     const deleteArgument = sheetsClient.spreadsheets.batchUpdate.mock
//       .calls[0][0] as Params$Resource$Spreadsheets$Batchupdate;
//
//     expect(deleteArgument.spreadsheetId).toBe(DATABASE_ID);
//     expect(deleteArgument.requestBody.requests[0].deleteDimension.range.sheetId).toBe(1234);
//     expect(deleteArgument.requestBody.requests[0].deleteDimension.range.dimension).toBe('ROWS');
//     expect(deleteArgument.requestBody.requests[0].deleteDimension.range.startIndex).toBe(1);
//     expect(deleteArgument.requestBody.requests[0].deleteDimension.range.endIndex).toBe(2);
//   });
//
//   test('delete should throw an InternalServerErrorException if it cannot find details for that sheet', async () => {
//     // Configure table headers, so that save method can correctly match headers positions.
//     const rawValues = [
//       [ 'id', 'createdAt', 'updatedAt', 'name', 'jsonField', 'current', 'course' ],
//       [
//         // row to delete
//         'ae222b54-182f-4958-b77f-26a3a04dff32',
//         '29/12/2023 17:47:04',
//         '29/12/2023 17:47:04',
//         'John Doe',
//         '{"a":"b","c":[1,2,3]}',
//         'false',
//         '2025',
//       ],
//     ];
//     sheetsClient.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: rawValues,
//       },
//     } as never);
//
//     sheetsClient.spreadsheets.get.mockResolvedValue({
//       data: {
//         sheets: [], // No details
//       },
//     } as never);
//
//     const entity = new TestEntity({
//       id: 'ae222b54-182f-4958-b77f-26a3a04dff32',
//       createdAt: new Date('2023-12-29 17:47:04'),
//       updatedAt: new Date('2023-12-29 17:47:04'),
//       name: 'John Doe 2',
//       jsonField: {
//         a: 'b',
//         c: [ 1, 2, 3 ],
//       },
//       current: false,
//       course: 2025,
//     });
//
//     await expect(orm.delete(entity)).rejects.toBeInstanceOf(InternalServerErrorException);
//   });
// });
