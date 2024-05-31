export const name = '+OKDEVINFO';
export function parseChannels(
  BLE_SCAN_CHANNEL,
  CHAN_SELECT_MAP,
  CHAN_SELECT_MASK,
  CHAN_WHITE_MASK,
) {
  const SCAN_CHANNELS = [];
  if (CHAN_SELECT_MAP) {
    const ms = CHAN_SELECT_MAP.split(':').map(x => parseInt(x, 16));
    const bs = parseInt(CHAN_SELECT_MASK, 10).toString(2).split('').reverse().map(x => parseInt(x));
    const ws = parseInt(CHAN_WHITE_MASK, 10).toString(2).split('').reverse().map(x => parseInt(x));
    for (let i = 0; i < bs.length; i++) {
      if (bs[i]) {
        SCAN_CHANNELS.push({
          value: ms[i] + 2400,
          whitening: !!ws[i],
        });
      }
    }
  } else {
    const value = (~~BLE_SCAN_CHANNEL) + 2400;
    SCAN_CHANNELS.push({
      value,
      whitening: [2402, 2426, 2480].includes(value),
    });
  }
  return SCAN_CHANNELS;
}
export function fn(buf) {
  const str = Buffer.from(buf).toString();
  if (str.startsWith('+OKDEVINFO')) {
    const m = /^\+OKDEVINFO=(?<DEV_TYPE>.+?),(?<DEV_IP>.+?),(?<MAC>.+?),(?<CFG_STATUS>.+?),(?<EXTRA>.+)/
      .exec(str);
    if (m && m.groups) {
      const [
        VERSION,
        IP_MODE,
        BLE_SCAN_CHANNEL,
        NAT_IP,
        NAT_PORT,
        NAT_INTERVAL,
        SUBNET_MASK,
        DEFAULT_GATEWAY,
        CHAN_SELECT_MAP,
        CHAN_SELECT_MASK,
        CHAN_WHITE_MASK,
        SYNC_FREQUENCY,
        PUBLIC_KEY,
        AUTH_KEY,
      ] = m.groups.EXTRA.split(',');

      let res = JSON.stringify(str);
      res += `\nMAC: ${m.groups.MAC}, VERSION: ${VERSION}, MODEL_NAME: ${m.groups.DEV_TYPE}`;
      const channels = parseChannels(BLE_SCAN_CHANNEL, CHAN_SELECT_MAP, CHAN_SELECT_MASK, CHAN_WHITE_MASK);
      res += `\nCHANNELS: ${channels.map(x => x.value + (x.whitening ? '(W)' : '')).join(', ')}`;
      res += `\nLAN: ${IP_MODE === '0' ? 'DHCP' : 'STATIC'} ${m.groups.DEV_IP} ${SUBNET_MASK} ${DEFAULT_GATEWAY}`;
      if (NAT_IP) {
        res += `\nNAT: ${NAT_IP} ${~~NAT_PORT} ${Number(NAT_INTERVAL)}`;
      }
      if (PUBLIC_KEY) {
        res += `\nPUBLIC_KEY: ${PUBLIC_KEY}`;
      }
      if (AUTH_KEY) {
        res += `\nAUTH_KEY: ${AUTH_KEY}`;
      }
      if (SYNC_FREQUENCY) {
        res += `\nSYNC_FREQUENCY: ${SYNC_FREQUENCY}`;
      }
      return res;
    }
  }

  return buf.map(x => x.toString(16).padStart(2, '0')).join(' ');
}