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
      checked: "09:41",
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
  // ?window=open: the driver window is open (a wish from the test: P1, P3; P4, P5 agreed)
  if (params.get("window") === "open") {
    S.windows = { open: [{ name: "Förarfönster", the: "förarfönstret" }], changed: ["Idag", "09:36"] };
    S.events.unshift({ icon: "window-open.svg", title: "Förarfönstret har öppnats", when: ["Idag", "09:36"] });
  }

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

  // ---------- State words ----------
  const open = S.doors.filter((d) => d.open);
  const unlocked = S.doors.filter((d) => !d.locked && !d.open);
  // eslint-disable-next-line no-unused-vars

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
  // Alarm: pulsing waves in the cab when it is on; nothing when it is off. A student did not
  // recognise the crossed-out badge (P1), and other vehicle apps keep the alarm out of the picture.
  // "Larm – Av" in the card below says it in words.
  if (S.alarm.on) {
    const cx = 512, cy = 480;
    const pt = (r, deg) => { const a2 = (deg * Math.PI) / 180; return `${(cx + r * Math.cos(a2)).toFixed(1)} ${(cy + r * Math.sin(a2)).toFixed(1)}`; };
    const arc = (r, mid, spread, cls) => svg("path", { class: cls, d: `M${pt(r, mid - spread)} A${r} ${r} 0 0 1 ${pt(r, mid + spread)}` });
    overlay.append(svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 }));
    [70, 120, 170].forEach((r, i) => [0, 180].forEach((m) => overlay.append(arc(r, m, 38, `alarm-wave alarm-wave--${i + 1}`))));
  }

  // ---------- 2. Update time ----------
  $("f-updated").textContent = `Uppdaterad ${S.checked}`;

  // ---------- 3. Doors and alarm: one card, word + since when ----------
  // "sedan 09:35" (today) / "sedan igår 18:20": short, and still says what the time is
  const since = ([day, time]) => `sedan ${day === "Idag" ? "" : day.toLowerCase() + " "}${time}`;
  const row = (iconName, title, meta, value, valueTone) => {
    const li = el("li", "list-item");
    const c = el("div", "list-item__content");
    const ic = el("div", "list-item__icon");
    ic.append(icon(iconName));
    const t = el("div", "list-item__text");
    t.append(el("p", "list-item__title", title), el("p", "list-item__meta", meta));
    c.append(ic, t);
    if (value) {
      const v = el("p", "f-value", value);
      if (valueTone) v.dataset.tone = valueTone;
      c.append(v);
    }
    li.append(c);
    return li;
  };
  const withDividers = (list, items) => items.forEach((li, i) => {
    if (i) li.prepend(Object.assign(icon("divider-line.svg"), { className: "list-item__divider f-divider" }));
    list.append(li);
  });
  // Doors and windows are each ONE row, the same way: all fine = one word ("Låsta", "Stängda");
  // otherwise the row names what is wrong ("Förardörr öppen"), in red when it is open.
  const latest = (list) => list.map((x) => x.changed).sort((p, q) => (p[0] === q[0] ? (p[1] < q[1] ? 1 : -1) : p[0] === "Idag" ? -1 : 1))[0];
  const doorsRow = (() => {
    if (open.length) return row("cab-door-left.svg", "Dörrar", since(open[0].changed), open.length > 1 ? "Båda öppna" : `${open[0].name} öppen`, "open");
    if (unlocked.length) return row("lock-unlocked.svg", "Dörrar", since(unlocked[0].changed), unlocked.length > 1 ? "Olåsta" : `${unlocked[0].name} olåst`);
    return row("lock-locked.svg", "Dörrar", since(latest(S.doors)), "Låsta");
  })();
  const w = S.windows.open;
  const windowsRow = row(
    w.length ? "window-open.svg" : "window.svg",
    "Fönster",
    since(S.windows.changed),
    w.length ? (w.length > 1 ? "Båda öppna" : `${w[0].name} öppet`) : "Stängda",
    w.length ? "open" : null
  );
  withDividers($("f-status"), [
    doorsRow,
    windowsRow,
    row(S.alarm.on ? "motion-sensor-cab.svg" : "motion-sensor-cab-disabled.svg", "Larm", since(S.alarm.changed), S.alarm.on ? "På" : "Av"),
  ]);

  // ---------- 4. Action (only when needed), one line ----------
  const toFix = [...open, ...unlocked];
  const winOpen = S.windows.open;
  if (toFix.length || winOpen.length) {
    const parts = [];
    if (toFix.length) parts.push(`${open.length ? "Stäng och lås" : "Lås"} ${toFix.map((d) => d.the).join(" och ")}`);
    if (winOpen.length) parts.push(`${parts.length ? "stäng" : "Stäng"} ${winOpen.map((w) => w.the).join(" och ")}`);
    // the alarm rule rides along, only when a door keeps the alarm off
    const rule = toFix.length && !S.alarm.on ? " Larmet kan bara vara på när alla dörrar är låsta." : "";
    $("f-action-text").textContent = `${parts.join(" och ")} vid lastbilen.${rule}`;
    $("f-action").hidden = false;
    $("f-action-close").addEventListener("click", () => { $("f-action").hidden = true; });
  }

  // ---------- 5. History page: every event, grouped by day ----------
  const hist = $("f-history");
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
    withDividers(ul, g.items.map((e) => {
      const time = g.day === "Tidigare" ? `${e.when[0]} ${e.when[1]}` : e.when[1];
      const li = row(e.icon, e.title, e.by ? `${time} · ${e.by}` : time);
      if (e.alarm) li.classList.add("f-event--alarm");
      return li;
    }));
    sec.append(ul);
    hist.append(sec);
  }
  // kept 30 days (P3: 2–4 weeks on the road) and can be shared, e.g. for a police report (P3, P5)
  hist.prepend(el("p", "f-history__note", "Sparas i 30 dagar"));
  const share = el("button", "f-share", "Dela historik");
  share.type = "button";
  hist.append(share);
  const page = $("f-history-page");
  const openHistory = (on) => { page.hidden = !on; };
  $("f-all").addEventListener("click", () => openHistory(true));
  $("f-history-back").addEventListener("click", () => openHistory(false));
  if (params.get("history") === "open") openHistory(true);
})();
