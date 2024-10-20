export const name = "RSSI Positioning";

export function parse(buf) {
  const str = Buffer.from(buf).toString();
  const m = /^AT\+RSSI_POS=(?<MAC1>.+?),(?<RSSI1>.+?),(?<MAC2>.+?),(?<RSSI2>.+?),(?<MAC3>.+?),(?<RSSI3>.+)/
    .exec(str);
  if (m && m.groups) {
    const { MAC1, RSSI1, MAC2, RSSI2, MAC3, RSSI3 } = m.groups;
    return `\nBeacon 1: ${MAC1} ${RSSI1}dBm\nBeacon 2: ${MAC2} ${RSSI2}dBm\nBeacon 3: ${MAC3} ${RSSI3}dBm`;
  }
  return buf;
}