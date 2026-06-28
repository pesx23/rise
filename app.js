/* ============================================================
   RISE CALISTHENICS – App
   State · Onboarding · Programme · Kalibrierung · Workout (Timer,
   Animationen, adaptive Nachregelung) · Ernährung · Backup · Tabs
   ============================================================ */

const STORE_KEY = "rise_calisthenics_v2";
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let state = null;

const DEFAULT_STATE = () => ({
  profile: null,
  programId: "reset",
  programIds: ["reset"],
  programMeta: null,
  training: null,
  calibration: null,
  progress: {},
  nutritionLog: {},
  lifeReset: { challenges: [] },
  rewardLog: {},
  weightLog: [],
  calorieGoal: null,
  xp: 0,
  badges: [],
  startedAt: null,
  startDateISO: null,
});
function activeProgramIds() {
  if (state.programIds && state.programIds.length) return state.programIds;
  return [state.programId || "reset"];
}

/* ---------------- Persistenz ---------------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    state = raw ? JSON.parse(raw) : null;
    if (!raw) {
      const old = localStorage.getItem("rise_calisthenics_v1");
      if (old) { state = migrateV1(JSON.parse(old)); save(); return; }
    }
    if (!state) state = DEFAULT_STATE();
    // Nachrüsten neuer Felder für ältere Speicherstände
    if (!state.lifeReset) state.lifeReset = { challenges: state.profile ? defaultChallenges(state.profile) : [] };
    if (!state.rewardLog) state.rewardLog = {};
    if (!state.programIds || !state.programIds.length) state.programIds = [state.programId || "reset"];
    if (!state.startDateISO) state.startDateISO = state.startedAt ? localISO(new Date(state.startedAt)) : todayISO();
  } catch (e) { state = DEFAULT_STATE(); }
}
function migrateV1(o) {
  const s = DEFAULT_STATE();
  s.profile = o.profile; s.progress = o.progress || {}; s.weightLog = o.weightLog || [];
  s.xp = o.xp || 0; s.badges = o.badges || []; s.startedAt = o.startedAt;
  if (o.profile) {
    s.programId = "reset";
    s.training = initTraining(null, o.profile);
    s.programMeta = generateStructure(o.profile, "reset");
    s.lifeReset = { challenges: defaultChallenges(o.profile) };
  }
  return s;
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ---------------- Helpers ---------------- */
function localISO(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function todayISO() { return localISO(new Date()); }
function dateMs(iso) { const [y, m, dd] = iso.split("-").map(Number); return Date.UTC(y, m - 1, dd); }
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

/* Echter Kalender-Tag: zählt ab Startdatum, wechselt um Mitternacht –
   NICHT abhängig davon, ob ein Workout erledigt wurde. */
function currentDay() {
  if (!state.programMeta) return 1;
  const start = state.startDateISO || todayISO();
  const d = Math.floor((dateMs(todayISO()) - dateMs(start)) / 86400000) + 1;
  return clamp(d, 1, TOTAL_DAYS);
}
function dayProgress(day) {
  if (!state.progress[day]) state.progress[day] = { exercises: {}, perf: {}, habits: {}, water: 0 };
  if (!state.progress[day].perf) state.progress[day].perf = {};
  return state.progress[day];
}
function level() { return Math.floor(state.xp / 500) + 1; }
function xpInLevel() { return state.xp % 500; }
function completedWorkouts() { return Object.values(state.progress).filter((p) => p.workoutDone).length; }
function totalWorkouts() { return state.programMeta ? state.programMeta.days.filter((d) => d.type === "workout").length : 0; }
function habitsDoneCount() {
  let n = 0; Object.values(state.progress).forEach((p) => { if (p.habits) n += Object.values(p.habits).filter(Boolean).length; });
  return n;
}
function streak() {
  const cur = currentDay();
  const isDone = (i) => {
    const d = state.programMeta.days[i - 1], p = state.progress[i];
    return d && (d.type === "workout" ? (p && p.workoutDone) : (p && p.done));
  };
  let s = 0;
  let i = isDone(cur) ? cur : cur - 1; // heute zählt nur, wenn schon erledigt
  for (; i >= 1; i--) { if (isDone(i)) s++; else break; }
  return s;
}

/* ---------------- XP & Badges ---------------- */
function addXP(n) {
  const before = level(); state.xp += n; const after = level();
  if (after > before) { toast(`Level ${after} erreicht`); if (after >= 5) unlock("level5"); }
}
function unlock(id) {
  if (!state.badges.includes(id)) {
    state.badges.push(id);
    const b = BADGES.find((x) => x.id === id);
    if (b) toast(`Erfolg freigeschaltet: ${b.name}`);
  }
}
function checkBadges() {
  if (completedWorkouts() >= 1) unlock("first");
  const st = streak();
  if (st >= 3) unlock("streak3"); if (st >= 7) unlock("streak7"); if (st >= 30) unlock("streak30");
  const w1 = state.programMeta.days.filter((d) => d.week === 1 && d.type === "workout");
  if (w1.length && w1.every((d) => state.progress[d.day] && state.progress[d.day].workoutDone)) unlock("week1");
  if (state.progress[33] && (state.progress[33].workoutDone || state.progress[33].done)) unlock("half");
  const last = state.progress[TOTAL_DAYS];
  if (last && (last.workoutDone || last.done)) unlock("finish");
  if (challengeDaysMet(state.lifeReset.challenges) >= 50) unlock("habit50");
  if (level() >= 5) unlock("level5");
}

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg) {
  let e = $("#toast"); if (!e) { e = el("div"); e.id = "toast"; document.body.appendChild(e); }
  e.textContent = msg; e.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => e.classList.remove("show"), 2800);
}

/* ============================================================
   ONBOARDING (3 Schritte: Profil -> Programm -> Test)
   ============================================================ */
let obDraft = {};
function renderOnboarding(step = 1) {
  const app = $("#app");
  if (step === 1) return obProfile(app);
  if (step === 2) return obProgram(app);
  if (step === 3) return obCalibration(app);
  if (step === 4) return obReset(app);
}
function stepDots(active) {
  return `<div class="steps">${[1,2,3,4].map(i=>`<span class="dot ${i<active?'done':i===active?'active':''}"></span>`).join('')}</div>`;
}

function obProfile(app) {
  app.innerHTML = `
    <div class="onboard">
      <div class="ob-hero">
        <img class="ob-hero-img" src="${unsplashURL(IMG.heroOnboard, 900)}" alt=""/>
        <div class="ob-hero-content">
          <div class="logo hero-logo">RISE</div>
          <p class="tagline light">66 Tage. Ein Körper. Ein neues Ich.</p>
        </div>
      </div>
      <div class="onboard-inner">
      ${stepDots(1)}
      <form id="ob-form" class="card">
        <h2>Erzähl mir von dir</h2>
        <p class="muted">Schritt 1 von 4 · Deine Basisdaten</p>
        <label>Name<input name="name" required placeholder="Dein Name" value="${obDraft.name||''}"/></label>
        <div class="row">
          <label>Alter<input name="age" type="number" min="12" max="99" required placeholder="25" value="${obDraft.age||''}"/></label>
          <label>Geschlecht<select name="gender">
            <option value="m" ${obDraft.gender==='m'?'selected':''}>Männlich</option>
            <option value="w" ${obDraft.gender==='w'?'selected':''}>Weiblich</option>
            <option value="d" ${obDraft.gender==='d'?'selected':''}>Divers</option>
          </select></label>
        </div>
        <div class="row">
          <label>Gewicht (kg)<input name="weight" type="number" min="30" max="250" step="0.1" required placeholder="75" value="${obDraft.weight||''}"/></label>
          <label>Zielgewicht (kg)<input name="targetWeight" type="number" min="30" max="250" step="0.1" required placeholder="72" value="${obDraft.targetWeight||''}"/></label>
        </div>
        <label>Größe (cm)<input name="height" type="number" min="120" max="230" required placeholder="180" value="${obDraft.height||''}"/></label>
        <label>Fitness-Level<select name="fitness">
          <option value="beginner" ${obDraft.fitness==='beginner'?'selected':''}>Anfänger – kaum/kein Calisthenics</option>
          <option value="intermediate" ${obDraft.fitness==='intermediate'?'selected':''}>Fortgeschritten – einige Klimmzüge/Liegestütze</option>
          <option value="advanced" ${obDraft.fitness==='advanced'?'selected':''}>Erfahren – sichere Grundübungen</option>
        </select></label>
        <label>Trainingstage pro Woche<select name="daysPerWeek">
          ${[2,3,4,5,6].map(n=>`<option value="${n}" ${(obDraft.daysPerWeek||3)==n?'selected':''}>${n} Tage${n===3?' (empfohlen)':''}</option>`).join('')}
        </select></label>
        <button type="submit" class="btn-primary big">Weiter → Programm wählen</button>
      </form>
      <p class="footnote">Alle Daten bleiben lokal auf deinem Gerät.</p>
      </div>
    </div>`;
  $("#ob-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    obDraft = {
      name: fd.get("name").trim(), age: +fd.get("age"), gender: fd.get("gender"),
      weight: +fd.get("weight"), targetWeight: +fd.get("targetWeight"), startWeight: +fd.get("weight"),
      height: +fd.get("height"), fitness: fd.get("fitness"), daysPerWeek: +fd.get("daysPerWeek"),
    };
    renderOnboarding(2);
  });
}

