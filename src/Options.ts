import { Castings } from './Castings';
import { BaseExternalAccountClient, GoogleAuth, OAuth2Client } from 'google-auth-library';
import { sheets_v4 } from 'googleapis';

export type AuthOptions = GoogleAuth | OAuth2Client | BaseExternalAccountClient | string;

export interface Options<T extends { id: string }> {
  readonly castings?: Castings<T>;
  readonly sheetClients?: sheets_v4.Sheets[];
  readonly auth?: AuthOptions | AuthOptions[];
  readonly verbose?: boolean;
  // readonly cacheContent: false;
  readonly instantiator?: (values: object) => T;
}
