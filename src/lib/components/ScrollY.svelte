<script lang="ts">
  import { onMount } from "svelte";

  export let style = "";
  let className = "";
  export { className as class };
  export let offset = 0;

  let clientHeight: number;
  let contentEl: HTMLDivElement;

  let buttonHeight: number;
  let maxTop: number;
  let hidden: boolean;

  let scrollHeight: number;
  let barHeight: number;

  $: {
    if (contentEl) {
      scrollHeight = contentEl.scrollHeight - clientHeight;
      barHeight = clientHeight - offset;
      buttonHeight = (barHeight * barHeight) / contentEl.scrollHeight;
      maxTop = barHeight - buttonHeight + 1;
      hidden = clientHeight === contentEl.scrollHeight;
    }
  }

  let start = false;
  let top = 0;
  let pageY = 0;
  function startScroll(e: MouseEvent) {
    start = true;
    pageY = e.pageY;
    document.body.classList.add("default");
  }
  function stopScroll() {
    start = false;
    document.body.classList.remove("default");
  }

  function scrolling(e: MouseEvent) {
    if (!start) return;
    top = top + e.pageY - pageY;
    pageY = e.pageY;
    if (top < 0) top = 0;
    else if (top > maxTop) top = maxTop;
    contentEl.scrollTop = (top / maxTop) * scrollHeight;
  }

  function onMouseWhell(e: WheelEvent) {
    top += e.deltaY;
    if (top < 0) top = 0;
    else if (top > maxTop) top = maxTop;
    contentEl.scrollTop = (top / maxTop) * scrollHeight;
  }

  onMount(() => {});
</script>

<svelte:window on:mousemove={scrolling} on:mouseup={stopScroll} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<main {style} class={className} on:wheel|passive={onMouseWhell}>
  <div class="scroll-content" bind:clientHeight bind:this={contentEl}>
    <slot />
  </div>
  <div
    class="scroll-bar{hidden ? ' hidden' : ''}"
    style="top: {offset}px; padding-top: {top}px;"
  >
    <div
      class="scroll-bar-btn"
      style="height: {buttonHeight}px;"
      on:mousedown={startScroll}
    ></div>
  </div>
</main>

<style lang="scss">
  main {
    position: relative;

    &:hover .scroll-bar {
      opacity: 1;

      &.hidden {
        opacity: 0;
      }
    }
  }

  .scroll-content {
    height: 100%;
    overflow: hidden;
  }

  .scroll-bar {
    position: absolute;
    overflow: hidden;
    right: 0;
    z-index: 1;
    opacity: 0;
    transition: opacity ease-in-out 300ms;
  }

  .scroll-bar.hidden {
    width: 0;
  }

  .scroll-bar-btn {
    width: 5px;
  }
</style>
