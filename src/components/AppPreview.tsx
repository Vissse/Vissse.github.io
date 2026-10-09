import { useState, type CSSProperties } from 'react';
import type { AppPreviewKind } from '@/data/projects';

// Stylised illustrations of what each tool does. Illustrative only: the
// numbers and sample lines are decoration, not real output.
//
// Every preview plays a short entrance each time it is mounted (see the
// "PREVIEW ENTRANCES" block in main.css). Items carry their order in --i so
// the CSS can stagger them.
const order = (i: number, extra?: Record<string, number>) => ({ '--i': i, ...extra }) as CSSProperties;

const WAVE = [8, 14, 22, 30, 18, 10, 26, 38, 44, 30, 16, 9, 20, 34, 40, 28, 14, 8, 12, 24, 36, 42, 26, 12, 8, 16, 28, 34, 20, 10];
// The sound being searched for. The two real occurrences are this exact
// shape: the tool finds the same word twice, not two unrelated peaks.
const MATCH = [30, 12, 10, 26, 34, 22, 40];
// A stretch that only resembles it. The tool marks it too, and it is then
// shown to be a false detection.
const LOOKALIKE = [26, 16, 22, 14, 36, 12, 30];
interface Unit {
  from: number; // first bar
  shape: number[];
  isFalse?: boolean;
}
const UNITS: Unit[] = [
  { from: 9, shape: MATCH },
  { from: 33, shape: MATCH },
  { from: 46, shape: LOOKALIKE, isFalse: true },
];
const unitOf = (i: number) => UNITS.findIndex(({ from, shape }) => i >= from && i < from + shape.length);
const BARS = Array.from({ length: 56 }, (_, i) => {
  const unit = UNITS[unitOf(i)];
  return unit ? unit.shape[i - unit.from]! : WAVE[i % WAVE.length]! * (0.7 + 0.3 * Math.sin(i * 1.7));
});
const FRAME_W = 38;

function Audio() {
  return (
    <>
      <svg className="preview-wave" viewBox="0 0 280 124" role="img" aria-label="Waveform with two detected lexical units and one false detection">
        {BARS.map((v, i) => {
          const u = unitOf(i);
          return (
            <rect
              key={i}
              x={i * 5}
              y={62 - v}
              width={3}
              height={v * 2}
              rx={1}
              className={u >= 0 ? `is-unit${UNITS[u]!.isFalse ? ' is-false' : ''}` : undefined}
              style={order(i, u >= 0 ? { '--u': u } : undefined)}
            />
          );
        })}
        {UNITS.map(({ from, isFalse }, u) => {
          const x = from * 5 - 2;
          return (
            <g key={from} className={`preview-unit${isFalse ? ' is-false' : ''}`} style={{ '--u': u } as CSSProperties}>
              {/* The frame is uncovered along its outline by this mask's stroke. */}
              <mask id={`unit-trace-${u}`} maskUnits="userSpaceOnUse" x={x - 4} y={4} width={FRAME_W + 8} height={116}>
                <rect className="preview-unit-trace" x={x} y={8} width={FRAME_W} height={108} pathLength={1} />
              </mask>
              <rect className="preview-unit-frame" x={x} y={8} width={FRAME_W} height={108} mask={`url(#unit-trace-${u})`} />
              <text x={x} y={5}>{`unit 0${u + 1}`}</text>
              {/* Struck through with a drawn line: SVG text can't animate its own. */}
              {isFalse && <line className="preview-unit-strike" x1={x - 1} y1={2} x2={x + FRAME_W + 1} y2={2} />}
            </g>
          );
        })}
      </svg>
      <p className="preview-caption mono">3 detected · 1 false match</p>
    </>
  );
}

// The model reads each sentence word by word and then labels it. Words that
// sway it are marked as it passes them: `-` pulls towards a negative label,
// `+` towards a positive one. In the first sentence "never" looks negative
// until the ending turns it around; in the second it latches onto "great",
// misses the irony and never corrects itself (`expected` is the annotation,
// not a second guess). readFrom / labelAt are ms into the sequence.
type Cue = '+' | '-';
interface Verdict {
  words: Array<[string, Cue?]>;
  label: string;
  readFrom: number;
  labelAt: number;
  expected?: string;
}
const WORD_MS = 120; // reading pace; main.css uses the same step
const VERDICTS: Verdict[] = [
  {
    words: [['I'], ['never', '-'], ['thought'], ['we'], ['would'], ['make it.', '+']],
    label: 'joy',
    readFrom: 300,
    labelAt: 1400,
  },
  // Read second, answered last: the longest think, and still the literal reading.
  { words: [['Oh'], ['great,', '+'], ['another'], ['Monday.']], label: 'joy', readFrom: 1550, labelAt: 3700, expected: 'irony' },
  { words: [['It'], ['was'], ['quiet', '-'], ['after'], ['they'], ['left.', '-']], label: 'sadness', readFrom: 2150, labelAt: 3150 },
];
const MISS_AFTER = 600; // the beat between the wrong label landing and being called out
const EXPECTED_AFTER = 1250;

