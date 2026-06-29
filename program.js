/* ============================================================
   RISE CALISTHENICS – Engine
   Plan-Struktur · Kalibrierung · Adaptive Schwierigkeit · Ernährung
   ============================================================ */

const TOTAL_DAYS = 66;
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ---------- Trainings-Splits ---------- */
function getSplit(daysPerWeek) {
  // Ganzkörper-Tage mit je 5 Übungen, viel Abwechslung, ohne Glute-/Ruder-Übungen
  const A = { focus: "Ganzkörper A", slots: ["push", "pull", "legs", "core", "dips"] };
  const B = { focus: "Ganzkörper B", slots: ["pushVertical", "pull", "legs", "core", "push"] };
  const C = { focus: "Ganzkörper C", slots: ["dips", "pull", "legs", "core", "push"] };
  const D = { focus: "Oberkörper-Fokus", slots: ["push", "pull", "dips", "pushVertical", "core"] };
  switch (Number(daysPerWeek)) {
    case 2: return [A, B];
    case 3: return [A, B, C];
    case 4: return [A, B, C, D];
    case 5: return [A, B, C, D, A];
    case 6: return [A, B, C, D, A, B];
    default: return [A, B, C];
  }
}

/* ---------- Phasen über 66 Tage ---------- */
function getPhase(week) {
  if (week <= 2) return { name: "Fundament", note: "Technik lernen, sauber bewegen.", sets: 3, restSec: 60 };
  if (week <= 4) return { name: "Aufbau", note: "Mehr Volumen, Wiederholungen rauf.", sets: 3, restSec: 75 };
  if (week <= 6) return { name: "Progression", note: "Schwerere Stufen, mehr Sätze.", sets: 4, restSec: 90 };
  if (week <= 8) return { name: "Intensität", note: "Nah ans Maximum, hohe Qualität.", sets: 4, restSec: 105 };
  return { name: "Peak & Test", note: "Zeig, was du kannst – teste deine Bestwerte.", sets: 4, restSec: 120 };
}

function getGoalMods(goal) {
  switch (goal) {
    case "strength":  return { restMult: 1.3, finisher: false, setBonus: 0 };
    case "muscle":    return { restMult: 1.0, finisher: false, setBonus: 1 };
    case "fatloss":   return { restMult: 0.65, finisher: true, setBonus: 0 };
    case "endurance": return { restMult: 0.6, finisher: true, setBonus: 0 };
    default:          return { restMult: 1.0, finisher: false, setBonus: 0 };
  }
}

function isTrainingDay(dayInWeek, dpw) {
  const patterns = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
  return (patterns[dpw] || patterns[3]).includes(dayInWeek);
}

/* ============================================================
   STRUKTUR generieren (nur Meta – Übungs-Ziele kommen adaptiv)
   ============================================================ */
function generateStructure(profile, programIds) {
  const ids = (Array.isArray(programIds) ? programIds : [programIds]).filter(Boolean);
  const programs = ids.map((id) => PROGRAMS[id] || PROGRAMS.reset);
  if (!programs.length) programs.push(PROGRAMS.reset);
  const multi = programs.length > 1;
  const split = getSplit(profile.daysPerWeek);
  const goalMods = getGoalMods(profile.goal);
  const dpw = Number(profile.daysPerWeek);
  const days = [];
  let wIndex = 0;

  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const week = Math.ceil(d / 7);
    const dayInWeek = ((d - 1) % 7) + 1;
    const phase = getPhase(week);

    if (!isTrainingDay(dayInWeek, dpw)) {
      days.push({
        day: d, week, phase: phase.name,
        type: dayInWeek === 7 ? "rest" : "active",
        focus: dayInWeek === 7 ? "Erholung" : "Aktive Erholung",
        note: dayInWeek === 7
          ? "Komplette Pause. Schlaf, Ernährung, Regeneration."
          : "Leichter Spaziergang, Mobility, Dehnen. Kein hartes Training.",
        slots: [], mobility: dayInWeek === 7 ? [] : COOLDOWN.slice(0, 3),
      });
      continue;
    }

    // Bei zwei aktiven Programmen wechseln sich die Schwerpunkt-Tage ab
    const program = programs[wIndex % programs.length];
    const tmpl = split[wIndex % split.length];
    wIndex++;

    let slots = tmpl.slots.slice();
    if (program.signature && !slots.includes(program.signature)) slots.unshift(program.signature);
    slots = slots.filter((s, i) => slots.indexOf(s) === i);
    slots.sort((a, b) => focusRank(program, a) - focusRank(program, b));
    if (slots.length > 5) slots = slots.slice(0, 5);

    days.push({
      day: d, week, phase: phase.name, phaseNote: phase.note,
      type: "workout",
      focus: multi ? `${tmpl.focus} · ${program.name}` : tmpl.focus,
      baseSets: phase.sets + goalMods.setBonus,
      restSec: Math.round(phase.restSec * goalMods.restMult),
      warmup: WARMUP.slice(0, 5),
      slots,
      signature: program.signature,
      programId: program.id,
      finisher: goalMods.finisher ? FINISHERS[d % FINISHERS.length] : null,
      mobility: COOLDOWN.slice(0, 4),
      isTestDay: d === TOTAL_DAYS,
    });
  }
  return { createdAt: Date.now(), programIds: ids, waterTarget: waterTarget(profile.weight), days };
}
function focusRank(program, slot) {
  const i = program.focus.indexOf(slot);
  return i === -1 ? 99 : i;
}

