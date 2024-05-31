<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import * as dialog from "@tauri-apps/plugin-dialog";
  import Select from "./components/Select.svelte";
  import storage from "./storage";
  import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
  import { downloadDir } from "@tauri-apps/api/path";
  import moment from "moment";
  import { createEventDispatcher, onMount } from "svelte";
  import type { IFunc, IParser } from "./IO";

  export let id: string;
  export let input = "";
  export let output: string[] = [];
  let maxOutputStr = '50';
  let maxOutput = 50;
  function refreshMaxOutput() {
    maxOutput = Number(maxOutputStr) || 50;
  }
  let outputCache: string[] = [];
  let outputTimer: any;
  function addOutput(str: string) {
    outputCache.push(
      `<span class="color-primary">[${moment().format("YYYY-MM-DD HH:mm:ss.SSS")}]</span> ${str}`,
    );
    if (!outputTimer) {
      outputTimer = setTimeout(() => {
        for (const item of outputCache) {
          output.unshift(item);
        }
        if (output.length > maxOutput) {
          output.splice(maxOutput);
        }
        output = output;
        outputCache = [];
        outputTimer = undefined;
      }, 50);
    }
  }
  function clearOutput() {
    output = [];
  }

  export let defaultFuncItems: IFunc[];
  const k_exFuncItems = id + "_exFuncItems";
  let funcItems = [...defaultFuncItems];
  let exFuncItems: { name: string; js: string }[] = [];
  export let func = funcItems[0];
  let funcArgs = func.args.map((x) => ({ k: x.name, v: x.defaultValue }));
  function onFuncChange() {
    funcArgs = func.args.map((x) => ({ k: x.name, v: x.defaultValue }));
    refreshInput();
  }
  function refreshInput() {
    if (func.fn) {
      const res = func.fn(...funcArgs.map((x) => x.v));
      if (typeof res === "string") {
        input = res;
      } else {
        input = res.map((x) => x.toString(16).padStart(2, "0")).join(" ");
      }
    }
  }
  async function parseFuncItemJs(str: string) {
    var b64 = "data:text/javascript," + str;
    const m: (typeof defaultFuncItems)[number] = await import(b64);
    console.log(m);
    const item: (typeof defaultFuncItems)[number] = {
      name: m.name,
      args: m.args,
      input: false,
      fn: m.fn,
      type:
        typeof m.fn!(...m.args.map((x) => x.defaultValue)) === "string"
          ? "string"
          : "binary",
    };
    return item;
  }
  async function importFuncItem() {
    const p = await dialog.open({
      filters: [
        {
          name: "Javascript",
          extensions: ["js"],
        },
      ],
    });
    if (p) {
      const js = await readTextFile(p.path);
      const m = await parseFuncItemJs(js);
      let i = funcItems.findIndex((x) => x.name === m.name);
      if (~i) funcItems[i] = m;
      else funcItems.push(m);
      funcItems = funcItems;
      i = exFuncItems.findIndex((x) => x.name === m.name);
      if (~i) exFuncItems[i] = { name: m.name, js };
      else exFuncItems.push({ name: m.name, js });
      storage.set(k_exFuncItems, exFuncItems);
      func = m;
      onFuncChange();
    }
  }
  async function exportFuncItem() {
    try {
      const filePath = (await invoke("open_save_dialog", {
        dir: await downloadDir(),
        defaultFileName: func.name.replaceAll(" ", "_") + ".js",
      })) as string;
      console.log("filePath", filePath);
      console.log(func, exFuncItems);
      const ex = exFuncItems.find((x) => x.name === func.name);
      if (ex) {
        console.log("writeTextFile", filePath);
        await writeTextFile(filePath, ex.js);
      }
    } catch (e) {
      console.error(e);
    }
  }
  async function deleteFuncItem() {
    exFuncItems = storage.get<typeof exFuncItems>(k_exFuncItems) || [];
    let i = exFuncItems.findIndex((x) => x.name === func.name);
    if (~i) {
      exFuncItems.splice(i, 1);
      storage.set(k_exFuncItems, exFuncItems);
    }
    i = funcItems.indexOf(func);
    if (~i) {
      funcItems.splice(i, 1);
      func = funcItems[0];
    }
  }
  async function loadExFuncItems() {
    exFuncItems = storage.get<typeof exFuncItems>(k_exFuncItems) || [];
    for (const item of exFuncItems) {
      const m = await parseFuncItemJs(item.js);
      funcItems.push(m);
      funcItems = funcItems;
    }
  }

  export let defaultParserItems: IParser[];
  const k_exParserItems = id + "_exParserItems";
  let parserItems = [...defaultParserItems];
  let exParserItems: { name: string; js: string }[] = [];
  export let parser = parserItems[0];
  async function parseParserItemJs(str: string) {
    var b64 = "data:text/javascript," + str;
    const m: (typeof defaultParserItems)[number] = await import(b64);
    const item: typeof m = {
      name: m.name,
      fn: m.fn,
      custom: true,
    };
    return item;
  }
  async function importParserItem() {
    const p = await dialog.open({
      filters: [
        {
          name: "Javascript",
          extensions: ["js"],
        },
      ],
    });
    if (p) {
      const js = await readTextFile(p.path);
      const m = await parseParserItemJs(js);
      let i = parserItems.findIndex((x) => x.name === m.name);
      if (~i) parserItems[i] = m;
      else parserItems.push(m);
      parserItems = parserItems;
      i = exParserItems.findIndex((x) => x.name === m.name);
      if (~i) exParserItems[i] = { name: m.name, js };
      else exParserItems.push({ name: m.name, js });
      storage.set(k_exParserItems, exParserItems);
      parser = m;
    }
  }
  async function exportParserItem() {
    try {
      const filePath = (await invoke("open_save_dialog", {
        dir: await downloadDir(),
        defaultFileName: parser.name.replaceAll(" ", "_") + ".js",
      })) as string;
      const ex = exParserItems.find((x) => x.name === parser.name);
      if (ex) {
        console.log("writeTextFile", filePath);
        await writeTextFile(filePath, ex.js);
      }
    } catch (e) {
      console.error(e);
    }
  }
  async function deleteParserItem() {
    exParserItems = storage.get<typeof exParserItems>(k_exParserItems) || [];
    let i = exParserItems.findIndex((x) => x.name === parser.name);
    if (~i) {
      exParserItems.splice(i, 1);
      storage.set(k_exParserItems, exParserItems);
    }
    i = parserItems.indexOf(parser);
    if (~i) {
      parserItems.splice(i, 1);
      parser = parserItems[0];
    }
  }
  async function loadExParserItems() {
    exParserItems = storage.get<typeof exFuncItems>(k_exParserItems) || [];
    for (const item of exParserItems) {
      const m = await parseParserItemJs(item.js);
      parserItems.push(m);
      parserItems = parserItems;
    }
  }

  const ed = createEventDispatcher<{ ready: void }>();

  onMount(async () => {
    await loadExFuncItems();
    await loadExParserItems();
    ed("ready");
  });

  export const IOHandler = {
    addOutput,
  };
