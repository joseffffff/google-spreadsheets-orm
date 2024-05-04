import { GoogleSpreadsheetOrmError } from './GoogleSpreadsheetOrmError';

export class InvalidConfigurationError extends GoogleSpreadsheetOrmError {
  constructor(message: string) {
    super(message);
  }
}