/* ============================================================
   KALIBRIERUNG: Test-Ergebnisse -> Start-Trainingsniveau
   training[key] = { level: index, reps: zielwert }
   ============================================================ */
function pickByThresholds(thresholds, value) {
  // thresholds: [[maxValue, level, reps], ...] aufsteigend; nimm ersten passenden
  for (const [mx, level, reps] of thresholds) {
    if (value <= mx) return { level, reps };
  }
  const last = thresholds[thresholds.length - 1];
  return { level: last[1], reps: last[2] };
}

function initTraining(calibration, profile) {
  const c = calibration || {};
  const num = (v, def) => (v === "" || v === null || v === undefined || isNaN(Number(v))) ? def : Number(v);

  // Fallback-Defaults aus Fitness-Level – Start am unteren Ende der Spanne
  const fb = LEVEL_START[profile.fitness] || LEVEL_START.beginner;
  const t = {};
  for (const key in PROGRESSIONS) {
    const lv = fb[key] !== undefined ? fb[key] : 0;
    t[key] = { level: lv, reps: PROGRESSIONS[key].levels[lv].min };
  }

  // Falls Testwerte vorhanden -> präzise überschreiben
  if (calibration && Object.keys(calibration).length) {
    // PUSH (Liegestütze)
    if (c.pushups !== undefined && c.pushups !== "")
      t.push = pickByThresholds([[2, 0, 10], [6, 2, 10], [12, 3, 8], [20, 4, 10], [30, 5, 10], [9999, 6, 6]], num(c.pushups, 5));
    // PUSH VERTIKAL (aus Liegestützen abgeleitet)
    if (c.pushups !== undefined && c.pushups !== "")
      t.pushVertical = pickByThresholds([[8, 0, 8], [15, 1, 8], [25, 2, 8], [40, 3, 30], [9999, 4, 5]], num(c.pushups, 5));
    // PULL (Klimmzüge, sonst Hang)
    if (c.pullups !== undefined && c.pullups !== "") {
      const p = num(c.pullups, 0);
      if (p <= 0) {
        const h = num(c.hang, 15);
        t.pull = pickByThresholds([[12, 0, 20], [25, 1, 8], [9999, 2, 5]], h);
      } else {
        t.pull = pickByThresholds([[2, 4, 4], [6, 4, p], [12, 5, p], [9999, 6, 5]], p);
      }
    }
    // EXPLOSIVE PULL (aus Klimmzügen)
    if (c.pullups !== undefined && c.pullups !== "")
      t.explosivePull = pickByThresholds([[7, 0, 5], [12, 1, 5], [9999, 2, 4]], num(c.pullups, 0));
    // DIPS
    if (c.dips !== undefined && c.dips !== "")
      t.dips = pickByThresholds([[3, 0, 10], [8, 1, 10], [15, 3, 8], [9999, 4, 8]], num(c.dips, 6));
    // LEGS (Kniebeugen)
    if (c.squats !== undefined && c.squats !== "")
      t.legs = pickByThresholds([[12, 0, 15], [25, 1, 12], [40, 2, 10], [9999, 3, 10]], num(c.squats, 20));
    // HAMSTRINGS (aus Kniebeugen)
    if (c.squats !== undefined && c.squats !== "")
      t.hamstrings = pickByThresholds([[20, 0, 15], [40, 1, 12], [9999, 2, 8]], num(c.squats, 20));
    // CORE (Plank)
    if (c.plank !== undefined && c.plank !== "")
      t.core = pickByThresholds([[20, 0, 25], [45, 1, 30], [70, 2, 12], [9999, 3, 12]], num(c.plank, 30));
  }
  // Auf gültige Spanne begrenzen – Start nicht am Maximum, damit Wachstum bleibt
  for (const key in t) {
    const prog = PROGRESSIONS[key]; if (!prog) continue;
    t[key].level = clamp(t[key].level, 0, prog.levels.length - 1);
    const def = prog.levels[t[key].level];
    t[key].reps = clamp(Math.round(t[key].reps), def.min, def.max);
  }
  return t;
}

