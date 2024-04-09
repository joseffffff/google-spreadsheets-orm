export type Castings<T extends object> = {
  [x in keyof T]?: string;
}