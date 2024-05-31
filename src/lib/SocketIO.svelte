<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import storage from "./storage";
  import { Buffer } from "buffer";
  import { getCurrent } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import IOSection from "./IOSection.svelte";
  import type { IFunc, IIOHandler, IParser } from "./IO";
  import sio, { Socket } from "socket.io-client";

  let windowId: string = "";

  const defaultRemoteItems = ["http://127.0.0.1:44444"];
  const k_exRemoteItems = "socketio_exRemoteItems";
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
    {
      name: "object",
      input: true,
      args: [],
      type: "object",
    },
  ];
  const defaultParserItems: IParser[] = [
    {
      name: "default",
      fn: (buf) => {
        if (buf instanceof ArrayBuffer) {
          return Array.from(Buffer.from(buf))
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(" ");
        } else {
          return JSON.stringify(buf);
        }
      },
    },
  ];

  let io: Socket | undefined = undefined;
  async function connect() {
    const s = sio(remote, {
      reconnection: false,
    });
    s.on("connect", () => {
      io = s;
      IOHandler.addOutput(`SocketIO connected to ${remote}`);
    });
    s.on("disconnect", () => {
      io = undefined;
      IOHandler.addOutput(`SocketIO disconnected`);
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

  let topic = "";

  let subscribedTopic = "";
  function subscribe() {
    if (subscribedTopic) {
      io!.off(subscribedTopic);
    }
    subscribedTopic = topic;
    if (subscribedTopic) {
      io!.on(subscribedTopic, (v) => {
        const data = parser.fn(v);
        IOHandler.addOutput(`← [${subscribedTopic}] ${data}`);
      });
    }
  }
  async function _send(message: any) {
    io!.emit(topic, message);
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
      case "object":
        var b64 = "data:text/javascript,export const value = " + input;
        const m = await import(b64);
        message = m.value;
        data = input;
        break;
    }
    const ok = await _send(message);
    if (ok) IOHandler.addOutput(`→ [${topic}] ${data} → OK`);
    else IOHandler.addOutput(`→ [${topic}] ${data} → FAIL`);
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
      placeholder="e.g. http://192.168.1.102:44444"
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
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label style="margin-left: 12px;">Topic</label>
    <input type="text" bind:value={topic} />
    {#if io}
      <button class="btn primary" on:click={send}>Send</button>
      <button class="btn primary" on:click={subscribe}>Subscribe</button>
    {/if}
  </div>

  <hr />

  <IOSection
    id="socketio"
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
