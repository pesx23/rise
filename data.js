/* ============================================================
   RISE CALISTHENICS – Datenbasis
   Progressionen, Programme, Ernährung, Habits, Badges
   ============================================================ */

/* ---------- Progressions-Leitern ----------
   type: "reps" | "hold" (Sek.) | "each" (pro Seite)
   pattern: push | pull | legs | core  (steuert die Animation)   */

const PROGRESSIONS = {
  push: {
    label: "Druck – horizontal (Brust/Trizeps)", icon: "💪", pattern: "push",
    levels: [
      { name: "Wand-Liegestütz", type: "reps", cue: "Hände an der Wand, Körper gerade, langsam absenken.", min: 8, max: 20 },
      { name: "Erhöhter Liegestütz", type: "reps", cue: "Hände auf Tisch/Stuhl. Je tiefer, desto schwerer.", min: 8, max: 18 },
      { name: "Knie-Liegestütz", type: "reps", cue: "Knie am Boden, Hüfte gestreckt, Brust zum Boden.", min: 8, max: 16 },
      { name: "Liegestütz", type: "reps", cue: "Voller Liegestütz, Ellbogen ~45°, Core fest.", min: 6, max: 15 },
      { name: "Enge Liegestütz", type: "reps", cue: "Hände schulterbreit, Ellbogen am Körper.", min: 6, max: 14 },
      { name: "Diamant-Liegestütz", type: "reps", cue: "Hände formen ein Dreieck unter der Brust.", min: 6, max: 12 },
      { name: "Archer-Liegestütz", type: "each", cue: "Ein Arm gestreckt, Gewicht auf einer Seite.", min: 4, max: 10 },
      { name: "Pseudo-Planche-Liegestütz", type: "reps", cue: "Hände an der Hüfte, nach vorne lehnen.", min: 5, max: 12 },
      { name: "Einarmiger Liegestütz (Negativ)", type: "each", cue: "Füße breit, langsam mit einem Arm runter.", min: 3, max: 8 },
    ],
  },
  pushVertical: {
    label: "Druck – vertikal (Schultern)", icon: "🙆", pattern: "push",
    levels: [
      { name: "Pike-Position halten", type: "hold", cue: "Hüfte hoch, umgedrehtes V (Hund nach unten). Einfach ruhig & stabil halten.", min: 15, max: 40 },
      { name: "Pike-Negative", type: "reps", cue: "In der Pike den Kopf 3–4 Sek. langsam Richtung Boden senken, dann mit den Beinen wieder hoch.", min: 4, max: 10 },
      { name: "Pike-Liegestütz – halber Weg", type: "reps", cue: "Nur die obere Hälfte: Kopf ein Stück senken und wieder hochdrücken.", min: 5, max: 12 },
      { name: "Pike-Liegestütz (Boden)", type: "reps", cue: "Voller Pike am Boden, Kopf tippt fast den Boden an.", min: 5, max: 12 },
      { name: "Pike-Liegestütz – Füße leicht erhöht", type: "reps", cue: "Füße auf eine niedrige Stufe/Stuhl. Etwas steiler.", min: 5, max: 10 },
      { name: "Pike-Liegestütz – Füße hoch", type: "reps", cue: "Füße auf Bank/Tisch, Oberkörper fast senkrecht.", min: 5, max: 10 },
      { name: "Pike-Liegestütz – Füße an der Wand", type: "reps", cue: "Füße an der Wand, Rücken zur Wand hochlaufen. Der echte Wand-Pike.", min: 4, max: 10 },
      { name: "Wand-Handstand halten", type: "hold", cue: "Bauch zur Wand hochlaufen, Körper lang & fest.", min: 15, max: 45 },
      { name: "Wand-Handstand-Liegestütz (Negativ)", type: "reps", cue: "Im Wand-Handstand langsam herunterlassen.", min: 3, max: 8 },
      { name: "Handstand-Liegestütz", type: "reps", cue: "Voller HSPU an der Wand.", min: 3, max: 10 },
    ],
  },
  pull: {
    label: "Zug – vertikal (Rücken/Bizeps)", icon: "🧗", pattern: "pull", needs: "Stange",
    levels: [
      { name: "Toter Hang", type: "hold", cue: "An der Stange hängen, Schultern aktiv.", min: 15, max: 60 },
      { name: "Scapula-Pulls", type: "reps", cue: "Nur Schulterblätter zusammenziehen, Arme gestreckt.", min: 6, max: 15 },
      { name: "Negativ-Klimmzug", type: "reps", cue: "Oben starten, 3–5 Sek. langsam absenken.", min: 3, max: 8 },
      { name: "Band-/Sprung-Klimmzug", type: "reps", cue: "Mit Band oder kleinem Sprung unterstützen.", min: 5, max: 12 },
      { name: "Klimmzug", type: "reps", cue: "Kinn über die Stange, Brust zur Stange.", min: 3, max: 12 },
      { name: "Breiter Klimmzug", type: "reps", cue: "Weiter Griff, Fokus oberer Rücken.", min: 4, max: 12 },
      { name: "Archer-Klimmzug", type: "each", cue: "Zu einer Seite ziehen, anderer Arm gestreckt.", min: 3, max: 8 },
      { name: "Einarmiger Klimmzug (Negativ)", type: "each", cue: "Oben starten, mit einem Arm langsam runter.", min: 2, max: 6 },
    ],
  },
  row: {
    label: "Zug – horizontal (Rücken)", icon: "🚣", pattern: "pull", needs: "Tisch/Stange",
    levels: [
      { name: "Schräges Rudern (steil)", type: "reps", cue: "Körper fast aufrecht, an Tischkante ziehen.", min: 8, max: 18 },
      { name: "Schräges Rudern", type: "reps", cue: "Körper schräger, Brust zur Kante ziehen.", min: 8, max: 16 },
      { name: "Horizontales Rudern", type: "reps", cue: "Körper waagerecht, Ellbogen nach hinten.", min: 6, max: 14 },
      { name: "Erhöhtes Rudern", type: "reps", cue: "Füße erhöht, mehr Last auf den Rücken.", min: 6, max: 12 },
      { name: "Tuck-Front-Lever-Rudern", type: "reps", cue: "Knie angezogen, waagerechter Körper.", min: 4, max: 10 },
    ],
  },
  legs: {
    label: "Beine (Quadrizeps/Gesäß)", icon: "🦵", pattern: "legs",
    levels: [
      { name: "Kniebeuge", type: "reps", cue: "Tief, Knie über die Zehen, Brust hoch.", min: 12, max: 25 },
      { name: "Ausfallschritt", type: "each", cue: "Großer Schritt, hinteres Knie zum Boden.", min: 8, max: 16 },
      { name: "Bulgarische Kniebeuge", type: "each", cue: "Hinterer Fuß erhöht, tief absenken.", min: 8, max: 14 },
      { name: "Geteilte Sprung-Kniebeuge", type: "each", cue: "Explosiv springen, Beine wechseln.", min: 6, max: 12 },
      { name: "Pistol-Kniebeuge (assistiert)", type: "each", cue: "Einbeinig, an Türrahmen festhalten.", min: 4, max: 10 },
      { name: "Pistol-Kniebeuge", type: "each", cue: "Volle einbeinige Kniebeuge, frei.", min: 3, max: 8 },
      { name: "Shrimp-Kniebeuge", type: "each", cue: "Hinteres Bein gehalten, einbeinig runter.", min: 3, max: 8 },
    ],
  },
  hamstrings: {
    label: "Beinbeuger/Gesäß (hintere Kette)", icon: "🍑", pattern: "legs",
    levels: [
      { name: "Glute Bridge", type: "reps", cue: "Hüfte hoch drücken, Gesäß anspannen.", min: 12, max: 25 },
      { name: "Einbeinige Glute Bridge", type: "each", cue: "Ein Bein gestreckt, Hüfte hoch.", min: 8, max: 16 },
      { name: "Nordic Curl (assistiert)", type: "reps", cue: "Füße fixiert, langsam nach vorne.", min: 4, max: 10 },
      { name: "Nordic Curl", type: "reps", cue: "Volle Kontrolle nach vorne und zurück.", min: 3, max: 8 },
    ],
  },
  core: {
    label: "Core (Bauch)", icon: "🔥", pattern: "core",
    levels: [
      { name: "Plank", type: "hold", cue: "Gerade Linie, Bauch & Gesäß fest.", min: 20, max: 60 },
      { name: "Hollow Hold", type: "hold", cue: "Unterer Rücken am Boden, Arme/Beine lang.", min: 15, max: 45 },
      { name: "Liegende Beinheben", type: "reps", cue: "Beine kontrolliert heben und senken.", min: 8, max: 18 },
      { name: "Hängendes Knieheben", type: "reps", cue: "An Stange Knie zur Brust ziehen.", min: 6, max: 15 },
      { name: "Hängendes Beinheben", type: "reps", cue: "Gestreckte Beine zur Stange heben.", min: 5, max: 12 },
      { name: "L-Sit (Stütz)", type: "hold", cue: "Beine waagerecht halten, Schultern runter.", min: 5, max: 30 },
      { name: "Drachen-Flagge (Negativ)", type: "reps", cue: "Körper gerade, langsam absenken.", min: 3, max: 8 },
    ],
  },
  dips: {
    label: "Dips (Brust/Trizeps)", icon: "🤸", pattern: "push", needs: "Barren/Stühle",
    levels: [
      { name: "Bank-Dips", type: "reps", cue: "Hände hinter dir auf Bank, Ellbogen beugen.", min: 8, max: 18 },
      { name: "Bank-Dips (Füße erhöht)", type: "reps", cue: "Füße auf zweiter Bank, tiefer.", min: 8, max: 15 },
      { name: "Negativ-Barren-Dips", type: "reps", cue: "Oben starten, langsam absenken.", min: 4, max: 8 },
      { name: "Barren-Dips", type: "reps", cue: "Voller Dip, leicht nach vorne lehnen.", min: 4, max: 12 },
      { name: "Ring-Dips", type: "reps", cue: "An Ringen, extra Stabilität nötig.", min: 4, max: 10 },
    ],
  },
  explosivePull: {
    label: "Explosives Ziehen (Muscle-Up)", icon: "💥", pattern: "pull", needs: "Stange",
    levels: [
      { name: "Sprung-Klimmzug + langsam ab", type: "reps", cue: "Hochspringen, oben kurz halten, 3 Sek. langsam herunterlassen.", min: 3, max: 8 },
      { name: "Schnelle Klimmzüge", type: "reps", cue: "Explosiv hochziehen, Brust zur Stange.", min: 4, max: 10 },
      { name: "Hohe Klimmzüge (Brustbein)", type: "reps", cue: "So hoch wie möglich, Stange zur unteren Brust.", min: 3, max: 8 },
      { name: "Negativ Muscle-Up", type: "reps", cue: "Oben im Stütz starten, langsam runter.", min: 2, max: 6 },
      { name: "Muscle-Up (assistiert)", type: "reps", cue: "Mit Band oder Sprung über die Stange.", min: 2, max: 6 },
      { name: "Muscle-Up", type: "reps", cue: "Sauber über die Stange, kein Kippen.", min: 1, max: 5 },
    ],
  },
};

