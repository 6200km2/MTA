// Final design (after the user test): one screen, state in words, each state with the time it
// happened, "Uppdaterad" = when the app checked. Status only (no lock / alarm buttons).
//   ?s=2           all doors locked, alarm on (default s=1: driver door open, alarm off)
//   ?truck=photo   the truck photo instead of the line drawing (the test was split 2–2)
//   ?theme=dark | ?theme=light
(function () {
  const params = new URLSearchParams(location.search);
  const ICONS = "assets/icons/";

  // ---------- Theme ----------
  const forced = ["dark", "light"].includes(params.get("theme")) ? params.get("theme") : null;
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = () => { document.documentElement.dataset.theme = forced || (dark.matches ? "dark" : "light"); };
  applyTheme();
  dark.addEventListener("change", applyTheme);

  // ---------- Data (same situations as the test) ----------
  // when: [day, time]; day = "Idag" | "Igår" | weekday. changed = when this state began.
  const SITUATIONS = {
    1: {
      checked: "09:41",
      doors: [
        { id: "driver", name: "Förardörr", the: "förardörren", locked: false, open: true, changed: ["Idag", "09:35"] },
        { id: "passenger", name: "Passagerardörr", the: "passagerardörren", locked: true, open: false, changed: ["Igår", "18:20"] },
      ],
      alarm: { on: false, changed: ["Idag", "09:34"] },
      events: [
        { icon: "cab-door-left.svg", title: "Förardörren har öppnats", when: ["Idag", "09:35"] },
        { icon: "motion-sensor-cab-disabled.svg", title: "Larmet har stängts av", when: ["Idag", "09:34"] },
        { icon: "lock-locked.svg", title: "Dörrarna har låsts", when: ["Igår", "18:20"] },
        { icon: "motion-sensor-cab.svg", title: "Larmet gick: rörelse i hytten", when: ["Igår", "02:06"], alarm: true },
        { icon: "speaker-panic-alarm.svg", title: "Larmet gick: panikknappen trycktes", when: ["Tisdag", "03:09"], alarm: true },
      ],
    },
    2: {
      checked: "09:41",
      doors: [
        { id: "driver", name: "Förardörr", the: "förardörren", locked: true, open: false, changed: ["Idag", "09:30"] },
        { id: "passenger", name: "Passagerardörr", the: "passagerardörren", locked: true, open: false, changed: ["Idag", "09:30"] },
      ],
      alarm: { on: true, changed: ["Idag", "09:31"] },
      events: [
        { icon: "motion-sensor-cab.svg", title: "Larmet har slagits på", when: ["Idag", "09:31"] },
        { icon: "lock-locked.svg", title: "Dörrarna har låsts", when: ["Idag", "09:30"] },
        { icon: "cab-door-left.svg", title: "Förardörren har öppnats", when: ["Idag", "09:28"] },
        { icon: "motion-sensor-cab-disabled.svg", title: "Larmet har stängts av", when: ["Idag", "06:15"] },
        { icon: "lock-unlocked.svg", title: "Dörrarna har låsts upp", when: ["Idag", "06:15"] },
        { icon: "speaker-panic-alarm.svg", title: "Larmet gick: panikknappen trycktes", when: ["Tisdag", "03:09"], alarm: true },
      ],
    },
  };
  const S = SITUATIONS[params.get("s")] || SITUATIONS[1];

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const icon = (name) => {
    const i = el("img");
    i.src = ICONS + name;
    i.alt = "";
    return i;
  };
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  // "Idag 09:35" / "igår 18:20" inside a sentence
  const at = ([day, time], inSentence) => `${inSentence && /^(Idag|Igår)$/.test(day) ? day.toLowerCase() : day} ${time}`;

  // ---------- State words ----------
  const open = S.doors.filter((d) => d.open);
  const unlocked = S.doors.filter((d) => !d.locked && !d.open);
  const allLocked = !open.length && !unlocked.length;
  const doorWord = (d) => (d.open ? "Öppen" : d.locked ? "Låst" : "Olåst");
  const doorSince = (d) => `${d.open ? "Öppnades" : d.locked ? "Låstes" : "Låstes upp"} ${at(d.changed, true)}`;

  // ---------- 1. Truck figure ----------
  const view = params.get("truck") === "photo" ? "photo" : "line";
  $("f-hero").dataset.view = view;
  $("f-image").src = view === "photo" ? "assets/images/truck-top-photo.png" : "assets/images/truck-top-line.png";

  const DOOR = {
    driver: { edge: [222, 345, 222, 590], open: [222, 345, 81.5, 545.7] },
    passenger: { edge: [803, 345, 803, 590], open: [803, 345, 943.5, 545.7] },
  };
  const overlay = $("f-overlay");
  for (const d of S.doors) {
    const g = DOOR[d.id];
    if (d.open) overlay.append(svg("line", { class: "door-overlay__line door-overlay__line--open", x1: g.open[0], y1: g.open[1], x2: g.open[2], y2: g.open[3] }));
    else if (!d.locked) overlay.append(svg("line", { class: "door-overlay__line", x1: g.edge[0], y1: g.edge[1], x2: g.edge[2], y2: g.edge[3] }));
  }
  // alarm: waves when on, the crossed-out badge when off (same marks as B / C)
  const cx = 512, cy = 480;
  const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; };
  const arc = (r, mid, spread, cls) => svg("path", { class: cls, d: `M${pt(r, mid - spread)} A${r} ${r} 0 0 1 ${pt(r, mid + spread)}` });
  if (S.alarm.on) {
    overlay.append(svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 }));
    [70, 120, 170].forEach((r, i) => [0, 180].forEach((m) => overlay.append(arc(r, m, 38, `alarm-wave alarm-wave--${i + 1}`))));
  } else {
    overlay.append(svg("circle", { class: "alarm-off__plate", cx, cy, r: 105 }), svg("circle", { class: "alarm-off__dot", cx, cy, r: 11 }));
    [38, 66].forEach((r) => [0, 180].forEach((m) => overlay.append(arc(r, m, 40, "alarm-off__wave"))));
    const line = { x1: cx - 60, y1: cy - 60, x2: cx + 60, y2: cy + 60 };
    overlay.append(svg("line", { class: "alarm-off__gap", ...line }), svg("line", { class: "alarm-off__slash", ...line }));
  }

  // ---------- 2. Summary sentence ----------
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  let title;
  let tone = "ok";
  if (open.length) {
    title = `${cap(open.map((d) => d.the).join(" och "))} ${open.length > 1 ? "är öppna" : "är öppen"}`;
    tone = "act";
  } else if (unlocked.length) {
    title = `${cap(unlocked.map((d) => d.the).join(" och "))} ${unlocked.length > 1 ? "är olåsta" : "är olåst"}`;
    tone = "act";
  } else {
    title = S.alarm.on ? "Allt är låst och larmet är på" : "Alla dörrar är låsta";
  }
  $("f-summary-title").textContent = title;
  $("f-summary-title").dataset.tone = tone;
  $("f-summary-sub").textContent = allLocked
    ? S.alarm.on ? "" : "Larmet är av"
    : S.alarm.on ? "Larmet är på" : "Larmet är av";
  $("f-summary-sub").hidden = !$("f-summary-sub").textContent;
  $("f-updated").textContent = `Uppdaterad idag ${S.checked}`;

  // ---------- 3. Action (only when needed) ----------
  const toFix = [...open, ...unlocked];
  if (toFix.length) {
    const names = toFix.map((d) => d.the).join(" och ");
    $("f-action-text").textContent = `${open.length ? "Stäng och lås" : "Lås"} ${names} vid lastbilen.`;
    $("f-action").hidden = false;
  }

  // ---------- 4. Doors and alarm rows ----------
  const row = (iconName, title, meta, value, valueTone, note) => {
    const li = el("li", "list-item");
    const c = el("div", "list-item__content");
    const ic = el("div", "list-item__icon");
    ic.append(icon(iconName));
    const t = el("div", "list-item__text");
    t.append(el("p", "list-item__title", title), el("p", "list-item__meta", meta));
    if (note) t.append(el("p", "f-note", note));
    const v = el("p", "f-value", value);
    if (valueTone) v.dataset.tone = valueTone;
    c.append(ic, t, v);
    li.append(c);
    return li;
  };
  const withDividers = (list, items) => items.forEach((li, i) => {
    if (i) li.prepend(Object.assign(icon("divider-line.svg"), { className: "list-item__divider f-divider" }));
    list.append(li);
  });
  withDividers($("f-doors"), S.doors.map((d) =>
    row(d.open ? "cab-door-left.svg" : d.locked ? "lock-locked.svg" : "lock-unlocked.svg", d.name, doorSince(d), doorWord(d), d.open ? "open" : d.locked ? null : "unlocked")
  ));
  withDividers($("f-alarm"), [
    row(
      S.alarm.on ? "motion-sensor-cab.svg" : "motion-sensor-cab-disabled.svg",
      "Larm",
      `${S.alarm.on ? "Slogs på" : "Stängdes av"} ${at(S.alarm.changed, true)}`,
      S.alarm.on ? "På" : "Av",
      null,
      !S.alarm.on && !allLocked ? "Larmet kan bara slås på när alla dörrar är låsta." : null
    ),
  ]);

  // ---------- 5. History, grouped by day ----------
  const groups = [];
  for (const e of S.events) {
    const day = /^(Idag|Igår)$/.test(e.when[0]) ? e.when[0] : "Tidigare";
    let g = groups.find((x) => x.day === day);
    if (!g) groups.push((g = { day, items: [] }));
    g.items.push(e);
  }
  const hist = $("f-history");
  hist.append(el("h2", "f-history__title", "Senaste"));
  for (const g of groups) {
    const sec = el("section", "list-group");
    sec.append(el("p", "list-group__label", g.day));
    const ul = el("ul", "list");
    withDividers(ul, g.items.map((e) => {
      const meta = g.day === "Tidigare" ? `${e.when[0]} ${e.when[1]}` : e.when[1];
      const li = row(e.icon, e.title, meta, "");
      li.querySelector(".f-value").remove();
      if (e.alarm) li.classList.add("f-event--alarm");
      return li;
    }));
    sec.append(ul);
    hist.append(sec);
  }
  $("f-all").addEventListener("click", (ev) => ev.preventDefault());
})();