// Sentiment per sentence: deliberately jumpy, like the real curve. A fixed
// pseudo-random sequence, so it renders the same every time.
const W = 280;
const H = 56;
const POINTS = Array.from({ length: 46 }, (_, i) => {
  const r = Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1;
  return `${((i / 45) * W).toFixed(1)},${(H / 2 - (r - 0.5) * (H - 8)).toFixed(1)}`;
}).join(' ');
const GRID = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (i / 10) * W);

function Sentiment() {
  return (
    <>
      {VERDICTS.map(({ words, label, readFrom, labelAt, expected }, i) => (
        <div
          key={label + i}
          className={`preview-line preview-verdict${expected ? ' is-miss' : ''}`}
          style={order(i, {
            '--rf': readFrom,
            '--ts': readFrom + words.length * WORD_MS,
            '--la': labelAt,
            '--wa': labelAt + MISS_AFTER,
            '--ea': labelAt + EXPECTED_AFTER,
          })}
        >
          <span className="preview-words">
            {words.map(([word, cue], w) => (
              <span key={w} className={`preview-word${cue ? (cue === '+' ? ' is-pos' : ' is-neg') : ''}`} style={{ '--w': w } as CSSProperties}>
                {word}
              </span>
            ))}
          </span>
          <span className="preview-think" aria-hidden="true"><i /><i /><i /></span>
          <span className={`preview-chip mono${expected ? ' preview-chip-wrong' : ''}`}>{label}</span>
          {expected && (
            // A slot that takes no room until its moment, so the wrong label
            // first lands at the end of the row like the others.
            <span className="preview-expected">
              <span className="preview-chip preview-chip-expected mono">
                <small>expected</small> {expected}
              </span>
            </span>
          )}
        </div>
      ))}
      <svg className="preview-sentiment" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Jumpy sentiment curve per sentence">
        {/* The curve is uncovered from the left by this clip's growing rect. */}
        <clipPath id="sentiment-reveal">
          <rect className="preview-sentiment-reveal" x={0} y={-4} width={W} height={H + 8} />
        </clipPath>
        {GRID.map((x) => (
          <line key={x} className="grid" x1={x} y1={0} x2={x} y2={H} />
        ))}
        <line className="mean" x1={0} y1={H / 2} x2={W} y2={H / 2} />
        <line className="axis axis-y" x1={0} y1={0} x2={0} y2={H} />
        <line className="axis axis-x" x1={0} y1={H} x2={W} y2={H} />
        <polyline points={POINTS} clipPath="url(#sentiment-reveal)" />
      </svg>
      <p className="preview-caption mono">sentiment per sentence</p>
    </>
  );
}