function obProgram(app) {
  if (!obDraft._programs) obDraft._programs = obDraft.programId ? [obDraft.programId] : [];
  app.innerHTML = `
    <div class="onboard"><div class="onboard-inner" style="padding-top:24px">
      <div class="brand"><div class="logo small">RISE</div></div>
      ${stepDots(2)}
      <h2 class="page-title" style="text-align:center">Wähl deine Ziele</h2>
      <p class="muted" style="text-align:center;margin-bottom:18px">Schritt 2 von 4 · Bis zu 2 kombinieren – z.B. „Erster Muscle-Up" + „Pistol Squat"</p>
      <div id="prog-list"></div>
      <button class="btn-primary big" id="ob-next2">Weiter</button>
      <button class="btn-secondary" id="ob-back" style="margin-top:10px">← Zurück</button>
      <div style="height:20px"></div>
    </div></div>`;
  const list = $("#prog-list");
  Object.values(PROGRAMS).forEach((p) => {
    const card = programCard(p, false);
    const sel = obDraft._programs.includes(p.id);
    const btn = el("button", sel ? "btn-primary" : "btn-secondary");
    btn.style.marginTop = "10px";
    btn.textContent = sel ? "✓ Ausgewählt" : "Auswählen";
    btn.addEventListener("click", () => {
      const i = obDraft._programs.indexOf(p.id);
      if (i > -1) obDraft._programs.splice(i, 1);
      else { if (obDraft._programs.length >= 2) { toast("Maximal 2 Programme"); return; } obDraft._programs.push(p.id); }
      obProgram(app);
    });
    card.querySelector(".prog-body").appendChild(btn);
    list.appendChild(card);
  });
  const next = $("#ob-next2");
  next.disabled = obDraft._programs.length === 0;
  next.addEventListener("click", () => {
    obDraft.programIds = obDraft._programs.slice();
    obDraft.programId = obDraft._programs[0];
    obDraft.goal = PROGRAMS[obDraft._programs[0]].goalDefault;
    renderOnboarding(3);
  });
  $("#ob-back").addEventListener("click", () => renderOnboarding(1));
}

function programCard(p, selectable) {
  const card = el("div", "card prog-card");
  const reqText = Object.keys(p.prereq).length
    ? `<div class="prereq">Voraussetzung: ${Object.entries(p.prereq).map(([k,v])=>`${reqLabel(k)} ${v}`).join(" · ")}</div>`
    : `<div class="prereq ok">Keine Voraussetzung – für jeden geeignet</div>`;
  card.innerHTML = `
    <div class="prog-photo">
      <img src="${unsplashURL(PROGRAM_IMG[p.id] || IMG.heroOnboard, 700)}" alt="" loading="lazy"/>
      <div class="pp-title"><div class="prog-tag">${p.tag}</div><div class="prog-name">${p.name}</div></div>
    </div>
    <div class="prog-body">
      <p class="prog-desc">${p.desc}</p>
      ${reqText}
      <div class="prog-goal">Ziel: <b>${p.milestone}</b></div>
      ${selectable ? `<button class="btn-primary" data-pid="${p.id}">Dieses Programm wählen</button>` : ''}
    </div>`;
  if (selectable) card.querySelector("button").addEventListener("click", () => {
    obDraft.programId = p.id;
    obDraft.goal = p.goalDefault;
    renderOnboarding(3);
  });
  return card;
}
function reqLabel(k) {
  return { hang: "Hang (Sek.)", rows: "Rudern", pullups: "Klimmzüge", dips: "Dips", squats: "Kniebeugen", pushups: "Liegestütze", plank: "Plank (Sek.)" }[k] || k;
}

function obCalibration(app) {
  app.innerHTML = `
    <div class="onboard"><div class="onboard-inner" style="padding-top:24px">
      <div class="brand"><div class="logo small">RISE</div></div>
      ${stepDots(3)}
      <h2 class="page-title" style="text-align:center">Kalibrierungs-Test</h2>
      <p class="muted" style="text-align:center;margin-bottom:6px">Schritt 3 von 4 · Dein Startniveau</p>
      <div class="card subtle" style="margin-bottom:16px">
        <p style="font-size:14px">Mach jetzt (oder schätze) deine Maximalwerte. Damit setze ich für <b>jede</b> Übung die perfekte Startschwierigkeit. Danach regelt sich alles nach jedem Workout automatisch nach. <span class="muted">Felder leer lassen = aus deinem Level geschätzt.</span></p>
      </div>
      <form id="calib-form" class="card">
        ${CALIB_FIELDS.map(f=>`
          <label>${f.label}
            <input name="${f.id}" type="number" min="0" max="999" placeholder="${f.placeholder}"/>
          </label>`).join('')}
        <button type="submit" class="btn-primary big">Plan erstellen & starten 🚀</button>
        <button type="button" class="btn-secondary" id="skip-calib" style="margin-top:10px">Test überspringen</button>
      </form>
      <button class="btn-secondary" id="ob-back2" style="margin-top:10px">← Zurück</button>
      <div style="height:24px"></div>
    </div></div>`;
  $("#ob-back2").addEventListener("click", () => renderOnboarding(2));
  $("#skip-calib").addEventListener("click", () => { obDraft._calib = null; renderOnboarding(4); });
  $("#calib-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target); const calib = {};
    CALIB_FIELDS.forEach((f) => { const v = fd.get(f.id); if (v !== "" && v !== null) calib[f.id] = +v; });
    obDraft._calib = Object.keys(calib).length ? calib : null;
    renderOnboarding(4);
  });
}

/* Schritt 4: Life-Reset-Ziele (66-Tage Challenges) wählen */
function obReset(app) {
  if (!obDraft._reset) obDraft._reset = RESET_BUNDLE.slice();
  app.innerHTML = `
    <div class="onboard"><div class="onboard-inner" style="padding-top:24px">
      <div class="brand"><div class="logo small">RISE</div></div>
      ${stepDots(4)}
      <h2 class="page-title" style="text-align:center">Deine 66-Tage Mission</h2>
      <p class="muted" style="text-align:center;margin-bottom:14px">Schritt 4 von 4 · Wähl deine Lebensbereich-Ziele</p>
      <div class="card subtle" style="margin-bottom:16px"><p style="font-size:14px">Das ist das Herz von RISE: kumulative Ziele über die ganzen 66 Tage – wie <i>„2 Marathons, 5 Bücher, 40h Training, 220L Wasser"</i>. Tippe an, was du angehen willst. Die Standard-Auswahl ist <b>der klassische Rise</b>.</p></div>
      <div id="reset-list"></div>
      <button class="btn-primary big" id="reset-finish">Plan & Mission starten 🚀</button>
      <button class="btn-secondary" id="ob-back3" style="margin-top:10px">← Zurück</button>
      <div style="height:24px"></div>
    </div></div>`;
  const list = $("#reset-list");
  Object.keys(AREAS).forEach((areaKey) => {
    const area = AREAS[areaKey];
    const ids = Object.values(CHALLENGES).filter((c) => c.area === areaKey).map((c) => c.id);
    const sec = el("div", "reset-area");
    sec.innerHTML = `<div class="area-head" style="--ac:${area.color}">${area.label}</div>`;
    ids.forEach((id) => {
      const c = CHALLENGES[id];
      const sel = obDraft._reset.includes(id);
      const item = el("button", "ch-pick" + (sel ? " sel" : ""));
      item.innerHTML = `<span class="ch-ico">${icon(c.ic)}</span>
        <span class="ch-txt"><b>${c.label}</b><small>${c.headline}</small></span>
        <span class="ch-check">${sel ? "✓" : "+"}</span>`;
      item.addEventListener("click", () => {
        const i = obDraft._reset.indexOf(id);
        if (i === -1) obDraft._reset.push(id); else obDraft._reset.splice(i, 1);
        item.classList.toggle("sel");
        item.querySelector(".ch-check").textContent = obDraft._reset.includes(id) ? "✓" : "+";
      });
      sec.appendChild(item);
    });
    list.appendChild(sec);
  });
  $("#ob-back3").addEventListener("click", () => renderOnboarding(3));
  $("#reset-finish").addEventListener("click", () => finishOnboarding(obDraft._calib));
}
function fmtTotal(c) {
  if (c.type === "binary") return "täglich";
  if (c.id === "steps") return (c.d0 / 1000) + "k → " + (c.d1 / 1000) + "k";
  return c.d0 + " → " + c.d1 + (c.unit ? " " + c.unit : "") + "/Tag";
}

function finishOnboarding(calib) {
  const profile = obDraft;
  state.profile = profile;
  state.programIds = (obDraft.programIds && obDraft.programIds.length) ? obDraft.programIds.slice() : [obDraft.programId || "reset"];
  state.programId = state.programIds[0];
  state.calibration = calib;
  state.training = initTraining(calib, profile);
  state.programMeta = generateStructure(profile, state.programIds);
  // Life-Reset-Challenges aus Auswahl bauen (Wasser an Gewicht angepasst)
  const sel = (obDraft._reset && obDraft._reset.length) ? obDraft._reset : RESET_BUNDLE.slice();
  state.lifeReset = {
    challenges: sel.map((id) => {
      if (id !== "water") return makeChallenge(id);
      const w = waterTarget(profile.weight);
      return makeChallenge(id, { d0: Math.max(2, Math.round(w * 0.85 * 10) / 10), d1: Math.round(w * 1.2 * 10) / 10 });
    }),
  };
  state.calorieGoal = nutritionTargets(profile).kcal;
  state.rewardLog = {};
  state.startedAt = Date.now();
  state.startDateISO = todayISO();
  state.weightLog = [{ dateISO: todayISO(), kg: profile.weight }];
  state.xp = 0; state.badges = [];
  if (calib) unlock("kalib");
  if (state.programIds.some((id) => id !== "reset")) unlock("program");
  save();
  activeTab = "today";
  renderApp();
}

