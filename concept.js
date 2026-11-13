// Design concepts after the user test (status only, no buttons).
//   ?v=1  Bild + tre ikoner : B's cab picture with the red door, then A's big icons with one word each
//   ?v=2  Tre rutor          : C's one screen as three tiles (icon, word, since when) under the picture
//   ?v=3  Bara ikoner        : A's minimal layout without a picture, three big icons with words
//   ?s=2 all locked + alarm on · ?window=open · ?truck=photo · ?theme=dark|light
(function () {
  const params = new URLSearchParams(location.search);
  const ICONS = "assets/icons/";
  const fallback = document.documentElement.dataset.defaultVariant || "1"; // final.html = concept 4
  const variant = ["1", "2", "3", "4"].includes(params.get("v")) ? params.get("v") : fallback;
  document.documentElement.dataset.variant = variant;

  const forced = ["dark", "light"].includes(params.get("theme")) ? params.get("theme") : null;
  const darkMq = matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = () => { document.documentElement.dataset.theme = forced || (darkMq.matches ? "dark" : "light"); };
  applyTheme();
  darkMq.addEventListener("change", applyTheme);

  // ---------- Data: the same situations as the test ----------
  const SITUATIONS = {
    1: {
      doors: [
        { id: "driver", name: "Förardörr", the: "förardörren", locked: false, open: true, changed: ["Idag", "09:35"] },
        { id: "passenger", name: "Passagerardörr", the: "passagerardörren", locked: true, open: false, changed: ["Igår", "18:20"] },
      ],
      alarm: { on: false, changed: ["Idag", "09:34"] },
      windows: { open: [], changed: ["Igår", "18:19"] },
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
      alarm: { on: true, changed: ["Idag", "09:31"] },
      windows: { open: [], changed: ["Idag", "09:29"] },
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
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const icon = (name, cls) => { const i = el("img", cls); i.src = ICONS + name; i.alt = ""; return i; };
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const since = ([day, time]) => `sedan ${day === "Idag" ? "" : day.toLowerCase() + " "}${time}`;

  // ---------- The three states, said the same way everywhere ----------
  const open = S.doors.filter((d) => d.open);
  const unlocked = S.doors.filter((d) => !d.locked && !d.open);
  const win = S.windows.open;
  const items = [
    {
      key: "doors",
      label: "Dörrar",
      icon: open.length ? "cab-door-left.svg" : unlocked.length ? "lock-unlocked.svg" : "lock-locked.svg",
      word: open.length ? (open.length > 1 ? "Båda öppna" : `${open[0].name} öppen`) : unlocked.length ? (unlocked.length > 1 ? "Olåsta" : `${unlocked[0].name} olåst`) : "Låsta",
      short: open.length ? "Öppen" : unlocked.length ? "Olåst" : "Låsta",
      where: open.length ? open[0].name : unlocked.length ? unlocked[0].name : "",
      alert: open.length > 0,
      when: open.length ? open[0].changed : unlocked.length ? unlocked[0].changed : S.doors[0].changed,
    },
    {
      key: "windows",
      label: "Fönster",
      icon: win.length ? "window-open.svg" : "window.svg",
      word: win.length ? `${win[0].name} öppet` : "Stängda",
      short: win.length ? "Öppet" : "Stängda",
      where: win.length ? win[0].name : "",
      alert: win.length > 0,
      when: S.windows.changed,
    },
    {
      key: "alarm",
      label: "Larm",
      icon: S.alarm.on ? "motion-sensor-cab.svg" : "motion-sensor-cab-disabled.svg",
      word: S.alarm.on ? "På" : "Av",
      short: S.alarm.on ? "På" : "Av",
      where: "",
      alert: false,
      when: S.alarm.changed,
    },
  ];

  const main = document.getElementById("k-main");

  // ---------- Picture (B / C): cab top view, red line on an open door, waves when the alarm is on ----------
  function figure() {
    const view = params.get("truck") === "photo" ? "photo" : "line";
    const hero = el("div", "k-hero");
    hero.dataset.view = view;
    const fig = el("div", "k-figure");
    const img = el("img", "k-figure__image");
    img.src = view === "photo" ? "assets/images/truck-top-photo.png" : "assets/images/truck-top-line.png";
    img.alt = "";
    const ov = svg("svg", { class: "door-overlay k-figure__overlay", viewBox: "0 0 1024 1536", "aria-hidden": "true" });
    const DOOR = { driver: [222, 345, 81.5, 545.7], passenger: [803, 345, 943.5, 545.7] };
    const EDGE = { driver: [222, 345, 222, 590], passenger: [803, 345, 803, 590] };
    for (const d of S.doors) {
      const g = d.open ? DOOR[d.id] : !d.locked ? EDGE[d.id] : null;
      if (g) ov.append(svg("line", { class: `door-overlay__line${d.open ? " door-overlay__line--open" : ""}`, x1: g[0], y1: g[1], x2: g[2], y2: g[3] }));
    }
    if (S.alarm.on) {
      const cx = 512, cy = 480;
      const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; };
      ov.append(svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 }));
      [70, 120, 170].forEach((r, i) => [0, 180].forEach((m) => ov.append(svg("path", { class: `alarm-wave alarm-wave--${i + 1}`, d: `M${pt(r, m - 38)} A${r} ${r} 0 0 1 ${pt(r, m + 38)}` }))));
    }
    fig.append(img, ov);
    hero.append(fig);
    return hero;
  }

  // ---------- A-style status icons: big icon, label, one word ----------
  function iconRow(size) {
    const row = el("ul", `k-icons k-icons--${size}`);
    for (const it of items) {
      const li = el("li", "k-icon");
      if (it.alert) li.dataset.alert = "true";
      li.append(icon(it.icon, "k-icon__img"));
      li.append(el("p", "k-icon__label", it.label));
      li.append(el("p", "k-icon__word", it.short));
      if (it.where) li.append(el("p", "k-icon__where", it.where));
      row.append(li);
    }
    return row;
  }

  // ---------- C-style tiles: one card per part, word + since when ----------
  function tiles() {
    const row = el("ul", "k-tiles");
    for (const it of items) {
      const li = el("li", "k-tile");
      if (it.alert) li.dataset.alert = "true";
      li.append(icon(it.icon, "k-tile__img"));
      li.append(el("p", "k-tile__label", it.label));
      li.append(el("p", "k-tile__word", it.short));
      li.append(el("p", "k-tile__when", it.where ? it.where : since(it.when)));
      row.append(li);
    }
    return row;
  }

  // ---------- Reminder: the original neutral info box, only when something needs doing ----------
  function reminder() {
    const toFix = [...open, ...unlocked];
    if (!toFix.length && !win.length) return null;
    const parts = [];
    if (toFix.length) parts.push(`${open.length ? "Stäng och lås" : "Lås"} ${toFix.map((d) => d.the).join(" och ")}`);
    if (win.length) parts.push(`${parts.length ? "stäng" : "Stäng"} ${win.map((w) => w.the).join(" och ")}`);
    const box = el("div", "direction k-direction");
    box.append(el("p", "direction__text", `${parts.join(" och ")} vid lastbilen.`));
    return box;
  }

  function historyLink() {
    const b = el("button", "history-link k-history-link", "Historik");
    b.type = "button";
    return b;
  }

  // ---------- Concept 4: one picture that answers B vs C, words only where something is wrong ----------
  // Whole truck (B: P3, P5 "hela lastbilen uppifrån") when everything is fine. When something needs
  // attention, the picture zooms into the cab where it is (C: P1 "fokuserar på hytten, det viktigaste"),
  // so the same picture gives the overview and points at the problem.
  function stage() {
    const view = params.get("truck") === "line" ? "line" : "photo";
    const needsLook = open.length + unlocked.length + win.length > 0;
    const st = el("div", "k-stage");
    st.dataset.view = view;
    const zoom = el("div", "k-zoom");
    const img = el("img", "k-zoom__image");
    img.src = view === "photo" ? "assets/images/truck-top-photo.png" : "assets/images/truck-top-line.png";
    img.alt = "";
    const ov = svg("svg", { class: "door-overlay k-zoom__overlay", viewBox: "0 0 1024 1536", "aria-hidden": "true" });
    const DOOR = { driver: [222, 345, 81.5, 545.7], passenger: [803, 345, 943.5, 545.7] };
    const EDGE = { driver: [222, 345, 222, 590], passenger: [803, 345, 803, 590] };
    for (const d of S.doors) {
      const g = d.open ? DOOR[d.id] : !d.locked ? EDGE[d.id] : null;
      if (g) ov.append(svg("line", { class: `door-overlay__line${d.open ? " door-overlay__line--open" : ""}`, x1: g[0], y1: g[1], x2: g[2], y2: g[3] }));
    }
    // open window: the upper part of the door edge, in red (dashed = glass, not the door)
    if (win.length) ov.append(svg("line", { class: "door-overlay__line door-overlay__line--open k-window", x1: 222, y1: 360, x2: 222, y2: 470 }));
    if (S.alarm.on) {
      const cx = 512, cy = 480;
      const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; };
      ov.append(svg("circle", { class: "alarm-wave__dot", cx, cy, r: 18 }));
      [80, 140].forEach((r, i) => [0, 180].forEach((m) => ov.append(svg("path", { class: `alarm-wave alarm-wave--${i + 1}`, d: `M${pt(r, m - 38)} A${r} ${r} 0 0 1 ${pt(r, m + 38)}` }))));
    }
    zoom.append(img, ov);
    st.append(zoom);
    // whole truck first; zoom into the cab only when there is something to look at
    if (needsLook) {
      if (params.get("still") === "1") st.dataset.zoom = "cab";
      else setTimeout(() => { st.dataset.zoom = "cab"; }, 600);
    }
    return st;
  }

  // Three icons, one word each. A time only on what is wrong ("sedan 09:35"): the rest is in Historik.
  function statusRow() {
    const row = el("ul", "k-status");
    for (const it of items) {
      const li = el("li", "k-st");
      if (it.alert || (it.key === "doors" && unlocked.length)) li.dataset.alert = it.alert ? "open" : "unlocked";
      li.append(icon(it.icon, "k-st__img"));
      li.append(el("p", "k-st__word", it.key === "alarm" ? `Larm ${it.short.toLowerCase()}` : it.alert || li.dataset.alert ? it.word : it.short));
      if (li.dataset.alert) li.append(el("p", "k-st__when", since(it.when)));
      row.append(li);
    }
    return row;
  }

  // ---------- Compose ----------
  const parts = [];
  if (variant === "1") parts.push(figure(), iconRow("m"), reminder(), historyLink());
  if (variant === "2") parts.push(figure(), tiles(), reminder(), historyLink());
  if (variant === "3") parts.push(iconRow("l"), reminder(), historyLink());
  if (variant === "4") parts.push(stage(), statusRow(), reminder(), historyLink());
  parts.filter(Boolean).forEach((p) => main.append(p));

  // ---------- History page (final.html): every event by day, who did it, kept 30 days, share ----------
  const page = document.getElementById("f-history-page");
  if (page) {
    const hist = document.getElementById("f-history");
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
        if (i) { const d = icon("divider-line.svg", "list-item__divider f-divider"); li.append(d); }
        const c = el("div", "list-item__content");
        const ic = el("div", "list-item__icon");
        ic.append(icon(e.icon));
        const t = el("div", "list-item__text");
        const time = g.day === "Tidigare" ? `${e.when[0]} ${e.when[1]}` : e.when[1];
        t.append(el("p", "list-item__title", e.title), el("p", "list-item__meta", e.by ? `${time} · ${e.by}` : time));
        c.append(ic, t);
        li.append(c);
        if (e.alarm) li.classList.add("f-event--alarm");
        ul.append(li);
      });
      sec.append(ul);
      hist.append(sec);
    }
    const share = el("button", "f-share", "Dela historik");
    share.type = "button";
    hist.append(share);
    const openHistory = (on) => { page.hidden = !on; };
    main.querySelector(".k-history-link").addEventListener("click", () => openHistory(true));
    document.getElementById("f-history-back").addEventListener("click", () => openHistory(false));
    if (params.get("history") === "open") openHistory(true);
  }
})();
