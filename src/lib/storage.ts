function get<T>(k: string): T | undefined {
  const json = localStorage.getItem(k);
  if (json)
    return JSON.parse(json).v;
}

function set<T>(k: string, v: T) {
  localStorage.setItem(k,JSON.stringify({ v }) );
}

async function rm(k: string) {
  localStorage.removeItem(k);
}

export default {
  get, set, rm,
};