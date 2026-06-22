import { strings, type Locale } from "./strings";

export const locale: Locale = import.meta.env.PUBLIC_LOCALE === "de" ? "de" : "en";

export const t = strings[locale];

export const domains: Record<Locale, string> = {
  en: "amazinglighting.design",
  de: "tolleslicht.de",
};

export const otherLocale: Locale = locale === "de" ? "en" : "de";