/* ---------- Programme ----------
   focus: gewichtete Bewegungen (kommen häufiger/zuerst)
   signature: Hauptbewegung (bekommt +1 Satz & Stern)
   prereq: Mindestvoraussetzungen (Feld -> Mindestwert)
   milestone: Endziel des Programms                              */
const PROGRAMS = {
  reset: {
    id: "reset", icon: "🔥", name: "66-Tage Reset",
    tag: "Ausgewogen · Einsteigerfreundlich",
    desc: "Der klassische Ganzkörper-Reset. Baut über 66 Tage Kraft, Muskeln und gute Gewohnheiten auf.",
    focus: ["push", "pull", "legs", "core"],
    signature: null,
    prereq: {},
    milestone: "Spürbar stärker, fitter & disziplinierter in 66 Tagen.",
    goalDefault: "muscle",
  },
  firstpullup: {
    id: "firstpullup", icon: "🧗", name: "Erster Klimmzug",
    tag: "Skill · Anfänger",
    desc: "Von null zum ersten sauberen Klimmzug. Fokus auf Rücken, Griffkraft und Negativ-Wiederholungen.",
    focus: ["pull", "row", "core", "push"],
    signature: "pull",
    prereq: { hang: 20, rows: 8 },
    milestone: "1 sauberer, voller Klimmzug aus dem toten Hang.",
    goalDefault: "strength",
  },
  muscleup: {
    id: "muscleup", icon: "🚀", name: "Erster Muscle-Up",
    tag: "Skill · Fortgeschritten",
    desc: "Der König der Calisthenics-Skills. Kombiniert explosive Klimmzüge, starke Dips und die Transition.",
    focus: ["explosivePull", "pull", "dips", "core"],
    signature: "explosivePull",
    prereq: { pullups: 8, dips: 8 },
    milestone: "1 sauberer Muscle-Up über die Stange.",
    goalDefault: "strength",
  },
  pistol: {
    id: "pistol", icon: "🦿", name: "Erste Pistol Squat",
    tag: "Skill · Beine",
    desc: "Einbeinige Kraft, Mobilität und Balance bis zur freien Pistol Squat.",
    focus: ["legs", "core"],
    signature: "legs",
    prereq: { squats: 20 },
    milestone: "1 freie Pistol Squat pro Bein.",
    goalDefault: "strength",
  },
  handstand: {
    id: "handstand", icon: "🤸", name: "Handstand & HSPU",
    tag: "Skill · Schultern",
    desc: "Schulterkraft und Balance bis zum freien Handstand und Handstand-Liegestütz.",
    focus: ["pushVertical", "core", "push"],
    signature: "pushVertical",
    prereq: { pushups: 10 },
    milestone: "Freier Handstand & erster Handstand-Liegestütz.",
    goalDefault: "strength",
  },
  shred: {
    id: "shred", icon: "⚡", name: "Lean & Shredded",
    tag: "Fettverlust · Kondition",
    desc: "Hohe Wiederholungen, Zirkel und Finisher für maximalen Kalorienverbrauch und Definition.",
    focus: ["push", "pull", "legs", "core"],
    signature: null,
    prereq: {},
    milestone: "Sichtbar definierter, fitter, leichter.",
    goalDefault: "fatloss",
  },
  mass: {
    id: "mass", icon: "💪", name: "Kraft & Masse",
    tag: "Muskelaufbau · Kraft",
    desc: "Schwerere Progressionen, moderate Wiederholungen, mehr Sätze für maximalen Muskelaufbau.",
    focus: ["push", "pull", "dips", "legs"],
    signature: null,
    prereq: {},
    milestone: "Mehr Muskelmasse und Kraft an allen Grundübungen.",
    goalDefault: "muscle",
  },
};

