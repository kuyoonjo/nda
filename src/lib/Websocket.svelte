<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import storage from "./storage";
  import { Buffer } from "buffer";
  import { getCurrent } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import IOSection from "./IOSection.svelte";
  import type { IFunc, IIOHandler, IParser } from "./IO";

  let windowId: string = "";

  const defaultRemoteItems = ["ws://127.0.0.1:44444"];
  const k_exRemoteItems = "ws_exRemoteItems";
  let exRemoteItems: string[] = [];
  let remoteItems: string[] = [];
  let remote = "";

  let func: IFunc;
  let parser: IParser;
  let input: string;
  let output: string[];
  let IOHandler: IIOHandler;
  const defaultFuncItems: IFunc[] = [
    {
      name: "string",
      input: true,
      args: [],
      type: "string",
    },
    {
      name: "binary",
      input: true,
      args: [],
      type: "binary",
    },
  ];
  const defaultParserItems: IParser<Buffer>[] = [
    {
      name: "string",
      fn: (buf) => JSON.stringify(buf.toString()),
    },
    {
      name: "binary",
      fn: (buf) =>
        Array.from(buf)
          .map((x) => x.toString(16).padStart(2, "0"))
          .join(" "),
    },
  ];

  let io: WebSocket | undefined = undefined;
  async function connect() {
    const s = new WebSocket(remote);
    s.addEventListener("open", () => {
      io = s;
      IOHandler.addOutput(`Websocket connected to ${remote}`);
    });
    s.addEventListener("close", () => {
      io = undefined;
      IOHandler.addOutput(`Websocket disconnected`);
    });
    s.addEventListener("message", async (e) => {
      const buf = Buffer.from(
        e.data instanceof Blob ? await e.data.arrayBuffer() : e.data,
      );
      const data = parser.fn(buf);
      IOHandler.addOutput(`← [${remote}] ${data}`);
    });
    if (!remoteItems.includes(remote)) {
      exRemoteItems.unshift(remote);
      storage.set(k_exRemoteItems, exRemoteItems);
      remoteItems.unshift(remote);
      remoteItems = remoteItems;
    }
    exRemoteItems = exRemoteItems;
    remote = remote;
  }
  async function disconnect() {
    io!.close();
    io = undefined;
  }

  async function _send(message: any) {
    io!.send(message);
    return true;
  }

  async function send() {
    if (!input) return;
    let message: any;
    let data: any;
    switch (func.type) {
      case "binary":
        message = Buffer.from(
          input
            .split(/\s+/)
            .map((x) => (x.length % 2 ? "0" + x : x))
            .join(""),
          "hex",
        );
        data = Array.from(message as Buffer)
          .map((x) => x.toString(16).padStart(2, "0"))
          .join(" ");
        break;
      case "string":
        message = input;
        data = input;
        break;
    }
    const ok = await _send(message);
    if (ok) IOHandler.addOutput(`→ [${remote}] ${data} → OK`);
    else IOHandler.addOutput(`→ [${remote}] ${data} → FAIL`);
  }

  function clearRemoteItem() {
    remote = "";
  }
  function deleteRemoteItem() {
    exRemoteItems = storage.get(k_exRemoteItems) || [];
    const i = exRemoteItems.indexOf(remote);
    if (~i) {
      exRemoteItems.splice(i, 1);
      storage.set(k_exRemoteItems, exRemoteItems);
    }
    remoteItems = [...exRemoteItems, ...defaultRemoteItems];
    remote = "";
  }

  let unlisten = () => {};
  onMount(async () => {
    windowId = getCurrent().label;
    exRemoteItems = storage.get(k_exRemoteItems) || [];
    remoteItems = [...exRemoteItems, ...defaultRemoteItems];
    remote = defaultRemoteItems[0];
  });

  onDestroy(() => {
    unlisten();
  });

  async function onIOReady() {
    unlisten = await listen<{
      addr: string;
      data: number[];
    }>("udp", (e) => {
      const data = parser.fn(e.payload.data);
      IOHandler.addOutput(`← [${e.payload.addr}] ${data}`);
    });
  }
</script>

<main>
  <div style="display: flex; margin-top: 12px; align-items: center;">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Remote</label>
    <AutoFill
      placeholder="e.g. ws://192.168.1.102:44444"
      bind:value={remote}
      items={remoteItems}
    />
    {#if io}
      <button class="btn error" on:click={disconnect}>Disconnect</button>
    {:else}
      <button class="btn primary" on:click={connect}>Connect</button>
    {/if}
    <button class="btn primary" on:click={clearRemoteItem}>Clear</button>
    {#if exRemoteItems.includes(remote)}
      <button class="btn error" on:click={deleteRemoteItem}>Delete</button>
    {/if}
    {#if io}
      <button class="btn primary" on:click={send}>Send</button>
    {/if}
  </div>

  <hr />

  <IOSection
    id="websocket"
    bind:input
    bind:output
    bind:func
    bind:parser
    bind:IOHandler
    on:ready={onIOReady}
    {defaultFuncItems}
    {defaultParserItems}
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
