import { GoogleSpreadsheetOrmError } from './GoogleSpreadsheetOrmError';

export class SerializationError extends GoogleSpreadsheetOrmError {
  constructor(message: string) {
    super(message);
  }
}
