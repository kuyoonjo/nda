export interface IFunc {
  name: string;
  input: boolean;
  args: {
    name: string;
    defaultValue: string;
  }[];
  type: "string" | "binary" | "object";
  fn?: (...args: string[]) => string | number[];
}

export interface IParser<T = any> {
  name: string;
  custom?: boolean;
  fn: (buf: T) => string;
}

export interface IIOHandler {
  addOutput: (str: string) => void;
}