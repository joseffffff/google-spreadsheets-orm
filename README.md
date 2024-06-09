# Google Spreadsheet ORM

Lightweight Node.js library simplifying Google Sheets integration, offering a robust
object-relational mapping (ORM) interface, following the data-mapper pattern.
This library enables seamless CRUD operations, including batch operations, ensuring a strict Typescript typing.

> [!WARNING]  
> This library is still under construction, CRUD functionality will be available in a few weeks.

## Quickstart

### Install

```shell
npm install google-spreadsheets-orm
```

### Configuration

Here's an example of an instantiation using `CustomerModel` interface as type for the `customers` sheet rows.

The example is using `GoogleAuth` from [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)
as authentication, but any other auth option from the auth library is available to use, more info on the
[Authentication options](#authentication-options) section.

```typescript
import { GoogleAuth } from 'google-auth-library';
import { GoogleSpreadsheetOrm } from 'google-spreadsheets-orm';

interface CustomerModel {
  id: string;
  dateCreated: Date;
  name: string;
}

const myGoogleAuth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const orm = new GoogleSpreadsheetOrm<CustomerModel>({
  spreadsheetId: 'my-spreadsheet-id',
  sheet: 'customers',
  auth: myGoogleAuth,
  castings: {
    dateCreated: FieldType.DATE,
  },
});

// returns all customers in customers sheet, as an array of `CustomerModel`
const sheetCustomers = await orm.all();

// Adds a new row to customers sheet
await orm.create({
  id: '1111-2222-3333-4444',
  dateCreated: new Date(),
  name: 'John Doe',
});
```

### Authentication Options

GoogleSpreadsheetORM supports various authentication options for interacting with Google Sheets API. You can provide
authentication options through the `auth` or `sheetClients` properties in the `Options` configuration.

#### Auth

The `auth` property accepts either a single authentication option or an array of authentication options allowed in
Google APIs libraries. These options are used to create a `sheets_v4.Sheets` instance for each authentication object
provided. Operations are load-balanced across these clients, and quota retries for API rate limiting are automatically
handled when multiple authentication options are provided.

#### Sheet Clients

Alternatively, you can directly provide an array of `sheets_v4.Sheets` client instances through the `sheetClients`
property. GoogleSpreadsheetORM distributes operations among the provided clients for load balancing. Quota retries for
API rate limiting are automatically handled when using multiple clients.

## Methods Overview

GoogleSpreadsheetORM provides several methods for interacting with Google Sheets. Here's an overview of each method:

### `all()`

Retrieves all entities from the specified sheet, parsing and serializing them according to the field types defined in
the Castings configuration.

```typescript
const myEntities = await orm.all();
```

- **Returns**: A Promise that resolves to an array of entities of type `T`, representing all rows retrieved from the
  sheet.

### `create(entity: T)`

Creates a new row in the specified sheet with the provided entity data.

```typescript
// Adds a new row to sheet
await orm.create({
  id: '1111-2222-3333-4444',
  dateCreated: new Date(),
  name: 'John Doe',
});
```

- **Parameters**:
  - `entity`: The entity object to persist as a new row in the sheet.
- **Remarks**:
  - It internally retrieves the headers of the sheet to ensure proper alignment of data.
  - Quota retries are automatically handled to manage API rate limits.

### `createAll(entities: T[])`

Creates many new rows in the specified sheet with the provided entities.

```typescript
// Adds 2 new rows to sheet
await orm.createAll([
  {
    id: '1111-2222-3333-4444',
    dateCreated: new Date(),
    name: 'John Doe',
  },
  {
    id: '5555-6666-7777-8888',
    dateCreated: new Date(),
    name: 'John Doe 2',
  },
]);
```

- **Parameters**:
  - `entities`: The entity array to persist as new rows in the sheet.
- **Remarks**:
  - It internally retrieves the headers of the sheet to ensure proper alignment of data.
  - Quota retries are automatically handled to manage API rate limits.

### `delete(entity: T) | deleteById(entityId: string)’`

Deletes the entity provided from the spreadsheet.

```typescript
const myEntities: YourEntity[] = await orm.all();

const entityToDelete: YourEntity = myEntities.find(e => e.id === '1111-2222-3333-4444');

await orm.delete(entityToDelete);
```

- **Parameters**:
  - `entity`: The entity object to delete in the sheet.
- **Remarks**:
  - This method deletes the row in which the entity was persisted.
  - It internally fetches the sheet data to find which row needs to delete.
  - Quota retries are automatically handled to manage API rate limits.

### `deleteAll(entities: T[])` | `deleteAllByIdIn(entityIds: string[])`

Deletes the provided entities from the spreadsheet.

```typescript
const myEntities: YourEntity[] = await orm.all();

const entitiesToDelete: YourEntity[] = myEntities.filter(e => e.shouldBeDeleted());

await orm.delete(entitiesToDelete);
```

- **Parameters**:
  - `entities`: The entity array to delete in the sheet.
- **Remarks**:
  - It internally fetches the sheet data to find which row needs to delete.
  - Quota retries are automatically handled to manage API rate limits.

### `update(entity: T)`

Updates the row in the specified sheet matching by id. All values are replaced with the ones in the entity param.

```typescript
const myEntities: YourEntity[] = await orm.all();

const entityToUpdate: YourEntity = myEntities.find(e => e.id === '1111-2222-3333-4444');
entityToUpdate.name = 'Updated name';

await orm.update(entityToUpdate);
```

- **Parameters**:
  - `entity`: The entity object to update in the sheet.
- **Remarks**:
  - It internally retrieves sheet data to ensure proper alignment of data and checking which row needs to update.
  - Quota retries are automatically handled to manage API rate limits.

### `updateAll(entities: T[])`

Updates the rows in the specified sheet matching by id. All values are replaced with the ones in the entities param.

```typescript
const myEntities: YourEntity[] = await orm.all();

const entitiesToUpdate: YourEntity[] = myEntities.filter(e => e.shouldBeDeleted());

entitiesToUpdate.forEach(entity => {
  entity.name = 'Updated Name';
});

await orm.updateAll(entitiesToUpdate);
```

- **Parameters**:
  - `entities`: An array of entities objects to update in the sheet.
- **Remarks**:
  - It internally retrieves sheet data to ensure proper alignment of data and checking which row needs to update.
  - Quota retries are automatically handled to manage API rate limits.

### `metrics()`

Returns an object that contains request latencies, grouped by type of request.

Example of method response:

```typescript
{
  FETCH_SHEET_DATA: [432, 551, 901],
  SHEET_APPEND: [302, 104]
}
```

Check [MetricOperations](./src/metrics/MetricOperation.ts) class to see possible keys.
