/* ============================================================
   RISE CALISTHENICS – Animierte Übungs-Demos (SVG)
   Eine Figur je Bewegungsmuster, Animation per CSS (styles.css)
   stroke = currentColor -> nimmt Akzentfarbe an
   ============================================================ */

const FIG_STROKE = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';

/* PUSH – Liegestütz (Seitenansicht, Körper senkt sich) */
const SVG_PUSH = `
<svg viewBox="0 0 160 100" class="exsvg anim-push" aria-hidden="true">
  <line x1="10" y1="88" x2="150" y2="88" stroke="currentColor" stroke-width="2" opacity=".35"/>
  <g class="fig">
    <circle cx="38" cy="46" r="9" ${FIG_STROKE}/>
    <line x1="46" y1="50" x2="118" y2="62" ${FIG_STROKE}/>
    <line x1="118" y1="62" x2="146" y2="86" ${FIG_STROKE}/>
    <line x1="58" y1="52" x2="54" y2="86" ${FIG_STROKE} class="arm"/>
  </g>
</svg>`;

/* PULL – Klimmzug (Figur zieht sich an Stange hoch) */
const SVG_PULL = `
<svg viewBox="0 0 120 130" class="exsvg anim-pull" aria-hidden="true">
  <line x1="15" y1="16" x2="105" y2="16" stroke="currentColor" stroke-width="3" opacity=".5"/>
  <g class="fig">
    <line x1="52" y1="18" x2="58" y2="46" ${FIG_STROKE} class="arm"/>
    <line x1="68" y1="18" x2="62" y2="46" ${FIG_STROKE} class="arm"/>
    <circle cx="60" cy="56" r="9" ${FIG_STROKE}/>
    <line x1="60" y1="65" x2="60" y2="98" ${FIG_STROKE}/>
    <line x1="60" y1="98" x2="50" y2="120" ${FIG_STROKE}/>
    <line x1="60" y1="98" x2="70" y2="120" ${FIG_STROKE}/>
  </g>
</svg>`;

/* LEGS – Kniebeuge (Figur geht in die Hocke) */
const SVG_LEGS = `
<svg viewBox="0 0 120 130" class="exsvg anim-legs" aria-hidden="true">
  <line x1="10" y1="120" x2="110" y2="120" stroke="currentColor" stroke-width="2" opacity=".35"/>
  <g class="fig">
    <circle cx="60" cy="30" r="9" ${FIG_STROKE}/>
    <line x1="60" y1="39" x2="60" y2="74" ${FIG_STROKE} class="torso"/>
    <line x1="60" y1="50" x2="40" y2="58" ${FIG_STROKE}/>
    <line x1="60" y1="50" x2="80" y2="58" ${FIG_STROKE}/>
    <line x1="60" y1="74" x2="44" y2="98" ${FIG_STROKE} class="thigh-l"/>
    <line x1="44" y1="98" x2="48" y2="120" ${FIG_STROKE} class="shin-l"/>
    <line x1="60" y1="74" x2="76" y2="98" ${FIG_STROKE} class="thigh-r"/>
    <line x1="76" y1="98" x2="72" y2="120" ${FIG_STROKE} class="shin-r"/>
  </g>
</svg>`;

/* CORE – Beinheben/Plank (Beine heben sich) */
const SVG_CORE = `
<svg viewBox="0 0 160 100" class="exsvg anim-core" aria-hidden="true">
  <line x1="10" y1="86" x2="150" y2="86" stroke="currentColor" stroke-width="2" opacity=".35"/>
  <g class="fig">
    <circle cx="34" cy="70" r="9" ${FIG_STROKE}/>
    <line x1="42" y1="72" x2="96" y2="80" ${FIG_STROKE}/>
    <line x1="48" y1="72" x2="42" y2="84" ${FIG_STROKE}/>
    <g class="legs-grp">
      <line x1="96" y1="80" x2="132" y2="78" ${FIG_STROKE}/>
      <line x1="132" y1="78" x2="148" y2="74" ${FIG_STROKE}/>
    </g>
  </g>
</svg>`;

const EX_ANIM = { push: SVG_PUSH, pull: SVG_PULL, legs: SVG_LEGS, core: SVG_CORE };

function exerciseAnim(pattern) {
  return EX_ANIM[pattern] || SVG_PUSH;
}

/* ---- Monochrome Line-Icons (kein Emoji) ---- */
const ICONS = {
  water:    'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  pushups:  'M3 16h18M6 16l3-4h6l3 4M9 12l1.5-3h3L15 12',
  legs:     'M9 3v7l-2 11M15 3v7l2 11M9 10h6',
  run:      'M13 4a2 2 0 1 0 0-.01M9 21l2-6 3-2 1 4 3 2M6 12l3-3 3 1 2-2',
  steps:    'M7 4v9a2 2 0 0 1-4 0M7 6h2M17 8v9a2 2 0 0 0 4 0M17 10h2',
  gym:      'M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11',
  read:     'M12 6c-2-1.5-5-1.5-7 0v12c2-1.5 5-1.5 7 0M12 6c2-1.5 5-1.5 7 0v12c-2-1.5-5-1.5-7 0M12 6v12',
  learn:    'M12 4 2 9l10 5 10-5-10-5ZM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5',
  meditate: 'M12 6a2 2 0 1 0 0-.01M5 20c1-4 4-6 7-6s6 2 7 6M9 14l-4-2M15 14l4-2',
  journal:  'M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3',
  heart:    'M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z',
  cold:     'M12 3v18M5 7l14 10M19 7 5 17M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5',
  sun:      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19',
  phone:    'M8 3h8v18H8zM11 18h2M4 4l16 16',
  moon:     'M20 14a8 8 0 1 1-9-11 6.5 6.5 0 0 0 9 11Z',
  no:       'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M6 6l12 12',
  leaf:     'M5 19c0-8 6-14 14-14 0 8-6 14-14 14ZM5 19l7-7',
  flame:    'M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c1.5-1 1-3 1-3 2 1.5 3 3.5 3 6a5 5 0 1 1-10 0c0-3 3-4 2-9 .5.5 2 1 3-3Z',
  trophy:   'M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 18h6M10 14v4M14 14v4M8 21h8',
  dot:      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
};
function icon(name, cls) {
  const d = ICONS[name] || ICONS.dot;
  return `<svg class="ic ${cls||''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
}

/* Echte Foto-Demo: blendet zwischen Start- und End-Position -> wirkt wie ein GIF.
   Fällt bei Ladefehler auf die SVG-Animation zurück. */
function exerciseDemo(key, level) {
  const a = exPhotoURL(key, level, 0);
  const b = exPhotoURL(key, level, 1);
  const svg = exerciseAnim((PROGRESSIONS[key] || {}).pattern);
  if (!a) return `<div class="demo noimg"><div class="demo-fallback">${svg}</div></div>`;
  return `<div class="demo">
    <img class="demo-img f0" src="${a}" alt="" loading="lazy"
         onerror="this.closest('.demo').classList.add('noimg')"/>
    <img class="demo-img f1" src="${b}" alt="" loading="lazy"/>
    <div class="demo-grad"></div>
    <div class="demo-fallback">${svg}</div>
  </div>`;
}
