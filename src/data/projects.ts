/**
 * Project data. Text/credits live in `projects.data.ts` (hand-editable);
 * images are auto-discovered from `src/assets/work/NN_slug/` via
 * import.meta.glob — no script needed to add a project's photos.
 */
import type { ImageMetadata } from "astro";
import { projectsData } from "./projects.data";

export type Category =
  | "BROADCAST" | "CONCERTS" | "CORPORATE" | "THEATER" | "EVENTS" | "CEREMONY";

export interface Project {
  order: number;          // higher = newer = shown first
  slug: string;
  title: string;
  year: string;
  location: string;
  category: Category;
  description: string;
  cover: ImageMetadata;
  gallery: ImageMetadata[];
  credits: { role: string; name: string }[];
}

const images = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/work/**/*.{jpg,jpeg,png,webp}",
  { eager: true }
);

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

function resolveFolder(assetFolder: string) {
  const prefix = `../assets/work/${assetFolder}/`;
  const entries = Object.entries(images)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, mod]) => ({ name: path.slice(prefix.length), img: mod.default }))
    .sort((a, b) => naturalSort(a.name, b.name));

  const mainEntry = entries.find((e) => /^main\./i.test(e.name));
  const numbered = entries.filter((e) => e !== mainEntry);
  const cover = mainEntry?.img ?? numbered[0]?.img ?? entries[0]?.img;
  const gallery = cover
    ? [cover, ...numbered.filter((e) => e.img !== cover).map((e) => e.img)]
    : [];

  return { cover, gallery };
}

export const projects: Project[] = projectsData
  .map((d) => {
    const { cover, gallery } = resolveFolder(d.assetFolder);
    if (!cover) return null;
    return {
      order: d.order,
      slug: d.slug,
      title: d.title,
      year: d.year,
      location: d.location,
      category: d.category,
      description: d.description,
      cover,
      gallery,
      credits: d.credits,
    };
  })
  .filter((p): p is Project => p !== null);
