export const name = "RSSI Positioning";
export const args = [
  {
    name: "MAC 1",
    defaultValue: "",
  },
  {
    name: "RSSI 1",
    defaultValue: "",
  },
  {
    name: "MAC 2",
    defaultValue: "",
  },
  {
    name: "RSSI 2",
    defaultValue: "",
  },
  {
    name: "MAC 3",
    defaultValue: "",
  },
  {
    name: "RSSI 3",
    defaultValue: "",
  },
];

export function generate(mac1, rssi1, mac2, rssi2, mac3, rssi3) {
  return `AT+RSSI_POS=${mac1},${rssi1},${mac2},${rssi2},${mac3},${rssi3}\r\n`;
}