/* ---------- Kalibrierungs-Test ----------
   Felder, die der Eingangstest abfragt. id wird in calibration{} gespeichert. */
const CALIB_FIELDS = [
  { id: "pushups", icon: "💪", label: "Max. Liegestütze (am Stück)", unit: "Wdh.", placeholder: "z.B. 15" },
  { id: "pullups", icon: "🧗", label: "Max. Klimmzüge (am Stück)", unit: "Wdh.", placeholder: "z.B. 5 (0 = keiner)" },
  { id: "dips",    icon: "🤸", label: "Max. Dips (Barren/Stuhl)", unit: "Wdh.", placeholder: "z.B. 8" },
  { id: "squats",  icon: "🦵", label: "Max. Kniebeugen (am Stück)", unit: "Wdh.", placeholder: "z.B. 30" },
  { id: "plank",   icon: "🔥", label: "Plank halten", unit: "Sek.", placeholder: "z.B. 45" },
  { id: "hang",    icon: "✊", label: "Toter Hang halten", unit: "Sek.", placeholder: "z.B. 30" },
];

/* ---------- Mobility / Warm-up / Cooldown ---------- */
const WARMUP = [
  { name: "Armkreisen", detail: "30 Sek. vor & zurück" },
  { name: "Hüftkreisen", detail: "30 Sek. je Richtung" },
  { name: "Cat-Cow", detail: "10 Wiederholungen" },
  { name: "Beinschwingen", detail: "10 je Bein" },
  { name: "Jumping Jacks", detail: "30 Sek." },
];
const COOLDOWN = [
  { name: "Brustdehnung an Wand", detail: "30 Sek. je Seite" },
  { name: "Kindshaltung", detail: "45 Sek." },
  { name: "Quad-Dehnung", detail: "30 Sek. je Bein" },
  { name: "Schulter-Dehnung", detail: "30 Sek. je Seite" },
];
const FINISHERS = [
  { name: "Burpees", detail: "3 × 10" },
  { name: "Mountain Climbers", detail: "3 × 30 Sek." },
  { name: "High Knees", detail: "3 × 30 Sek." },
  { name: "Squat Jumps", detail: "3 × 12" },
  { name: "Plank-to-Shoulder-Taps", detail: "3 × 20" },
];

