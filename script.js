document.addEventListener('DOMContentLoaded', () => {
    // 1. Reveal Animations on Scroll
    const revealElements = document.querySelectorAll('.reveal-up, .line');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(
        entries,
        observer
    ) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // Immediately reveal nav
    setTimeout(() => {
        const nav = document.querySelector('.reveal-nav');
        if (nav) nav.style.opacity = '1';
    }, 100);

    // 1b. Anchor links into the stacked sticky sections: the browser's
    // native hash-jump miscalculates the target scroll position once a
    // section in between is currently "stuck" (its measured offset reflects
    // where it's pinned right now, not its true position in the document),
    // which breaks jumping back UP the page. Height (unlike top offset)
    // isn't affected by sticky pinning, so sum the heights of every section
    // before the target to get a reliable scroll target in both directions.
    function sectionScrollTarget(target) {
        const sections = [...document.querySelectorAll('main > section')];
        let top = 0;
        for (const section of sections) {
            if (section === target) break;
            top += section.getBoundingClientRect().height;
        }
        return top;
    }

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Explicit `behavior: 'instant'` — html has scroll-behavior:
            // smooth globally, which this call would otherwise inherit, and
            // that native smooth scroll was unreliable jumping back UP over
            // these stacked sticky sections (it would sometimes just never
            // move), so correctness wins over the animation here.
            window.scrollTo({ top: sectionScrollTarget(target), left: 0, behavior: 'instant' });
            history.pushState(null, '', `#${id}`);
        });
    });

    // 2. Contours: draw in on load (randomized, independent per layer),
    //    then stay reactive to scroll position (shrink/fade both ways).
    const heroFrame = document.querySelector('.hero-frame');
    const heroInner = document.querySelector('.hero-inner');
    const scrollNav = document.getElementById('scrollNav');
    const contourLayers = document.querySelectorAll('.contour-layer');
    const nextSection = document.querySelector('.light-section');
    // Every section that gets covered by the one after it, paired with
    // the section that covers it — so each gets the same sticky-fade
    // treatment as the hero does from Web Projects.
    const coveredSectionPairs = ['web-projects', 'app-projects', 'o-mne', 'kontakt']
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .reduce((pairs, el, i, arr) => {
            if (i < arr.length - 1) pairs.push([el, arr[i + 1]]);
            return pairs;
        }, []);

    // Page background colors to interpolate between (dark hero -> cream section)
    const bgDark = [14, 15, 10];
    const bgLight = [247, 242, 235];

    function lerpColor(a, b, t) {
        return a.map((v, i) => Math.round(v + (b[i] - v) * t));
    }

    function coverProgress(el) {
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 while this section is still below the fold,
        // 1 once it has scrolled ~70% of the way up into view.
        return Math.min(1, Math.max(0, 1 - (rect.top - vh * 0.3) / (vh * 0.7)));
    }

    function applyBackgroundTransition() {
        if (!nextSection) return;
        const t = coverProgress(nextSection);
        const [r, g, b] = lerpColor(bgDark, bgLight, t);
        document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    function scrollFactor() {
        if (!heroFrame) return 1;
        const heroHeight = heroFrame.offsetHeight || 1;
        return Math.max(0, 1 - window.scrollY / heroHeight);
    }

    function contentFadeFactor() {
        if (!heroFrame) return 1;
        const heroHeight = heroFrame.offsetHeight || 1;
        // Fades out over the first ~55% of the hero's height, so content
        // is gone before the frame itself finishes scrolling away.
        return Math.max(0, 1 - window.scrollY / (heroHeight * 0.55));
    }

    // Same idea as the hero's content fade, but driven by how far the next
    // section has scrolled up to cover this one (since this section stays
    // pinned via position: sticky rather than scrolling away itself).
    function coveredContentFade(coveringEl) {
        const t = coverProgress(coveringEl);
        return Math.max(0, 1 - t / 0.55);
    }

    function applyProgress() {
        const factor = scrollFactor();
        contourLayers.forEach(el => {
            if (el.dataset.revealed === 'true') {
                el.style.setProperty('--progress', factor.toFixed(3));
            }
        });
        if (heroInner) {
            heroInner.style.setProperty('--fade', contentFadeFactor().toFixed(3));
        }
        coveredSectionPairs.forEach(([section, coveringSection]) => {
            const fade = coveredContentFade(coveringSection).toFixed(3);
            section.querySelectorAll('.light-section-inner, .poster-stack').forEach(el => {
                el.style.setProperty('--fade', fade);
            });
        });
        if (scrollNav) {
            scrollNav.classList.toggle('visible', window.scrollY > 80);
        }
        applyBackgroundTransition();
    }

    applyProgress();

    contourLayers.forEach(el => {
        el.style.setProperty('--progress', 0);
        const delay = 200 + Math.random() * 1600;
        setTimeout(() => {
            el.dataset.revealed = 'true';
            applyProgress();
        }, delay);
    });

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                applyProgress();
                ticking = false;
            });
            ticking = true;
        }
    });

    // 3. Poster stack: cards always face forward (no tilt/rotateY) — they
    //    only shift sideways, scale and fade, which reads as an orbit
    //    around a center without ever turning away from the viewer.
    document.querySelectorAll('.poster-stack').forEach(initPosterStack);

    function initPosterStack(posterStack) {
        const ring = posterStack.querySelector('.poster-ring');
        const cards = [...ring.querySelectorAll('.poster-card')];
        const total = cards.length;
        const baseAngles = cards.map((_, i) => (360 / total) * i);
        // Phase-shift by half a step so the "front" position always sits
        // between two cards — they stay paired up, side by side, instead
        // of one dead-center card with fading neighbours.
        const phaseOffset = 180 / total;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let rotation = 0;
        let dragging = false;
        let dragMoved = false;
        let startX = 0;
        let startRotation = 0;
        let lastTime = null;
        const degPerSecond = reducedMotion ? 0 : 360 / 28; // one full lap through all cards

        function currentSpread() {
            const value = getComputedStyle(cards[0]).getPropertyValue('--spread-radius');
            return parseFloat(value) || 190;
        }

        function render() {
            const spread = currentSpread();
            cards.forEach((el, i) => {
                const angleDeg = rotation + baseAngles[i] + phaseOffset;
                const rad = angleDeg * Math.PI / 180;
                const x = Math.sin(rad) * spread;
                const c = Math.cos(rad); // 1 = front-center, -1 = directly behind
                const scale = 0.55 + 0.45 * c;
                // Always fully opaque — never see-through. A card "disappears"
                // only because it slides low enough in scale/x/z-index to be
                // physically covered by the cards in front of it, so it reads
                // as sliding in and out behind them, not popping in and out.
                el.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) scale(${scale.toFixed(3)})`;
                el.style.opacity = '1';
                el.style.pointerEvents = c > 0.3 ? 'auto' : 'none';
                el.style.zIndex = String(Math.round((c + 1) * 500));
            });
        }

        function tick(time) {
            if (lastTime === null) lastTime = time;
            const dt = (time - lastTime) / 1000;
            lastTime = time;
            if (!dragging) {
                rotation += degPerSecond * dt;
            }
            render();
            requestAnimationFrame(tick);
        }
        render();
        requestAnimationFrame(tick);

        function pointerX(e) {
            return e.touches ? e.touches[0].clientX : e.clientX;
        }

        posterStack.addEventListener('dragstart', (e) => e.preventDefault());

        posterStack.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            dragging = true;
            dragMoved = false;
            startX = pointerX(e);
            startRotation = rotation;
            posterStack.classList.add('dragging');
            posterStack.setPointerCapture(e.pointerId);
        });

        posterStack.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = pointerX(e) - startX;
            if (Math.abs(dx) > 3) dragMoved = true;
            rotation = startRotation + dx * 0.35;
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
