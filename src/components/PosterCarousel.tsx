import { useEffect, useRef } from 'react';
import { webProjects } from '@/data/projects';
import { initPosterRing } from '@/lib/posterRing';
import { initBinaryField } from '@/lib/binaryField';

// `lazy`: only for the swiped row. The orbit's cards start at zero size, so a
// lazy image there would not begin loading until its card had already appeared.
function PosterCards({ lazy = false }: { lazy?: boolean }) {
  return (
    <>
      {webProjects.map((p) => {
        const body = (
          <span className="poster-card-image">
            {/* An <img>, not a CSS background: it can load lazily and decode
                off the main thread, so the cards don't hold up the page. */}
            <img
              src={`https://picsum.photos/seed/${p.seed}/700/434`}
              width={700}
              height={434}
              alt=""
              loading={lazy ? 'lazy' : 'eager'}
              decoding="async"
              draggable={false}
            />
            <span className="poster-title">{p.title}</span>
          </span>
        );
        return p.href ? (
          <a key={p.seed} className="poster-card" draggable={false} href={p.href} target="_blank" rel="noreferrer">
            {body}
          </a>
        ) : (
          <div key={p.seed} className="poster-card">{body}</div>
        );
      })}
    </>
  );
}

// Narrow screens: the same cards as a row that is swiped sideways. The
// orbit needs a wide stage; a phone gets the native gesture instead.
export function PosterStrip() {
  return (
    <div className="poster-strip" aria-label="Web projects">
      <PosterCards lazy />
    </div>
  );
}

export function PosterCarousel() {
  const stackRef = useRef<HTMLDivElement>(null);
  const bitsRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => (stackRef.current ? initPosterRing(stackRef.current) : undefined), []);
  useEffect(
    () => (bitsRef.current && stackRef.current ? initBinaryField(bitsRef.current, stackRef.current) : undefined),
    [],
  );

  return (
    <div className="poster-layer">
      <div className="poster-stack" id="posterStack" ref={stackRef}>
        <canvas className="binary-field" aria-hidden="true" ref={bitsRef} />
        <div className="poster-ring">
          <PosterCards />
        </div>
      </div>
    </div>
  );
}
