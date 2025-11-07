<script lang="ts">
  import AutoFill from "./components/AutoFill.svelte";
  import { onDestroy, onMount } from "svelte";
  import storage from "./storage";
  import { Buffer } from "buffer";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { event } from "@tauri-apps/api";
  import IOSection from "./IOSection.svelte";
  import { binaryGenerator, binaryParser, packInput, stringGenerator, stringParser, type IGenerator, type IIOHandler, type IParser } from "./IO";
  import * as mqtt from "@kuyoonjo/tauri-plugin-mqtt";

  let windowId: string = "";

  const defaultUriItems = [
    "mqtt://test.mosquitto.org",
    "mqtts://test.mosquitto.org",
  ];
  const k_exUriItems = "mqtt_exUriItems";
  let exUriItems: string[] = [];
  let uriItems: string[] = [];
  let uri = "";
  let connectStatus: "disconnected" | "connected" | "connecting" =
    "disconnected";

  const defaultTopicItems = ["/hello"];
  const k_exTopicItems = "mqtt_exTopicItems";
  let exTopicItems: string[] = [];
  let topicItems: string[] = [];
  let topic = "";

  const defaultSubTopicItems = ["/hello"];
  const k_exSubTopicItems = "mqtt_exSubTopicItems";
  let exSubTopicItems: string[] = [];
  let subTopicItems: string[] = [];
  let subTopic = "";

  let gen: IGenerator;
  let parser: IParser;
  let input: string;
  let output: string[];
  let IOHandler: IIOHandler;
  const defaultGenerators: IGenerator[] = [stringGenerator, binaryGenerator];
  const defaultParsers: IParser[] = [stringParser, binaryParser];

  async function connect() {
    try {
      await mqtt.connect(
        windowId,
        uri,
        uri.startsWith("mqtts://") ? { skipVerification: true } : undefined,
      );
      connectStatus = "connecting";
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`mqtt failed to connect to ${uri}`, 'error');
      return;
    }

    if (!uriItems.includes(uri)) {
      exUriItems.unshift(uri);
      storage.set(k_exUriItems, exUriItems);
      uriItems.unshift(uri);
      uriItems = uriItems;
    }
    exUriItems = exUriItems;
    uri = uri;
  }
  async function disconnect() {
    try {
      await mqtt.disconnect(windowId);
      connectStatus = "disconnected";
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`mqtt failed to disconnect from ${uri}`, 'error');
    }
  }

  async function _publish(message: any) {
    try {
      await mqtt.publish(windowId, topic, 0, false, message);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function publish() {
    refreshInput();
    const { message, data } = await packInput(gen, input);
    const ok = await _publish(message);
    if (ok) IOHandler.addOutput(`→ [Publish ${topic}] ${data}`, 'success');
    else IOHandler.addOutput(`→ [Publish ${topic}] ${data}`, 'error');
    if (!topicItems.includes(topic)) {
      exTopicItems.unshift(topic);
      storage.set(k_exTopicItems, exTopicItems);
      topicItems.unshift(topic);
      topicItems = topicItems;
    }
    exTopicItems = exTopicItems;
    topic = topic;
  }

  async function subscribe() {
    try {
      await mqtt.subscribe(windowId, topic, 0);
      IOHandler.addOutput(`→ [Subscribe ${topic}]`, 'success');
      return true;
    } catch (e) {
      console.error(e);
      IOHandler.addOutput(`→ [Subscribe ${topic}]`, 'error');
      return false;
    }
  }

  function clearUriItem() {
    uri = "";
  }
  function deleteUriItem() {
    exUriItems = storage.get(k_exUriItems) || [];
    const i = exUriItems.indexOf(uri);
    if (~i) {
      exUriItems.splice(i, 1);
      storage.set(k_exUriItems, exUriItems);
    }
    uriItems = [...exUriItems, ...defaultUriItems];
    uri = "";
  }
  function clearTopicItem() {
    topic = "";
  }
  function deleteTopicItem() {
    exTopicItems = storage.get(k_exTopicItems) || [];
    const i = exTopicItems.indexOf(topic);
    if (~i) {
      exTopicItems.splice(i, 1);
      storage.set(k_exTopicItems, exTopicItems);
    }
    topicItems = [...exTopicItems, ...defaultTopicItems];
    topic = "";
  }
  function clearSubTopicItem() {
    subTopic = "";
  }
  function deleteSubTopicItem() {
    exSubTopicItems = storage.get(k_exSubTopicItems) || [];
    const i = exSubTopicItems.indexOf(subTopic);
    if (~i) {
      exSubTopicItems.splice(i, 1);
      storage.set(k_exSubTopicItems, exSubTopicItems);
    }
    subTopicItems = [...exSubTopicItems, ...defaultSubTopicItems];
    subTopic = "";
  }

  let unlisten = () => {};
  onMount(async () => {
    windowId = getCurrentWindow().label;
    exUriItems = storage.get(k_exUriItems) || [];
    uriItems = [...exUriItems, ...defaultUriItems];
    uri = defaultUriItems[0];
    exTopicItems = storage.get(k_exTopicItems) || [];
    topicItems = [...exTopicItems, ...defaultTopicItems];
    topic = defaultTopicItems[0];
    exSubTopicItems = storage.get(k_exSubTopicItems) || [];
    subTopicItems = [...exSubTopicItems, ...defaultSubTopicItems];
    subTopic = defaultSubTopicItems[0];
  });

  onDestroy(() => {
    unlisten();
  });

  async function onIOReady() {
    unlisten = await mqtt.listen((e) => {
      if (e.payload.id !== windowId) return;
      if (e.payload.event.connect) {
        IOHandler.addOutput(`MQTT connected to ${uri}`, 'success');
        connectStatus = "connected";
      } else if (e.payload.event.disconnect) {
        IOHandler.addOutput(`MQTT disconnected from ${uri}`, 'error');
        connectStatus = "disconnected";
      } else if (e.payload.event.message) {
        const data = parser.parse(e.payload.event.message.payload);
        IOHandler.addOutput(`← [${e.payload.event.message.topic}] ${data}`);
      }
    });
  }
  
  let refreshInput: () => void;
</script>

<main>
  <div style="display: flex; margin-top: 12px; align-items: center;">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>URI</label>
    <AutoFill
      style="width: 512px;"
      placeholder="e.g. mqtt://test.mosquitto.org"
      bind:value={uri}
      items={uriItems}
      disabled={connectStatus != "disconnected"}
    />
    {#if connectStatus === "connected"}
      <button class="btn error" on:click={disconnect}>Disconnect</button>
    {:else if connectStatus === "connecting"}
      <button disabled class="btn processing">Connecting..</button>
    {:else}
      <button class="btn primary" on:click={connect}>Connect</button>
      <button class="btn primary" on:click={clearUriItem}>Clear</button>
      {#if exUriItems.includes(uri)}
        <button class="btn error" on:click={deleteUriItem}>Delete</button>
      {/if}
    {/if}
  </div>

  <div style="display: flex; margin-top: 12px; align-items: center;">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Topic</label>
    <AutoFill
      placeholder="e.g. /hello"
      bind:value={subTopic}
      items={subTopicItems}
    />
    {#if subTopic && connectStatus === 'connected'}
      <button class="btn primary" on:click={subscribe}>Subscribe</button>
    {/if}
    {#if subTopic}
      <button class="btn primary" on:click={clearSubTopicItem}>Clear</button>
    {/if}
    {#if exSubTopicItems.includes(subTopic)}
      <button class="btn error" on:click={deleteSubTopicItem}>Delete</button>
    {/if}
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label style="margin-left: 16px">Topic</label>
    <AutoFill placeholder="e.g. /hello" bind:value={topic} items={topicItems} />
    {#if topic && connectStatus === 'connected'}
      <button class="btn primary" on:click={publish}>Publish</button>
    {/if}
    {#if topic}
      <button class="btn primary" on:click={clearTopicItem}>Clear</button>
    {/if}
    {#if exTopicItems.includes(topic)}
      <button class="btn error" on:click={deleteTopicItem}>Delete</button>
    {/if}
  </div>

  <hr />

  <IOSection
    id="mqtt"
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
