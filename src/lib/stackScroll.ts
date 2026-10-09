import { FLOW_QUERY } from '@/lib/breakpoints';

// The page is one stack of cards: the hero and each .light-section stay
// pinned while the next one slides up over them. Everything is derived from
// scrollY and cached section offsets — no layout reads while scrolling.
//
// That only works while every section fits the screen. On narrow screens the
// sections are taller than the viewport (a pinned section's lower part could
// never be reached), so there the stack is switched off: FLOW mode. Sections
// simply follow one another, the page scrolls natively, and all this module
// still does is reveal sections as they arrive, keep the URL's hash in sync
// and glide to a section when a menu link is used. main.css mirrors the
// switch with the same breakpoint.

const LANDING_RATIO = 0.45; // of the viewport height
const SETTLE = 0.7; // share of the landing that counts as "landed"

const landing = () => window.innerHeight * LANDING_RATIO;

// Where a section with natural top `y` is actually drawn: it decelerates
// smoothly into its pinned position instead of locking instantly.
function visTop(y: number, L: number): number {
  if (y >= L) return y;
  if (y <= -L) return 0;
  const t = (y + L) / (2 * L);
  return 2 * L * (t ** 3 - t ** 4 / 2);
}

// 0 while the covering section is below the fold, 1 once fully arrived.
const coverFromTop = (top: number) => Math.min(1, Math.max(0, 1 - top / window.innerHeight));

