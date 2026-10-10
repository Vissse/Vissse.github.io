import { reveal } from '@/lib/reveal';

// A minimal line drawing of an envelope for the empty right side of Contact:
// the flap closes on a sage square (the hero's square dot). Decorative only.
export function ContactOrnament() {
  return (
    <div className="contact-ornament" aria-hidden="true">
      {/* The drawing spans y 40-230 (centre 135), so the view starts at 10: the
            envelope's centre is the SVG's centre, which the halo is centred on. */}
      <svg viewBox="0 10 360 250" {...reveal(250)}>
        <rect className="co-body" x={20} y={40} width={320} height={190} rx={10} />
        <path className="co-fold" d="M20 222 L150 120 M340 222 L210 120" />
        <path className="co-flap" d="M20 52 L180 160 L340 52" />
        <rect className="co-seal" x={172} y={152} width={16} height={16} />
      </svg>
    </div>
  );
}