</script>

<div style="display: flex; align-items: center;">
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label>Function</label>
  <Select
    bind:value={func}
    items={funcItems}
    key="name"
    on:change={onFuncChange}
  />
  <button class="btn primary" on:click={importFuncItem}>Import</button>
  {#if !func.input}
    <button class="btn primary" on:click={exportFuncItem}>Export</button>
    <button class="btn error" on:click={deleteFuncItem}>Delete</button>
  {/if}
</div>
{#if funcArgs.length}
  <div style="display: flex; align-items: center;margin: 8px 0 0;">
    {#each funcArgs as arg}
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label>{arg.k}</label>
      <input
        style="margin-right: 12px"
        type="text"
        bind:value={arg.v}
        on:input={refreshInput}
      />
    {/each}
  </div>
{/if}
<textarea
  style="margin: 8px 0 0; flex: 1 1 0;"
  bind:value={input}
  disabled={!func.input}
></textarea>
<hr />
<div style="display: flex; align-items: center;">
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label>Parser</label>
  <Select bind:value={parser} items={parserItems} key="name" />
  <button class="btn primary" on:click={importParserItem}>Import</button>
  {#if parser.custom}
    <button class="btn primary" on:click={exportParserItem}>Export</button>
    <button class="btn error" on:click={deleteParserItem}>Delete</button>
  {/if}
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label style="margin-left: 16px">Max # of Records</label>
  <input
    style="margin-right: 12px"
    type="text"
    bind:value={maxOutputStr}
    on:input={refreshMaxOutput}
  />
  <div style="flex-grow: 1;"></div>
  <button class="btn primary" on:click={clearOutput}>Clear</button>
</div>
<div class="fake-textarea" style="margin: 8px 0 12px; flex: 2 1 0;">
  {#each output as item}
    <pre>{@html item}</pre>
  {/each}
</div>

<style lang="scss">
  label {
    margin: 0 8px 0 0;
  }

  .btn {
    margin-left: 8px;
  }

  .fake-textarea {
    font-family: monospace;
    padding: 6px 10px 6px 18px;
  }

  textarea {
    resize: none;
    padding: 10px;
    line-height: 15px;
    font-family: monospace;
  }
</style>
