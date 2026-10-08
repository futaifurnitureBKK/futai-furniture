"use client";
import { Suspense } from "react";
import { QuoteBuilderInner } from "../quote-builder/page";

// Same component as Quote Builder (same data, same every feature) — this
// is just a separate entry point that opens straight into the "ใบส่งของ"
// tab instead of "ใบเสนอราคา", for staff who only ever make delivery notes
// and don't need to land on the quotation tab first every time.
export default function DeliveryNotePage() {
  return (
    <Suspense fallback={null}>
      <QuoteBuilderInner defaultDocType="delivery_note" />
    </Suspense>
  );
}