/* ============================================================
   HAUPT-APP
   ============================================================ */
let activeTab = "today";

/* Saubere SVG-Line-Icons (kein Emoji) für die Navigation */
const TAB_ICONS = {
  today: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  nutrition: '<svg viewBox="0 0 24 24"><path d="M12 8c0-3 2-5 5-5 0 4-2 6-5 6Z"/><path d="M12 8.5C10.5 6.5 8 6 6 7c-3 1.5-3 7-1 10.5 1.2 2 3 3.5 4.5 3 1-.3 1-1 2.5-1s1.5.7 2.5 1c1.5.5 3.3-1 4.5-3"/></svg>',
  progress: '<svg viewBox="0 0 24 24"><path d="M4 19.5V4M20 20H4"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
};

function renderApp() {
  if (!state.profile || !state.programMeta) { renderOnboarding(1); return; }
  checkBadges(); save();
  const app = $("#app");
  app.innerHTML = `
    <header class="topbar">
      <span class="logo small">RISE</span>
      <div class="topbar-stats">
        <div class="stat"><svg class="si" viewBox="0 0 24 24"><path d="M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c1.5-1 1-3 1-3 2 1.5 3 3.5 3 6a5 5 0 1 1-10 0c0-3 3-4 2-9 .5.5 2 1 3-3Z"/></svg><b>${streak()}</b><small>Streak</small></div>
        <div class="stat"><svg class="si" viewBox="0 0 24 24"><path d="M12 3.5 14.6 9l6 .5-4.5 4 1.4 5.9L12 16.8 6.5 19.4 7.9 13.5 3.4 9.5l6-.5Z"/></svg><b>Lvl ${level()}</b><small>${xpInLevel()}/500</small></div>
      </div>
    </header>
    <main id="tab-content"></main>
    <nav class="tabbar">
      <button data-tab="today" class="tab">${TAB_ICONS.today}Heute</button>
      <button data-tab="reset" class="tab">${TAB_ICONS.reset}Reset</button>
      <button data-tab="plan" class="tab">${TAB_ICONS.plan}Plan</button>
      <button data-tab="nutrition" class="tab">${TAB_ICONS.nutrition}Essen</button>
      <button data-tab="progress" class="tab">${TAB_ICONS.progress}Stats</button>
      <button data-tab="profile" class="tab">${TAB_ICONS.profile}Profil</button>
    </nav>`;
  $$(".tab").forEach((t) => t.addEventListener("click", () => { activeTab = t.dataset.tab; renderTab(); }));
  renderTab();
}
function renderTab() {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === activeTab));
  const c = $("#tab-content"); c.innerHTML = "";
  if (activeTab === "today") c.appendChild(renderToday());
  else if (activeTab === "reset") c.appendChild(renderReset());
  else if (activeTab === "plan") c.appendChild(renderPlan());
  else if (activeTab === "nutrition") c.appendChild(renderNutrition());
  else if (activeTab === "progress") c.appendChild(renderProgress());
  else if (activeTab === "profile") c.appendChild(renderProfile());
  c.scrollTop = 0;
}

/* ---------------- TAB: HEUTE ---------------- */
function renderToday() {
  const wrap = el("div", "view");
  const day = currentDay(); const d = state.programMeta.days[day - 1]; const p = dayProgress(day);
  const progTags = activeProgramIds().map((id) => `<span class="phase-tag">${PROGRAMS[id].name}</span>`).join("");
  const quote = QUOTES[(day - 1) % QUOTES.length];
  const pct = Math.round(((day - 1) / TOTAL_DAYS) * 100);

  wrap.innerHTML = `
    <div class="hero">
      <img class="hero-bg" src="${unsplashURL(IMG.heroToday, 900)}" alt=""/>
      <div class="hero-top">
        <div>
          <div class="hello">Willkommen zurück, ${state.profile.name}</div>
          <div class="day-badge">Tag ${day} <span class="muted">/ ${TOTAL_DAYS}</span></div>
        </div>
        <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
      </div>
      <div>
        <div class="hero-tags">${progTags}<span class="phase-tag">${d.phase}</span></div>
        <div class="quote">„${quote}"</div>
      </div>
    </div>`;

  if (d.type === "workout") {
    const ex = buildExercises(d, state.training);
    const lead = ex.find((e) => e.isSignature) || ex[0];
    const leadPhoto = exPhotoURL(lead.key, lead.levelIndex, 0);
    const card = el("div", "card workout-card");
    card.innerHTML = `
      <div class="wc-photo">
        ${leadPhoto ? `<img src="${leadPhoto}" alt="" loading="lazy"/>` : ''}
        ${p.workoutDone ? '<div class="status ok" style="position:absolute;top:12px;right:14px;z-index:2">✓ Erledigt</div>' : ''}
        <div class="wc-label">
          <div class="wc-kicker">${d.isTestDay ? 'Test-Tag' : 'Heutiges Workout'}</div>
          <h2 style="color:#fff">${d.focus}</h2>
        </div>
      </div>
      <div class="wc-body">
        <div class="muted" style="margin-bottom:12px;font-weight:600">${ex.length} Übungen · ${ex[0].sets} Sätze · ${d.restSec}s Pause</div>
        <div class="phase-note">${d.phaseNote||''}</div>
        <div class="ex-preview">${ex.map(e=>`<span class="chip">${e.name}${e.isSignature?' <span class="star">★</span>':''}</span>`).join('')}</div>
        <button class="btn-primary big" id="start-workout">${p.workoutDone?'Workout ansehen':'Workout starten'}</button>
      </div>`;
    card.querySelector("#start-workout").addEventListener("click", () => openWorkout(day));
    wrap.appendChild(card);
  } else {
    const card = el("div", "card rest-card");
    card.innerHTML = `<div class="kicker">${d.focus}</div>
      <h2>${d.type==='rest'?'Ruhetag':'Aktive Erholung'}</h2>
      <p class="muted">${d.note}</p>
      <button class="btn-primary" id="mark-rest">${p.done?'✓ Erledigt':'Tag abhaken'}</button>`;
    card.querySelector("#mark-rest").addEventListener("click", () => {
      p.done = true; addXP(40); checkBadges(); save(); renderApp(); toast("Erholung zählt auch! +40 XP");
    });
    wrap.appendChild(card);
  }

  wrap.appendChild(renderWeightCard());
  wrap.appendChild(renderRoutineCard());
  wrap.appendChild(calorieMiniCard());
  return wrap;
}

/* Tägliches Gewicht – schnell eintragen */
function renderWeightCard() {
  const iso = todayISO();
  const todayEntry = state.weightLog.find((e) => e.dateISO === iso);
  const pr = state.profile;
  const card = el("div", "card");
  if (todayEntry) {
    const diff = Math.round((todayEntry.kg - pr.startWeight) * 10) / 10;
    const diffTxt = diff === 0 ? "±0" : (diff > 0 ? "+" + diff : "" + diff);
    card.innerHTML = `<div class="kicker">Gewicht heute</div>
      <div class="weight-today"><b>${todayEntry.kg} kg</b>
        <span class="muted">Start ${pr.startWeight} · Ziel ${pr.targetWeight} kg · ${diffTxt} kg</span></div>
      <button class="link-btn" id="wt-edit">ändern</button>`;
    card.querySelector("#wt-edit").addEventListener("click", () => {
      state.weightLog = state.weightLog.filter((e) => e.dateISO !== iso); save(); renderTab();
    });
  } else {
    card.innerHTML = `<div class="kicker">Gewicht heute eintragen</div>
      <div class="weight-add"><input type="number" step="0.1" id="wt-input" placeholder="${pr.weight} kg"/><button class="btn-primary" id="wt-save" style="margin:0">Speichern</button></div>`;
    card.querySelector("#wt-save").addEventListener("click", () => {
      const v = +$("#wt-input").value || pr.weight;
      if (v < 30 || v > 250) { toast("Bitte gültiges Gewicht."); return; }
      state.weightLog.push({ dateISO: iso, kg: v }); pr.weight = v;
      addXP(10); save(); renderTab(); toast("Gewicht gespeichert · +10 XP");
    });
  }
  return card;
}

/* ---------------- Tägliche Routine (Life-Reset-Challenges) ---------------- */
function renderRoutineCard() {
  const card = el("div", "card");
  const chs = state.lifeReset.challenges;
  card.innerHTML = `<div class="card-head" style="margin-bottom:6px">
      <div class="kicker" style="margin:0">Heutige Routine</div>
      <button class="link-btn" id="routine-manage">verwalten</button></div>`;
  if (!chs.length) {
    card.insertAdjacentHTML("beforeend", `<p class="muted" style="font-size:14px">Noch keine Ziele gewählt. Tippe auf „verwalten", um deine 66-Tage-Mission zu starten.</p>`);
  } else {
    const list = el("div", "routine-list");
    chs.forEach((inst) => list.appendChild(routineRow(inst)));
    card.appendChild(list);
  }
  card.querySelector("#routine-manage").addEventListener("click", openManageChallenges);
  return card;
}

