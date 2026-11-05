import { useEffect, useState } from "react";
import type { SavedQuote } from "@/types";

// Shared CSS for any page that offers "download several saved quotations as
// ONE combined PDF" (browsers can't silently save multiple PDF files
// without a "Save" dialog per file, so one file with every quotation on its
// own page is the only one-click option). A page using this must also
// guard its own #print-area's print visibility with ":not(.batch-print)"
// so the two print targets never both show at once — see quote-builder's
// and the commission page's print <style> blocks for the exact pattern.
export const BATCH_PDF_CSS = `
  #batch-print-area { visibility: hidden; position: fixed; left: -99999px; top: 0; }
  @media print {
    body.batch-print #batch-print-area, body.batch-print #batch-print-area * { visibility: visible; }
    #batch-print-area { position: absolute; top: 0; left: 0; width: 794px; margin: 0; }
    #batch-print-area, #batch-print-area * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #batch-print-area tr, #batch-print-area .no-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .batch-print-page { break-after: page; page-break-after: always; }
    .batch-print-page:last-child { break-after: auto; page-break-after: auto; }
  }
`;

// #batch-print-area sits at `left: -99999px` so it stays invisible outside
// print — which also means every <img> in it (the Futai logo, product
// photos) is permanently outside the viewport, so a lazy-loaded one would
// never ask the browser to fetch it at all. QuoteDocument marks all of its
// <Image>s `priority` to force that fetch to start on mount regardless;
// this still only STARTS the fetch, so printing has to wait for it to
// finish or the dialog opens on half-loaded (or blank/broken) images —
// exactly what happened before this existed. A hard cap keeps one stuck
// image (bad URL, offline) from blocking the print indefinitely.
function waitForImages(root: HTMLElement, timeoutMs = 4000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const pending = imgs.filter((img) => !img.complete);
  if (!pending.length) return Promise.resolve();
  const whenLoaded = Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => {});
  const whenTimedOut = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([whenLoaded, whenTimedOut]);
}

// Fetches full SavedQuote records for the given ids, mounts them (render
// the returned `batchQuotes` into a `<div id="batch-print-area">`, one
// `<QuoteDocument>` per quote wrapped in `.batch-print-page`), flips the
// body into "batch-print" mode so BATCH_PDF_CSS's rules take over from the
// page's normal print target, waits for every image in it to actually load,
// triggers the OS print dialog once, and cleans up (unmounts, removes the
// body class) once it closes.
export function useQuoteBatchPdf() {
  const [batchQuotes, setBatchQuotes] = useState<SavedQuote[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!batchQuotes || !batchQuotes.length) return;
    document.body.classList.add("batch-print");
    const after = () => {
      document.body.classList.remove("batch-print");
      setBatchQuotes(null);
    };
    window.addEventListener("afterprint", after);
    let cancelled = false;
    (async () => {
      const container = document.getElementById("batch-print-area");
      if (container) await waitForImages(container);
      if (!cancelled) window.print();
    })();
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", after);
      document.body.classList.remove("batch-print");
    };
  }, [batchQuotes]);

  async function printQuoteIds(ids: number[]): Promise<{ ok: boolean; count: number }> {
    if (!ids.length || loading) return { ok: false, count: 0 };
    setLoading(true);
    try {
      const results = await Promise.all(ids.map((id) => fetch(`/api/admin/saved-quotes/${id}`).then((r) => r.json())));
      const quotes = results
        .map((r) => r.quote as SavedQuote | undefined)
        .filter((q): q is SavedQuote => !!q)
        .sort((a, b) => a.doc_date.localeCompare(b.doc_date) || a.id - b.id);
      if (!quotes.length) return { ok: false, count: 0 };
      setBatchQuotes(quotes);
      return { ok: true, count: quotes.length };
    } finally {
      setLoading(false);
    }
  }

  return { batchQuotes, loading, printQuoteIds };
}
