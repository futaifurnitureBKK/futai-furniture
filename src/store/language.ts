import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "th" | "en" | "zh";

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // zh falls back to en when not yet translated, so existing 2-arg call
  // sites keep working while content is migrated incrementally.
  t: (th: string, en: string, zh?: string) => string;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: "th",
      setLang: (lang) => set({ lang }),
      t: (th, en, zh) => {
        const lang = get().lang;
        if (lang === "th") return th;
        if (lang === "zh") return zh || en;
        return en;
      },
    }),
    { name: "futai-lang" }
  )
);