function routineRow(inst) {
  const meta = CHALLENGES[inst.id];
  const iso = todayISO();
  const today = challengeToday(inst, iso);
  const daily = challengeDailyForDay(inst, currentDay());
  const met = today >= daily - 1e-9;
  const row = el("div", "routine-row" + (met ? " met" : ""));

  if (meta.type === "binary") {
    row.classList.add("binary");
    row.innerHTML = `<span class="rr-ico">${icon(meta.ic)}</span>
      <span class="rr-info"><b>${meta.label}</b><small>Heute · ${met ? "erledigt" : "offen"}</small></span>
      <button class="rr-toggle ${met ? "on" : ""}">${met ? "✓" : ""}</button>`;
    row.querySelector(".rr-toggle").addEventListener("click", () => {
      setChallengeToday(inst, met ? 0 : 1); renderTab();
    });
    return row;
  }

  if (meta.id === "water") {
    const tgtL = Math.round(daily * 100) / 100;
    const glasses = Math.max(1, Math.round(tgtL / 0.25));
    const filled = Math.round(today / 0.25);
    row.innerHTML = `<div class="rr-top"><span class="rr-ico">${icon(meta.ic)}</span>
      <span class="rr-info"><b>${meta.label}</b><small>${today.toFixed(2)} / ${tgtL} L heute</small></span></div>
      <div class="glasses"></div>`;
    const g = row.querySelector(".glasses");
    for (let i = 0; i < glasses; i++) {
      const b = el("button", "glass" + (i < filled ? " full" : ""));
      b.textContent = "";
      b.addEventListener("click", () => { setChallengeToday(inst, (i < filled ? i : i + 1) * 0.25); renderTab(); });
      g.appendChild(b);
    }
    return row;
  }

  const disp = (v) => meta.id === "steps" ? Math.round(v) : (Math.round(v * 100) / 100);
  row.innerHTML = `<div class="rr-top"><span class="rr-ico">${icon(meta.ic)}</span>
      <span class="rr-info"><b>${meta.label}</b><small>${disp(today)} / ${disp(daily)} ${meta.unit} heute</small></span>
      <span class="rr-state">${met ? "✓" : ""}</span></div>
    <div class="quick-row"></div>`;
  const qr = row.querySelector(".quick-row");
  (meta.quick || []).forEach((q) => {
    const b = el("button", "quick-btn"); b.textContent = "+" + (meta.id === "steps" && q >= 1000 ? (q / 1000) + "k" : q);
    b.addEventListener("click", () => { addChallengeToday(inst, q); renderTab(); });
    qr.appendChild(b);
  });
  const custom = el("button", "quick-btn ghost"); custom.textContent = "…";
  custom.addEventListener("click", () => {
    const v = prompt(`${meta.label} – wie viel ${meta.unit} hinzufügen?`);
    const n = parseFloat((v || "").replace(",", "."));
    if (!isNaN(n) && n > 0) { addChallengeToday(inst, n); renderTab(); }
  });
  qr.appendChild(custom);
  return row;
}

function getChallenge(id) { return state.lifeReset.challenges.find((c) => c.id === id); }
function setChallengeToday(inst, value) {
  inst.logged[todayISO()] = Math.max(0, value);
  rewardChallenge(inst); save();
}
function addChallengeToday(inst, amount) {
  const iso = todayISO();
  inst.logged[iso] = (inst.logged[iso] || 0) + amount;
  rewardChallenge(inst); save();
}
function rewardChallenge(inst) {
  const iso = todayISO();
  const daily = challengeDailyForDay(inst, currentDay());
  const key = iso + "_" + inst.id;
  if ((inst.logged[iso] || 0) >= daily - 1e-9 && !state.rewardLog[key]) {
    state.rewardLog[key] = true;
    addXP(15);
    const meta = CHALLENGES[inst.id];
    toast(`Tagesziel erreicht: ${meta.label} · +15 XP`);
    checkBadges();
  }
}

function calorieGoal() { return state.calorieGoal || nutritionTargets(state.profile).kcal; }

function calorieMiniCard() {
  const goal = calorieGoal();
  const prot = nutritionTargets(state.profile).protein;
  const log = state.nutritionLog[todayISO()] || { items: [] };
  const kcal = log.items.reduce((s, i) => s + i.kcal, 0);
  const protToday = log.items.reduce((s, i) => s + i.protein, 0);
  const card = el("div", "card mini-nutri");
  card.innerHTML = `
    <div class="kicker">Ernährung heute</div>
    <div class="nutri-mini-row">
      <div><b>${kcal}</b> <span class="muted">/ ${goal} kcal</span></div>
      <div><b>${protToday}g</b> <span class="muted">/ ${prot}g Protein</span></div>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${Math.min(100,(kcal/goal)*100)}%"></div></div>
    <button class="btn-secondary" id="go-nutri">Mahlzeit eintragen</button>`;
  card.querySelector("#go-nutri").addEventListener("click", () => { activeTab = "nutrition"; renderTab(); });
  return card;
}

/* ============================================================
   WORKOUT (Overlay) – Animation, Timer, Sätze, Anstrengung
   ============================================================ */
function openWorkout(day) {
  const d = state.programMeta.days[day - 1];
  const p = dayProgress(day);
  const ex = buildExercises(d, state.training);
  const overlay = el("div", "overlay"); overlay.id = "workout-overlay";

  let html = `
    <div class="overlay-inner">
      <div class="overlay-head">
        <button class="back" id="close-wo">← Zurück</button>
        <div class="overlay-title">${d.focus} · Tag ${day}</div>
        <button class="timer-btn" id="open-timer">Timer</button>
      </div>
      <div class="wo-body">
        <div class="card subtle"><div class="kicker">Aufwärmen · ~5 Min.</div>
          <ul class="mini-list">${d.warmup.map(w=>`<li>${w.name} – <span class="muted">${w.detail}</span></li>`).join('')}</ul></div>`;

  ex.forEach((e) => {
    if (!p.exercises[e.key] || p.exercises[e.key].length !== e.sets) p.exercises[e.key] = Array(e.sets).fill(false);
    const eff = (p.perf[e.key] && p.perf[e.key].effort) || null;
    html += `
      <div class="card ex-card" data-key="${e.key}">
        <div class="ex-demo-wrap">
          ${exerciseDemo(e.key, e.levelIndex)}
          ${e.isSignature?'<div class="sig-pill">SKILL</div>':''}
          <div class="lvl-pill">Stufe ${e.levelIndex+1}/${e.maxLevel+1}</div>
        </div>
        <div class="ex-inner">
          <div class="ex-name">${e.name}</div>
          <div class="ex-meta muted">${e.category}</div>
          ${e.needs?`<div class="needs">Benötigt: ${e.needs}</div>`:''}
          <div class="ex-cue">${e.cue}</div>
          <div class="ex-target">Ziel: <b>${e.sets} × ${e.target} ${e.unit}</b>
            ${e.type==='hold'?`<button class="mini-timer" data-sec="${e.target}">▶ ${e.target}s Timer</button>`:''}
          </div>
          <div class="sets" data-key="${e.key}">
            ${p.exercises[e.key].map((s,si)=>`<button class="set-chip ${s?'done':''}" data-si="${si}">${si+1}</button>`).join('')}
          </div>
          <div class="effort" data-key="${e.key}">
            <span class="effort-label">Wie waren die Sätze?</span>
            <button class="eff ${eff==='hard'?'sel':''}" data-eff="hard">Zu schwer</button>
            <button class="eff ${eff==='ok'?'sel':''}" data-eff="ok">Passend</button>
            <button class="eff ${eff==='easy'?'sel':''}" data-eff="easy">Zu leicht</button>
          </div>
        </div>
      </div>`;
  });

  if (d.finisher) html += `<div class="card subtle"><div class="kicker">Finisher</div><p>${d.finisher.name} – <span class="muted">${d.finisher.detail}</span></p></div>`;
  html += `<div class="card subtle"><div class="kicker">Cooldown</div>
      <ul class="mini-list">${d.mobility.map(m=>`<li>${m.name} – <span class="muted">${m.detail}</span></li>`).join('')}</ul></div>
      <button class="btn-primary big" id="finish-wo">Workout abschließen</button><div style="height:30px"></div>
    </div></div>`;
  overlay.innerHTML = html;
  document.body.appendChild(overlay); document.body.style.overflow = "hidden";

  overlay.querySelector("#close-wo").addEventListener("click", closeWorkout);
  overlay.querySelector("#open-timer").addEventListener("click", () => openTimer(d.restSec, "Pause"));

  overlay.querySelectorAll(".sets").forEach((row) => {
    const key = row.dataset.key;
    row.querySelectorAll(".set-chip").forEach((chip) => chip.addEventListener("click", () => {
      const si = +chip.dataset.si;
      p.exercises[key][si] = !p.exercises[key][si];
      chip.classList.toggle("done", p.exercises[key][si]);
      save();
      if (p.exercises[key][si]) openTimer(d.restSec, "Pause"); // Pause-Timer nach jedem Satz
    }));
  });
  overlay.querySelectorAll(".mini-timer").forEach((b) => b.addEventListener("click", () => openTimer(+b.dataset.sec, "Halten")));
  overlay.querySelectorAll(".effort").forEach((row) => {
    const key = row.dataset.key;
    row.querySelectorAll(".eff").forEach((b) => b.addEventListener("click", () => {
      if (!p.perf[key]) p.perf[key] = {};
      p.perf[key].effort = b.dataset.eff;
      row.querySelectorAll(".eff").forEach(x => x.classList.remove("sel"));
      b.classList.add("sel"); save();
    }));
  });

  overlay.querySelector("#finish-wo").addEventListener("click", () => finishWorkout(day, d, ex));
}

