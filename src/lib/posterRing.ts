// Poster carousel: cards always face forward and only shift along a tilted
// band, scale and fade, which reads as an orbit. Cards are fed in one at a
// time at the entry point once the carousel scrolls into view.

export function initPosterRing(posterStack: HTMLElement): () => void {
  const ring = posterStack.querySelector<HTMLElement>('.poster-ring');
  const cards = ring ? [...ring.querySelectorAll<HTMLElement>('.poster-card')] : [];
  const first = cards[0];
  if (!first) return () => {};
  const total = cards.length;
  const gap = 360 / total;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bandRad = ((180 - 25) * Math.PI) / 180;
  const bandCos = Math.cos(bandRad);
  const bandSin = Math.sin(bandRad);

  const entryAngle = -100; // where on the orbit a card gets fed in
  const emergeSpan = 22; // degrees of travel over which it grows in
  const degPerSecond = reducedMotion ? 0 : 360 / 20;
  const burstPeak = 300; // deg/s at the start, easing to cruise speed
  const burstDuration = 1.2; // seconds

  let running = false;
  let reached = reducedMotion ? 720 : 0;
  let rotation = 0;
  let dragging = false;
  let dragMoved = false;
  let startX = 0;
  let startY = 0;
  let startRotation = 0;
  let lastTime: number | null = null;
  let runStart: number | null = null;
  let dirty = true;
  let raf = 0;

  const readSpread = () => parseFloat(getComputedStyle(first).getPropertyValue('--spread-radius')) || 190;
  let spread = readSpread();
  const onResize = () => {
    spread = readSpread();
    dirty = true;
  };
  window.addEventListener('resize', onResize);

  function render() {
    dirty = false;
    reached = Math.max(reached, rotation);
    cards.forEach((el, i) => {
      const rad = ((entryAngle + rotation - i * gap) * Math.PI) / 180;
      const along = Math.sin(rad) * spread;
      const c = Math.cos(rad);
      const g = Math.min(1, Math.max(0, (reached - i * gap) / emergeSpan));
      const emerge = g * g * (3 - 2 * g);
      const scale = Math.max((0.55 + 0.45 * c) * emerge, 0);
      el.style.transform = `translate(-50%, -50%) translate(${(along * bandCos).toFixed(1)}px, ${(along * bandSin).toFixed(1)}px) scale(${scale.toFixed(3)})`;
      el.style.opacity = '1';
      el.style.pointerEvents = c > 0.3 && g >= 1 ? 'auto' : 'none';
      el.style.zIndex = String(Math.round((c + 1) * 500));
    });
  }

  function tick(time: number) {
    if (lastTime === null) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if (running && !dragging) {
      const elapsed = runStart === null ? Infinity : Math.max(0, (time - runStart) / 1000);
      const u = Math.min(1, elapsed / burstDuration);
      const settle = u * u * (3 - 2 * u);
      rotation += (burstPeak + (degPerSecond - burstPeak) * settle) * dt;
    }
    if (running || dragging || dirty) render();
    raf = requestAnimationFrame(tick);
  }
  render();
  raf = requestAnimationFrame(tick);

  let observer: IntersectionObserver | undefined;
  if (!reducedMotion) {
    observer = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (!last) return;
        const visible = last.intersectionRatio >= 0.3;
        if (visible && !running) {
          running = true;
          runStart = performance.now();
        } else if (!visible && running) {
          running = false;
          runStart = null;
          rotation = 0;
          reached = 0;
          dirty = true;
        }
      },
      { threshold: [0, 0.3, 0.6, 1] },
    );
    observer.observe(posterStack);
  }

  const onDragStart = (e: Event) => e.preventDefault();
  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    dragging = true;
    dragMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    startRotation = rotation;
    posterStack.classList.add('dragging');
    posterStack.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const along = (e.clientX - startX) * bandCos + (e.clientY - startY) * bandSin;
    if (Math.abs(along) > 3) dragMoved = true;
    rotation = startRotation + along * 0.35;
    render();
  };
  const endDrag = () => {
    dragging = false;
    posterStack.classList.remove('dragging');
  };
  const onCardClick = (e: Event) => {
    if (dragMoved) e.preventDefault();
  };

  posterStack.addEventListener('dragstart', onDragStart);
  posterStack.addEventListener('pointerdown', onDown);
  posterStack.addEventListener('pointermove', onMove);
  posterStack.addEventListener('pointerup', endDrag);
  posterStack.addEventListener('pointercancel', endDrag);
  cards.forEach((card) => card.addEventListener('click', onCardClick));

  return () => {
    cancelAnimationFrame(raf);
    observer?.disconnect();
    window.removeEventListener('resize', onResize);
    posterStack.removeEventListener('dragstart', onDragStart);
    posterStack.removeEventListener('pointerdown', onDown);
    posterStack.removeEventListener('pointermove', onMove);
    posterStack.removeEventListener('pointerup', endDrag);
    posterStack.removeEventListener('pointercancel', endDrag);
    cards.forEach((card) => card.removeEventListener('click', onCardClick));
  };
}
