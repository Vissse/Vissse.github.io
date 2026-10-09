export interface WebProject {
  title: string;
  seed: string;
  href?: string;
}

export type AppPreviewKind = 'audio' | 'sentiment' | 'desk' | 'glpi';

export interface AppProject {
  title: string;
  description: string;
  preview: AppPreviewKind;
  figure: string;
}

export const webProjects: WebProject[] = [
  { title: 'RustTools', seed: 'rusttools-project', href: 'https://www.rust-tools.eu/' },
  { title: 'VAS Solutions s.r.o.', seed: 'vas-solutions-project', href: 'https://www.vas-solutions.cz/' },
  { title: 'Librion s.r.o.', seed: 'librion-project' },
  { title: 'TJ Sokol Polanka', seed: 'tj-sokol-polanka' },
  { title: 'MP celní služby', seed: 'mp-celni-sluzby' },
  { title: 'Wishlist App', seed: 'wishlist-app' },
  { title: 'Obrazy od Ameli', seed: 'obrazy-od-ameli' },
];

export const appProjects: AppProject[] = [
  {
    title: 'Audio Analysis Tool',
    description: 'Software for analyzing audio corpora with automatic AI-based detection of lexical units.',
    preview: 'audio',
    figure: 'fig. 02a — audio corpus',
  },
  {
    title: 'Subtitle Sentiment Analysis',
    description: "Bachelor's thesis in NLP — a script for cleaning subtitles and building a corpus for emotion analysis.",
    preview: 'sentiment',
    figure: 'fig. 02b — emotion corpus',
  },
  {
    title: 'OmniDesk',
    description: 'A modern desktop app for full PC management in one place — including bulk software installs via Winget after a clean Windows install.',
    preview: 'desk',
    figure: 'fig. 02c — system overview',
  },
  {
    title: 'GLPI Agent Enhancement',
    description: "My own extension of the GLPI agent: a configurable script that scans our IP range in parallel, reports to GLPI, and logs every run.",
    preview: 'glpi',
    figure: 'fig. 02d — scan log',
  },
];
