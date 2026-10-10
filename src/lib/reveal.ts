import type { CSSProperties } from 'react';

// Marks an element to appear `delay` ms after its section arrives (see
// [data-reveal] in main.css; stackScroll sets .is-revealed on the section).
export const reveal = (delay: number) => ({ 'data-reveal': '', style: { '--d': delay } as CSSProperties });
