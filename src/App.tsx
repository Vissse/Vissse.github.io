import { useEffect } from 'react';
import { FLOW_QUERY } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { PosterCarousel } from '@/components/PosterCarousel';
import { About, AppProjects, Contact, WebProjects } from '@/components/Sections';
import { initStackScroll } from '@/lib/stackScroll';

export function App() {
  // Effects of children run first, so every section already exists here.
  useEffect(() => initStackScroll(), []);
  // Narrow screens get the projects as a swipeable row inside the section
  // instead of the orbiting carousel layered over it.
  const stacked = useMediaQuery(FLOW_QUERY);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        {!stacked && <PosterCarousel />}
        <WebProjects strip={stacked} />
        <AppProjects />
        <About />
        <Contact />
        <div className="scroll-tail" aria-hidden="true" />
      </main>
    </>
  );
}