/* ---------- Habits ---------- */
const HABITS = [
  { id: "water",   icon: "💧", label: "Wasser trinken", xp: 20 },
  { id: "steps",   icon: "👟", label: "8.000 Schritte gehen", xp: 20 },
  { id: "read",    icon: "📚", label: "10 Seiten lesen", xp: 20 },
  { id: "sleep",   icon: "😴", label: "7–8 h schlafen", xp: 20 },
  { id: "stretch", icon: "🧘", label: "5 Min. Mobility", xp: 15 },
  { id: "nosugar", icon: "🚫", label: "Kein zugesetzter Zucker", xp: 20 },
  { id: "cold",    icon: "🚿", label: "Kalt duschen", xp: 15 },
  { id: "journal", icon: "✍️", label: "Tagebuch / Reflexion", xp: 15 },
];

/* ---------- Badges ---------- */
const BADGES = [
  { id: "first",    icon: "🌱", name: "Erster Schritt",   desc: "Erstes Workout abgeschlossen." },
  { id: "kalib",    icon: "🎚️", name: "Kalibriert",       desc: "Eingangstest absolviert." },
  { id: "program",  icon: "🎯", name: "Auf Mission",       desc: "Ein Skill-Programm gestartet." },
  { id: "streak3",  icon: "🔥", name: "Drei am Stück",     desc: "3 Tage Streak." },
  { id: "streak7",  icon: "⚡", name: "Eine Woche",        desc: "7 Tage Streak." },
  { id: "streak30", icon: "💎", name: "Eiserner Wille",    desc: "30 Tage Streak." },
  { id: "levelup",  icon: "📈", name: "Aufgestiegen",      desc: "Erste Übungs-Stufe hochgestuft." },
  { id: "week1",    icon: "✅", name: "Woche 1 geschafft", desc: "Erste Trainingswoche komplett." },
  { id: "half",     icon: "🏔️", name: "Halbzeit",          desc: "Tag 33 erreicht." },
  { id: "finish",   icon: "🏆", name: "RISE vollendet",    desc: "Alle 66 Tage geschafft!" },
  { id: "habit50",  icon: "🧠", name: "Gewohnheitstier",   desc: "50 Habits erledigt." },
  { id: "level5",   icon: "⭐", name: "Level 5",           desc: "App-Level 5 erreicht." },
  { id: "perfect",  icon: "💯", name: "Perfekter Tag",     desc: "Workout + alle Habits + Wasser." },
  { id: "nutri",    icon: "🥗", name: "Sauber gegessen",   desc: "Kalorienziel an einem Tag erreicht." },
];

