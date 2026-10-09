import { useEffect, useState } from 'react';

const GHOSTS = ['ghost-above-1', 'ghost-above-2', 'ghost-below-1', 'ghost-below-2'];

export function Hero() {
  // Each contour layer draws in at its own random moment after load.
  const [drawn, setDrawn] = useState([false, false, false]);
  useEffect(() => {
    const timers = [0, 1, 2].map((i) =>
      window.setTimeout(() => setDrawn((d) => d.map((v, j) => (j === i ? true : v))), 200 + Math.random() * 1600),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section id="domu" className="hero-frame">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-contours" aria-hidden="true">
        {drawn.map((on, i) => (
          <div key={i} className={`contour-layer contour-${i + 1}${on ? ' is-drawn' : ''}`} />
        ))}
      </div>
      <div className="hero-grain" aria-hidden="true" />

      <div className="hero-inner">
        <p className="eyebrow line">
          <span className="line-inner mono">
            Frontend × Backend<span className="eyebrow-dash"> — </span>
            <span className="eyebrow-tail">Language Processing</span>
          </span>
        </p>
        <h1 className="hero-title">
          <span className="line">
            <span className="line-inner"><strong>Websites and tools</strong> that</span>
          </span>
          <span className="line line-ghost-host">
            <span className="line-inner accent">make sense<span className="square-dot" /></span>
            {GHOSTS.map((g) => (
              <span key={g} className={`ghost-duplicate ${g}`} aria-hidden="true">make sense</span>
            ))}
          </span>
        </h1>
        <p className="hero-sub">
          I design and build products across frontend, backend, and language processing — with an NLP background from my computational linguistics degree at Masaryk University.
        </p>
        <a href="#web-projects" className="btn-frame btn-frame-lg">
          <span className="corner corner-tl">+</span>
          <span className="btn-frame-inner mono">View my work</span>
          <span className="corner corner-br">+</span>
        </a>
      </div>
    </section>
  );
}
