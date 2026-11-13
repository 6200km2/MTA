// Final design: C's layout + what the user test asked for. Status only (no lock / alarm buttons).
//   ?s=2 all locked + alarm on · ?window=open driver window open · ?view=whole whole truck · ?layout=icons (?tip=0)
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
  // Open window: a red badge with the window icon, pinned to the driver's side window. A dashed
  // line on the door edge was too hard to read (the window is not visible from above).
  if (win.length) {
    const g = svg("g", { class: "f-winbadge" });
    g.append(svg("line", { class: "f-winbadge__pin", x1: 222, y1: 440, x2: 170, y2: 440 }));
    g.append(svg("circle", { class: "f-winbadge__plate", cx: 128, cy: 440, r: 56 }));
    const icon = svg("g", { transform: "translate(97.4 409.4) scale(2.55)" });
    icon.append(svg("path", { class: "f-winbadge__glyph", d: "M2.25 4.75H13.1C14.6 4.75 15.95 5.55 16.7 6.85L21.6 19.25H4.05L2.25 4.75Z" }));
    icon.append(svg("path", { class: "f-winbadge__glyph", d: "M3.2 12.25H12.3C13.8 12.25 15.15 13.05 15.9 14.35L18.1 19.25" }));
    g.append(icon);
    ov.append(g);
  }
  // Alarm: waves only when it is on; nothing when it is off ("Larm – Av" in the row says it)
  if (S.alarm.on) {
    const cx = 512, cy = 480;
    const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; };
    ov.append(svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 }));
    [70, 120, 170].forEach((r, i) => [0, 180].forEach((m) => ov.append(svg("path", { class: `alarm-wave alarm-wave--${i + 1}`, d: `M${pt(r, m - 38)} A${r} ${r} 0 0 1 ${pt(r, m + 38)}` }))));
  }
  // Picture: C's line drawing, or the photo (?truck=photo). Same crop of the cab.
  const view = params.get("truck") === "photo" ? "photo" : "line";
  $("f-stage").dataset.view = view;
  // ?view=whole: the whole truck (B) instead of the cab (C)
  $("f-stage").dataset.frame = params.get("view") === "whole" ? "whole" : "cab";
  if (view === "photo") document.querySelector(".f-zoom__image").src = "assets/images/truck-top-photo.png";

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
  const items = [
    open.length
      ? { icon: "cab-door-left.svg", label: "Dörrar", value: open.length > 1 ? "Båda öppna" : `${open[0].name} öppen`, when: open[0].changed, alert: true }
      : unlocked.length
        ? { icon: "lock-unlocked.svg", label: "Dörrar", value: unlocked.length > 1 ? "Olåsta" : `${unlocked[0].name} olåst`, when: unlocked[0].changed }
        : { icon: "lock-locked.svg", label: "Dörrar", value: "Låsta", when: latest(S.doors) },
    // Windows have no row: an open window comes as a push notification (notis.html) and then shows
    // on the drawing (red dashes) and in the reminder box. Car apps alert the same way (Volvo Cars).
    { icon: S.alarm.on ? "motion-sensor-cab.svg" : "motion-sensor-cab-disabled.svg", label: "Larm", value: S.alarm.on ? "På" : "Av", when: S.alarm.changed },
  ];

  if (params.get("layout") === "icons") {
    // Icons only (the simplest): the icon itself shows the state, a red dot marks what is open.
    // Tap an icon to read it in words ("Förardörr öppen · Idag 09:35"). ?tip=0|1|2 opens one.
    $("f-status").hidden = true;
    const ul = $("f-icons");
    ul.hidden = false;
    ul.style.gridTemplateColumns = `repeat(${items.length}, 1fr)`;
    const tip = $("f-icons-tip");
    const show = (i) => {
      ul.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
      if (i == null) { tip.hidden = true; return; }
      const it = items[i];
      tip.replaceChildren(el("strong", null, `${it.label}: `), document.createTextNode(`${it.value.toLowerCase()} · ${stamp(it.when)}`));
      tip.dataset.col = String(i);
      tip.hidden = false;
    };
    items.forEach((it, i) => {
      const li = el("li");
      const b = el("button", "f-ic");
      b.type = "button";
      b.setAttribute("aria-label", `${it.label}: ${it.value}`);
      b.append(img(it.icon, "f-ic__img"));
      if (it.alert) b.append(el("span", "f-ic__dot"));
      b.addEventListener("click", () => show(b.getAttribute("aria-pressed") === "true" ? null : i));
      li.append(b);
      ul.append(li);
    });
    show(params.has("tip") ? Number(params.get("tip")) : null);
  } else {
    const rows = items.map((it) => row(it.icon, it.label, it.value, it.when, it.alert));
    rows.forEach((li, i) => { if (i < rows.length - 1) li.append(img("divider-line.svg", "list-item__divider")); $("f-status").append(li); });
  }

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