/* ---------- Zitate ---------- */
const QUOTES = [
  "Disziplin ist die Brücke zwischen Zielen und Erfolg.",
  "Du wirst nicht gewinnen, weil es leicht ist – sondern weil du dranbleibst.",
  "Kleine tägliche Verbesserungen führen zu atemberaubenden Ergebnissen.",
  "Dein Körper schafft fast alles. Es ist dein Geist, den du überzeugen musst.",
  "Werde 1 % besser als gestern.",
  "Der einzige schlechte Workout ist der, der nicht stattfand.",
  "Schmerz ist vorübergehend. Aufgeben ist für immer.",
  "Sei stärker als deine beste Ausrede.",
  "Erfolg ist die Summe kleiner Anstrengungen, täglich wiederholt.",
  "Stehe auf. Steh auf. RISE.",
];

/* ---------- Ernährung ---------- */
const ACTIVITY_BY_DAYS = { 2: 1.4, 3: 1.5, 4: 1.6, 5: 1.7, 6: 1.8 };
const GOAL_CALORIE_ADJ = { fatloss: -450, endurance: -100, muscle: 250, strength: 150 };
const GOAL_PROTEIN_GKG = { fatloss: 2.2, endurance: 1.6, muscle: 2.0, strength: 1.9 };

const FOOD_PRESETS = [
  { name: "Eier (2 Stk.)", kcal: 155, protein: 13 },
  { name: "Haferflocken (80g)", kcal: 300, protein: 11 },
  { name: "Hähnchenbrust (150g)", kcal: 248, protein: 46 },
  { name: "Magerquark (250g)", kcal: 170, protein: 30 },
  { name: "Reis gekocht (200g)", kcal: 260, protein: 5 },
  { name: "Banane", kcal: 105, protein: 1 },
  { name: "Proteinshake", kcal: 170, protein: 30 },
  { name: "Vollkornbrot (Scheibe)", kcal: 90, protein: 4 },
  { name: "Thunfisch (Dose)", kcal: 130, protein: 29 },
  { name: "Apfel", kcal: 80, protein: 0 },
  { name: "Nüsse (30g)", kcal: 180, protein: 6 },
  { name: "Olivenöl (EL)", kcal: 120, protein: 0 },
];

