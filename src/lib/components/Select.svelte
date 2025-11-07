<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value: any;
  export let key = "";
  export let style: string = "";
  let classname: string = "";
  export { classname as class };
  export let mainClass = "";
  export let items: any[] = [];
  export let disabled = false;

  let showList = false;

  function show() {
    if (disabled) {
      return;
    }
    showList = true;
  }
  function hide() {
    showList = false;
  }

  const ed = createEventDispatcher<{ change: any }>();
  function onChange(v: any) {
    if (disabled) {
      return;
    }
    value = v;
    ed("change", value);
  }
</script>

<svelte:window on:click={hide} />

<main class={mainClass}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    {style}
    class="fake-input {classname}"
    on:click|preventDefault|stopPropagation={show}
  >
    {key ? value[key] : value}
  </div>
  {#if showList && items.length}
    <div class="auto-fill-menu">
      {#each items as item}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="auto-fill-menu-item" on:mousedown={() => onChange(item)}>
          {key ? item[key] : item}
        </div>
      {/each}
    </div>
  {/if}
</main>

<style lang="scss">
  main {
    display: inline-block;
    position: relative;
  }
  .list {
    position: absolute;
  }
  .fake-input {
    font-size: 12px;
    min-width: 141px;
    height: 13px;
    display: flex;
    align-items: center;
  }
</style>
