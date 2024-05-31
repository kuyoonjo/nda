export const name = "CLE 7E CMD";
export const args = [
  {
    name: "devType",
    defaultValue: "03",
  },
  {
    name: "subCMD",
    defaultValue: "0f",
  },
];
export function fn(devType, subCMD) {
  const b = [
    0x7e,
    0x00,
    0x0c,
    parseInt(devType, 16),
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    ...Array.from(
      Buffer.from(
        subCMD
          .split(/\s+/)
          .map((x) => (x.length % 2 ? "0" + x : x))
          .join(""),
        "hex",
      ),
    ),
    0x00,
  ];
  b[b.length - 1] = b.reduce((x, y) => x + y) & 0xff;

  return b;
}