/* ============================================================
   LIFE RESET – 66-Tage Challenges & Lebensbereiche
   (das eigentliche „Rise"-Konzept: kumulative Ziele über alle
   Lebensbereiche – „2 Marathons, 5 Bücher, 40h Gym, 220L Wasser…")
   ============================================================ */
const AREAS = {
  koerper:    { label: "Körper",     icon: "💪", color: "#ff7a45" },
  geist:      { label: "Geist",      icon: "🧠", color: "#a855f7" },
  wissen:     { label: "Wissen",     icon: "📚", color: "#4aa8ff" },
  ernaehrung: { label: "Ernährung",  icon: "🥗", color: "#3ddc84" },
  disziplin:  { label: "Disziplin",  icon: "⚔️", color: "#facc15" },
};

/* type: count | volume | distance | duration | binary
   total = Standard-66-Tage-Ziel · quick = Schnell-Log-Buttons
   binary:true -> tägliches Abhaken (Ziel = 66×)                    */
/* d0 = Tagesziel an Tag 1 · d1 = Tagesziel an Tag 66 (lineare Steigerung)
   So fängt es niedrig an und steigert sich deutlich.                     */
const CHALLENGES = {
  water:     { id: "water",     ic: "water",   area: "koerper",    label: "Wasser trinken",          unit: "L",      type: "volume",   d0: 2.0,  d1: 3.5,   quick: [0.25, 0.5],       step: 0.25, headline: "steigt auf ~3,5 L/Tag" },
  pushups:   { id: "pushups",   ic: "pushups", area: "koerper",    label: "Liegestütze",             unit: "Wdh.",   type: "count",    d0: 15,   d1: 80,    quick: [5, 10, 25],       headline: "15 → 80 / Tag" },
  squats:    { id: "squats",    ic: "legs",    area: "koerper",    label: "Kniebeugen",              unit: "Wdh.",   type: "count",    d0: 20,   d1: 100,   quick: [10, 20, 40],      headline: "20 → 100 / Tag" },
  run:       { id: "run",       ic: "run",     area: "koerper",    label: "Laufen / Cardio",         unit: "km",     type: "distance", d0: 0.5,  d1: 3,     quick: [0.5, 1, 2],       step: 0.5,  headline: "0,5 → 3 km / Tag" },
  steps:     { id: "steps",     ic: "steps",   area: "koerper",    label: "Schritte",                unit: "",       type: "count",    d0: 6000, d1: 11000, quick: [1000, 2500, 5000], headline: "6k → 11k / Tag" },
  gym:       { id: "gym",       ic: "gym",     area: "koerper",    label: "Trainingszeit",           unit: "h",      type: "duration", d0: 0.4,  d1: 0.9,   quick: [0.25, 0.5],       step: 0.25, headline: "automatisch aus Workouts" },
  read:      { id: "read",      ic: "read",    area: "wissen",     label: "Seiten lesen",            unit: "Seiten", type: "count",    d0: 8,    d1: 35,    quick: [5, 10, 20],       headline: "8 → 35 / Tag" },
  learn:     { id: "learn",     ic: "learn",   area: "wissen",     label: "Lernen / Skill üben",     unit: "Min.",   type: "duration", d0: 15,   d1: 45,    quick: [10, 20, 30],      headline: "15 → 45 Min. / Tag" },
  meditate:  { id: "meditate",  ic: "meditate",area: "geist",      label: "Meditation",              unit: "Min.",   type: "duration", d0: 5,    d1: 15,    quick: [5, 10],           headline: "5 → 15 Min. / Tag" },
  journal:   { id: "journal",   ic: "journal", area: "geist",      label: "Journal schreiben",       unit: "×",      type: "binary",   headline: "Jeden Tag" },
  gratitude: { id: "gratitude", ic: "heart",   area: "geist",      label: "3× Dankbarkeit",          unit: "×",      type: "binary",   headline: "Jeden Tag" },
  cold:      { id: "cold",      ic: "cold",    area: "disziplin",  label: "Kalt duschen",            unit: "×",      type: "binary",   headline: "Jeden Tag" },
  earlyrise: { id: "earlyrise", ic: "sun",     area: "disziplin",  label: "Früh aufstehen",          unit: "×",      type: "binary",   headline: "Vor 7 Uhr" },
  nosocial:  { id: "nosocial",  ic: "phone",   area: "disziplin",  label: "< 1h Social Media",       unit: "×",      type: "binary",   headline: "Jeden Tag" },
  sleep:     { id: "sleep",     ic: "moon",    area: "koerper",    label: "7h+ Schlaf",              unit: "×",      type: "binary",   headline: "Jede Nacht" },
  nosugar:   { id: "nosugar",   ic: "no",      area: "ernaehrung", label: "Kein zugesetzter Zucker", unit: "×",      type: "binary",   headline: "Jeden Tag" },
  veggies:   { id: "veggies",   ic: "leaf",    area: "ernaehrung", label: "Gemüse zu jeder Mahlzeit",unit: "×",      type: "binary",   headline: "Jeden Tag" },
};

