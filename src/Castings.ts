import { FieldType } from './serialization/FieldType';

export type Castings<T extends object> = {
  [x in keyof T]?: FieldType;
};
