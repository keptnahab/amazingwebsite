/**
 * Prototype project data.
 * In the final build this is generated from one markdown file per project
 * (Astro content collection) — the "simple file-based CMS".
 */
import type { ImageMetadata } from "astro";

import croCover from "../assets/work/cro-chronicles.jpg";
import cro1 from "../assets/work/cro-1.jpg";
import cro2 from "../assets/work/cro-2.jpg";
import cro3 from "../assets/work/cro-3.jpg";
import paepstin from "../assets/work/die-paepstin.jpg";
import bavaria from "../assets/work/bavaria-sounds.jpg";

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

export const projects: Project[] = [
  {
    order: 52,
    slug: "die-paepstin",
    title: "Die Päpstin",
    year: "2025",
    location: "Festspielhaus Füssen",
    category: "THEATER",
    description:
      "Lighting design and programming for the Festspielhaus Füssen musical — shaping a cinematic, atmospheric stage world for the production.",
    cover: paepstin,
    gallery: [paepstin],
    credits: [
      { role: "Scope", name: "Lighting Design & Programming" },
      { role: "Client", name: "Festspielhaus Füssen" },
      { role: "Creative Director", name: "Benjamin Sahler" },
      { role: "Choreographer", name: "Stefanie Gröning" },
      { role: "Lighting Design", name: "Michael Kühbandner" },
    ],
  },
  {
    order: 47,
    slug: "cro-chronicles-tour",
    title: "CRO — Chronicles Tour",
    year: "2024",
    location: "Across Germany",
    category: "CONCERTS",
    description:
      "A dynamic arena production for CRO's Chronicles tour across Germany — studio associate design and previsualization alongside Roland Greil.",
    cover: croCover,
    gallery: [croCover, cro1, cro2, cro3],
    credits: [
      { role: "Scope", name: "Studio Associate" },
      { role: "Client", name: "Roland Greil" },
      { role: "Lighting Design", name: "Roland Greil" },
      { role: "LX Programmer", name: "Klaus Kubesch" },
      { role: "Touring Lighting Director", name: "Martin Holstein" },
      { role: "Media Server & Screens", name: "Michael Trapster" },
      { role: "Production Manager", name: "Pierre Zuta" },
      { role: "LX & Set Vendor", name: "Satis&Fy" },
    ],
  },
  {
    order: 28,
    slug: "bavaria-sounds",
    title: "Bavaria Sounds",
    year: "2022",
    location: "Munich",
    category: "EVENTS",
    description:
      "Open-air music spectacle in Munich — studio associate and programming on Florian Wieder's stage design.",
    cover: bavaria,
    gallery: [bavaria],
    credits: [
      { role: "Scope", name: "Studio Associate / Programming" },
      { role: "Client", name: "Roland Greil" },
      { role: "Production Design", name: "Florian Wieder" },
      { role: "Photos", name: "Manfred Vogel / Wieder Design" },
    ],
  },
];