/* Sanfte Standard-Auswahl für den Einstieg (anpassbar) */
const RESET_BUNDLE = ["water", "pushups", "read", "cold", "meditate"];

/* Fallback-Startstufen, falls kein Test gemacht wird */
const LEVEL_START = {
  beginner:     { push: 1, pushVertical: 0, pull: 0, row: 0, legs: 0, hamstrings: 0, core: 0, dips: 0, explosivePull: 0 },
  intermediate: { push: 3, pushVertical: 1, pull: 2, row: 1, legs: 1, hamstrings: 1, core: 2, dips: 1, explosivePull: 0 },
  advanced:     { push: 4, pushVertical: 3, pull: 4, row: 2, legs: 3, hamstrings: 2, core: 4, dips: 3, explosivePull: 1 },
};

/* ============================================================
   BILDER – echte Übungsfotos (free-exercise-db) + Stimmungsbilder
   Jede Übung hat 0.jpg (Start) & 1.jpg (End) -> Demo-Animation
   ============================================================ */
const DB_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const EX_PHOTO = {
  push:         { fallback: "Pushups", levels: ["Incline_Push-Up","Incline_Push-Up","Pushups","Pushups","Pushups_Close_and_Wide_Hand_Positions","Pushups_Close_and_Wide_Hand_Positions","Pushups","Decline_Push-Up","Pushups"] },
  pushVertical: { fallback: "Handstand_Push-Ups" },
  pull:         { fallback: "Pullups", levels: ["Pullups","Pullups","Pullups","Pullups","Pullups","Pullups","Chin-Up","Chin-Up"] },
  row:          { fallback: "Inverted_Row" },
  legs:         { fallback: "Bodyweight_Squat", levels: ["Bodyweight_Squat","Bodyweight_Walking_Lunge","Bodyweight_Walking_Lunge","Bodyweight_Squat","Bodyweight_Squat","Bodyweight_Squat","Bodyweight_Squat"] },
  hamstrings:   { fallback: "Romanian_Deadlift", levels: ["Hip_Lift_with_Band","Hip_Lift_with_Band","Romanian_Deadlift","Romanian_Deadlift"] },
  core:         { fallback: "Plank", levels: ["Plank","Plank","Air_Bike","Hanging_Leg_Raise","Hanging_Leg_Raise","Hanging_Leg_Raise","Air_Bike"] },
  dips:         { fallback: "Dips_-_Chest_Version", levels: ["Bench_Dips","Bench_Dips","Dips_-_Chest_Version","Dips_-_Chest_Version","Dips_-_Chest_Version"] },
  explosivePull:{ fallback: "Pullups", levels: ["Pullups","Pullups","Pullups","Muscle_Up","Muscle_Up","Muscle_Up"] },
};
function exPhotoName(key, level) {
  const m = EX_PHOTO[key]; if (!m) return null;
  return (m.levels && m.levels[level]) || m.fallback;
}
function exPhotoURL(key, level, frame) {
  const n = exPhotoName(key, level);
  return n ? DB_BASE + n + "/" + (frame || 0) + ".jpg" : null;
}

