<div align="center">
<img height=150 src="src-tauri/icons/icon.png" />
</div>

<p align="center"><span><b>Network Debug Assistant</b> - UDP, TCP, Websocket, SocketIO, MQTT</span></p>

<div align="center">

[![Windows Support](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/kuyoonjo/nda/releases)
 [![Ubuntu Support](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/kuyoonjo/nda/releases) 
[![Mac Support](https://img.shields.io/badge/MACOS-adb8c5?style=for-the-badge&logo=macos&logoColor=white)](https://github.com/kuyoonjo/nda/releases)

</div>

<div align="center">

[![License MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)

[![GitHub package.json version](https://img.shields.io/github/package-json/v/kuyoonjo/nda?color=%40&label=latest)](https://github.com/kuyoonjo/nda/releases/latest)
![GitHub issues](https://img.shields.io/github/issues-raw/kuyoonjo/nda)

</div>
<div align="center">

![GitHub all releases](https://img.shields.io/github/downloads/kuyoonjo/nda/total)

</div>

## Screenshot
![](./screenshots/udp.png)
![](./screenshots/tcp.png)
![](./screenshots/ws.png)
![](./screenshots/sio.png)
![](./screenshots/mqtt.png)

## Scripting Support
This application supports scripting with javascript to customize the input fields and the output.

![](./screenshots/scripting.png)

The .js file is imported as a module. The struct of the module is as follows:
> Input Script
```typescript
export interface IGenerator {
  name: string;
  args: {
    name: string;
    defaultValue: string;
  }[];
  generate: (...args: string[]) => string | number[] | object;
}
```
> Output Script
```typescript
export interface IParser {
  name: string;
  parse: (buf: number[]) => string;
}
```

See [examples](./js) for more details.

## Installation

Download the installer for your operating system [on the release page](https://github.com/kuyoonjo/nda/releases).

## Run Locally

Clone the project

```bash
  git clone https://github.com/kuyoonjo/nda.git
```

Go to the project directory

```bash
  cd nda
```

Install dependencies

```bash
  pnpm install
```

Note : Follow [this guide](https://tauri.studio/en/docs/getting-started/intro/#setting-up-your-environment) to set up Tauri environment

Start the server

```bash
  pnpm tauri dev
```
