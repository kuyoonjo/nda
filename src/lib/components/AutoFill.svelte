<script lang="ts">
  export let value: string;
  export let style: string = "";
  let classname: string = "";
  export { classname as class };
  export let items: string[] = [];
  export let placeholder = "";
  export let disabled = false;

  let showList = false;
  $: filtered_items = items.filter((x) => x.includes(value));

  function focus() {
    showList = true;
  }
  function blur() {
    showList = false;
  }
</script>

<main>
  <input
    type="text"
    {style}
    {placeholder}
    class={classname}
    bind:value
    on:blur={blur}
    on:focus={focus}
    {disabled}
  />
  {#if showList && filtered_items.length}
    <div class="auto-fill-menu">
      {#each filtered_items as item}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="auto-fill-menu-item" on:mousedown={() => (value = item)}>
          {item}
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
</style>