const UNSPLASH = "https://images.unsplash.com/photo-";
function unsplashURL(id, w) { return UNSPLASH + id + "?w=" + (w || 900) + "&q=72&auto=format&fit=crop"; }
const IMG = {
  heroOnboard: "1598971639058-fab3c3109a00", // Mann beim Liegestütz
  heroToday:   "1605296867304-46d5465a13f1", // dunkle Silhouette
};
const PROGRAM_MUSCLES = {
  reset:       ["Brust", "Rücken", "Beine", "Core", "Schultern"],
  firstpullup: ["Rücken", "Bizeps", "Core"],
  muscleup:    ["Rücken", "Bizeps", "Brust", "Trizeps", "Schultern"],
  pistol:      ["Beine", "Core", "Balance"],
  handstand:   ["Schultern", "Trizeps", "Core"],
  shred:       ["Ganzkörper", "Core", "Kondition"],
  mass:        ["Brust", "Rücken", "Beine", "Arme"],
};
const PROGRAM_IMG = {
  reset:       "1598971639058-fab3c3109a00",
  firstpullup: "1581009146145-b5ef050c2e1e",
  muscleup:    "1574680096145-d05b474e2155",
  pistol:      "1534368420009-621bfab424a8",
  handstand:   "1594737625785-a6cbdabd333c",
  shred:       "1607962837359-5e7e89f86776",
  mass:        "1599058917212-d750089bc07e",
};