export function initStackScroll(): () => void {
  const root = document.documentElement;
  const heroFrame = document.querySelector<HTMLElement>('.hero-frame');
  const scrollNav = document.getElementById('scrollNav');
  // Looked up when needed: it only exists in stack mode (see App.tsx).
  const getPosterLayer = () => document.querySelector<HTMLElement>('.poster-layer');
  const sections = [...document.querySelectorAll<HTMLElement>('.light-section')];
  if (!heroFrame) return () => {};
  const hero = heroFrame;
  const flowQuery = window.matchMedia(FLOW_QUERY);
  let flow = flowQuery.matches;

  let docTops: number[] = [];
  // Whether each section has arrived far enough for its content to appear
  // (the CSS staggers [data-reveal] elements off the .is-revealed class).
  const revealed = sections.map(() => false);
  let dotGrid = 28;
  let heroCovered = false;

  const lastValue = new WeakMap<Element, Record<string, string>>();
  const write = (el: Element, key: string, value: string, apply: (v: string) => void) => {
    let seen = lastValue.get(el);
    if (!seen) lastValue.set(el, (seen = {}));
    if (seen[key] === value) return;
    seen[key] = value;
    apply(value);
  };
  const setVar = (el: HTMLElement, name: string, value: string) =>
    write(el, name, value, (v) => el.style.setProperty(name, v));
  const setLift = (el: HTMLElement, px: number) =>
    write(el, 'lift', Math.abs(px) < 0.05 ? '' : `translate3d(0, ${px.toFixed(2)}px, 0)`, (v) => {
      el.style.transform = v;
    });
  const setDots = (el: HTMLElement, px: number) =>
    write(el, 'dots', `0 ${px.toFixed(2)}px`, (v) => {
      el.style.backgroundPosition = v;
    });

  function measure() {
    root.style.setProperty('--landing', `${landing()}px`);
    root.style.setProperty('--landing-settled', `${landing() * SETTLE}px`);
    dotGrid = parseFloat(getComputedStyle(root).getPropertyValue('--dot-grid')) || 28;

    if (flow) {
      // Nothing is pinned, so a section's real position is its position.
      docTops = sections.map((section) => section.getBoundingClientRect().top + window.scrollY);
      return;
    }

    const cs = getComputedStyle(hero);
    let acc = hero.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    docTops = sections.map((section) => {
      const top = acc;
      acc += section.offsetHeight;
      return top;
    });
  }

  // FLOW mode: no lifting, no covering. Only what still makes sense.
  function applyFlow() {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    sections.forEach((section, i) => {
      setLift(section, 0);
      setVar(section, '--cover', '0');

      // Appears when its top is well into the screen; resets only once it is
      // back below the fold.
      const top = docTops[i]! - scrollY;
      const show = top <= vh * 0.8 ? true : top >= vh ? false : revealed[i]!;
      if (show !== revealed[i]) {
        revealed[i] = show;
        section.classList.toggle('is-revealed', show);
        if (show) section.dispatchEvent(new CustomEvent('sectionreveal'));
      }
    });
    // The page background (seen around the hero's frame and on overscroll) is
    // dark while any of the hero is on screen and cream after. It flips once,
    // when the hero is gone, instead of fading with the scroll: --cover is an
    // inherited property on <html>, so changing it every frame would restyle
    // the whole document on every frame.
    const firstTop = docTops[0] ?? vh;
    setVar(root, '--cover', scrollY >= firstTop ? '1' : '0');

    scrollNav?.classList.toggle('visible', scrollY > 80);
    syncHash();

    if (heroCovered) {
      heroCovered = false;
      hero.classList.remove('is-covered');
    }
  }

  function apply() {
    if (flow) {
      applyFlow();
      return;
    }
    const scrollY = window.scrollY;
    const L = landing();
    const drawnTops = docTops.map((top) => visTop(top - scrollY, L));
    // What covers section i is the next section that is actually shown: ones
    // hidden by a menu jump (see skipBetween) don't count, so the section we
    // leave keeps its content until the real target slides over it.
    const coveringTop = (i: number) => {
      for (let j = i + 1; j < sections.length; j++) {
        if (!skipped.includes(sections[j]!)) return drawnTops[j];
      }
      return undefined;
    };

    sections.forEach((section, i) => {
      setLift(section, drawnTops[i]! - Math.max(docTops[i]! - scrollY, 0));
      setDots(section, -(drawnTops[i]! % dotGrid));

      // Appears once it is more than half-way in; resets only when it has
      // left the screen downwards, so it never flickers while in view.
      const top = drawnTops[i]!;
      const show = top <= window.innerHeight * 0.55 ? true : top >= window.innerHeight ? false : revealed[i]!;
      if (show !== revealed[i]) {
        revealed[i] = show;
        section.classList.toggle('is-revealed', show);
        if (show) section.dispatchEvent(new CustomEvent('sectionreveal'));
      }

      const covering = coveringTop(i);
      const cover = (covering === undefined ? 0 : coverFromTop(covering)).toFixed(4);
      setVar(section, '--cover', cover);
    });

    const firstTop = coveringTop(-1);
    const heroCover = firstTop === undefined ? 0 : coverFromTop(firstTop);
    setVar(root, '--cover', heroCover.toFixed(4));

    scrollNav?.classList.toggle('visible', scrollY > 80);
    syncHash();

    const covered = heroCover >= 1;
    if (covered !== heroCovered) {
      heroCovered = covered;
      hero.classList.toggle('is-covered', covered);
    }
  }

  const refresh = () => {
    // Checked here as well as on the query's own change event (below): this
    // runs on every resize, so the mode can't be left behind.
    if (flow !== flowQuery.matches) {
      flow = flowQuery.matches;
      cancelGlide();
      if (flow) sections.forEach((section) => (section.style.backgroundPosition = ''));
    }
    measure();
    apply();
  };

  // The URL always names the section on screen, so a refresh lands on that
  // section's start (the browser's own scroll restoration is turned off and
  // would leave the next section peeking in at the bottom).
  const sectionIds = ['domu', ...sections.map((s) => s.id)];
  let syncedIndex = -2;
  let hashReady = false; // only after the first jump, or the startup pass would overwrite the URL's hash
  function syncHash() {
    if (!hashReady || glide || !docTops.length) return; // mid-glide the link's own hash is already set
    const index = currentIndex();
    if (index === syncedIndex) return;
    syncedIndex = index;
    const id = sectionIds[index + 1]!;
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }

  // Native hash-jump miscalculates with stuck sections, so we scroll to the
  // cached natural offset plus the finished soft landing ourselves. The
  // native `behavior: 'smooth'` was unreliable over the stacked sticky
  // sections, so the glide is a small rAF animation (explicit 'instant' on
  // every step because html has scroll-behavior: smooth).
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let glide = 0;

  const targetTop = (target: HTMLElement) => {
    const i = sections.indexOf(target);
    if (i < 0) return 0;
    return flow ? docTops[i]! : docTops[i]! + landing() * SETTLE;
  };

  // A jump over several sections never flies through them. The sections in
  // between are hidden (not removed: layout and offsets stay) and the hidden
  // part of the trip is cut instantly, so only what is on screen is animated:
  //   down: cut to where the target is just below the fold, then it slides in;
  //   up:   the section we leave slides away, then cut to the target's start.
  // Either way it is one screen of travel, however far apart the two are.
  let skipped: HTMLElement[] = [];

  function currentIndex() {
    const vh = window.innerHeight;
    let current = -1; // -1 = the hero
    sections.forEach((_, i) => {
      if (docTops[i]! - window.scrollY <= vh * 0.5) current = i;
    });
    return current;
  }

  function skipBetween(a: number, b: number) {
    const lo = Math.min(a, b) + 1;
    const hi = Math.max(a, b) - 1;
    for (let i = lo; i <= hi; i++) {
      skipped.push(sections[i]!);
      const posterLayer = i === 0 ? getPosterLayer() : null;
      if (posterLayer) skipped.push(posterLayer); // the carousel belongs to the first section
    }
    skipped.forEach((el) => el.classList.add('is-skipped'));
  }

  function clearSkipped() {
    if (!skipped.length) return;
    skipped.forEach((el) => el.classList.remove('is-skipped'));
    skipped = [];
    apply(); // covers were computed without the hidden sections
  }

  function cancelGlide() {
    if (glide) cancelAnimationFrame(glide);
    glide = 0;
    clearSkipped();
  }

  // Jump without animating, and redraw now rather than on the next scroll event.
  function cutTo(top: number) {
    window.scrollTo({ top, left: 0, behavior: 'instant' });
    apply();
  }

  const easeOut = (t: number) => 1 - (1 - t) ** 3; // moves at full speed from the first frame
  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  function scrollToTarget(target: HTMLElement, animate: boolean) {
    cancelGlide();
    const to = targetTop(target);
    if (!animate || reducedMotion.matches || Math.abs(to - window.scrollY) < 2) {
      window.scrollTo({ top: to, left: 0, behavior: 'instant' });
      return;
    }

    const vh = window.innerHeight;
    const sourceIndex = currentIndex();
    const targetIndex = sections.indexOf(target);
    // In FLOW mode the sections in between are real page, not a pile to cut
    // through: the glide just travels the distance (capped in time below).
    if (!flow) skipBetween(sourceIndex, targetIndex);

    let from = window.scrollY;
    let end = to;
    let cutAfter: number | null = null;
    let ease = easeOut;
    if (skipped.length && targetIndex > sourceIndex) {
      from = Math.max(from, docTops[targetIndex]! - vh);
      cutTo(from);
    } else if (skipped.length) {
      end = Math.min(from, docTops[sourceIndex]! - vh);
      cutAfter = to;
      ease = easeInOut; // an exit: easing out would leave it creeping off the edge
    }

    const dist = end - from;
    const duration = Math.min(900, Math.max(450, 350 + Math.abs(dist) * 0.25));
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo({ top: from + dist * ease(t), left: 0, behavior: 'instant' });
      if (t < 1) {
        glide = requestAnimationFrame(step);
        return;
      }
      glide = 0;
      if (cutAfter !== null) cutTo(cutAfter);
      clearSkipped();
    };
    glide = requestAnimationFrame(step);
  }

  // The user taking over (wheel, touch, keys) stops the glide immediately.
  const interrupts = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  interrupts.forEach((type) => window.addEventListener(type, cancelGlide, { passive: true }));

  // After a load the browser scrolls to the #fragment by itself, and may do
  // it after our own jump. Its idea of where a pinned section starts is wrong
  // (for the hero it is off by the frame's margin, which leaves the next
  // section peeking in), so the right position is held for a moment: until
  // the user scrolls, or a second and a half at most.
  let releaseHold = () => {};
  function holdAt(top: number) {
    releaseHold();
    const fix = () => {
      if (Math.abs(window.scrollY - top) > 1) cutTo(top);
    };
    const timer = window.setTimeout(() => releaseHold(), 1500);
    releaseHold = () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', fix);
      interrupts.forEach((type) => window.removeEventListener(type, releaseHold));
      releaseHold = () => {};
    };
    window.addEventListener('scroll', fix);
    interrupts.forEach((type) => window.addEventListener(type, releaseHold, { passive: true }));
  }

  function jumpToHash(animate: boolean) {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (animate) {
      if (target) scrollToTarget(target, true);
      return;
    }
    const top = target ? targetTop(target) : 0;
    cutTo(top);
    holdAt(top);
  }
  const onPopState = () => jumpToHash(true);

  const linkCleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute('href')!.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    const onClick = (e: Event) => {
      e.preventDefault();
      scrollToTarget(target, true);
      history.pushState(null, '', `#${id}`);
    };
    link.addEventListener('click', onClick);
    linkCleanups.push(() => link.removeEventListener('click', onClick));
  });

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };
  const onLoad = () => {
    refresh();
    jumpToHash(false); // opening or refreshing lands on the section's start, no glide
    hashReady = true;
    syncedIndex = -2;
    apply();
  };

  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';

  // Crossing the breakpoint (rotation, resizing) switches the whole model.
  const onModeChange = () => refresh();
  flowQuery.addEventListener('change', onModeChange);

  // Sections change height on their own too (the Apps accordion opening a
  // different row, fonts and images arriving), which moves everything below.
  const sizeObserver = new ResizeObserver(() => refresh());
  sections.forEach((section) => sizeObserver.observe(section));

  refresh();
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('popstate', onPopState);
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad);
  void document.fonts?.ready.then(refresh);

  return () => {
    flowQuery.removeEventListener('change', onModeChange);
    sizeObserver.disconnect();
    window.removeEventListener('resize', refresh);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('load', onLoad);
    interrupts.forEach((type) => window.removeEventListener(type, cancelGlide));
    cancelGlide();
    releaseHold();
    history.scrollRestoration = previousRestoration;
    linkCleanups.forEach((fn) => fn());
  };
}
