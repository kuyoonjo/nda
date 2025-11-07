<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import IOSection from "./IOSection.svelte";
  import {
    binaryGenerator,
    binaryParser,
    packInput,
    stringGenerator,
    stringParser,
    type IGenerator,
    type IIOHandler,
    type IParser,
  } from "./IO";
  import { SerialPort } from "tauri-plugin-serialplugin-api";
  import Select from "./components/Select.svelte";

  let windowId: string = "";
  let baudrateItems: string[] = [
    "300",
    "600",
    "1200",
    "2400",
    "4800",
    "9600",
    "14400",
    "19200",
    "28800",
    "38400",
    "57600",
    "115200",
    "230400",
    "460800",
    "921600",
  ];
  let baudrate = "";

  let gen: IGenerator;
  let parser: IParser;
  let input: string;
  let output: string[];
  let IOHandler: IIOHandler;
  const defaultGenerators: IGenerator[] = [stringGenerator, binaryGenerator];
  const defaultParsers: IParser[] = [stringParser, binaryParser];

  let port = "";
  let ports: string[] = [];
  let opened: SerialPort | undefined;

  async function refreshPorts() {
    try {
      ports = Object.keys(await SerialPort.available_ports());
      await SerialPort.closeAll();
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleConnect() {
    if (opened) {
      try {
        await opened.stopListening();
        await opened.close();
        opened = undefined;
        IOHandler.addOutput(`Serial port ${port} closed`, "success");
      } catch (e) {
        console.error(e);
        opened = undefined;
        IOHandler.addOutput(`Serial port ${port} failed to close`, "error");
      }
    } else {
      try {
        const sp = new SerialPort({
          path: port,
          baudRate: Number(baudrate),
        });
        await sp.open();
        await sp.cancelAllListeners();
        await sp.disconnected(async () => {
          await sp.cancelAllListeners();
          IOHandler.addOutput(`Serial port ${port} closed`, "success");
          opened = undefined;
        });
        await sp.startListening();
        await sp.listen(async (u8a: Uint8Array) => {
          const data = parser.parse(Array.from(u8a));
          IOHandler.addOutput(`← ${data}`);
        }, false);
        opened = sp;
        IOHandler.addOutput(`Serial port ${port} opened`, "success");
      } catch (e) {
        console.error(e);
        IOHandler.addOutput(`Serial port ${port} failed to open`, "error");
      }
    }
  }

  async function _send(message: any) {
    try {
      if (!opened) return false;
      if (typeof message === "string") await opened.write(message);
      else await opened?.writeBinary(message);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function send() {
    refreshInput();
    const { message, data } = await packInput(gen, input);
    const ok = await _send(message);
    if (ok) IOHandler.addOutput(`→ ${data}`, "success");
    else IOHandler.addOutput(`→ ${data}`, "error");
  }

  let unlisten = () => {
    if (opened) {
      toggleConnect();
    }
  };
  onMount(async () => {
    windowId = getCurrentWindow().label;
    refreshPorts();
  });

  onDestroy(() => {
    unlisten();
  });

  async function onIOReady() {}

  let refreshInput: () => void;
</script>

<main>
  <div style="display: flex; margin-top: 12px; align-items: center;">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Port</label>
    <Select
      mainClass="grow"
      bind:value={port}
      items={ports}
      disabled={opened !== undefined}
    />
    <button class="btn primary" on:click={refreshPorts}>Refresh</button>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label style="margin-left: 16px">Baudrate</label>
    <AutoFill
      disabled={opened !== undefined}
      bind:value={baudrate}
      items={baudrateItems}
    />
    {#if opened}
      <button class="btn error" on:click={toggleConnect}>Close</button>
    {:else}
      <button
        class="btn primary"
        disabled={!port || !baudrate}
        on:click={toggleConnect}>Open</button
      >
    {/if}
    <button class="btn primary" disabled={!opened} on:click={send}>Send</button>
  </div>

  <hr />

  <IOSection
    id="serialport"
    bind:refreshInput
    bind:input
    bind:output
    bind:gen
    bind:parser
    bind:IOHandler
    on:ready={onIOReady}
    {defaultGenerators}
    {defaultParsers}
  />
</main>

<style lang="scss">
  main {
    padding: 0 12px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  label {
    margin: 0 8px 0 0;
  }

  .btn {
    margin-left: 8px;
  }
</style>
