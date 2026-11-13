// Final design: C's layout + what the user test asked for. Status only (no lock / alarm buttons).
//   ?s=2 all locked + alarm on · ?window=open driver window open · ?zoom=whole start on the whole truck
//   ?history=open · ?theme=dark | light
(function () {
  const params = new URLSearchParams(location.search);
  const ICONS = "assets/icons/";

  const forced = ["dark", "light"].includes(params.get("theme")) ? params.get("theme") : null;
  const darkMq = matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = () => { document.documentElement.dataset.theme = forced || (darkMq.matches ? "dark" : "light"); };
  applyTheme();
  darkMq.addEventListener("change", applyTheme);

  // ---------- Data: the situations from the test ----------
  // changed = when this state began (shown in the row). when = when the event happened.
  const SITUATIONS = {
    1: {
      doors: [
        { id: "driver", name: "Förardörr", the: "förardörren", locked: false, open: true, changed: ["Idag", "09:35"] },
        { id: "passenger", name: "Passagerardörr", the: "passagerardörren", locked: true, open: false, changed: ["Igår", "18:20"] },
      ],
      windows: { open: [], changed: ["Igår", "18:19"] },
      alarm: { on: false, changed: ["Idag", "09:34"] },
      events: [
        { icon: "cab-door-left.svg", title: "Förardörren har öppnats", when: ["Idag", "09:35"] },
        { icon: "motion-sensor-cab-disabled.svg", title: "Larmet har stängts av", when: ["Idag", "09:34"], by: "Med nyckeln" },
        { icon: "lock-locked.svg", title: "Dörrarna har låsts", when: ["Igår", "18:20"], by: "Med nyckeln" },
        { icon: "motion-sensor-cab.svg", title: "Larmet gick: rörelse i hytten", when: ["Igår", "02:06"], alarm: true },
        { icon: "speaker-panic-alarm.svg", title: "Larmet gick: panikknappen trycktes", when: ["Tisdag", "03:09"], alarm: true },
      ],
    },
    2: {
      doors: [
        { id: "driver", name: "Förardörr", the: "förardörren", locked: true, open: false, changed: ["Idag", "09:30"] },
        { id: "passenger", name: "Passagerardörr", the: "passagerardörren", locked: true, open: false, changed: ["Idag", "09:30"] },
      ],
      windows: { open: [], changed: ["Idag", "09:29"] },
      alarm: { on: true, changed: ["Idag", "09:31"] },
      events: [
        { icon: "motion-sensor-cab.svg", title: "Larmet har slagits på", when: ["Idag", "09:31"], by: "Med nyckeln" },
        { icon: "lock-locked.svg", title: "Dörrarna har låsts", when: ["Idag", "09:30"], by: "Med nyckeln" },
        { icon: "cab-door-left.svg", title: "Förardörren har öppnats", when: ["Idag", "09:28"] },
        { icon: "motion-sensor-cab-disabled.svg", title: "Larmet har stängts av", when: ["Idag", "06:15"], by: "Med nyckeln" },
        { icon: "lock-unlocked.svg", title: "Dörrarna har låsts upp", when: ["Idag", "06:15"], by: "Med nyckeln" },
        { icon: "speaker-panic-alarm.svg", title: "Larmet gick: panikknappen trycktes", when: ["Tisdag", "03:09"], alarm: true },
      ],
    },
  };
  const S = SITUATIONS[params.get("s")] || SITUATIONS[1];
  if (params.get("window") === "open") {
    S.windows = { open: [{ name: "Förarfönster", the: "förarfönstret" }], changed: ["Idag", "09:36"] };
    S.events.unshift({ icon: "window-open.svg", title: "Förarfönstret har öppnats", when: ["Idag", "09:36"] });
  }

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const img = (name, cls) => { const i = el("img", cls); i.src = ICONS + name; i.alt = ""; return i; };
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const stamp = ([day, time]) => `${day} ${time}`; // "Idag 09:35", the same look as C

  const open = S.doors.filter((d) => d.open);
  const unlocked = S.doors.filter((d) => !d.locked && !d.open);
  const win = S.windows.open;

  // ---------- 1. Truck: marks on the line drawing ----------
  const DOOR_OPEN = { driver: [222, 345, 81.5, 545.7], passenger: [803, 345, 943.5, 545.7] };
  const DOOR_EDGE = { driver: [222, 345, 222, 590], passenger: [803, 345, 803, 590] };
  const ov = $("f-overlay");
  for (const d of S.doors) {
    const g = d.open ? DOOR_OPEN[d.id] : !d.locked ? DOOR_EDGE[d.id] : null;
    if (g) ov.append(svg("line", { class: `door-overlay__line${d.open ? " door-overlay__line--open" : ""}`, x1: g[0], y1: g[1], x2: g[2], y2: g[3] }));
  }
  if (win.length) ov.append(svg("line", { class: "door-overlay__line door-overlay__line--open f-window", x1: 222, y1: 360, x2: 222, y2: 470 }));
  // Alarm: waves only when it is on; nothing when it is off ("Larm – Av" in the row says it)
  if (S.alarm.on) {
    const cx = 512, cy = 480;
    const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; };
    ov.append(svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 }));
    [70, 120, 170].forEach((r, i) => [0, 180].forEach((m) => ov.append(svg("path", { class: `alarm-wave alarm-wave--${i + 1}`, d: `M${pt(r, m - 38)} A${r} ${r} 0 0 1 ${pt(r, m + 38)}` }))));
  }
  // minimap: the cab outlined, a red dot where something is open
  const mo = $("f-mini-overlay");
  for (const d of open) mo.append(svg("circle", { class: "f-mini__dot", cx: d.id === "driver" ? 9 : 31, cy: 15, r: 3.2 }));
  if (win.length && !open.length) mo.append(svg("circle", { class: "f-mini__dot", cx: 9, cy: 12, r: 3.2 }));

  // Cab big by default (C); tap the corner = whole truck (B), tap the picture = back to the cab
  const stage = $("f-stage");
  const setWhole = (on) => {
    stage.dataset.zoom = on ? "whole" : "cab";
    stage.setAttribute("aria-label", on ? "Hela lastbilen. Tryck för att visa hytten" : "Hytten");
  };
  stage.addEventListener("click", (e) => { if (!e.target.closest(".f-mini")) setWhole(false); });
  $("f-mini").addEventListener("click", (e) => { e.stopPropagation(); setWhole(true); });
  setWhole(params.get("zoom") === "whole");

  // ---------- 2. Rows: C's look, the time = when that state began ----------
  const row = (icon, label, value, when, alert) => {
    const li = el("li", "list-item");
    const c = el("div", "list-item__content status-row");
    const box = el("div", "list-item__icon");
    box.append(img(icon));
    const t = el("div", "list-item__text");
    t.append(el("p", "list-item__title", label), el("p", "list-item__meta", stamp(when)));
    const v = el("span", "status-row__value", value);
    if (alert) v.dataset.alert = "true";
    c.append(box, t, v);
    li.append(c);
    return li;
  };
  const latest = (list) => list.map((x) => x.changed).sort((p, q) => (p[0] === q[0] ? (p[1] < q[1] ? 1 : -1) : p[0] === "Idag" ? -1 : 1))[0];
  const rows = [
    open.length
      ? row("cab-door-left.svg", "Dörrar", open.length > 1 ? "Båda öppna" : `${open[0].name} öppen`, open[0].changed, true)
      : unlocked.length
        ? row("lock-unlocked.svg", "Dörrar", unlocked.length > 1 ? "Olåsta" : `${unlocked[0].name} olåst`, unlocked[0].changed)
        : row("lock-locked.svg", "Dörrar", "Låsta", latest(S.doors)),
    win.length
      ? row("window-open.svg", "Fönster", `${win[0].name} öppet`, S.windows.changed, true)
      : row("window.svg", "Fönster", "Stängda", S.windows.changed),
    row(S.alarm.on ? "motion-sensor-cab.svg" : "motion-sensor-cab-disabled.svg", "Larm", S.alarm.on ? "På" : "Av", S.alarm.changed),
  ];
  rows.forEach((li, i) => { if (i < rows.length - 1) li.append(img("divider-line.svg", "list-item__divider")); $("f-status").append(li); });

  // ---------- 3. Reminder (C's info box), only when something needs doing ----------
  const toFix = [...open, ...unlocked];
  if (toFix.length || win.length) {
    const parts = [];
    if (toFix.length) parts.push(`${open.length ? "Stäng och lås" : "Lås"} ${toFix.map((d) => d.the).join(" och ")}`);
    if (win.length) parts.push(`${parts.length ? "stäng" : "Stäng"} ${win.map((w) => w.the).join(" och ")}`);
    const rule = toFix.length && !S.alarm.on ? " Larmet kan bara vara på när alla dörrar är låsta." : "";
    $("f-action-text").textContent = `${parts.join(" och ")} vid lastbilen.${rule}`;
    $("f-action").hidden = false;
    $("f-action-close").addEventListener("click", () => { $("f-action").hidden = true; });
  }

  // ---------- 4. History page: by day, who did it, kept 30 days, share ----------
  const hist = $("f-history");
  hist.append(el("p", "f-history__note", "Sparas i 30 dagar"));
  const groups = [];
  for (const e of S.events) {
    const day = /^(Idag|Igår)$/.test(e.when[0]) ? e.when[0] : "Tidigare";
    let g = groups.find((x) => x.day === day);
    if (!g) groups.push((g = { day, items: [] }));
    g.items.push(e);
  }
  for (const g of groups) {
    const sec = el("section", "list-group");
    sec.append(el("p", "list-group__label", g.day));
    const ul = el("ul", "list");
    g.items.forEach((e, i) => {
      const li = el("li", "list-item");
      const c = el("div", "list-item__content");
      const box = el("div", "list-item__icon");
      box.append(img(e.icon));
      const t = el("div", "list-item__text");
      const time = g.day === "Tidigare" ? `${e.when[0]} ${e.when[1]}` : e.when[1];
      t.append(el("p", "list-item__title", e.title), el("p", "list-item__meta", e.by ? `${time} · ${e.by}` : time));
      c.append(box, t);
      li.append(c);
      if (i < g.items.length - 1) li.append(img("divider-line.svg", "list-item__divider"));
      if (e.alarm) li.classList.add("f-event--alarm");
      ul.append(li);
    });
    sec.append(ul);
    hist.append(sec);
  }
  const share = el("button", "f-share", "Dela historik");
  share.type = "button";
  hist.append(share);
  const page = $("f-history-page");
  const openHistory = (on) => { page.hidden = !on; };
  $("f-all").addEventListener("click", () => openHistory(true));
  $("f-history-back").addEventListener("click", () => openHistory(false));
  if (params.get("history") === "open") openHistory(true);
})();
