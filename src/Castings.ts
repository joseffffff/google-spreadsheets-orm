import { FieldType } from './serialization/FieldType';
import { BaseModel } from './BaseModel';

export type Castings<T extends BaseModel> = {
  [x in keyof T]?: FieldType;
};
