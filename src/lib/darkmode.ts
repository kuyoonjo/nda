import { writable } from 'svelte/store';
import { getTheme, Theme } from '@kuyoonjo/tauri-plugin-appearance';
import { getCurrent } from '@tauri-apps/api/webview';
import { listen } from '@tauri-apps/api/event';

export const darkmode = writable<'light' | 'dark'>('light');

export async function initDarkmode() {
  let theme = await getTheme();
  console.log('theme', theme);
  const win = getCurrent();
  if (theme === Theme.Auto) {
    let t = await win.window.theme() || 'light';
    theme = t === 'light' ? Theme.Light : Theme.Dark;
  }
  darkmode.subscribe(async _theme => {
    document.body.parentElement!.className = _theme;
  });
  darkmode.set(theme);
  await listen('themeChanged', async e => {
    console.log('themeChanged', e.payload);
    let theme = e.payload as Theme;
    if (theme === Theme.Auto) {
      let t = await win.window.theme() || 'light';
      theme = t === 'light' ? Theme.Light : Theme.Dark;
    }
    darkmode.set(theme);
  });
}

export async function setDarkmode(theme: 'auto' | 'light' | 'dark') {
  if (theme === 'auto') {
    let t = await getCurrent().window.theme() || 'light';
    theme = t === 'light' ? Theme.Light : Theme.Dark;
  }
  darkmode.set(theme);
}