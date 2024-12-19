<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import storage from "./storage";
  import { Buffer } from "buffer";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import IOSection from "./IOSection.svelte";
  import { binaryGenerator, objectGenerator, packInput, stringGenerator, type IGenerator, type IIOHandler, type IParser } from "./IO";
  import sio, { Socket } from "socket.io-client";

  let windowId: string = "";

  const defaultRemoteItems = ["http://127.0.0.1:44444"];
  const k_exRemoteItems = "socketio_exRemoteItems";
  let exRemoteItems: string[] = [];
  let remoteItems: string[] = [];
  let remote = "";

  let gen: IGenerator;
  let parser: IParser;
  let input: string;
  let output: string[];
  let IOHandler: IIOHandler;
  const defaultGenerators: IGenerator[] = [stringGenerator, binaryGenerator, objectGenerator];
  const defaultParsers: IParser[] = [
    {
      name: "default",
      parse: (buf) => {
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
      IOHandler.addOutput(`SocketIO connected to ${remote}`, 'success');
    });
    s.on("disconnect", () => {
      io = undefined;
      IOHandler.addOutput(`SocketIO disconnected`, 'error');
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
        const data = parser.parse(v);
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
    refreshInput();
    const { message, data } = await packInput(gen, input);
    const ok = await _send(message);
    if (ok) IOHandler.addOutput(`→ [${topic}] ${data}`, 'success');
    else IOHandler.addOutput(`→ [${topic}] ${data}`, 'error');
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
    windowId = getCurrentWindow().label;
    exRemoteItems = storage.get(k_exRemoteItems) || [];
    remoteItems = [...exRemoteItems, ...defaultRemoteItems];
    remote = defaultRemoteItems[0];
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