function finishWorkout(day, d, ex) {
  const p = dayProgress(day);
  let levelUps = 0; const changes = [];
  ex.forEach((e) => {
    const arr = p.exercises[e.key] || [];
    const score = arr.length ? arr.filter(Boolean).length / arr.length : 0;
    const effort = (p.perf[e.key] && p.perf[e.key].effort) || "ok";
    const r = adjustTraining(state.training, e.key, score, effort);
    const lv = state.training[e.key].level;
    const name = PROGRESSIONS[e.key].levels[lv].name;
    if (r.leveledUp) { levelUps++; changes.push({ dir: "up", key: e.key, level: lv, name }); }
    else if (r.leveledDown) { changes.push({ dir: "down", key: e.key, level: lv, name }); }
  });
  if (levelUps) unlock("levelup");

  p.workoutDone = true; p.dateISO = todayISO();
  const allSets = ex.every((e) => (p.exercises[e.key] || []).every(Boolean));
  addXP(allSets ? 120 : 80);
  if (new Date().getHours() < 9) unlock("early");
  contributeFromWorkout(d, ex, p);
  const iso = todayISO();
  const allCh = state.lifeReset.challenges.length &&
    state.lifeReset.challenges.every((inst) => (inst.logged[iso] || 0) >= challengeDailyForDay(inst, currentDay()) - 1e-9);
  if (allCh) unlock("perfect");
  checkBadges(); save(); closeWorkout();

  if (changes.length) showCalibResult(changes, allSets);
  else { toast(allSets ? "Stark! Alle Sätze geschafft · +120 XP" : "Workout erledigt · +80 XP"); renderApp(); }
}

/* Workout zählt automatisch auf passende Challenges ein */
function contributeFromWorkout(d, ex, p) {
  // Trainingszeit (h)
  const gym = getChallenge("gym");
  if (gym) {
    const totalSets = ex.reduce((s, e) => s + e.sets, 0);
    const minutes = totalSets * (d.restSec + 40) / 60 + 8; // + Aufwärmen/Cooldown
    addChallengeToday(gym, Math.round((minutes / 60) * 100) / 100);
  }
  // Liegestütze: erledigte Sätze der Push-Übung × Zielwiederholungen
  const pu = getChallenge("pushups");
  if (pu) {
    let reps = 0;
    ex.forEach((e) => {
      if (e.key === "push" || e.key === "dips") {
        const done = (p.exercises[e.key] || []).filter(Boolean).length;
        reps += done * e.target;
      }
    });
    if (reps > 0) addChallengeToday(pu, reps);
  }
}

function showCalibResult(changes, allSets) {
  const ups = changes.filter((c) => c.dir === "up").length;
  const downs = changes.filter((c) => c.dir === "down").length;
  const title = ups && !downs ? "Stufe aufgestiegen" : (!ups && downs ? "Intensität angepasst" : "Training kalibriert");
  const sub = downs
    ? "Deine Engine hat live nachjustiert – schwerere Übungen wurden leichter gemacht, damit du sauber weitertrainierst."
    : "Du wirst stärker. Deine nächste Einheit wird automatisch anspruchsvoller.";
  const arrowUp = '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const arrowDown = '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
  const ov = el("div", "overlay"); ov.id = "calib-result";
  ov.innerHTML = `<div class="overlay-inner"><div class="calib-screen">
      <div class="calib-emoji">${arrowUp}</div>
      <h1>${title}</h1>
      <p class="calib-sub">${sub}</p>
      <div class="calib-list">
        ${changes.map((c) => {
          const photo = exPhotoURL(c.key, c.level, 0);
          return `<div class="calib-item ${c.dir}">
            <div class="calib-thumb">${photo ? `<img src="${photo}" alt="" loading="lazy"/>` : ''}</div>
            <div class="calib-info">
              <div class="ci-label">${c.dir === 'up' ? 'Neue Stufe' : 'Jetzt leichter'}</div>
              <div class="ci-name">${c.name}</div>
            </div>
            <div class="calib-tag">${c.dir === 'up' ? arrowUp : arrowDown} ${c.dir === 'up' ? 'Schwerer' : 'Leichter'}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="calib-xp">+${allSets ? 120 : 80} XP</div>
      <button class="btn-primary big" id="result-ok">Weiter</button>
    </div></div>`;
  document.body.appendChild(ov); document.body.style.overflow = "hidden";
  ov.querySelector("#result-ok").addEventListener("click", () => { ov.remove(); document.body.style.overflow = ""; renderApp(); });
}

function closeWorkout() { const o = $("#workout-overlay"); if (o) o.remove(); document.body.style.overflow = ""; }

/* ---------------- TIMER ---------------- */
let timerInt = null;
function openTimer(seconds, label) {
  closeTimer();
  const ov = el("div", "timer-overlay"); ov.id = "timer-overlay";
  let remaining = seconds;
  ov.innerHTML = `
    <div class="timer-card">
      <div class="timer-label">${label}</div>
      <div class="timer-time" id="t-time">${fmtTime(remaining)}</div>
      <div class="timer-actions">
        <button class="btn-secondary" id="t-minus">−15s</button>
        <button class="btn-secondary" id="t-plus">+15s</button>
      </div>
      <button class="btn-primary" id="t-close">Schließen</button>
    </div>`;
  document.body.appendChild(ov);
  const tt = ov.querySelector("#t-time");
  const tick = () => {
    remaining--; tt.textContent = fmtTime(Math.max(0, remaining));
    if (remaining <= 0) { beep(); tt.textContent = "Fertig! ✅"; clearInterval(timerInt); timerInt = null; }
  };
  timerInt = setInterval(tick, 1000);
  ov.querySelector("#t-minus").addEventListener("click", () => { remaining = Math.max(1, remaining - 15); tt.textContent = fmtTime(remaining); });
  ov.querySelector("#t-plus").addEventListener("click", () => { remaining += 15; tt.textContent = fmtTime(remaining); });
  ov.querySelector("#t-close").addEventListener("click", closeTimer);
}
function closeTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } const o = $("#timer-overlay"); if (o) o.remove(); }
function fmtTime(s) { const m = Math.floor(s / 60), x = s % 60; return m ? `${m}:${String(x).padStart(2,'0')}` : `${x}s`; }
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; o.type = "sine";
    g.gain.setValueAtTime(0.25, ctx.currentTime); o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6); o.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}

/* ---------------- TAB: RESET (66-Tage Mission Dashboard) ---------------- */
function renderReset() {
  const wrap = el("div", "view");
  const chs = state.lifeReset.challenges;
  const day = currentDay();
  const daysLeft = TOTAL_DAYS - day + 1;

  // Gesamtfortschritt = Durchschnitt der Challenge-Prozente
  let overall = 0;
  if (chs.length) overall = Math.round(chs.reduce((s, inst) => s + Math.min(1, challengeSum(inst) / challengeTotal(inst)), 0) / chs.length * 100);

  wrap.innerHTML = `
    <h1 class="page-title">66-Tage Mission</h1>
    <div class="mission-hero">
      <div class="ring big-ring" style="--p:${overall}"><span>${overall}%</span></div>
      <div class="mission-meta">
        <div class="mm-day">Tag ${day} / ${TOTAL_DAYS}</div>
        <div class="muted">${daysLeft} Tage übrig · ${chs.length} Ziele</div>
      </div>
    </div>
    <button class="btn-secondary" id="manage-ch" style="margin-bottom:16px">Ziele verwalten</button>
  `;
  wrap.querySelector("#manage-ch").addEventListener("click", openManageChallenges);

  if (!chs.length) {
    wrap.insertAdjacentHTML("beforeend", `<div class="card"><p class="muted">Noch keine Ziele. Tippe oben auf „Ziele verwalten".</p></div>`);
    return wrap;
  }

  // gruppiert nach Lebensbereich
  Object.keys(AREAS).forEach((areaKey) => {
    const inAreas = chs.filter((inst) => CHALLENGES[inst.id].area === areaKey);
    if (!inAreas.length) return;
    const area = AREAS[areaKey];
    const sec = el("div", "reset-area-block");
    sec.innerHTML = `<div class="area-head" style="--ac:${area.color}">${area.label}</div>`;
    inAreas.forEach((inst) => sec.appendChild(challengeBigCard(inst, day)));
    wrap.appendChild(sec);
  });
  return wrap;
}

function challengeBigCard(inst, day) {
  const meta = CHALLENGES[inst.id];
  const sum = challengeSum(inst);
  const total = challengeTotal(inst);
  const pct = Math.min(100, Math.round((sum / total) * 100));
  const pace = challengePaceTarget(inst, day);
  const onTrack = sum >= pace * 0.97;
  const close = !onTrack && sum >= pace * 0.7;
  const paceTxt = onTrack ? "im Plan" : close ? "leicht zurück" : "zurück";
  const disp = (v) => meta.id === "steps" ? Math.round(v).toLocaleString("de-DE") : (Math.round(v * 100) / 100);
  const remaining = Math.max(0, total - sum);
  const card = el("div", "card ch-card");
  card.innerHTML = `
    <div class="ch-card-head">
      <span class="ch-ico">${icon(meta.ic)}</span>
      <div class="ch-card-info"><b>${meta.label}</b><small class="muted">${meta.headline}</small></div>
      <span class="pace ${onTrack ? "ok" : close ? "warn" : "bad"}">${paceTxt}</span>
    </div>
    <div class="ch-bar"><div class="ch-fill" style="width:${pct}%;background:${AREAS[meta.area].color}"></div></div>
    <div class="ch-nums"><b>${disp(sum)}</b> / ${disp(total)} ${meta.unit} <span class="muted">· ${pct}% · noch ${disp(remaining)}</span></div>
  `;
  card.addEventListener("click", () => { activeTab = "today"; renderApp(); });
  return card;
}

