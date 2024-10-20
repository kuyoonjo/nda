<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import * as dialog from "@tauri-apps/plugin-dialog";
  import Select from "./components/Select.svelte";
  import storage from "./storage";
  import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
  import { downloadDir } from "@tauri-apps/api/path";
  import moment from "moment";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import type { IGenerator, IParser } from "./IO";
  import { ContextMenu } from "./contextMenu";
  import { writeText } from "@tauri-apps/plugin-clipboard-manager";

  export let id: string;
  export let input = "";
  export let output: string[] = [];
  let maxOutputStr = "50";
  let maxOutput = 50;
  function refreshMaxOutput() {
    maxOutput = Number(maxOutputStr) || 50;
  }
  let outputCache: string[] = [];
  let outputTimer: any;
  function addOutput(str: string, color: 'primary' | 'error' | 'success' = 'primary') {
    outputCache.push(
      `<span class="color-${color}">[${moment().format("YYYY-MM-DD HH:mm:ss.SSS")}]</span> ${str}`,
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

  export let defaultGenerators: IGenerator[];
  const k_exGenerators = id + "_exGenerators";
  let generators = [...defaultGenerators];
  let exGenerators: { name: string; js: string }[] = [];
  export let gen = generators[0];
  let genArgs = gen.args.map((x) => ({ k: x.name, v: x.defaultValue }));
  function onFuncChange() {
    genArgs = gen.args.map((x) => ({ k: x.name, v: x.defaultValue }));
    refreshInput();
  }
  function refreshInput() {
    if (gen.generate) {
      const res = gen.generate(...genArgs.map((x) => x.v));
      if (typeof res === "string") {
        input = JSON.stringify(res).slice(1, -1);
      } else {
        input = res.map((x) => x.toString(16).padStart(2, "0")).join(" ");
      }
    }
  }
  async function parseGeneratorJs(str: string) {
    var b64 = "data:text/javascript," + str;
    const m: (typeof defaultGenerators)[number] = await import(b64);
    console.log(m);
    const item: (typeof defaultGenerators)[number] = {
      name: m.name,
      args: m.args,
      input: false,
      generate: m.generate,
      type: (() => {
        const v = m.generate!(...m.args.map((x) => x.defaultValue));
        return typeof v === "string"
          ? "string"
          : Array.isArray(v)
            ? "octets"
            : "object";
      })(),
    };
    return item;
  }
  async function importGenerator() {
    const p = await dialog.open({
      filters: [
        {
          name: "Javascript",
          extensions: ["js"],
        },
      ],
    });
    if (p) {
      const js = await readTextFile(p);
      const m = await parseGeneratorJs(js);
      let i = generators.findIndex((x) => x.name === m.name);
      if (~i) generators[i] = m;
      else generators.push(m);
      generators = generators;
      i = exGenerators.findIndex((x) => x.name === m.name);
      if (~i) exGenerators[i] = { name: m.name, js };
      else exGenerators.push({ name: m.name, js });
      storage.set(k_exGenerators, exGenerators);
      gen = m;
      onFuncChange();
    }
  }
  async function exportGenerator() {
    try {
      const filePath = (await invoke("open_save_dialog", {
        dir: await downloadDir(),
        defaultFileName: gen.name.replaceAll(" ", "_") + ".js",
      })) as string;
      console.log("filePath", filePath);
      console.log(gen, exGenerators);
      const ex = exGenerators.find((x) => x.name === gen.name);
      if (ex) {
        console.log("writeTextFile", filePath);
        await writeTextFile(filePath, ex.js);
      }
    } catch (e) {
      console.error(e);
    }
  }
  async function deleteGenerator() {
    exGenerators = storage.get<typeof exGenerators>(k_exGenerators) || [];
    let i = exGenerators.findIndex((x) => x.name === gen.name);
    if (~i) {
      exGenerators.splice(i, 1);
      storage.set(k_exGenerators, exGenerators);
    }
    i = generators.indexOf(gen);
    if (~i) {
      generators.splice(i, 1);
      gen = generators[0];
    }
  }
  async function loadExGenerators() {
    exGenerators = storage.get<typeof exGenerators>(k_exGenerators) || [];
    for (const item of exGenerators) {
      const m = await parseGeneratorJs(item.js);
      generators.push(m);
      generators = generators;
    }
  }

  export let defaultParsers: IParser[];
  const k_exParsers = id + "_exParsers";
  let parsers = [...defaultParsers];
  let exParsers: { name: string; js: string }[] = [];
  export let parser = parsers[0];
  async function parseParserJs(str: string) {
    var b64 = "data:text/javascript," + str;
    const m: (typeof defaultParsers)[number] = await import(b64);
    const item: typeof m = {
      name: m.name,
      parse: m.parse,
      custom: true,
    };
    return item;
  }
  async function importParser() {
    const p = await dialog.open({
      filters: [
        {
          name: "Javascript",
          extensions: ["js"],
        },
      ],
    });
    if (p) {
      const js = await readTextFile(p);
      const m = await parseParserJs(js);
      let i = parsers.findIndex((x) => x.name === m.name);
      if (~i) parsers[i] = m;
      else parsers.push(m);
      parsers = parsers;
      i = exParsers.findIndex((x) => x.name === m.name);
      if (~i) exParsers[i] = { name: m.name, js };
      else exParsers.push({ name: m.name, js });
      storage.set(k_exParsers, exParsers);
      parser = m;
    }
  }
  async function exportParser() {
    try {
      const filePath = (await invoke("open_save_dialog", {
        dir: await downloadDir(),
        defaultFileName: parser.name.replaceAll(" ", "_") + ".js",
      })) as string;
      const ex = exParsers.find((x) => x.name === parser.name);
      if (ex) {
        console.log("writeTextFile", filePath);
        await writeTextFile(filePath, ex.js);
      }
    } catch (e) {
      console.error(e);
    }
  }
  async function deleteParser() {
    exParsers = storage.get<typeof exParsers>(k_exParsers) || [];
    let i = exParsers.findIndex((x) => x.name === parser.name);
    if (~i) {
      exParsers.splice(i, 1);
      storage.set(k_exParsers, exParsers);
    }
    i = parsers.indexOf(parser);
    if (~i) {
      parsers.splice(i, 1);
      parser = parsers[0];
    }
  }
  async function loadExParsers() {
    exParsers = storage.get<typeof exGenerators>(k_exParsers) || [];
    for (const item of exParsers) {
      const m = await parseParserJs(item.js);
      parsers.push(m);
      parsers = parsers;
    }
  }

  let outputEl: HTMLDivElement;
  const contextmenu = new ContextMenu([
    {
      text: "Copy Records",
      onclick() {
        console.log(outputEl.innerText);
        writeText(outputEl.innerText);
      },
    },
  ]);
  async function onContextmenu(e: MouseEvent) {
    await contextmenu.open(e);
  }

  const ed = createEventDispatcher<{ ready: void }>();

  onMount(async () => {
    await loadExGenerators();
    await loadExParsers();
    ed("ready");
  });

  onDestroy(() => {
    contextmenu.destroy();
  });

  export const IOHandler = {
    addOutput,
  };
</script>

<div style="display: flex; align-items: center;">
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label>Generator</label>
  <Select
    bind:value={gen}
    items={generators}
    key="name"
    on:change={onFuncChange}
  />
  <button class="btn primary" on:click={importGenerator}>Import</button>
  {#if !gen.input}
    <button class="btn primary" on:click={exportGenerator}>Export</button>
    <button class="btn error" on:click={deleteGenerator}>Delete</button>
  {/if}
</div>
{#if genArgs.length}
  <div
    style="display: flex; align-items: center;margin: 8px 0 0; flex-wrap: wrap; row-gap: 6px;"
  >
    {#each genArgs as arg}
      <div style="display: flex; align-items: center;">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label style="flex-shrink: 0;">{arg.k}</label>
        <input
          style="margin-right: 12px"
          type="text"
          bind:value={arg.v}
          on:input={refreshInput}
        />
      </div>
    {/each}
  </div>
{/if}
<textarea
  style="margin: 8px 0 0; flex: 1 1 0;"
  bind:value={input}
  disabled={!gen.input}
></textarea>
<hr />
<div style="display: flex; align-items: center;">
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label>Parser</label>
  <Select bind:value={parser} items={parsers} key="name" />
  <button class="btn primary" on:click={importParser}>Import</button>
  {#if parser.custom}
    <button class="btn primary" on:click={exportParser}>Export</button>
    <button class="btn error" on:click={deleteParser}>Delete</button>
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
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="fake-textarea"
  style="margin: 8px 0 12px; flex: 2 1 0;"
  on:contextmenu|preventDefault|stopPropagation={onContextmenu}
  bind:this={outputEl}
>
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
