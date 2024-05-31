<script lang="ts">
  import { getCurrent } from "@tauri-apps/api/window";
  import { onDestroy, onMount } from "svelte";
  import { initDarkmode, setDarkmode } from "../lib/darkmode";
  import { listen } from "@tauri-apps/api/event";
  import Udp from "../lib/UDP.svelte";
  import { Buffer } from "buffer";
  import SocketIo from "../lib/SocketIO.svelte";
  import Websocket from "../lib/Websocket.svelte";

  (window as any).Buffer = Buffer;

  let unsubscribe = () => {};

  let label = '';

  onMount(async () => {
    const win = getCurrent();
    label = win.label.split('-')[0];
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
  {:else if label === "SocketIO"}
    <SocketIo />
  {:else if label === "Websocket"}
    <Websocket />
  {/if}
</main>
