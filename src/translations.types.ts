export type Lang = "en" | "ko" | "ja" | "ru";
export type Translations = Record<string, { en: string } & Partial<Record<Exclude<Lang, "en">, string>>>;
