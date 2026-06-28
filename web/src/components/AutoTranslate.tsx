import { useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { cachedTranslation, translateBatch } from "../lib/translate";

// Automatically translates dynamic (database) content on the public site when
// Arabic is selected. UI chrome is already translated via the dictionary, so we
// only touch text that is still in Latin script and skip anything already Arabic.

const HAS_LATIN = /[A-Za-z]{2,}/;
const HAS_ARABIC = /[؀-ۿ]/;
const SKIP_SELECTOR = "script,style,noscript,textarea,input,code,pre,[data-no-translate],[translate='no']";

function isTranslatable(raw: string | null, parent: Element | null): boolean {
  if (!raw || !parent) return false;
  const t = raw.trim();
  if (t.length < 2) return false;
  if (!HAS_LATIN.test(t)) return false;       // numbers/symbols/prices — skip
  if (HAS_ARABIC.test(t)) return false;        // already Arabic (dictionary UI) — skip
  if (/https?:\/\//.test(t) || /\S+@\S+\.\S+/.test(t) || /^[@#]/.test(t)) return false; // urls/emails/handles
  if (parent.closest(SKIP_SELECTOR)) return false;
  if ((parent as HTMLElement).isContentEditable) return false;
  return true;
}

export function AutoTranslate() {
  const { lang } = useLang();

  useEffect(() => {
    if (lang !== "ar") return;
    const target = "ar" as const;
    const originals = new Map<Text, string>(); // node -> original raw text we replaced
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const collect = (): { node: Text; raw: string; key: string }[] => {
      const found: { node: Text; raw: string; key: string }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const node = n as Text;
        const raw = node.nodeValue;
        if (isTranslatable(raw, node.parentElement)) found.push({ node, raw: raw!, key: raw!.trim() });
      }
      return found;
    };

    const apply = (items: { node: Text; raw: string; key: string }[], map: Map<string, string>) => {
      observer?.disconnect();
      for (const { node, raw, key } of items) {
        if (!node.isConnected || node.nodeValue !== raw) continue; // changed since collect
        const tr = map.get(key);
        if (!tr || tr === key) continue;
        originals.set(node, raw);
        node.nodeValue = raw.replace(key, tr);
      }
      if (!cancelled) observer?.observe(document.body, { childList: true, characterData: true, subtree: true });
    };

    const scan = async () => {
      const items = collect();
      if (!items.length) return;
      // Apply already-cached translations synchronously first (no flicker on repeat visits).
      const cachedMap = new Map<string, string>();
      const need: string[] = [];
      for (const { key } of items) {
        if (cachedMap.has(key)) continue;
        const hit = cachedTranslation(key, target);
        if (hit !== undefined) cachedMap.set(key, hit);
        else need.push(key);
      }
      if (cachedMap.size) apply(items, cachedMap);
      if (!need.length) return;
      const map = await translateBatch(need, target);
      if (!cancelled) apply(items.length ? collect() : items, map);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(scan, 250);
    };

    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      // Restore English text we replaced.
      for (const [node, raw] of originals) if (node.isConnected) node.nodeValue = raw;
      originals.clear();
    };
  }, [lang]);

  return null;
}