/* Overlay: Challenges hinzufügen/entfernen + Ziel anpassen */
function openManageChallenges() {
  const ov = el("div", "overlay"); ov.id = "manage-overlay";
  let html = `<div class="overlay-inner"><div class="overlay-head">
    <button class="back" id="close-manage">← Zurück</button><div class="overlay-title">Ziele verwalten</div></div>
    <div class="wo-body"><p class="muted" style="margin-bottom:14px">Ziele an/aus. Bei aktiven kannst du Start- und Endwert pro Tag anpassen (steigert sich automatisch über 66 Tage).</p>`;
  Object.keys(AREAS).forEach((areaKey) => {
    const area = AREAS[areaKey];
    const ids = Object.values(CHALLENGES).filter((c) => c.area === areaKey).map((c) => c.id);
    html += `<div class="area-head" style="--ac:${area.color}">${area.label}</div>`;
    ids.forEach((id) => {
      const c = CHALLENGES[id];
      const inst = getChallenge(id);
      const active = !!inst;
      html += `<div class="manage-row" data-id="${id}">
        <button class="ch-pick ${active ? "sel" : ""}" data-toggle="${id}">
          <span class="ch-ico">${icon(c.ic)}</span>
          <span class="ch-txt"><b>${c.label}</b><small>${c.headline}</small></span>
          <span class="ch-check">${active ? "✓" : "+"}</span>
        </button>
        ${active && c.type !== "binary" ? `<div class="target-edit"><span class="muted">Start/Tag</span>
          <input type="number" min="0" step="${c.step || 1}" value="${inst.d0}" data-d0="${id}"/>
          <span class="muted">Ziel/Tag</span>
          <input type="number" min="0" step="${c.step || 1}" value="${inst.d1}" data-d1="${id}"/></div>` : ""}
      </div>`;
    });
  });
  html += `<div style="height:30px"></div></div></div>`;
  ov.innerHTML = html; document.body.appendChild(ov); document.body.style.overflow = "hidden";

  ov.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.toggle; const inst = getChallenge(id);
    if (inst) state.lifeReset.challenges = state.lifeReset.challenges.filter((c) => c.id !== id);
    else {
      if (id === "water") { const w = waterTarget(state.profile.weight); state.lifeReset.challenges.push(makeChallenge(id, { d0: Math.max(2, Math.round(w * 0.85 * 10) / 10), d1: Math.round(w * 1.2 * 10) / 10 })); }
      else state.lifeReset.challenges.push(makeChallenge(id));
    }
    save(); ov.remove(); document.body.style.overflow = ""; openManageChallenges();
  }));
  ov.querySelectorAll("[data-d0]").forEach((inp) => inp.addEventListener("change", () => {
    const inst = getChallenge(inp.dataset.d0); const v = parseFloat(inp.value);
    if (inst && !isNaN(v) && v >= 0) { inst.d0 = v; save(); toast("Startwert angepasst."); }
  }));
  ov.querySelectorAll("[data-d1]").forEach((inp) => inp.addEventListener("change", () => {
    const inst = getChallenge(inp.dataset.d1); const v = parseFloat(inp.value);
    if (inst && !isNaN(v) && v >= 0) { inst.d1 = v; save(); toast("Zielwert angepasst."); }
  }));
  ov.querySelector("#close-manage").addEventListener("click", () => { ov.remove(); document.body.style.overflow = ""; activeTab = activeTab; renderApp(); });
}

/* ---------------- TAB: PLAN ---------------- */
function renderPlan() {
  const wrap = el("div", "view");
  const progLine = activeProgramIds().map((id) => `<b>${PROGRAMS[id].name}</b>`).join(" + ");
  const goals = activeProgramIds().map((id) => PROGRAMS[id].milestone).join(" · ");
  wrap.innerHTML = `<h1 class="page-title">Dein 66-Tage-Plan</h1>
    <div class="card subtle" style="margin-bottom:16px">${progLine}<div class="muted" style="font-size:13px;margin-top:4px">Ziel: ${goals}</div></div>`;
  const cur = currentDay();
  for (let w = 1; w <= 10; w++) {
    const wd = state.programMeta.days.filter((d) => d.week === w);
    if (!wd.length) break;
    const sec = el("div", "week-block");
    sec.innerHTML = `<div class="week-head"><span>Woche ${w}</span><span class="phase-pill">${wd[0].phase}</span></div>`;
    const grid = el("div", "day-grid");
    wd.forEach((d) => {
      const p = state.progress[d.day];
      const done = d.type === "workout" ? (p && p.workoutDone) : (p && p.done);
      const cell = el("button", "day-cell " + d.type + (done?' done':'') + (d.day===cur?' current':''));
      cell.innerHTML = `<div class="dc-num">${d.day}</div><div class="dc-focus">${shortFocus(d)}</div>${done?'<div class="dc-check">✓</div>':''}`;
      cell.addEventListener("click", () => { if (d.type === "workout") openWorkout(d.day); else { activeTab = "today"; renderApp(); } });
      grid.appendChild(cell);
    });
    sec.appendChild(grid); wrap.appendChild(sec);
  }
  return wrap;
}
function shortFocus(d) {
  if (d.type === "rest") return "Ruhe"; if (d.type === "active") return "Aktiv";
  return d.focus.replace(/\s*\(.*\)/, "").replace("Ganzkörper ", "GK ");
}

/* ---------------- TAB: ERNÄHRUNG ---------------- */
function renderNutrition() {
  const wrap = el("div", "view");
  const t = nutritionTargets(state.profile);
  const iso = todayISO();
  if (!state.nutritionLog[iso]) state.nutritionLog[iso] = { items: [] };
  const log = state.nutritionLog[iso];
  const kcal = log.items.reduce((s, i) => s + i.kcal, 0);
  const prot = log.items.reduce((s, i) => s + i.protein, 0);

  const goal = calorieGoal();
  wrap.innerHTML = `<h1 class="page-title">Ernährung</h1>
    <div class="card">
      <div class="card-head" style="margin-bottom:8px"><div class="kicker" style="margin:0">Dein Tagesziel</div><button class="link-btn" id="edit-kcal">anpassen</button></div>
      <div class="nutri-rings">
        ${ring2(kcal, goal, "kcal", "#ff6a3d")}
        ${ring2(prot, t.protein, "g Protein", "#4aa8ff")}
      </div>
      <div class="nutri-info muted">Grundumsatz ${t.bmr} · Verbrauch ~${t.tdee} kcal/Tag · Ziel: „${goalLabel(state.profile.goal)}"</div>
    </div>
    <div class="card">
      <div class="kicker">Schnell hinzufügen</div>
      <div class="preset-grid">${FOOD_PRESETS.map((f,i)=>`<button class="preset" data-i="${i}">${f.name}<small>${f.kcal} kcal · ${f.protein}g P</small></button>`).join('')}</div>
    </div>
    <div class="card">
      <div class="kicker">Eigene Mahlzeit</div>
      <form id="food-form" class="food-form">
        <input name="name" placeholder="Name" required/>
        <div class="row">
          <input name="kcal" type="number" min="0" placeholder="kcal" required/>
          <input name="protein" type="number" min="0" placeholder="Protein g" required/>
        </div>
        <button class="btn-secondary" type="submit">Hinzufügen</button>
      </form>
    </div>
    <div class="card">
      <div class="kicker">Mahlzeiten heute (${log.items.length})</div>
      <div id="food-list"></div>
    </div>`;

  wrap.querySelector("#edit-kcal").addEventListener("click", () => {
    const v = prompt("Wie viele Kalorien willst du allgemein pro Tag essen?", calorieGoal());
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1000 && n <= 6000) { state.calorieGoal = n; save(); renderTab(); toast("Kalorienziel gesetzt."); }
  });
  wrap.querySelectorAll(".preset").forEach((b) => b.addEventListener("click", () => { addFood({ ...FOOD_PRESETS[+b.dataset.i] }); }));
  wrap.querySelector("#food-form").addEventListener("submit", (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    addFood({ name: fd.get("name"), kcal: +fd.get("kcal"), protein: +fd.get("protein") });
  });
  const fl = wrap.querySelector("#food-list");
  if (!log.items.length) fl.innerHTML = `<p class="muted" style="font-size:14px">Noch nichts eingetragen.</p>`;
  log.items.forEach((it, idx) => {
    const row = el("div", "food-row");
    row.innerHTML = `<span>${it.name}</span><span class="muted">${it.kcal} kcal · ${it.protein}g</span><button class="food-del" data-i="${idx}">✕</button>`;
    row.querySelector(".food-del").addEventListener("click", () => { log.items.splice(idx, 1); save(); renderTab(); });
    fl.appendChild(row);
  });
  return wrap;
}
function addFood(item) {
  const iso = todayISO();
  if (!state.nutritionLog[iso]) state.nutritionLog[iso] = { items: [] };
  state.nutritionLog[iso].items.push(item);
  const goal = calorieGoal();
  const t = nutritionTargets(state.profile);
  const kcal = state.nutritionLog[iso].items.reduce((s, i) => s + i.kcal, 0);
  if (kcal >= goal * 0.9 && kcal <= goal * 1.08) { unlock("nutri"); }
  const prot = state.nutritionLog[iso].items.reduce((s, i) => s + i.protein, 0);
  if (prot >= t.protein && !state.nutritionLog[iso]._protXP) { state.nutritionLog[iso]._protXP = true; addXP(25); toast("Proteinziel erreicht · +25 XP"); }
  save(); renderTab();
}
function ring2(val, target, label, color) {
  const pct = Math.min(100, Math.round((val / target) * 100));
  return `<div class="nring" style="--p:${pct};--c:${color}">
    <div class="nring-in"><b>${val}</b><small>/${target}</small></div>
    <div class="nring-lbl">${label} · ${pct}%</div></div>`;
}
function goalLabel(g) { return { muscle: "Muskelaufbau", strength: "Maximale Kraft", fatloss: "Fettverlust", endurance: "Ausdauer" }[g]; }

