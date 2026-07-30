import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "th" | "en" | "zh";

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // Falls back to Thai (always present) whenever a translation is missing
  // or empty — e.g. content saved before auto-translate existed.
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
        if (lang === "en") return en || th;
        if (lang === "zh") return zh || en || th;
        return th;
      },
    }),
    { name: "futai-lang" }
  )
);
