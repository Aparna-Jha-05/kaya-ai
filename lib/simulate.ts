// Latency + streaming helpers so extraction and patrol runs FEEL live.
// Pure timing sugar — no decision logic lives here.

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Reveal an array of items one at a time with a delay, invoking a callback.
export async function streamItems<T>(
  items: T[],
  onItem: (item: T, index: number) => void,
  delayMs = 320
) {
  for (let i = 0; i < items.length; i++) {
    await sleep(delayMs);
    onItem(items[i], i);
  }
}

// Type-writer effect for a single string.
export async function streamText(
  text: string,
  onUpdate: (partial: string) => void,
  perCharMs = 12
) {
  let acc = "";
  for (const ch of text) {
    acc += ch;
    onUpdate(acc);
    await sleep(perCharMs);
  }
}
