import { BaseModel } from '../BaseModel';

export type Plain<T extends BaseModel> = {
  [key in keyof T]: T[key] extends Function ? never : T[key];
};
