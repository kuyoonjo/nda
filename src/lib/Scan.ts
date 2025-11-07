// import type { BleDevice } from "@mnlphlp/plugin-blec";

export interface IScaner {
  name: string;
  scan?: (bleDevice: any) => string | number[];
}

export interface IDevice {
  address: string;
  name: string;
  isConnected: boolean;
  services: string[];
  manufacturerData: Record<number, Uint8Array>;
}