/* Bereitschaft für ein Programm (0..1) anhand Prereqs */
function programReadiness(programId, calibration) {
  const program = PROGRAMS[programId];
  const req = program.prereq || {};
  const keys = Object.keys(req);
  if (!keys.length) return 1;
  if (!calibration) return 0;
  let sum = 0;
  keys.forEach((k) => {
    const have = Number(calibration[k] || 0);
    sum += clamp(have / req[k], 0, 1);
  });
  return sum / keys.length;
}

/* ============================================================
   ÜBUNGEN für einen Tag aus aktuellem Trainingsniveau bauen
   ============================================================ */
function buildExercises(dayMeta, training) {
  return dayMeta.slots.map((key) => {
    const prog = PROGRESSIONS[key];
    const t = training[key] || { level: 0, reps: prog.levels[0].min };
    const lvlIndex = clamp(t.level, 0, prog.levels.length - 1);
    const def = prog.levels[lvlIndex];
    const reps = clamp(Math.round(t.reps), def.min - 2, def.max + (def.type === "hold" ? 20 : 4));
    const isSig = key === dayMeta.signature;
    return {
      key, category: prog.label, icon: prog.icon, pattern: prog.pattern,
      needs: prog.needs || null,
      levelIndex: lvlIndex, maxLevel: prog.levels.length - 1,
      name: def.name, cue: def.cue, type: def.type,
      sets: dayMeta.baseSets + (isSig ? 1 : 0),
      target: reps,
      unit: def.type === "hold" ? "Sek." : (def.type === "each" ? "Wdh./Seite" : "Wdh."),
      isSignature: isSig,
    };
  });
}

/* ============================================================
   ADAPTIVE KALIBRIERUNG nach dem Workout
   perf[key] = { score: 0..1 (Sätze geschafft), effort: 'easy'|'ok'|'hard' }
   -> verändert training[key]
   ============================================================ */
/* Modell: DOUBLE PROGRESSION + RPE-Autoregulation
   (bewährt aus r/bodyweightfitness & Autoregulations-Literatur)
   - In einer Wdh.-Spanne [min..max] arbeiten, pro Einheit +1 Wdh.
   - Spannen-Maximum sauber erreicht -> nächste, schwerere Variante (Reset auf min)
   - effort = wahrgenommene Anstrengung (RPE):
       'easy' ≈ RPE ≤6 (3+ in Reserve) · 'ok' ≈ RPE 7-8 · 'hard' ≈ RPE 9-10
   - Überforderung -> sofort eine Stufe leichter (kein wochenlanges Festhängen)
   So entsteht stetiges Wachstum ohne unrealistische Sprünge.            */
function adjustTraining(training, key, score, effort) {
  const prog = PROGRESSIONS[key];
  const t = training[key];
  if (!t) return { changed: 0, leveledUp: false, leveledDown: false, easier: false };
  const startLevel = t.level;
  const startReps = t.reps;
  const lastLevel = prog.levels.length - 1;
  const def = () => prog.levels[t.level];
  const regress = () => { if (t.level > 0) { t.level--; t.reps = Math.round((def().min + def().max) / 2); } else { t.reps = Math.max(def().min, t.reps - 2); } };

  if (score <= 0.5 && (score <= 0.25 || effort === "hard")) {
    // VIEL zu schwer (max. die Hälfte geschafft UND kaum etwas / als „zu schwer" bewertet)
    // -> sofort eine ganze Stufe leichter
    regress();
  } else if (score <= 0.5) {
    // Nur rund die Hälfte geschafft (z.B. 2 von 4 Sätzen) -> deutlich leichter machen
    t.reps -= 2;
    if (t.reps < def().min) regress();            // fällt unter die Spanne -> Stufe runter
  } else if (score >= 0.999) {
    // Alle Sätze geschafft -> Double Progression, durch RPE moduliert
    if (effort === "hard") {
      /* RPE 9-10: Ziel erreicht, aber am Limit -> konsolidieren (kein Schritt) */
    } else if (t.reps < def().max) {
      t.reps += 1;
      if (effort === "easy" && t.reps >= def().max && t.level < lastLevel) { t.level++; t.reps = def().min; }
    } else if (t.level < lastLevel) {
      t.level++; t.reps = def().min;
    } else {
      t.reps = Math.min(t.reps + 1, def().max + (def().type === "hold" ? 15 : 3));
    }
  } else {
    // Fast geschafft (mehr als die Hälfte, < voll) -> Ziel halten; bei RPE 9-10 leicht zurück
    if (effort === "hard" && t.reps > def().min) t.reps -= 1;
  }

  t.level = clamp(t.level, 0, lastLevel);
  const lo = def().min - (def().type === "hold" ? 5 : 0);
  const hi = def().max + (def().type === "hold" ? 15 : 3);
  t.reps = clamp(Math.round(t.reps), lo, hi);

  const easier = t.level < startLevel || (t.level === startLevel && t.reps < startReps);
  return { changed: 0, leveledUp: t.level > startLevel, leveledDown: t.level < startLevel, easier };
}

