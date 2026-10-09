document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const heroFrame = document.querySelector('.hero-frame');
    const scrollNav = document.getElementById('scrollNav');
    const posterLayer = document.querySelector('.poster-layer');
    const contourLayers = document.querySelectorAll('.contour-layer');
    // The stack of light sections, in page order. Section i is covered by
    // section i + 1; the hero is covered by section 0.
    const sections = [...document.querySelectorAll('.light-section')];

    // ── Stack geometry ───────────────────────────────────────────────────
    // A plain `position: sticky` section goes from moving at full scroll
    // speed to dead still the instant it reaches the top, which reads as the
    // scroll "locking". Instead each section decelerates smoothly into its
    // pinned position: over the last `landing` px of approach (and the same
    // distance past its natural position) its speed eases from 1× down to 0.
    //
    // y         = the section's natural top, relative to the viewport
    // visTop(y) = where it is actually drawn:  y for y >= L, 0 for y <= -L,
    //             and 2L(t³ − t⁴/2) between, with t = (y + L) / 2L
    //             (that is the integral of a smoothstep speed curve).
    // Native sticky keeps it at 0 once y < 0, so the extra translateY needed
    // is visTop(y) − max(y, 0).
    const LANDING_RATIO = 0.45; // of the viewport height
    const SETTLE = 0.7;         // share of the landing that counts as "landed" (≈ flush with the top)

    function landing() {
        return window.innerHeight * LANDING_RATIO;
    }

    function visTop(y, L) {
        if (y >= L) return y;
        if (y <= -L) return 0;
        const t = (y + L) / (2 * L);
        return 2 * L * (t * t * t - (t * t * t * t) / 2);
    }

    // Natural document offsets, from heights (heights, unlike top offsets,
    // aren't distorted by sticky pinning). Re-measured on resize / load.
    let docTops = [];
    let heroOuterHeight = 0;
    let dotGrid = 28;

    function measureSections() {
        if (!heroFrame) return;
        // CSS sizes the sections from these, so publish them before measuring.
        root.style.setProperty('--landing', `${landing()}px`);
        root.style.setProperty('--landing-settled', `${landing() * SETTLE}px`);
        dotGrid = parseFloat(getComputedStyle(root).getPropertyValue('--dot-grid')) || 28;

        const cs = getComputedStyle(heroFrame);
        heroOuterHeight = heroFrame.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
        let acc = heroOuterHeight;
        docTops = sections.map(section => {
            const top = acc;
            acc += section.offsetHeight;
            return top;
        });
    }

    // ── Writing styles only when they changed ────────────────────────────
    const lastValue = new WeakMap();
    function write(el, key, value, apply) {
        let seen = lastValue.get(el);
        if (!seen) lastValue.set(el, seen = {});
        if (seen[key] === value) return;
        seen[key] = value;
        apply(el, value);
    }
    const setVar = (el, name, value) => write(el, name, value, (e, v) => e.style.setProperty(name, v));
    const setLift = (el, px) => write(el, 'lift', Math.abs(px) < 0.05 ? '' : `translate3d(0, ${px.toFixed(2)}px, 0)`, (e, v) => { e.style.transform = v; });
    const setDots = (el, px) => write(el, 'dots', `0 ${px.toFixed(2)}px`, (e, v) => { e.style.backgroundPosition = v; });

    // 0 while the covering section is still below the fold, 1 once it has
    // fully arrived: linear over its whole slide-up, so the covered content
    // starts moving the moment the next section first shows and moves
    // exactly as far as that section has risen.
    function coverFromTop(top) {
        return Math.min(1, Math.max(0, 1 - top / window.innerHeight));
    }

    // ── One scroll model for the whole page ──────────────────────────────
    // Everything below is computed from scrollY and the cached section
    // offsets — no layout reads at all while scrolling.
    let heroCovered = false;

    function applyProgress() {
        const scrollY = window.scrollY;
        const vh = window.innerHeight;
        const L = landing();

        // Where each section is actually drawn (see visTop above), and the
        // extra lift that puts it there.
        const drawnTops = docTops.map(top => visTop(top - scrollY, L));

        sections.forEach((section, i) => {
            setLift(section, drawnTops[i] - Math.max(docTops[i] - scrollY, 0));
            // The dotted paper is anchored to the viewport, not to the section:
            // all sections show the same fixed grid, so it lines up at every seam.
            setDots(section, -(drawnTops[i] % dotGrid));

            const covering = drawnTops[i + 1];
            const cover = (covering === undefined ? 0 : coverFromTop(covering)).toFixed(4);
            setVar(section, '--cover', cover);
            // The carousel lives in its own layer outside the first section so
            // it can ride over the next ones; it rises with that section.
            if (i === 0 && posterLayer) setVar(posterLayer, '--cover', cover);
        });

        // The hero's cover also drives the page background (see body in CSS).
        const heroCover = drawnTops.length ? coverFromTop(drawnTops[0]) : 0;
        setVar(root, '--cover', heroCover.toFixed(4));

        if (scrollNav) {
            scrollNav.classList.toggle('visible', scrollY > 80);
        }

        // Once the first section fully covers the hero, stop painting it (it
        // has blurred glow, blend-mode contours and grain, which are costly
        // to keep compositing underneath while scrolling).
        if (heroFrame) {
            const covered = heroCover >= 1;
            if (covered !== heroCovered) {
                heroCovered = covered;
                heroFrame.classList.toggle('is-covered', covered);
            }
        }
    }

    function refresh() {
        measureSections();
        applyProgress();
    }

    // ── Anchor links ─────────────────────────────────────────────────────
    // The browser's native hash-jump miscalculates the target position once
    // a section in between is currently "stuck" (its measured offset reflects
    // where it's pinned right now, not its true position in the document),
    // which breaks jumping back UP the page. So jump to the cached natural
    // offset, plus enough to have finished the soft landing.
    function scrollTargetFor(target) {
        const i = sections.indexOf(target);
        return i < 0 ? 0 : docTops[i] + landing() * SETTLE;
    }

    // Explicit `behavior: 'instant'` — html has scroll-behavior: smooth
    // globally, which this call would otherwise inherit, and that native
    // smooth scroll was unreliable jumping back UP over these stacked sticky
    // sections (it would sometimes just never move), so correctness wins
    // over the animation here.
    function jumpTo(target) {
        window.scrollTo({ top: scrollTargetFor(target), left: 0, behavior: 'instant' });
    }

    function jumpToHash() {
        const target = location.hash && document.getElementById(location.hash.slice(1));
        if (target) jumpTo(target);
    }

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            jumpTo(target);
            history.pushState(null, '', `#${id}`);
        });
    });
    window.addEventListener('popstate', jumpToHash);

    // ── Wiring ───────────────────────────────────────────────────────────
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('load', () => {
        refresh();
        jumpToHash(); // opening the page on a #hash lands where the menu would
    });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(refresh);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            applyProgress();
            ticking = false;
        });
    });

    // Contours: each layer draws in on load at its own random moment; after
    // that CSS keeps it tied to the hero's --cover (shrinking as it is covered).
    contourLayers.forEach(el => {
        setTimeout(() => el.classList.add('is-drawn'), 200 + Math.random() * 1600);
    });

    // 2b. Binary field: 0s and 1s along the seam between Webs and Apps. It is
    //     deliberately irregular — cells are left out in clustered patches,
    //     each glyph has its own size, brightness and small offset, and while
    //     it runs cells flip 0 <-> 1 and also blink in and out of existence,
    //     so it never settles into a regular grid. Each cell is drawn once and
    //     only the few that change are redrawn, so it costs almost nothing.
    //     The moving band of visibility is CSS (see .binary-field).
    const binaryReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const binaryFields = [...document.querySelectorAll('.binary-field')].map(canvas => {
        const field = { canvas, ctx: canvas.getContext('2d'), cols: 0, rows: 0, bits: [], cw: 24, ch: 28, dpr: 1 };
        return field;
    });

    // Cell states: -1 = empty, 0 / 1 = that digit.
    function drawBinaryCell(field, col, row) {
        const { ctx, cw, ch, dpr } = field;
        const index = row * field.cols + col;
        const x = col * cw * dpr;
        const y = row * ch * dpr;
        // Clear a bit more than the cell, since glyphs are jittered / vary in size.
        ctx.clearRect(x - 4 * dpr, y - 4 * dpr, (cw + 8) * dpr, (ch + 8) * dpr);
        const bit = field.bits[index];
        if (bit < 0) return;
        ctx.font = `${Math.round(field.size[index] * dpr)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(109, 122, 84, ${field.strength[index]})`;
        ctx.fillText(String(bit), x + (cw * dpr) / 2 + field.jx[index] * dpr, y + (ch * dpr) / 2 + field.jy[index] * dpr);
    }

    function layoutBinaryField(field) {
        // Layout size (offsetWidth/Height) — getBoundingClientRect would give the
        // bounding box of the *rotated* strip instead.
        const rect = { width: field.canvas.offsetWidth, height: field.canvas.offsetHeight };
        if (!rect.width || !rect.height) return;
        field.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        field.canvas.width = Math.round(rect.width * field.dpr);
        field.canvas.height = Math.round(rect.height * field.dpr);
        field.cols = Math.ceil(rect.width / field.cw);
        field.rows = Math.ceil(rect.height / field.ch);
        const n = field.cols * field.rows;
        // Smooth, random-phase "density" so whole patches are thin or dense,
        // plus a per-cell coin toss on top.
        const p1 = Math.random() * 6.28, p2 = Math.random() * 6.28, p3 = Math.random() * 6.28;
        field.bits = new Array(n);
        field.strength = new Array(n);
        field.size = new Array(n);
        field.jx = new Array(n);
        field.jy = new Array(n);
        for (let r = 0; r < field.rows; r++) {
            for (let c = 0; c < field.cols; c++) {
                const i = r * field.cols + c;
                const density = 0.5
                    + 0.22 * Math.sin(c * 0.33 + r * 0.19 + p1)
                    + 0.16 * Math.sin(c * 0.11 - r * 0.41 + p2)
                    + 0.10 * Math.sin(c * 0.71 + r * 0.53 + p3);
                field.bits[i] = Math.random() < density ? (Math.random() < 0.5 ? 0 : 1) : -1;
                field.strength[i] = 0.2 + Math.random() * 0.55;
                field.size[i] = 11 + Math.random() * 9;
                field.jx[i] = (Math.random() - 0.5) * 9;
                field.jy[i] = (Math.random() - 0.5) * 9;
            }
        }
        const ctx = field.ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let r = 0; r < field.rows; r++) {
            for (let c = 0; c < field.cols; c++) drawBinaryCell(field, c, r);
        }
    }

    binaryFields.forEach(field => {
        layoutBinaryField(field);
        if ('ResizeObserver' in window) {
            new ResizeObserver(() => layoutBinaryField(field)).observe(field.canvas);
        }
    });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => binaryFields.forEach(layoutBinaryField));
    }

    if (!binaryReduced) {
        setInterval(() => {
            if (document.hidden) return;
            binaryFields.forEach(field => {
                const cells = field.cols * field.rows;
                if (!cells) return;
                // Touch ~1.4% of the cells each tick, chosen at random: most
                // flip their digit, some blink out and others blink back in.
                const flips = Math.max(4, Math.round(cells * 0.014));
                for (let n = 0; n < flips; n++) {
                    const index = Math.floor(Math.random() * cells);
                    const roll = Math.random();
                    const bit = field.bits[index];
                    if (bit < 0) {
                        if (roll < 0.35) field.bits[index] = Math.random() < 0.5 ? 0 : 1;
                    } else if (roll < 0.22) {
                        field.bits[index] = -1;
                    } else {
                        field.bits[index] = bit ^ 1;
                    }
                    drawBinaryCell(field, index % field.cols, Math.floor(index / field.cols));
                }
            });
        }, 90);
    }

    // 3. Poster stack: cards always face forward (no tilt/rotateY) — they
    //    only shift sideways, scale and fade, which reads as an orbit
    //    around a center without ever turning away from the viewer.
    document.querySelectorAll('.poster-stack').forEach(initPosterStack);

    function initPosterStack(posterStack) {
        const ring = posterStack.querySelector('.poster-ring');
        const cards = [...ring.querySelectorAll('.poster-card')];
        const total = cards.length;
        const gap = 360 / total; // angular spacing between neighbouring cards
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // The whole band runs top-right → bottom-left, tilted 25° from
        // horizontal. Cards stay upright; only their positions are projected
        // along this axis.
        const bandRad = (180 - 25) * Math.PI / 180;
        const bandCos = Math.cos(bandRad);
        const bandSin = Math.sin(bandRad);

        // Queue: the ring is already turning at its normal, constant speed
        // the moment the section scrolls into view, but cards are only
        // *fed into it* one at a time at the top-right entry point (angle
        // entryAngle), each emerging at that spot and then travelling at the
        // same speed as everything else — so the ring fills up behind the
        // first card like a queue, with no stop-and-go.
        const entryAngle = -100;   // where on the orbit a card gets fed in
        const emergeSpan = 22;     // degrees of travel over which it grows in
        let running = false; // reduced motion: never runs, all cards just sit there
        let reached = reducedMotion ? 360 * 2 : 0; // furthest rotation seen

        let rotation = 0;
        let dragging = false;
        let dragMoved = false;
        let startX = 0;
        let startY = 0;
        let startRotation = 0;
        let lastTime = null;
        // One full lap through all cards. Also sets how quickly the queue
        // fills: one card is fed in every (360 / total) / degPerSecond s.
        const degPerSecond = reducedMotion ? 0 : 360 / 20;
        // Entry burst: the ring starts out at burstPeak deg/s and eases
        // down (smoothstep) to the cruise speed over burstDuration seconds,
        // so the first cards fly in fast for about a second and then settle
        // into the gentle steady rotation. The peak is sized so that roughly
        // four cards are already in by the time it has settled.
        const burstPeak = 300; // deg/s
        const burstDuration = 1.2; // seconds
        let runStart = null;

        // Read once (and again on resize) instead of every frame —
        // getComputedStyle in the render loop forces a style recalculation.
        function readSpread() {
            const value = getComputedStyle(cards[0]).getPropertyValue('--spread-radius');
            return parseFloat(value) || 190;
        }
        let spread = readSpread();
        let dirty = true; // something changed that needs one more render
        window.addEventListener('resize', () => {
            spread = readSpread();
            dirty = true;
        });

        function render() {
            dirty = false;
            reached = Math.max(reached, rotation);
            cards.forEach((el, i) => {
                // Degrees travelled since this card was fed in. Card i is fed
                // in one spacing (`gap`) after card i-1.
                const angleDeg = entryAngle + rotation - i * gap;
                const rad = angleDeg * Math.PI / 180;
                const along = Math.sin(rad) * spread;
                const c = Math.cos(rad); // 1 = front-center, -1 = directly behind
                // Emerges at the entry point instead of popping in. Based on
                // the furthest rotation reached, so dragging back never
                // un-feeds a card.
                const g = Math.min(1, Math.max(0, (reached - i * gap) / emergeSpan));
                const emerge = g * g * (3 - 2 * g);

                const visibleScale = (0.55 + 0.45 * c) * emerge;
                const x = along * bandCos;
                const y = along * bandSin;
                el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${Math.max(visibleScale, 0).toFixed(3)})`;
                el.style.opacity = '1';
                el.style.pointerEvents = c > 0.3 && g >= 1 ? 'auto' : 'none';
                el.style.zIndex = String(Math.round((c + 1) * 500));
            });
        }

        function tick(time) {
            if (lastTime === null) lastTime = time;
            const dt = (time - lastTime) / 1000;
            lastTime = time;
            if (running && !dragging) {
                const elapsed = runStart === null ? Infinity : Math.max(0, (time - runStart) / 1000);
                const u = Math.min(1, elapsed / burstDuration);
                const settle = u * u * (3 - 2 * u); // 0 = burst, 1 = cruise
                const speed = burstPeak + (degPerSecond - burstPeak) * settle;
                rotation += speed * dt;
            }
            // Idle (carousel off-screen / reduced motion): nothing to draw.
            if (running || dragging || dirty) render();
            requestAnimationFrame(tick);
        }
        render();
        requestAnimationFrame(tick);

        if (!reducedMotion) {
            new IntersectionObserver((entries) => {
                const visible = entries[entries.length - 1].intersectionRatio >= 0.3;
                if (visible && !running) {
                    running = true;
                    runStart = performance.now();
                } else if (!visible && running) {
                    running = false;
                    runStart = null;
                    rotation = 0;
                    reached = 0;
                    dirty = true; // one last render to put the cards back
                }
            }, { threshold: [0, 0.3, 0.6, 1] }).observe(posterStack);
        }

        posterStack.addEventListener('dragstart', (e) => e.preventDefault());

        posterStack.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            dragging = true;
            dragMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            startRotation = rotation;
            posterStack.classList.add('dragging');
            posterStack.setPointerCapture(e.pointerId);
        });

        posterStack.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            // Project the drag onto the diagonal axis of the band.
            const along = (e.clientX - startX) * bandCos + (e.clientY - startY) * bandSin;
            if (Math.abs(along) > 3) dragMoved = true;
            rotation = startRotation + along * 0.35;
            render();
        });

        function endDrag() {
            dragging = false;
            posterStack.classList.remove('dragging');
        }
        posterStack.addEventListener('pointerup', endDrag);
        posterStack.addEventListener('pointercancel', endDrag);

        // Prevent an accidental navigation click right after a drag.
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (dragMoved) e.preventDefault();
            });
        });
    }

});
