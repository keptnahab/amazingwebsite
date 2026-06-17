// @ts-check
import { defineConfig } from 'astro/config';

// English-first build. tolleslicht.de (DE) follows later.
export default defineConfig({
  site: 'https://amazinglighting.design',
  image: {
    // keep large source photos but ship optimized responsive variants
    responsiveStyles: true,
  },
});