/* ---------------- TAB: STATS ---------------- */
function renderProgress() {
  const wrap = el("div", "view");
  const cw = completedWorkouts(), tw = totalWorkouts();
  const pr = state.profile;
  wrap.innerHTML = `<h1 class="page-title">Fortschritt</h1>
    <div class="stat-grid">
      <div class="card stat-box"><div class="big-num">${cw}<small>/${tw}</small></div><div class="muted">Workouts</div></div>
      <div class="card stat-box"><div class="big-num">${streak()}</div><div class="muted">Streak 🔥</div></div>
      <div class="card stat-box"><div class="big-num">${state.xp}</div><div class="muted">Gesamt-XP</div></div>
      <div class="card stat-box"><div class="big-num">${challengeDaysMet(state.lifeReset.challenges)}</div><div class="muted">Ziel-Tage 🎯</div></div>
    </div>`;

  // Trainingsniveau
  const lvlCard = el("div", "card");
  lvlCard.innerHTML = `<div class="kicker">Dein aktuelles Niveau</div>`;
  Object.entries(state.training).forEach(([key, t]) => {
    const prog = PROGRESSIONS[key];
    const pctL = Math.round((t.level / (prog.levels.length - 1)) * 100);
    const thumb = exPhotoURL(key, t.level, 0);
    const row = el("div", "lvl-row");
    row.innerHTML = `<div class="lvl-name">${thumb?`<img class="lvl-thumb" src="${thumb}" alt="" loading="lazy"/>`:''}${prog.levels[t.level].name}</div>
      <div class="lvl-bar"><div class="lvl-fill" style="width:${pctL}%"></div></div>
      <div class="lvl-tag muted">Stufe ${t.level+1}/${prog.levels.length} · Ziel ${t.reps} ${prog.levels[t.level].type==='hold'?'Sek.':'Wdh.'}</div>`;
    lvlCard.appendChild(row);
  });
  wrap.appendChild(lvlCard);

  // Gewicht
  const wc = el("div", "card");
  wc.innerHTML = `<div class="kicker">Gewichtsverlauf</div>
    <div class="weight-now"><b>${pr.weight} kg</b> <span class="muted">Start: ${pr.startWeight} · Ziel: ${pr.targetWeight} kg</span></div>
    <div id="weight-chart"></div>
    <div class="weight-add"><input type="number" step="0.1" id="weight-input" placeholder="Heutiges Gewicht (kg)"/><button class="btn-secondary" id="log-weight">Eintragen</button></div>`;
  wrap.appendChild(wc);
  wc.querySelector("#weight-chart").appendChild(weightChart());
  wc.querySelector("#log-weight").addEventListener("click", () => {
    const v = +$("#weight-input").value;
    if (!v || v < 30 || v > 250) { toast("Bitte gültiges Gewicht eingeben."); return; }
    const today = todayISO(); const ex = state.weightLog.find((e) => e.dateISO === today);
    if (ex) ex.kg = v; else state.weightLog.push({ dateISO: today, kg: v });
    state.profile.weight = v; state.programMeta.waterTarget = waterTarget(v);
    save(); renderTab(); toast("Gewicht gespeichert.");
  });

  // Badges
  const bc = el("div", "card");
  bc.innerHTML = `<div class="kicker">Erfolge (${state.badges.length}/${BADGES.length})</div>`;
  const bg = el("div", "badge-grid");
  BADGES.forEach((b) => {
    const got = state.badges.includes(b.id);
    const bd = el("div", "badge" + (got ? " got" : ""));
    bd.innerHTML = `<div class="badge-ico">${icon('trophy')}</div><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div>`;
    bg.appendChild(bd);
  });
  bc.appendChild(bg); wrap.appendChild(bc);
  return wrap;
}

function weightChart() {
  const log = state.weightLog.slice().sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const ns = "http://www.w3.org/2000/svg"; const W = 300, H = 120, pad = 24;
  const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "wchart");
  if (log.length < 2) {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", W/2); t.setAttribute("y", H/2); t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "#888"); t.setAttribute("font-size", "11");
    t.textContent = "Trage mind. 2 Werte ein für den Verlauf."; svg.appendChild(t); return svg;
  }
  const vals = log.map((e) => e.kg); const tgt = state.profile.targetWeight;
  const min = Math.min(...vals, tgt) - 1, max = Math.max(...vals, tgt) + 1;
  const x = (i) => pad + (i / (log.length - 1)) * (W - pad * 2);
  const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const tl = document.createElementNS(ns, "line");
  tl.setAttribute("x1", pad); tl.setAttribute("x2", W - pad); tl.setAttribute("y1", y(tgt)); tl.setAttribute("y2", y(tgt));
  tl.setAttribute("stroke", "#3ddc84"); tl.setAttribute("stroke-dasharray", "4 4"); svg.appendChild(tl);
  let dp = ""; log.forEach((e, i) => dp += (i ? "L" : "M") + x(i) + " " + y(e.kg) + " ");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", dp); path.setAttribute("fill", "none"); path.setAttribute("stroke", "#ff7a45");
  path.setAttribute("stroke-width", "2.5"); path.setAttribute("stroke-linejoin", "round"); svg.appendChild(path);
  log.forEach((e, i) => { const c = document.createElementNS(ns, "circle"); c.setAttribute("cx", x(i)); c.setAttribute("cy", y(e.kg)); c.setAttribute("r", "3"); c.setAttribute("fill", "#ff7a45"); svg.appendChild(c); });
  return svg;
}

/* ---------------- TAB: PROFIL ---------------- */
function renderProfile() {
  const wrap = el("div", "view");
  const pr = state.profile;
  const bmi = (pr.weight / Math.pow(pr.height / 100, 2)).toFixed(1);
  const fit = { beginner: "Anfänger", intermediate: "Fortgeschritten", advanced: "Erfahren" };
  const program = PROGRAMS[state.programId];
  wrap.innerHTML = `
    <h1 class="page-title">Profil</h1>
    <div class="card profile-card">
      <div class="avatar">${pr.name.charAt(0).toUpperCase()}</div>
      <div class="p-name">${pr.name}</div><div class="muted">Level ${level()} · ${state.xp} XP</div>
    </div>
    <div class="card">
      <div class="kicker">Aktive Programme</div>
      ${activeProgramIds().map((id) => { const pg = PROGRAMS[id]; return `<div class="active-prog"><img class="ap-thumb" src="${unsplashURL(PROGRAM_IMG[id]||IMG.heroOnboard,200)}" alt=""/><div><b>${pg.name}</b><div class="muted" style="font-size:12px">${pg.tag}</div></div></div>`; }).join("")}
      <button class="btn-secondary" id="switch-prog">Programme verwalten (bis zu 2)</button>
    </div>
    <div class="card">
      <div class="kicker">Deine Daten</div>
      <div class="info-row"><span>Alter</span><b>${pr.age}</b></div>
      <div class="info-row"><span>Gewicht</span><b>${pr.weight} kg</b></div>
      <div class="info-row"><span>Größe</span><b>${pr.height} cm</b></div>
      <div class="info-row"><span>BMI</span><b>${bmi}</b></div>
      <div class="info-row"><span>Zielgewicht</span><b>${pr.targetWeight} kg</b></div>
      <div class="info-row"><span>Level</span><b>${fit[pr.fitness]}</b></div>
      <div class="info-row"><span>Ziel</span><b>${goalLabel(pr.goal)}</b></div>
      <div class="info-row"><span>Trainingstage</span><b>${pr.daysPerWeek}/Woche</b></div>
      <div class="info-row"><span>Wasserziel</span><b>${state.programMeta.waterTarget} L</b></div>
      <div class="info-row"><span>Kalorienziel</span><b>${nutritionTargets(pr).kcal} kcal</b></div>
    </div>
    <div class="card">
      <div class="kicker">Anpassen & Tools</div>
      <button class="btn-secondary mb" id="edit-plan">Daten / Ziel anpassen</button>
      <button class="btn-secondary mb" id="recalib">Neu kalibrieren (Test)</button>
      <button class="btn-secondary mb" id="open-lib">Übungs-Bibliothek</button>
    </div>
    <div class="card">
      <div class="kicker">💾 Daten sichern</div>
      <p class="muted" style="font-size:13px">Exportiere ein Backup oder stelle es wieder her.</p>
      <button class="btn-secondary mb" id="export">Backup exportieren</button>
      <button class="btn-secondary" id="import-btn">Backup importieren</button>
      <input type="file" id="import-file" accept="application/json" style="display:none"/>
    </div>
    <div class="card danger-card">
      <div class="kicker">Zurücksetzen</div>
      <button class="btn-danger" id="reset-all">Alles löschen & neu starten</button>
    </div>`;
  wrap.querySelector("#switch-prog").addEventListener("click", openProgramSwitch);
  wrap.querySelector("#edit-plan").addEventListener("click", renderEditPlan);
  wrap.querySelector("#recalib").addEventListener("click", openRecalib);
  wrap.querySelector("#open-lib").addEventListener("click", openLibrary);
  wrap.querySelector("#export").addEventListener("click", exportBackup);
  wrap.querySelector("#import-btn").addEventListener("click", () => $("#import-file").click());
  wrap.querySelector("#import-file").addEventListener("change", importBackup);
  wrap.querySelector("#reset-all").addEventListener("click", () => {
    if (confirm("Wirklich ALLE Daten löschen und neu starten?")) {
      localStorage.removeItem(STORE_KEY); localStorage.removeItem("rise_calisthenics_v1");
      state = DEFAULT_STATE(); obDraft = {}; renderOnboarding(1);
    }
  });
  return wrap;
}

