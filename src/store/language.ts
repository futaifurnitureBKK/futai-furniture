import { create } from "zustand";
import { persist } from "zustand/middleware";

type Lang = "th" | "en";

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (th: string, en: string) => string;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: "th",
      setLang: (lang) => set({ lang }),
      t: (th, en) => (get().lang === "th" ? th : en),
    }),
    { name: "futai-lang" }
  )
);
