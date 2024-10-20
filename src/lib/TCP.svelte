<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import storage from "./storage";
  import { Buffer } from "buffer";
  import { getCurrent } from "@tauri-apps/api/window";
  import { event } from "@tauri-apps/api";
  import IOSection from "./IOSection.svelte";
  import type { IFunc, IIOHandler, IParser } from "./IO";
  import * as tcp from "@kuyoonjo/tauri-plugin-tcp";

  let windowId: string = "";

  let connectStatus: "disconnected" | "connected" | "connecting" =
    "disconnected";

  const defaultRemoteItems = ["127.0.0.1:8080"];
  const k_exRemoteItems = "tcp_exRemoteItems";
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
  const defaultParserItems: IParser<number[]>[] = [
    {
      name: "string",
      fn: (buf) => JSON.stringify(Buffer.from(buf).toString()),
    },
    {
      name: "binary",
      fn: (buf) => buf.map((x) => x.toString(16).padStart(2, "0")).join(" "),
    },
  ];

  async function connect() {
    try {
      await tcp.connect(windowId, remote);
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`TCP failed to connect to ${remote}`);
      return;
    }

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
    try {
      await tcp.disconnect(windowId);
      IOHandler.addOutput(`TCP disconnected from ${remote}`);
      connectStatus = "disconnected";
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`TCP failed to disconnected from ${remote}`);
    }
  }

  async function _send(message: any) {
    try {
      await tcp.send(windowId, message);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function send() {
    const message =
      func.type === "binary"
        ? Array.from(
            Buffer.from(
              input
                .split(/\s+/)
                .map((x) => (x.length % 2 ? "0" + x : x))
                .join(""),
              "hex",
            ),
          )
        : Array.from(Buffer.from(input));
    console.log(func, message);
    const ok = await _send(message);
    const data =
      func.type === "binary"
        ? message.map((x) => x.toString(16).padStart(2, "0")).join(" ")
        : input;
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
    unlisten = await tcp.listen((e) => {
      if (e.payload.event.connect) {
        IOHandler.addOutput(`TCP connected to ${remote}`);
        connectStatus = "connected";
      } else if (e.payload.event.disconnect) {
        IOHandler.addOutput(`TCP disconnected from ${remote}`);
        connectStatus = "disconnected";
      } else if (e.payload.event.message) {
        const data = parser.fn(e.payload.event.message.data);
        IOHandler.addOutput(`← [${e.payload.event.message.addr}] ${data}`);
      }
    });
  }
</script>

<main>
  <div style="display: flex; margin-top: 12px; align-items: center;">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Remote</label>
    <AutoFill
      placeholder="e.g. 192.168.1.102:8256"
      bind:value={remote}
      items={remoteItems}
    />
    {#if connectStatus === "connected"}
      <button class="btn error" on:click={disconnect}>Disconnect</button>
      <button class="btn primary" on:click={send}>Send</button>
    {:else if connectStatus === "connecting"}
      <button disabled class="btn processing">Connecting..</button>
    {:else}
      <button class="btn primary" on:click={connect}>Connect</button>
      <button class="btn primary" on:click={clearRemoteItem}>Clear</button>
      {#if exRemoteItems.includes(remote)}
        <button class="btn error" on:click={deleteRemoteItem}>Delete</button>
      {/if}
    {/if}
  </div>

  <hr />

  <IOSection
    id="tcp"
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
