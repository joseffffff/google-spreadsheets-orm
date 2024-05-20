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
import { GoogleSpreadsheetOrm } from 'google-spreadsheet-orm';

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
const myEntities = await orm.all()
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
  - This method appends a new row at the end of the specified sheet in the associated spreadsheet.
  - It retrieves the headers of the sheet to ensure proper alignment of data.
  - The entity object is converted into an array of cell values according to the sheet headers.
  - Quota retries are automatically handled to manage API rate limits.

### `delete(entity: T)`

Deletes the entity provided from the spreadsheet.

```typescript
const myEntities: YourEntity[] = await orm.all()

const entityToDelete: YourEntity = myEntities.find(e => e.id === '1111-2222-3333-4444')

await orm.delete(entityToDelete);
```

- **Parameters**:
  - `entity`: The entity object to delete in the sheet.
- **Remarks**:
  - This method deletes the row in which the entity was persisted.
  - It internally fetches the sheet data to find which row needs to delete. 
  - Quota retries are automatically handled to manage API rate limits.