// A small clickable model of OmniDesk: the sidebar (or an overview tile)
// switches screens, and apps added in the catalog show up in the queue.
// Section names are the app's own (translated); the rows are a few real
// examples from each screen, trimmed to fit.
type DeskView = 'overview' | 'catalog' | 'queue' | 'updates' | 'uninstall' | 'health' | 'specs';
const DESK_VIEWS: Array<[DeskView, string]> = [
  ['overview', 'Overview'],
  ['catalog', 'App catalog'],
  ['queue', 'Install queue'],
  ['updates', 'App updates'],
  ['uninstall', 'Uninstall'],
  ['health', 'PC health'],
  ['specs', 'PC specs'],
];
// Line icons for the overview tiles (24 x 24, drawn with the stroke only).
const DESK_ICONS: Record<Exclude<DeskView, 'overview'>, string[]> = {
  catalog: ['M21 8l-9-5-9 5v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
  queue: ['M12 4v10', 'M8 10l4 4 4-4', 'M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2'],
  updates: ['M20 11a8 8 0 0 0-14.9-3', 'M4 5v3h3', 'M4 13a8 8 0 0 0 14.9 3', 'M20 19v-3h-3'],
  uninstall: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12', 'M9 7V4h6v3'],
  health: ['M3 12h4l2-5 4 10 2-5h6'],
  specs: ['M3 5h18v11H3z', 'M8 20h8', 'M12 16v4'],
};

const CATALOG = ['Brave Browser', 'Google Chrome', 'Mozilla Firefox', 'Vivaldi'];
const UPDATES: Array<[string, string, string]> = [
  ['Affinity', '3.2.3', '3.3.0'],
  ['Audacity', '3.7.7', '4.0.1'],
  ['Bitwarden', '2026.5.0', '2026.9.1'],
];
const INSTALLED: Array<[string, string]> = [
  ['AnyDesk', 'AnyDesk.AnyDesk'],
  ['Audacity', 'Audacity.Audacity'],
  ['Bitwarden', 'Bitwarden.Bitwarden'],
];
const HEALTH: Array<[string, string]> = [
  ['SFC Scan', 'Repairs damaged system files'],
  ['CHKDSK Scan', 'Checks the disk for errors'],
  ['Clear Temp & Cache', 'Removes temporary files'],
];
const SPECS: Array<[string, string]> = [
  ['Processor', 'AMD Ryzen 7 5700X3D'],
  ['Graphics card', 'NVIDIA GeForce RTX 4060'],
  ['Memory', '64 GB'],
  ['System', 'Windows 11 Pro'],
];

function Desk() {
  const [view, setView] = useState<DeskView>('overview');
  const [queue, setQueue] = useState<string[]>([]);
  const toggle = (app: string) => setQueue((q) => (q.includes(app) ? q.filter((a) => a !== app) : [...q, app]));
  const title = DESK_VIEWS.find(([id]) => id === view)![1];

  return (
    <div className="preview-desk">
      <ul className="preview-desk-nav">
        {DESK_VIEWS.map(([id, label], i) => (
          <li key={id} style={order(i)}>
            <button type="button" className={id === view ? 'is-active' : undefined} aria-pressed={id === view} onClick={() => setView(id)}>
              {label}
              {id === 'queue' && queue.length > 0 && <span className="desk-count mono">{queue.length}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="preview-desk-pane" key={view}>
        {view === 'overview' ? (
          <div className="preview-desk-tiles">
            {DESK_VIEWS.slice(1).map(([id, label], i) => (
              <button key={id} type="button" className="preview-desk-tile" style={order(i)} onClick={() => setView(id)}>
                <span className="desk-tile-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {DESK_ICONS[id as Exclude<DeskView, 'overview'>].map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                  <span className="desk-tile-no mono">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <span className="desk-tile-label">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="desk-head">
              <span className="desk-title">{title}</span>
              {view === 'catalog' && <span className="desk-meta mono">Browsers</span>}
              {view === 'queue' && queue.length > 0 && <span className="desk-meta mono">Install all</span>}
              {view === 'updates' && <span className="desk-meta mono">Update all</span>}
            </div>

            {view === 'catalog' &&
              CATALOG.map((app, i) => {
                const added = queue.includes(app);
                return (
                  <div key={app} className="desk-row" style={order(i)}>
                    <span>{app}</span>
                    <button
                      type="button"
                      className={`desk-add${added ? ' is-added' : ''}`}
                      aria-pressed={added}
                      aria-label={`${added ? 'Remove' : 'Add'} ${app} ${added ? 'from' : 'to'} the install queue`}
                      onClick={() => toggle(app)}
                    >
                      {added ? '\u2713' : '+'}
                    </button>
                  </div>
                );
              })}

            {view === 'queue' &&
              (queue.length === 0 ? (
                <p className="desk-empty">
                  The queue is empty.{' '}
                  <button type="button" className="desk-link" onClick={() => setView('catalog')}>Add apps from the catalog</button>
                </p>
              ) : (
                queue.map((app, i) => (
                  <div key={app} className="desk-row" style={order(i)}>
                    <span>{app}</span>
                    <button type="button" className="desk-add is-added" aria-label={`Remove ${app} from the install queue`} onClick={() => toggle(app)}>
                      {'\u00d7'}
                    </button>
                  </div>
                ))
              ))}

            {view === 'updates' &&
              UPDATES.map(([name, from, to], i) => (
                <div key={name} className="desk-row" style={order(i)}>
                  <span>{name}</span>
                  <span className="desk-version mono">
                    {from} <b>{'\u2192'} {to}</b>
                  </span>
                </div>
              ))}

            {view === 'uninstall' &&
              INSTALLED.map(([name, id], i) => (
                <div key={name} className="desk-row" style={order(i)}>
                  <span>{name}</span>
                  <span className="desk-version mono">{id}</span>
                </div>
              ))}

            {view === 'health' &&
              HEALTH.map(([name, what], i) => (
                <div key={name} className="desk-row" style={order(i)}>
                  <span>
                    {name}
                    <small>{what}</small>
                  </span>
                  <span className="desk-run" aria-hidden="true" />
                </div>
              ))}

            {view === 'specs' && (
              <div className="desk-specs">
                {SPECS.map(([label, value], i) => (
                  <div key={label} className="desk-spec" style={order(i)}>
                    <span className="mono">{label}</span>
                    {value}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// The scan, as the script runs it: every host goes through the same chain of
// checks, all hosts in parallel. A check that fails stops the chain for that
// host (no ping: nothing else can be tried; firewall closed or WinRM off: no
// inventory can be collected), and only hosts that pass all of them are
// reported to GLPI. "Scan again" re-runs it with a fresh, random outcome.
const CHECKS = ['Ping', 'Firewall', 'WinRM', 'GLPI'];
const HOSTS = ['192.0.2.11', '192.0.2.12', '192.0.2.13', '192.0.2.14'];
// Where a host's chain breaks: -1 = nowhere (reported), otherwise the index
// of the failing check (0 ping, 1 firewall, 2 WinRM).
type Break = -1 | 0 | 1 | 2;
const FIRST_RUN: Break[] = [-1, -1, 2, 0];
const randomRun = (): Break[] =>
  HOSTS.map(() => {
    const r = Math.random();
    return r < 0.6 ? -1 : r < 0.74 ? 0 : r < 0.87 ? 1 : 2;
  });

type CellState = 'ok' | 'fail' | 'skip';
const MARK: Record<CellState, string> = { ok: '\u2713', fail: '\u00d7', skip: '\u2013' };
const WORD: Record<CellState, string> = { ok: 'passed', fail: 'failed', skip: 'skipped' };

// One host's row: the state of each check and when it starts / resolves (ms).
function chain(host: number, breaksAt: Break) {
  let t = 250 + host * 90;
  return CHECKS.map((_, k) => {
    const state: CellState = breaksAt === -1 || k < breaksAt ? 'ok' : k === breaksAt ? 'fail' : 'skip';
    const from = t;
    // A skipped check takes no time; the others each take their own while.
    t += state === 'skip' ? 70 : 380 + ((host * 37 + k * 53) % 5) * 70;
    return { state, from, at: t };
  });
}

function Glpi() {
  const [run, setRun] = useState(0);
  const [breaks, setBreaks] = useState<Break[]>(FIRST_RUN);
  const rows = HOSTS.map((_, i) => chain(i, breaks[i]!));
  const end = Math.max(...rows.map((cells) => cells[cells.length - 1]!.at));
  const reported = breaks.filter((b) => b === -1).length;

  const again = () => {
    setBreaks(randomRun());
    setRun((n) => n + 1);
  };

  return (
    // Re-mounted on every run, so the whole sequence plays again; a manual
    // run doesn't wait for the card (--pd) the way the first one does.
    <div className="scan" key={run} style={{ '--end': end, ...(run > 0 ? { '--pd': '0ms' } : null) } as CSSProperties}>
      <div className="scan-row scan-head mono" aria-hidden="true">
        <span>Host</span>
        {CHECKS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      {HOSTS.map((host, i) => (
        <div key={host} className="scan-row" style={order(i)}>
          <span className="scan-host mono">{host}</span>
          {rows[i]!.map(({ state, from, at }, k) => (
            <span
              key={k}
              className={`scan-cell is-${state}`}
              style={{ '--from': from, '--at': at } as CSSProperties}
              aria-label={`${CHECKS[k]}: ${WORD[state]}`}
            >
              <i className="scan-wait" aria-hidden="true" />
              <b className="scan-mark" aria-hidden="true">{MARK[state]}</b>
            </span>
          ))}
        </div>
      ))}
      <div className="scan-foot">
        <div className="preview-progress" aria-hidden="true"><span /></div>
        <p className="scan-summary mono">
          {reported} of {HOSTS.length} reported to GLPI
        </p>
        <button type="button" className="scan-again mono" onClick={again}>Scan again</button>
      </div>
    </div>
  );
}

const VIEWS: Record<AppPreviewKind, () => React.JSX.Element> = { audio: Audio, sentiment: Sentiment, desk: Desk, glpi: Glpi };

export function AppPreview({ kind }: { kind: AppPreviewKind }) {
  const View = VIEWS[kind];
  return <View />;
}
