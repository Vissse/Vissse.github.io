import { useEffect, useRef, useState, type ReactNode } from 'react';
import { appProjects } from '@/data/projects';
import { AppPreview } from '@/components/AppPreview';
import { PosterStrip } from '@/components/PosterCarousel';
import { ContactForm } from '@/components/ContactForm';
import { ContactOrnament } from '@/components/ContactOrnament';
import { reveal } from '@/lib/reveal';
import { FLOW_QUERY } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';

interface SectionProps {
  id: string;
  label: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  /** Content appears with the section, like everywhere else on the page. */
  animate?: boolean;
}


function Section({ id, label, title, lead, children, animate = false }: SectionProps) {
  const at = (delay: number) => (animate ? reveal(delay) : {});
  return (
    <section id={id} className="light-section">
      <div className="light-section-inner">
        <span className="index-label mono" {...at(0)}>— {label}</span>
        <h2 className="section-title" {...at(70)}>{title}</h2>
        {lead && <p className="section-lead" {...at(140)}>{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export function WebProjects({ strip }: { strip: boolean }) {
  return (
    <Section
      id="web-projects"
      label="Web Development"
      title="Web Projects"
      lead="Websites and web apps I've built — for myself and for clients, some shipped, some still in progress."
    >
      {strip && (
        <>
          <p className="poster-strip-hint mono">Swipe to browse</p>
          <PosterStrip />
        </>
      )}
    </Section>
  );
}

export function AppProjects() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  // The preview replays its entrance whenever it is re-mounted: on every
  // change of selection, and each time the section arrives on screen
  // (stackScroll fires `sectionreveal`). `mode` only sets how long it waits:
  // on arrival it lets the card itself fade in first.
  const [arrivals, setArrivals] = useState(0);
  const [mode, setMode] = useState<'arrive' | 'switch'>('arrive');
  const current = appProjects[active] ?? appProjects[0]!;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onReveal = () => {
      setMode('arrive');
      setArrivals((n) => n + 1);
    };
    section.addEventListener('sectionreveal', onReveal);
    return () => section.removeEventListener('sectionreveal', onReveal);
  }, []);

  const select = (i: number) => {
    if (i === active) return;
    setMode('switch');
    setActive(i);
  };

  // On narrow screens the list is an accordion: the preview opens inside the
  // selected row instead of sitting beside the list. Opening one row closes
  // another above it, which moves the page under the finger, so the newly
  // selected row is brought back into view.
  const stacked = useMediaQuery(FLOW_QUERY);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const touched = useRef(false);
  useEffect(() => {
    if (!stacked || !touched.current) return;
    rowRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, stacked]);

  const card = (
    <div className="preview-card" aria-live="polite" data-mode={mode} {...reveal(300)}>
      <span className="preview-cross preview-cross-tl mono" aria-hidden="true">+</span>
      <span className="preview-cross preview-cross-br mono" aria-hidden="true">+</span>
      <div className="preview-bar" key={active}>
        <span className="preview-index mono">{String(active + 1).padStart(2, '0')}</span>
        <span className="preview-name">{current.title}</span>
        <span className="preview-fig mono">{current.figure}</span>
      </div>
      <div className="preview-body" key={`${current.preview}-${arrivals}`}>
        <div className="preview-stage">
          <AppPreview kind={current.preview} />
        </div>
      </div>
    </div>
  );

  return (
    <section id="app-projects" className="light-section" ref={sectionRef}>
      <div className="light-section-inner apps-layout">
        <div className="apps-side">
          <span className="index-label mono" {...reveal(0)}>— App Development</span>
          <h2 className="section-title" {...reveal(70)}>App Projects</h2>
          <p className="section-lead" {...reveal(140)}>
            Desktop tools and scripts I've built — AI-assisted audio analysis, NLP research tooling, and system utilities.
          </p>
        </div>

        <div className="apps-listing">
          <div className="apps-listing-head" {...reveal(120)}>
            <h3 className="apps-listing-title"><strong>Tools</strong> I've built<span className="square-dot" /></h3>
            <span className="apps-listing-hint mono">{stacked ? 'Tap to preview' : 'Select to preview'}</span>
          </div>
          <ol className="app-list">
            {appProjects.map((app, i) => (
              <li
                key={app.title}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className={`app-row${i === active ? ' is-active' : ''}`}
                tabIndex={0}
                {...reveal(230 + i * 80)}
                onMouseEnter={() => select(i)}
                onFocus={() => select(i)}
                onPointerDown={() => {
                  touched.current = true;
                }}
                onClick={() => select(i)}
              >
                <span className="app-row-index mono">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="app-row-title">{app.title}</h3>
                <p className="app-row-desc">{app.description}</p>
                {stacked && i === active && card}
              </li>
            ))}
          </ol>
        </div>

        {!stacked && card}
      </div>
    </section>
  );
}

// The portrait at the sizes it is actually drawn at (it is 260-480px wide),
// and its ghost as a separate small file with the grey, soft look baked in,
// so nothing has to be filtered while the page scrolls.
const PORTRAIT = {
  src: '/assets/foto-960.webp',
  srcSet: '/assets/foto-480.webp 480w, /assets/foto-960.webp 960w',
  sizes: '(max-width: 899px) min(82vw, 380px), clamp(260px, 34vw, 480px)',
  width: 960,
  height: 1023,
  loading: 'lazy' as const, // far down the page: not part of the first load
};
const PORTRAIT_GHOST = {
  src: '/assets/foto-ghost.webp',
  width: 640,
  height: 682,
  loading: 'lazy' as const,
  decoding: 'async' as const,
};
const NAME_GHOSTS = ['ghost-above-1', 'ghost-above-2', 'ghost-below-1', 'ghost-below-2'];
// Facts shown either side of the portrait: [label, value].
const ABOUT_LEFT: Array<[string, string]> = [
  ['Degree', 'Master’s degree (Mgr.), 2026'],
  ['Programme', 'Computational Linguistics'],
  ['Faculty', 'Faculty of Arts, Masaryk University'],
];
const ABOUT_RIGHT: Array<[string, string]> = [
  // Broken by hand, so no separator is left dangling at the end of a line.
  ['Works across', 'Frontend · Backend\nLanguage processing'],
  ['Approach', 'Technical precision, analytical thinking, a sense of design'],
];

export function About() {
  const facts = (items: Array<[string, string]>, from: number) =>
    items.map(([label, value], i) => (
      <div key={label} className="about-fact" {...reveal(from + i * 90)}>
        <dt className="mono">{label}</dt>
        <dd>{value}</dd>
      </div>
    ));

  return (
    <section id="o-mne" className="light-section">
      <div className="light-section-inner about-layout">
        <div className="about-head">
          <span className="index-label mono" {...reveal(0)}>— About</span>
          <h2 className="section-title" {...reveal(70)}>About</h2>
        </div>

        <dl className="about-facts about-facts-left">{facts(ABOUT_LEFT, 520)}</dl>

        <div className="about-stage">
          <div className="about-portrait" {...reveal(80)}>
            <img className="about-ghost about-ghost-far" {...PORTRAIT_GHOST} alt="" aria-hidden="true" />
            <img className="about-ghost about-ghost-near" {...PORTRAIT_GHOST} alt="" aria-hidden="true" />
            <img className="about-photo" {...PORTRAIT} alt="Vít Šebestík" />
            {/* Set on the dark T-shirt, so it is light text and sized to stay on it. */}
            <div className="about-caption">
              <p className="about-role" {...reveal(340)}>Developer · IT Specialist at Librion</p>
              {/* A signature, with the hero accent's gradient and its four
                  faded duplicates around it. */}
              <p className="about-name" {...reveal(420)}>
                <span className="about-name-text">Vít Šebestík</span>
                {NAME_GHOSTS.map((g) => (
                  <span key={g} className={`ghost-duplicate ${g}`} aria-hidden="true">Vít Šebestík</span>
                ))}
              </p>
            </div>
          </div>
        </div>

        <dl className="about-facts about-facts-right">
          {facts(ABOUT_RIGHT, 520)}
        </dl>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <Section
      id="kontakt"
      label="Contact"
      title="Contact"
      animate
    >
      <ContactForm />
      <ContactOrnament />
    </Section>
  );
}
