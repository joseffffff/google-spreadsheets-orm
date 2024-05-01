# Google Spreadsheet ORM

Production-ready lightweight Node.js library simplifying Google Sheets integration, offering a robust
object-relational mapping (ORM) interface, following the data-mapper pattern.
This library enables seamless CRUD operations, including batch operations, ensuring a strict Typescript typing.

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
const sheetCustomers = await orm.findAll();

// Adds a new row to customers sheet
await orm.create({
  id: '1111-2222-3333-4444',
  dateCreated: new Date(),
  name: 'John Doe',
});
```

### Authentication options

TODO

## API

### `findAll()`

Returns all sheet content as an array of the provided type.
