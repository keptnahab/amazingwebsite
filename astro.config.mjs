// @ts-check
import { defineConfig } from 'astro/config';

// Locale is fixed at build time via PUBLIC_LOCALE (en|de) — the EN and DE
// sites are two separate static builds deployed to separate domains, see
// .github/workflows/deploy.yml.
const locale = process.env.PUBLIC_LOCALE === 'de' ? 'de' : 'en';

export default defineConfig({
  site: locale === 'de' ? 'https://www.tolleslicht.de' : 'https://amazinglighting.design',
  image: {
    // keep large source photos but ship optimized responsive variants
    responsiveStyles: true,
  },
});
