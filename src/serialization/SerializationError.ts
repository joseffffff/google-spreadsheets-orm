import { GoogleSpreadsheetOrmError } from '../errors/GoogleSpreadsheetOrmError';

export class SerializationError extends GoogleSpreadsheetOrmError {
  constructor(message: string) {
    super(message);
  }
}