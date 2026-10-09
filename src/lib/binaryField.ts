// Irregular field of 0s and 1s behind the poster carousel. When the carousel
// scrolls into view the digits are written in from the top-right end of the
// band towards the bottom-left (the same direction the cards are fed in);
// once written, cells keep flipping 0 <-> 1 and blinking at random.
// Each cell is drawn once and only the few that change are redrawn.

const REVEAL_SECONDS = 1.4; // matches the carousel burst (~1.2 s)
const TICK_MS = 90;

interface Field {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cols: number;
  rows: number;
  bits: number[]; // -1 = empty, 0 / 1 = that digit
  shown: boolean[]; // has the reveal front passed this cell yet
  threshold: number[]; // 0 = first to appear (top-right end), 1 = last
  strength: number[];
  size: number[];
  jx: number[];
  jy: number[];
  cw: number;
  ch: number;
  dpr: number;
}

const ease = (u: number) => 1 - (1 - u) ** 2; // ease-out: starts fast, no slow lead-in

function drawCell(f: Field, col: number, row: number) {
  const { ctx, cw, ch, dpr } = f;
  const i = row * f.cols + col;
  const x = col * cw * dpr;
  const y = row * ch * dpr;
  ctx.clearRect(x - 4 * dpr, y - 4 * dpr, (cw + 8) * dpr, (ch + 8) * dpr);
  const bit = f.bits[i]!;
  if (bit < 0 || !f.shown[i]) return;
  ctx.font = `${Math.round(f.size[i]! * dpr)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = `rgba(109, 122, 84, ${f.strength[i]})`;
  ctx.fillText(String(bit), x + (cw * dpr) / 2 + f.jx[i]! * dpr, y + (ch * dpr) / 2 + f.jy[i]! * dpr);
}

function layout(f: Field, progress: number) {
  const w = f.canvas.offsetWidth;
  const h = f.canvas.offsetHeight;
  if (!w || !h) return;
  f.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  f.canvas.width = Math.round(w * f.dpr);
  f.canvas.height = Math.round(h * f.dpr);
  f.cols = Math.ceil(w / f.cw);
  f.rows = Math.ceil(h / f.ch);
  const n = f.cols * f.rows;
  const p1 = Math.random() * 6.28;
  const p2 = Math.random() * 6.28;
  const p3 = Math.random() * 6.28;
  f.bits = new Array<number>(n);
  f.shown = new Array<boolean>(n);
  f.threshold = new Array<number>(n);
  f.strength = new Array<number>(n);
  f.size = new Array<number>(n);
  f.jx = new Array<number>(n);
  f.jy = new Array<number>(n);
  for (let r = 0; r < f.rows; r++) {
    for (let c = 0; c < f.cols; c++) {
      const i = r * f.cols + c;
      const density =
        0.5 +
        0.22 * Math.sin(c * 0.33 + r * 0.19 + p1) +
        0.16 * Math.sin(c * 0.11 - r * 0.41 + p2) +
        0.1 * Math.sin(c * 0.71 + r * 0.53 + p3);
      f.bits[i] = Math.random() < density ? (Math.random() < 0.5 ? 0 : 1) : -1;
      // The canvas is rotated with the band, so its right end is the top-right.
      f.threshold[i] = (1 - c / f.cols) * 0.85 + Math.random() * 0.15;
      f.shown[i] = f.threshold[i]! <= progress;
      f.strength[i] = 0.2 + Math.random() * 0.55;
      f.size[i] = 11 + Math.random() * 9;
      f.jx[i] = (Math.random() - 0.5) * 9;
      f.jy[i] = (Math.random() - 0.5) * 9;
    }
  }
  f.ctx.textAlign = 'center';
  f.ctx.textBaseline = 'middle';
  for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++) drawCell(f, c, r);
}

// `host` is the element whose visibility starts the write-in (the carousel).
export function initBinaryField(canvas: HTMLCanvasElement, host: HTMLElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f: Field = {
    canvas, ctx, cols: 0, rows: 0, bits: [], shown: [], threshold: [],
    strength: [], size: [], jx: [], jy: [], cw: 24, ch: 28, dpr: 1,
  };

  let progress = reduced ? 1 : 0; // 0..1 position of the reveal front
  let revealStart: number | null = null;
  let raf = 0;

  layout(f, progress);
  const resizeObserver = new ResizeObserver(() => layout(f, progress));
  resizeObserver.observe(canvas);
  void document.fonts?.ready.then(() => layout(f, progress));

  function revealFrame(time: number) {
    if (revealStart === null) return;
    progress = ease(Math.min(1, (time - revealStart) / (REVEAL_SECONDS * 1000)));
    for (let i = 0; i < f.threshold.length; i++) {
      if (!f.shown[i] && f.threshold[i]! <= progress) {
        f.shown[i] = true;
        drawCell(f, i % f.cols, Math.floor(i / f.cols));
      }
    }
    if (progress < 1) raf = requestAnimationFrame(revealFrame);
  }

  function reset() {
    cancelAnimationFrame(raf);
    revealStart = null;
    progress = 0;
    layout(f, 0);
  }

  let observer: IntersectionObserver | undefined;
  if (!reduced) {
    let running = false;
    observer = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (!last) return;
        const visible = last.intersectionRatio >= 0.3;
        if (visible && !running) {
          running = true;
          revealStart = performance.now();
          raf = requestAnimationFrame(revealFrame);
        } else if (!visible && running) {
          running = false;
          reset();
        }
      },
      { threshold: [0, 0.3, 0.6, 1] },
    );
    observer.observe(host);
  }

  let timer: number | undefined;
  if (!reduced) {
    timer = window.setInterval(() => {
      if (document.hidden) return;
      const cells = f.cols * f.rows;
      if (!cells) return;
      // Touch ~1.4% of the cells each tick: most flip their digit, some
      // blink out and others blink back in. Only cells already written.
      const flips = Math.max(4, Math.round(cells * 0.014));
      for (let n = 0; n < flips; n++) {
        const i = Math.floor(Math.random() * cells);
        if (!f.shown[i]) continue;
        const roll = Math.random();
        const bit = f.bits[i]!;
        if (bit < 0) {
          if (roll < 0.35) f.bits[i] = Math.random() < 0.5 ? 0 : 1;
        } else if (roll < 0.22) {
          f.bits[i] = -1;
        } else {
          f.bits[i] = bit ^ 1;
        }
        drawCell(f, i % f.cols, Math.floor(i / f.cols));
      }
    }, TICK_MS);
  }

  return () => {
    cancelAnimationFrame(raf);
    observer?.disconnect();
    resizeObserver.disconnect();
    if (timer !== undefined) clearInterval(timer);
  };
}
