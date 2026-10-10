import { renderToString } from 'react-dom/server';
import { App } from './App';

// Used at build time only (scripts/prerender.mjs): the page's markup as a
// string, so the built index.html already holds the content for crawlers.
export function render(): string {
  return renderToString(<App />);
}