/* ---------------- Overlays: Programm wechseln ---------------- */
function openProgramSwitch() {
  let sel = activeProgramIds().slice();
  const render = () => {
    const ov0 = $("#prog-overlay"); if (ov0) ov0.remove();
    const ov = el("div", "overlay"); ov.id = "prog-overlay";
    ov.innerHTML = `<div class="overlay-inner"><div class="overlay-head">
        <button class="back" id="close-prog">← Zurück</button><div class="overlay-title">Programme verwalten</div></div>
        <div class="wo-body"><p class="muted" style="margin-bottom:14px">Wähle 1–2 Ziele. Fortschritt (XP, Streak, Niveau) bleibt erhalten – der Plan richtet sich ab heute neu aus.</p>
        <div id="ps-list"></div>
        <button class="btn-primary big" id="ps-save">Übernehmen</button>
        <div style="height:30px"></div></div></div>`;
    document.body.appendChild(ov); document.body.style.overflow = "hidden";
    const list = ov.querySelector("#ps-list");
    Object.values(PROGRAMS).forEach((p) => {
      const card = programCard(p, false);
      const on = sel.includes(p.id);
      const btn = el("button", on ? "btn-primary" : "btn-secondary");
      btn.textContent = on ? "✓ Ausgewählt" : "Auswählen";
      btn.style.marginTop = "10px";
      btn.addEventListener("click", () => {
        const i = sel.indexOf(p.id);
        if (i > -1) { if (sel.length > 1) sel.splice(i, 1); else toast("Mindestens 1 Programm."); }
        else { if (sel.length >= 2) { toast("Maximal 2 Programme."); return; } sel.push(p.id); }
        render();
      });
      (card.querySelector(".prog-body") || card).appendChild(btn); list.appendChild(card);
    });
    ov.querySelector("#close-prog").addEventListener("click", () => { ov.remove(); document.body.style.overflow = ""; });
    ov.querySelector("#ps-save").addEventListener("click", () => {
      state.programIds = sel.slice(); state.programId = sel[0];
      state.programMeta = generateStructure(state.profile, state.programIds);
      if (sel.some((id) => id !== "reset")) unlock("program");
      save(); ov.remove(); document.body.style.overflow = "";
      activeTab = "today"; renderApp(); toast("Programme aktualisiert.");
    });
  };
  render();
}

/* ---------------- Overlay: Neu kalibrieren ---------------- */
function openRecalib() {
  const ov = el("div", "overlay"); ov.id = "recalib-overlay";
  const c = state.calibration || {};
  ov.innerHTML = `<div class="overlay-inner"><div class="overlay-head">
    <button class="back" id="close-rc">← Zurück</button><div class="overlay-title">Neu kalibrieren</div></div>
    <div class="wo-body"><p class="muted" style="margin-bottom:14px">Aktualisiere deine Bestwerte – dein Niveau wird neu gesetzt.</p>
    <form id="rc-form" class="card">
      ${CALIB_FIELDS.map(f=>`<label>${f.label}<input name="${f.id}" type="number" min="0" placeholder="${f.placeholder}" value="${c[f.id]!==undefined?c[f.id]:''}"/></label>`).join('')}
      <button type="submit" class="btn-primary big">Niveau neu setzen</button>
    </form><div style="height:30px"></div></div></div>`;
  document.body.appendChild(ov); document.body.style.overflow = "hidden";
  ov.querySelector("#close-rc").addEventListener("click", () => { ov.remove(); document.body.style.overflow = ""; });
  ov.querySelector("#rc-form").addEventListener("submit", (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const calib = {};
    CALIB_FIELDS.forEach((f) => { const v = fd.get(f.id); if (v !== "" && v !== null) calib[f.id] = +v; });
    state.calibration = Object.keys(calib).length ? calib : null;
    state.training = initTraining(state.calibration, state.profile);
    unlock("kalib"); save(); ov.remove(); document.body.style.overflow = "";
    activeTab = "progress"; renderApp(); toast("Niveau neu kalibriert.");
  });
}

/* ---------------- Overlay: Bibliothek ---------------- */
function openLibrary() {
  const ov = el("div", "overlay"); ov.id = "lib-overlay";
  let html = `<div class="overlay-inner"><div class="overlay-head">
    <button class="back" id="close-lib">← Zurück</button><div class="overlay-title">Übungs-Bibliothek</div></div>
    <div class="wo-body"><p class="muted" style="margin-bottom:14px">Jede Bewegung hat eine Progressions-Leiter. Deine aktuelle Stufe ist markiert.</p>`;
  Object.entries(PROGRESSIONS).forEach(([key, prog]) => {
    const ul = state.training[key] ? state.training[key].level : 0;
    html += `<div class="card lib-card">
      <div class="lib-demo">${exerciseDemo(key, ul)}</div>
      <div class="lib-head">
        <div><div class="lib-title">${prog.label}</div>${prog.needs?`<div class="needs-sm">Benötigt: ${prog.needs}</div>`:''}</div></div>
      <div class="ladder">${prog.levels.map((lv,i)=>`
        <div class="ladder-step ${i===ul?'active':''} ${i<ul?'passed':''}">
          <div class="step-num">${i+1}</div>
          <div class="step-info"><div class="step-name">${lv.name}${i===ul?' <span class="you">aktuell</span>':''}</div>
          <div class="step-cue muted">${lv.cue}</div></div></div>`).join('')}</div></div>`;
  });
  html += `<div style="height:30px"></div></div></div>`;
  ov.innerHTML = html; document.body.appendChild(ov); document.body.style.overflow = "hidden";
  ov.querySelector("#close-lib").addEventListener("click", () => { ov.remove(); document.body.style.overflow = ""; });
}

/* ---------------- Overlay: Plan anpassen ---------------- */
function renderEditPlan() {
  const pr = state.profile;
  const ov = el("div", "overlay"); ov.id = "edit-overlay";
  ov.innerHTML = `<div class="overlay-inner"><div class="overlay-head">
    <button class="back" id="close-edit">← Zurück</button><div class="overlay-title">Daten anpassen</div></div>
    <div class="wo-body"><form id="edit-form" class="card">
      <label>Aktuelles Gewicht (kg)<input name="weight" type="number" step="0.1" value="${pr.weight}"/></label>
      <label>Zielgewicht (kg)<input name="targetWeight" type="number" step="0.1" value="${pr.targetWeight}"/></label>
      <label>Fitness-Level<select name="fitness">
        <option value="beginner" ${pr.fitness==='beginner'?'selected':''}>Anfänger</option>
        <option value="intermediate" ${pr.fitness==='intermediate'?'selected':''}>Fortgeschritten</option>
        <option value="advanced" ${pr.fitness==='advanced'?'selected':''}>Erfahren</option></select></label>
      <label>Ziel<select name="goal">
        <option value="muscle" ${pr.goal==='muscle'?'selected':''}>Muskelaufbau</option>
        <option value="strength" ${pr.goal==='strength'?'selected':''}>Maximale Kraft</option>
        <option value="fatloss" ${pr.goal==='fatloss'?'selected':''}>Fettverlust</option>
        <option value="endurance" ${pr.goal==='endurance'?'selected':''}>Ausdauer</option></select></label>
      <label>Trainingstage/Woche<select name="daysPerWeek">
        ${[2,3,4,5,6].map(n=>`<option value="${n}" ${pr.daysPerWeek===n?'selected':''}>${n} Tage</option>`).join('')}</select></label>
      <button type="submit" class="btn-primary big">Aktualisieren</button>
    </form><div style="height:30px"></div></div></div>`;
  document.body.appendChild(ov); document.body.style.overflow = "hidden";
  ov.querySelector("#close-edit").addEventListener("click", () => { ov.remove(); document.body.style.overflow = ""; });
  ov.querySelector("#edit-form").addEventListener("submit", (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    pr.weight = +fd.get("weight"); pr.targetWeight = +fd.get("targetWeight");
    pr.fitness = fd.get("fitness"); pr.goal = fd.get("goal"); pr.daysPerWeek = +fd.get("daysPerWeek");
    state.programMeta = generateStructure(pr, activeProgramIds());
    save(); ov.remove(); document.body.style.overflow = "";
    activeTab = "today"; renderApp(); toast("Aktualisiert.");
  });
}

/* ---------------- Backup ---------------- */
function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = el("a");
  a.href = url; a.download = `rise-backup-${todayISO()}.json`; a.click();
  URL.revokeObjectURL(url); toast("Backup heruntergeladen.");
}
function importBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.profile || !data.programMeta) throw new Error("ungültig");
      state = data; save(); activeTab = "today"; renderApp(); toast("Backup wiederhergestellt! ✅");
    } catch (err) { toast("Ungültige Backup-Datei."); }
  };
  reader.readAsText(file);
}

/* ---------------- Init ---------------- */
load();
if (state.profile && state.programMeta) renderApp(); else renderOnboarding(1);
