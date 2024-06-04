<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import storage from "./storage";
  import { Buffer } from "buffer";
  import { getCurrent } from "@tauri-apps/api/window";
  import { event } from "@tauri-apps/api";
  import IOSection from "./IOSection.svelte";
  import type { IFunc, IIOHandler, IParser } from "./IO";
  import * as udp from '@kuyoonjo/tauri-plugin-udp';

  let windowId: string = "";

  const defaultLocalItems = ["0.0.0.0:8080", "127.0.0.1:8080"];
  const k_exLocalItems = "udp_exLocalItems";
  let exLocalItems: string[] = [];
  let localItems: string[] = [];
  let local = "";
  let bondAt = "";

  const defaultRemoteItems = ["255.255.255.255:8256", "192.168.1.255:8256"];
  const k_exRemoteItems = "udp_exRemoteItems";
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

  async function bind() {
    try {
      await udp.bind(windowId, local, true);
      IOHandler.addOutput(`UDP bond at ${local}`);
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`UDP failed to bind at ${local}`);
      return;
    }

    if (!localItems.includes(local)) {
      exLocalItems.unshift(local);
      storage.set(k_exLocalItems, exLocalItems);
      localItems.unshift(local);
      localItems = localItems;
    }
    exLocalItems = exLocalItems;
    local = local;
    bondAt = local;
  }
  async function unbind() {
    try {
      await udp.unbind(windowId);
      IOHandler.addOutput(`UDP unbond from ${local}`);
      bondAt = "";
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`UDP failed to unbind from ${local}`);
    }
  }

  async function _send(message: any) {
    try {
      await udp.send(windowId, remote, message);
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
    if (!remoteItems.includes(remote)) {
      exRemoteItems.unshift(remote);
      storage.set(k_exRemoteItems, exRemoteItems);
      remoteItems.unshift(remote);
      remoteItems = remoteItems;
    }
    exRemoteItems = exRemoteItems;
    remote = remote;
  }
  function clearLocalItem() {
    local = "";
  }
  function deleteLocalItem() {
    exLocalItems = storage.get(k_exLocalItems) || [];
    const i = exLocalItems.indexOf(local);
    if (~i) {
      exLocalItems.splice(i, 1);
      storage.set(k_exLocalItems, exLocalItems);
    }
    localItems = [...exLocalItems, ...defaultLocalItems];
    local = "";
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
    exLocalItems = storage.get(k_exLocalItems) || [];
    localItems = [...exLocalItems, ...defaultLocalItems];
    local = defaultLocalItems[0];
    exRemoteItems = storage.get(k_exRemoteItems) || [];
    remoteItems = [...exRemoteItems, ...defaultRemoteItems];
    remote = defaultRemoteItems[0];
  });

  onDestroy(() => {
    unlisten();
  });

  async function onIOReady() {
    unlisten = await udp.listen((e) => {
      const data = parser.fn(e.payload.data);
      IOHandler.addOutput(`← [${e.payload.addr}] ${data}`);
    });
  }
</script>

<main>
  <div style="display: flex; margin-top: 12px; align-items: center;">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Local</label>
    <AutoFill
      placeholder="e.g. 127.0.0.1:8080"
      bind:value={local}
      items={localItems}
      disabled={!!bondAt}
    />
    {#if bondAt}
      <button class="btn error" on:click={unbind}>Unbind</button>
    {:else}
      <button class="btn primary" on:click={bind}>Bind</button>
      <button class="btn primary" on:click={clearLocalItem}>Clear</button>
      {#if exLocalItems.includes(local)}
        <button class="btn error" on:click={deleteLocalItem}>Delete</button>
      {/if}
    {/if}
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label style="margin-left: 16px">Remote</label>
    <AutoFill
      placeholder="e.g. 192.168.1.102:8256"
      bind:value={remote}
      items={remoteItems}
    />
    {#if remote && bondAt}
      <button class="btn primary" on:click={send}>Send</button>
    {/if}
    {#if remote}
      <button class="btn primary" on:click={clearRemoteItem}>Clear</button>
    {/if}
    {#if exRemoteItems.includes(remote)}
      <button class="btn error" on:click={deleteRemoteItem}>Delete</button>
    {/if}
  </div>

  <hr />

  <IOSection
    id="udp"
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
