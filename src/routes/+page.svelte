<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onDestroy, onMount } from "svelte";
  import { initDarkmode, setDarkmode } from "../lib/darkmode";
  import { listen } from "@tauri-apps/api/event";
  import { Buffer } from "buffer";
  import Udp from "../lib/UDP.svelte";
  import Tcp from "$lib/TCP.svelte";
  import Mqtt from "$lib/MQTT.svelte";
  import SocketIo from "../lib/SocketIO.svelte";
  import Websocket from "../lib/Websocket.svelte";

  (window as any).Buffer = Buffer;

  let unsubscribe = () => {};

  let label = "";

  onMount(async () => {
    const win = getCurrentWindow();
    label = win.label.split("-")[0];
    await initDarkmode();

    const unlisten = await listen<string>("theme-change", (event) => {
      setDarkmode(event.payload as any);
    });

    unsubscribe = () => {
      unlisten();
    };
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<main class="container">
  {#if label === "UDP"}
    <Udp />
  {:else if label === "TCP"}
    <Tcp />
  {:else if label === "MQTT"}
    <Mqtt />
  {:else if label === "SocketIO"}
    <SocketIo />
  {:else if label === "Websocket"}
    <Websocket />
  {/if}
</main>