/* Geschätzte Workout-Dauer in Minuten (für Anzeige & Zielzeit 40–60 Min.) */
function estimateMinutes(dayMeta, ex) {
  const totalSets = ex.reduce((s, e) => s + e.sets, 0);
  const work = totalSets * 0.6;                 // ~36 s Arbeit/Satz
  const rest = totalSets * (dayMeta.restSec / 60);
  const warm = 6, cool = 3;
  return Math.round(work + rest + warm + cool);
}

/* ============================================================
   ERNÄHRUNG: Kalorien- & Proteinziel (Mifflin-St Jeor)
   ============================================================ */
function nutritionTargets(profile) {
  const { weight, height, age, gender, goal, daysPerWeek } = profile;
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === "m") bmr += 5;
  else if (gender === "w") bmr -= 161;
  else bmr -= 78; // divers: Mittelwert
  const activity = ACTIVITY_BY_DAYS[Number(daysPerWeek)] || 1.5;
  const tdee = bmr * activity;
  const kcal = Math.round((tdee + (GOAL_CALORIE_ADJ[goal] || 0)) / 10) * 10;
  const protein = Math.round(weight * (GOAL_PROTEIN_GKG[goal] || 1.8));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein };
}

function waterTarget(weightKg) {
  return clamp(Math.round(weightKg * 0.033 * 10) / 10, 1.5, 5);
}

/* ============================================================
   LIFE RESET – Challenge-Helfer
   Instanz: { id, total, logged: { 'YYYY-MM-DD': betrag } }
   ============================================================ */
/* Instanz: { id, d0, d1, logged } – d0/d1 = Tagesziel Tag 1 → Tag 66 */
function makeChallenge(id, opts) {
  const m = CHALLENGES[id];
  const inst = { id, logged: {} };
  if (m.type !== "binary") {
    inst.d0 = (opts && opts.d0 != null) ? opts.d0 : m.d0;
    inst.d1 = (opts && opts.d1 != null) ? opts.d1 : m.d1;
  }
  return inst;
}
function defaultChallenges(profile) {
  return RESET_BUNDLE.map((id) => {
    if (id === "water" && profile) {
      const w = waterTarget(profile.weight);
      return makeChallenge(id, { d0: Math.max(2, Math.round(w * 0.85 * 10) / 10), d1: Math.round(w * 1.2 * 10) / 10 });
    }
    return makeChallenge(id);
  });
}
function challengeMeta(id) { return CHALLENGES[id]; }
function roundFor(id, v) { return id === "steps" ? Math.round(v / 100) * 100 : Math.round(v * 100) / 100; }
/* Tagesziel an einem bestimmten Tag (linearer Anstieg d0 -> d1) */
function challengeDailyForDay(inst, day) {
  const m = CHALLENGES[inst.id];
  if (m.type === "binary") return 1;
  const f = TOTAL_DAYS > 1 ? clamp((day - 1) / (TOTAL_DAYS - 1), 0, 1) : 0;
  return roundFor(inst.id, inst.d0 + (inst.d1 - inst.d0) * f);
}
/* Gesamt-Ziel über alle 66 Tage (Summe der Tagesziele) */
function challengeTotal(inst) {
  const m = CHALLENGES[inst.id];
  if (m.type === "binary") return TOTAL_DAYS;
  let s = 0; for (let d = 1; d <= TOTAL_DAYS; d++) s += challengeDailyForDay(inst, d);
  return Math.round(s);
}
function challengeSum(inst) { let s = 0; for (const k in inst.logged) s += inst.logged[k]; return s; }
function challengeToday(inst, iso) { return inst.logged[iso] || 0; }
/* Soll-Stand bis Tag X (Summe der Tagesziele) */
function challengePaceTarget(inst, dayNum) {
  let s = 0; for (let d = 1; d <= Math.min(dayNum, TOTAL_DAYS); d++) s += challengeDailyForDay(inst, d);
  return s;
}
/* Tage mit erreichtem (Mindest-)Tagesziel über alle Challenges */
function challengeDaysMet(challenges) {
  let n = 0;
  challenges.forEach((inst) => {
    const m = CHALLENGES[inst.id];
    const thr = m.type === "binary" ? 1 : (inst.d0 || 0);
    for (const k in inst.logged) if (inst.logged[k] >= thr - 1e-9) n++;
  });
  return n;
}
