export interface IGenerator {
  name: string;
  input: boolean;
  args: {
    name: string;
    defaultValue: string;
  }[];
  type: "string" | "octets" | "object";
  generate?: (...args: string[]) => string | number[];
}

export interface IParser {
  name: string;
  custom?: boolean;
  parse: (buf: number[]) => string;
}

export interface IIOHandler {
  addOutput: (str: string, color?: 'primary' | 'error' | 'success') => void;
}

export const stringGenerator: IGenerator =
{
  name: "String",
  input: true,
  args: [],
  type: "string",
};

export const binaryGenerator: IGenerator =
{
  name: "Octets",
  input: true,
  args: [],
  type: "octets",
};

export const objectGenerator: IGenerator =
{
  name: "object",
  input: true,
  args: [],
  type: "object",
};

export const stringParser: IParser = {
  name: "String",
  custom: true,
  parse: (buf: number[]) => JSON.stringify(String.fromCharCode(...buf)),
};

export const binaryParser: IParser = {
  name: "Octets",
  custom: true,
  parse: (buf: number[]) => buf.map((x) => x.toString(16).padStart(2, "0")).join(" "),
};

export const objectParser: IParser = {
  name: "object",
  custom: false,
  parse: (buf: number[]) => JSON.stringify(String.fromCharCode(...buf), null, 2),
};

export async function packInput(gen: IGenerator, input: string) {
  let message: string | number[];
  let data: string;
  switch (gen.type) {
    case "octets":
      message = Array.from(Buffer.from(
        input
          .split(/\s+/)
          .map((x) => (x.length % 2 ? "0" + x : x))
          .join(""),
        "hex",
      ));
      data = message
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(" ");
      break;
    case "string":
      const v = input.split('\n').map(x => x.trim()).join("");
      const o = `{"v":"${v}"}`;
      message = JSON.parse(o).v;
      data = JSON.stringify(message);
      break;
    case "object":
      var b64 = "data:text/javascript,export const value = " + input;
      const m = await import(b64);
      message = m.value;
      data = input;
      break;
  }
  return { message, data };
}