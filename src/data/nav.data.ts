import { t, locale } from "../i18n/config";

export const mainNav = [
  { label: t.nav.work, href: "/work" },
  { label: t.nav.about, href: "/#about" },
  { label: t.nav.services, href: "/#services" },
  { label: t.nav.network, href: "/#network" },
  { label: t.nav.contact, href: "/#contact" },
];

export const legalNav = [
  { label: t.nav.imprint, href: "/imprint" },
  { label: t.nav.privacy, href: "/privacy" },
  { label: t.nav.terms, href: locale === "de" ? "/agb-de.pdf" : "/agb-en.pdf", external: true },
];
