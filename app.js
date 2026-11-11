// Alarm & Lock screen: two tabs, Alarm and Doors.
// Edit the data below to change what the screen shows.
//
// Preview other states with URL parameters (they can be combined):
//   ?tab=doors                 open the Doors tab
//   ?alarm=on                  alarm on (blinking sensor waves inside the cab); off = slashed waves
//   ?truck=cab                 line drawing zoomed in on the cab, so the seats and doors are bigger
//   ?truck=photo               both tabs use the truck photo instead of the line drawing; on the
//                              Alarm tab the truck itself turns the alarm on / off ("Tap to turn on"
//                              hint + a first-visit popup; ?coach=off hides the popup)
//   ?history=split             Recent = today + yesterday only, and a separate "See all history"
//                              button below that opens a full history page (compare with default)
//   ?doors=locked              all doors locked and closed
//   ?open=driver,passenger     which doors are open (driver, passenger, or none)
//   ?stale=1                   the backend hasn't heard from the truck for a while
//   ?connection=checking       still checking with the truck
//   ?connection=failed         could not reach the truck
//   ?remote=1                  truck supports remote lock / alarm (shows buttons)
//   ?remote=1&result=fail      remote command fails
//   ?theme=dark | ?theme=light night mode on / off (default: follows the phone)
//   ?events=none               no events at all (common on real trucks)
//   ?layout=simple             no truck image: one status icon per tab (research: icon + status
//                              text was read correctly at a glance by almost everyone). Events
//                              that need attention get an unchecked mark + check button instead
//                              of the "Check the cab…" direction.
const ICONS = "assets/icons/";

// ---------- Data ----------

// Each fact is said once: the heading says what and which ("Driver door: open"), the stamp says
// when the app checked it with the truck ("Today, 09:41"), the direction says what to do.
// Like the Volvo My Truck app: the icon / image is the state now, and the stamp is when the app
// got it (checkedAt), right when the screen opens. It matches the phone clock (the status bar
// says 9:41). When it happened is in Recent (changedAt = the time of that event), always before
// the stamp. Keep it consistent with the events below and with A (a/app.js).
//
// lastReportMinutes = minutes since the backend last heard from the truck. It is not shown as a
// time (what it means is unclear to people); it only decides when to warn that the state may be old.
// connection: "ok" | "checking" | "failed".
const STALE_AFTER_MINUTES = 30;

const vehicleStatus = {
  connection: "ok",
  lastReportMinutes: 4,
  checkedAt: "today, 09:41", // when the app got this state from the truck (the stamp)
  remoteControl: false, // true when this truck can be locked / armed from the app
  remoteAlarm: false, // alarm only can be turned on / off from the app (photo version, for comparison)
  alarm: { state: "off", changedAt: "today, 09:34" },
  doors: {
    changedAt: "today, 09:35",
    // state: "locked" | "unlocked"; open: true when the door is physically open.
    list: [
      { id: "driver", name: "Förardörr", the: "förardörren", state: "unlocked", open: true },
      { id: "passenger", name: "Passagerardörr", the: "passagerardörren", state: "locked", open: false },
    ],
  },
};

// Where each door sits on the truck line drawing (pixel space of truck-top-line.png, 1024 x 1536).
// edge = the door in the cab wall (drawn red when unlocked). open = the door leaf swung out
// around its front hinge (drawn red when the door is open). Both are plain lines, so the same
// overlay can be drawn in Figma.
const DOOR_GEOMETRY = {
  driver: { edge: [222, 345, 222, 590], open: [222, 345, 81.5, 545.7] },
  passenger: { edge: [803, 345, 803, 590], open: [803, 345, 943.5, 545.7] },
};

// Alarm on: sensor waves inside the cab, where the motion sensor watches ((( • ))), drawn like the
// arcs in the "Motion Sensor Cab" icon. Alarm off: nothing. Same pixel space as DOOR_GEOMETRY.
// Like the doors, the drawing stays the same and the overlay is the state.
const ALARM_WAVES = { cx: 512, cy: 480, radii: [70, 120, 170], spread: 38 };

// Truck image for both tabs: line drawing (default, Figma 24:6658) or photo (Figma 24:6624).
// Both use the same 1024 x 1536 composition, so the waves and door lines sit in the same place.
// Simple layout: one Volvo DS icon per state (same icons as the first Figma design and the list).
const STATUS_ICONS = {
  alarm: { on: "motion-sensor-cab.svg", off: "motion-sensor-cab-disabled.svg", unknown: "status-unknown.svg" },
  doors: { locked: "lock-locked.svg", unlocked: "lock-unlocked.svg", open: "cab-door-left.svg", unknown: "status-unknown.svg" },
};

const TRUCK_IMAGES = {
  line: "assets/images/truck-top-line.png",
  photo: "assets/images/truck-top-photo.png",
  cab: "assets/images/truck-top-line.png", // same line drawing, cropped to the cab (CSS)
};

// Three image states for the alarm sensor, all drawn at the same spot in the cab:
//   on      = sensor dot + waves blinking outward          (sensing)
//   off     = faint still waves crossed by a slash          (switched off, like the DS
//             "Motion Sensor Cab Disabled" icon; gray, not a warning color)
//   unknown = a question mark in a circle, no waves          (checking / couldn't reach the truck)
function sensorShapes(mode, { cx, cy, radii, spread }) {
  if (mode === "unknown") {
    const q = svg("text", { class: "alarm-unknown__mark", x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "central" });
    q.textContent = "?";
    return [svg("circle", { class: "alarm-unknown__ring", cx, cy, r: 56 }), q];
  }
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  };
  // Off: a small badge on a plate (sensor icon crossed out), not loose lines on the drawing — a long
  // slash read as a second door line, and faint waves disappeared into the seats (mock test).
  // Plate = page background, marks = text color, so it looks the same in day and night mode.
  if (mode === "off") {
    const r = 105;
    const off = [svg("circle", { class: "alarm-off__plate", cx, cy, r }), svg("circle", { class: "alarm-off__dot", cx, cy, r: 11 })];
    for (const wr of [38, 66]) {
      for (const mid of [0, 180]) {
        off.push(svg("path", { class: "alarm-off__wave", d: `M${pt(wr, mid - 40)} A${wr} ${wr} 0 0 1 ${pt(wr, mid + 40)}` }));
      }
    }
    const d = 60;
    const line = { x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d };
    off.push(svg("line", { class: "alarm-off__gap", ...line }), svg("line", { class: "alarm-off__slash", ...line }));
    return off;
  }
  const waveClass = (i) => `alarm-wave alarm-wave--${i + 1}`;
  const shapes = [svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 })];
  radii.forEach((r, i) => {
    for (const mid of [0, 180]) {
      shapes.push(svg("path", { class: waveClass(i), d: `M${pt(r, mid - spread)} A${r} ${r} 0 0 1 ${pt(r, mid + spread)}` }));
    }
  });
  return shapes;
}

// Event history. category = which tab lists it. attention = listed first, under "Needs attention".
// direction = what to do about it (shown as the tab's direction line while it needs attention).
// Newest first. Only "attention" events and today's events show on the tab; the rest sit
// behind "See all history" so each tab fits on one screen without scrolling.
const events = [
  {
    category: "doors",
    icon: "cab-door-left.svg",
    title: "Förardörren har öppnats",
    when: "Today • 09:35",
  },
  {
    category: "doors",
    icon: "lock-locked.svg",
    title: "Dörrarna har låsts",
    when: "Yesterday • 18:20",
  },
  {
    category: "doors",
    icon: "cab-door-left.svg",
    title: "Passagerardörren har öppnats",
    when: "Monday • 07:45",
  },
  {
    category: "alarm",
    icon: "motion-sensor-cab-disabled.svg",
    title: "Larmet har stängts av",
    when: "Today • 09:34",
  },
  {
    category: "alarm",
    icon: "motion-sensor-cab.svg",
    // mentor feedback: say what set the alarm off, not only that it went off
    title: "Larmet gick: rörelse i hytten",
    when: "Yesterday • 02:06",
    where: "Hytten",
    attention: true,
    direction: "Titta till hytten när du är tillbaka vid lastbilen.",
  },
  {
    category: "alarm",
    icon: "speaker-panic-alarm.svg",
    title: "Larmet gick: panikknappen trycktes",
    when: "Tuesday • 03:09",
    where: "Hytten",
  },
];

const TEXT = {
  // Swedish only (all participants are Swedish). Time only ("Idag 09:41"): the heading right above
  // says what the time is for. Internal keys stay English ("today, 09:41", "on", "locked").
  since: (t) => dayText(String(t).replace(/^(\w+),\s*/, (m, d) => `${cap(d)} `)),
  direction: {
    closeAndLock: (many) => `Stäng och lås ${many ? "dem" : "den"} vid lastbilen.`,
    lock: (many) => `Lås ${many ? "dem" : "den"} vid lastbilen.`,
    alarmOn: "Slå på det när du låser lastbilen.",
    alarmNeedsLock: "Larmet kan bara vara på när alla dörrar är låsta.",
  },
  stale: (m) => `Kan vara inaktuellt. Senaste rapport från lastbilen för ${m} min sedan`,
  checking: "Kontrollerar med lastbilen…",
  failed: "Kunde inte nå lastbilen. Visar senast kända läge.",
  tryAgain: "Försök igen",
  recent: "Senaste",
  toCheck: (n) => `${n} att kontrollera`,
  seeAllPage: "Visa all historik",
  truckHint: { on: "Tryck för att stänga av", off: "Tryck för att slå på", working: { on: "Stänger av…", off: "Slår på…" } },
  truckButton: (on) => (on ? "Larm på. Tryck på lastbilen för att stänga av" : "Larm av. Tryck på lastbilen för att slå på"),
  historyTitle: { alarm: "Larmhistorik", doors: "Dörrhistorik", all: "Historik" },
  lastKnown: "Senast kända läge",
  dayGroup: { Today: "Idag", Yesterday: "Igår", other: "Tidigare" },
  seeAll: (n, more) => (more ? `Visa all historik (${n} till)` : `Visa historik (${n})`),
  showLess: "Visa mindre",
  // Empty history is common on real trucks (mentor): say what will show up here instead of a blank.
  empty: {
    alarm: "Larmet har inte gått. Om det gör det ser du här vad som utlöste det.",
    doors: "Inga dörrhändelser än. Öppnade och låsta dörrar visas här.",
    all: "Inget har hänt än. Larm och dörrhändelser visas här.",
  },
  historyFailed: "Historiken kunde inte laddas.",
  buttons: {
    alarmOn: "Slå på larm",
    alarmOff: "Stäng av larm",
    lock: "Lås dörrar",
    closeFirst: "Stäng dörren för att låsa",
    unlock: "Lås upp dörrar",
    cancel: "Avbryt",
    confirmUnlock: "Lås upp",
    working: { alarmOn: "Slår på…", alarmOff: "Stänger av…", lock: "Låser…", unlock: "Låser upp…" },
  },
  confirmUnlock: "<strong>Lås upp alla dörrar?</strong> Vem som helst nära lastbilen kan öppna dem.",
  failedCommand: "<strong>Lastbilen svarade inte.</strong> Inget ändrades. Kontrollera vid lastbilen eller försök igen.",
  labels: { alarm: "Larm", doors: "Dörrar" },
};

// Shown words for the internal states and days
const SV = {
  alarm: { on: "på", off: "av" },
  doors: { locked: "låsta", unlocked: "olåsta", open: "öppna" }, // "Dörrar: låsta"
  door: { locked: "låst", unlocked: "olåst", open: "öppen" }, // "Förardörr: öppen"
  day: { Today: "Idag", Yesterday: "Igår", Monday: "Måndag", Tuesday: "Tisdag", Wednesday: "Onsdag", Thursday: "Torsdag", Friday: "Fredag", Saturday: "Lördag", Sunday: "Söndag" },
};
const dayText = (when) => String(when).replace(/^(Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/, (d) => SV.day[d]);
const doorsWord = (heading) => (heading.subject === TEXT.labels.doors ? SV.doors : SV.door)[heading.state] || heading.state;

// ---------- Helpers ----------

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function img(src, className) {
  const i = el("img", className);
  i.src = src;
  i.alt = "";
  i.draggable = false;
  return i;
}

// Demo clock: starts at 09:41 like the status bar (one minute per action), instead of the real
// time, which could read as earlier than the demo events.
let demoMinutes = 9 * 60 + 41;
function nowText() {
  demoMinutes += 1;
  const hh = String(Math.floor(demoMinutes / 60) % 24).padStart(2, "0");
  const mm = String(demoMinutes % 60).padStart(2, "0");
  return `today, ${hh}:${mm}`;
}

const openDoors = (status) => status.doors.list.filter((d) => d.open);
const doorsState = (status) =>
  openDoors(status).length ? "open" : status.doors.list.some((d) => d.state === "unlocked") ? "unlocked" : "locked";

// ---------- List rendering ----------

function renderList(rows) {
  const list = el("ul", "list");
  rows.forEach((row, i) => {
    const li = el("li", "list-item");
    li.append(row);
    if (i < rows.length - 1) li.append(img(ICONS + "divider-line.svg", "list-item__divider"));
    list.append(li);
  });
  return list;
}

function renderGroup(label, rows, badge) {
  const section = el("section", "list-group");
  const head = el("p", "list-group__label", label);
  if (badge) head.append(el("span", "list-group__badge", badge));
  section.append(head, renderList(rows));
  return section;
}

// ---------- Unchecked events (icon layout only: ?layout=simple) ----------
// Events that need attention stay "unchecked" (amber dot, bold title) until the driver ticks the
// check button on the row. This replaces the "Check the cab…" direction on that layout.
const simpleLayout = () => params.get("layout") === "simple";
const CHECKED_KEY = "mta.checkedEvents";
const checkedEvents = new Set(
  (() => {
    try {
      return JSON.parse(sessionStorage.getItem(CHECKED_KEY)) || [];
    } catch {
      return [];
    }
  })()
);
const eventKey = (e) => `${e.category}|${e.title}|${e.when}`;
const needsCheck = (e) => simpleLayout() && e.attention;
const isUnchecked = (e) => needsCheck(e) && !checkedEvents.has(eventKey(e));
const uncheckedBadge = (items) => {
  const n = items.filter(isUnchecked).length;
  return n ? TEXT.toCheck(n) : null;
};

function setChecked(item, checked) {
  if (checked) checkedEvents.add(eventKey(item));
  else checkedEvents.delete(eventKey(item));
  try {
    sessionStorage.setItem(CHECKED_KEY, JSON.stringify([...checkedEvents]));
  } catch {
    // storage blocked: still works until reload
  }
  renderStatus(vehicleStatus);
}

function eventRow(item) {
  const content = el("div", "list-item__content");
  const iconBox = el("div", "list-item__icon");
  iconBox.append(img(ICONS + item.icon, item.iconClass));

  const text = el("div", "list-item__text");
  const meta = dayText(item.where ? `${item.when} • ${item.where}` : item.when);
  text.append(el("p", "list-item__title", item.title), el("p", "list-item__meta", meta));

  content.append(iconBox, text);

  if (needsCheck(item)) {
    const unchecked = isUnchecked(item);
    content.classList.toggle("list-item__content--unchecked", unchecked);
    const box = el("button", "check-toggle");
    box.type = "button";
    box.setAttribute("aria-pressed", String(!unchecked));
    box.setAttribute("aria-label", unchecked ? `Markera "${item.title}" som kontrollerad` : `"${item.title}" kontrollerad. Markera som inte kontrollerad`);
    box.addEventListener("click", () => {
      const nowChecked = box.getAttribute("aria-pressed") !== "true";
      // update this row right away (also on the history page), then the tab
      box.setAttribute("aria-pressed", String(nowChecked));
      content.classList.toggle("list-item__content--unchecked", !nowChecked);
      setChecked(item, nowChecked);
    });
    content.append(box);
  }
  return content;
}

// What the tab shows: events that need attention (pinned first), then today's events, at most
// MAX_SHOWN. The event that started the current state is left out here: the heading and time
// stamp above already say it ("Driver door: open / Today, 09:41"). Everything is one tap away.
const MAX_SHOWN = 2;
const expanded = { alarm: false, doors: false };
// The stamp is the check time now, so Recent keeps the event of the current state (it is the only
// place that says when it happened). Nothing is filtered out any more.
const sameTime = () => false;

// A tab with a control button (e.g. Turn on alarm) keeps one history row so it still fits one screen.
let rowsLimit = MAX_SHOWN;

function pickShown(items, changedAt) {
  const isToday = (e) => e.when.startsWith("Today");
  const candidates = items.filter((e) => !sameTime(e.when, changedAt));
  const shown = [...candidates.filter((e) => e.attention), ...candidates.filter((e) => !e.attention && isToday(e))];
  return shown.slice(0, rowsLimit);
}

// ?history=split: Recent keeps today's and yesterday's events (attention first, the current
// state's own event still left out), and the full list moves to its own page.
const splitHistory = () => params.get("history") === "split";
const dayOf = (e) => e.when.split(" •")[0];

function pickRecentDays(items, changedAt) {
  const recent = items.filter((e) => !sameTime(e.when, changedAt) && ["Today", "Yesterday"].includes(dayOf(e)));
  return [...recent.filter((e) => e.attention), ...recent.filter((e) => !e.attention)].slice(0, rowsLimit);
}

function renderHistory(container, items, category, connection, changedAt) {
  // a full-width button takes a row of space; the small switch doesn't
  rowsLimit = canControl(category, vehicleStatus) && !usesTruckButton(category, vehicleStatus) ? 1 : MAX_SHOWN;
  if (splitHistory()) return renderHistorySplit(container, items, category, connection, changedAt);
  container.replaceChildren();
  if (connection === "failed") {
    container.append(el("p", "history__empty", TEXT.historyFailed));
    return;
  }
  if (items.length === 0) {
    container.append(el("p", "history__empty", TEXT.empty[category]));
    return;
  }
  const shown = pickShown(items, changedAt);
  const hidden = items.filter((e) => !shown.includes(e));
  const rows = (expanded[category] ? [...shown, ...hidden] : shown).map(eventRow);

  if (hidden.length) {
    const more = el("button", "list-more");
    more.type = "button";
    more.setAttribute("aria-expanded", String(expanded[category]));
    more.append(el("span", null, expanded[category] ? TEXT.showLess : TEXT.seeAll(hidden.length, shown.length > 0)));
    more.addEventListener("click", () => {
      expanded[category] = !expanded[category];
      renderHistory(container, items, category, connection, changedAt);
    });
    rows.push(more);
  }
  container.append(renderGroup(TEXT.recent, rows, uncheckedBadge(expanded[category] ? items : shown)));
}

function renderHistorySplit(container, items, category, connection, changedAt) {
  container.replaceChildren();
  if (connection === "failed") {
    container.append(el("p", "history__empty", TEXT.historyFailed));
    return;
  }
  const shown = pickRecentDays(items, changedAt);
  if (shown.length) container.append(renderGroup(TEXT.recent, shown.map(eventRow), uncheckedBadge(shown)));
  if (items.length) {
    const link = el("button", "history-link");
    link.type = "button";
    link.append(el("span", null, TEXT.seeAllPage));
    link.addEventListener("click", () => openHistoryPage(category, items, link));
    container.append(link);
  }
}

// Full history page: every event of the tab, grouped Today / Yesterday / Earlier.
function openHistoryPage(category, items, opener) {
  const page = $("history-page");
  $("history-page-title").textContent = TEXT.historyTitle[category];
  const body = $("history-page-body");
  body.replaceChildren();
  const order = ["Today", "Yesterday", "other"];
  for (const key of order) {
    const group = items.filter((e) => (key === "other" ? !["Today", "Yesterday"].includes(dayOf(e)) : dayOf(e) === key));
    if (group.length) body.append(renderGroup(TEXT.dayGroup[key], group.map(eventRow)));
  }
  page.hidden = false;
  document.body.classList.add("is-history-open");
  const back = $("history-page-back");
  back.focus();
  const close = () => {
    page.hidden = true;
    document.body.classList.remove("is-history-open");
    back.removeEventListener("click", close);
    document.removeEventListener("keydown", onKey);
    opener.focus();
  };
  const onKey = (e) => e.key === "Escape" && close();
  back.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
}

// Heading for the Doors tab. Names the door when only one isn't locked, so no door list is needed.
function doorsHeading(status) {
  const notLocked = status.doors.list.filter((d) => d.open || d.state === "unlocked");
  if (notLocked.length === 1) {
    const d = notLocked[0];
    return { subject: d.name, state: d.open ? "open" : "unlocked" };
  }
  return { subject: TEXT.labels.doors, state: doorsState(status) };
}

// ---------- Door overlay ----------

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Locked + closed: nothing. Unlocked: red door edge. Open: red door leaf swung out.
// No text on the image: the door list right below names each door.
function doorShapes(status) {
  const shapes = [];
  for (const door of status.doors.list) {
    const g = DOOR_GEOMETRY[door.id];
    if (!g || (door.state === "locked" && !door.open)) continue;
    const [x1, y1, x2, y2] = door.open ? g.open : g.edge;
    // open door = red (the one thing to act on now); unlocked but closed = ink
    shapes.push(svg("line", { class: door.open ? "door-overlay__line door-overlay__line--open" : "door-overlay__line", x1, y1, x2, y2 }));
  }
  return shapes;
}

function renderDoorOverlay(status) {
  const layer = $("door-overlay");
  // Checking / couldn't reach the truck: the same question mark as the Alarm tab, no door marks
  layer.replaceChildren(...(status.connection !== "ok" ? sensorShapes("unknown", ALARM_WAVES) : doorShapes(status)));
}

// ---------- Direction line ----------
// One line per tab, only when there is something to do. urgent = shown in the warning color
// ("do it now"); otherwise regular text ("when you can"). Trucks with remote control get a button
// instead of lock / alarm directions.

// Can this tab's state be changed from the app? Doors: remote lock. Alarm: remote lock or remoteAlarm.
const canControl = (category, status) => status.remoteControl || (category === "alarm" && status.remoteAlarm);
// Photo version: the truck photo itself is the alarm on/off button (no text button, no switch).
const usesTruckButton = (category, status) => category === "alarm" && status.remoteAlarm && !status.remoteControl;

function directionFor(category, status) {
  if (category === "combined") {
    // here and now first: an open / unlocked door, then the alarm (it needs the doors locked)
    // no heading names the door on this screen, so the direction does
    const notLocked = status.doors.list.filter((x) => x.open || x.state === "unlocked");
    if (notLocked.length) {
      const names = notLocked.map((x) => x.the).join(" och ");
      const verb = openDoors(status).length ? "Stäng och lås" : "Lås";
      return { text: `${verb} ${names} vid lastbilen. ${TEXT.direction.alarmNeedsLock}`, urgent: false };
    }
    return null; // all locked: the rows say it, and the hint on the cab says how to turn the alarm on
  }
  const attention = events.find((e) => e.category === category && e.attention && e.direction);
  if (attention && !simpleLayout()) return { text: attention.direction, urgent: true };
  if (canControl(category, status)) return null;

  if (category === "doors") {
    const open = openDoors(status);
    const notLocked = status.doors.list.filter((d) => d.open || d.state === "unlocked");
    const many = notLocked.length > 1;
    if (open.length) return { text: TEXT.direction.closeAndLock(many), urgent: true };
    if (notLocked.length) return { text: TEXT.direction.lock(many), urgent: false };
  }
  if (category === "alarm" && status.alarm.state === "off") return { text: TEXT.direction.alarmOn, urgent: false };
  return null;
}

// Sits right under the stamp: state -> when -> what to do. The X hides it for this situation only:
// it comes back when the situation changes (another door, a new event, a new state change).
const DISMISS_KEY = "mta.dismissedDirections";
const dismissed = new Set(readDismissed());

function readDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Storage blocked (private mode): dismissing still works until the page is reloaded.
  }
}

// Same text + same state-change time = same situation.
function situationKey(category, status, d) {
  const changedAt = category === "doors" ? status.doors.changedAt : status.alarm.changedAt;
  return `${category}|${d.text}|${changedAt}`;
}

function renderDirection(category, status) {
  const line = $(`${category}-direction`);
  const d = directionFor(category, status);
  const key = d && situationKey(category, status, d);
  line.hidden = !d || dismissed.has(key);
  if (line.hidden) return;
  $(`${category}-direction-text`).textContent = d.text;
  line.classList.toggle("direction--urgent", d.urgent);
  line.dataset.key = key;
}

for (const category of ["alarm", "doors", "combined"]) {
  $(`${category}-direction-close`).addEventListener("click", () => {
    const line = $(`${category}-direction`);
    dismissed.add(line.dataset.key);
    saveDismissed();
    line.hidden = true;
  });
}

// ---------- Status (top of each tab) ----------

// One stamp per status: when the state started. Freshness only shows up when there is a problem.
function renderCheck(container, status, changedAt) {
  container.replaceChildren();
  const tag = el("span", "tag");
  if (status.connection === "checking") {
    tag.append(el("span", "spinner"), el("span", null, TEXT.checking));
  } else if (status.connection === "failed") {
    tag.classList.add("tag--failed");
    tag.append(el("span", "alert-mark", "!"), el("span", null, TEXT.failed));
  } else {
    tag.append(el("span", null, TEXT.since(changedAt)));
  }
  container.append(tag);

  if (status.connection === "ok" && status.lastReportMinutes >= STALE_AFTER_MINUTES) {
    container.append(el("p", "check__stale", TEXT.stale(status.lastReportMinutes)));
  }
  if (status.connection === "failed") {
    const retry = el("button", "text-button", TEXT.tryAgain);
    retry.type = "button";
    retry.addEventListener("click", reconnect);
    container.append(retry);
  }
}

function renderStatus(status) {
  const stale = status.connection !== "ok" || status.lastReportMinutes >= STALE_AFTER_MINUTES;

  // Alarm
  $("alarm-hero").dataset.stale = String(stale);
  const view = ["photo", "cab"].includes(params.get("truck")) ? params.get("truck") : "line";
  $("alarm-hero").dataset.view = view;
  $("alarm-image").src = TRUCK_IMAGES[view];
  const sensor = status.connection !== "ok" ? "unknown" : status.alarm.state;
  $("alarm-image").alt =
    sensor === "unknown" ? "Lastbilen sedd ovanifrån, larmets läge okänt" : `Lastbilen sedd ovanifrån, larm ${SV.alarm[sensor]}`;
  $("alarm-overlay").replaceChildren(...sensorShapes(sensor, ALARM_WAVES));
  $("alarm-icon").src = ICONS + STATUS_ICONS.alarm[sensor];
  $("alarm-state").textContent = SV.alarm[status.alarm.state];
  renderCheck($("alarm-check"), status, status.checkedAt);

  // Doors
  const doors = doorsState(status);
  $("doors-hero").dataset.stale = String(stale);
  $("doors-hero").dataset.view = view;
  $("doors-image").src = TRUCK_IMAGES[view];
  const open = openDoors(status);
  $("doors-image").alt = open.length
    ? `Lastbilen sedd ovanifrån. Öppen: ${open.map((d) => d.name).join(", ")}`
    : `Lastbilen sedd ovanifrån, dörrar ${SV.doors[doors] || doors}`;
  renderDoorOverlay(status);
  const heading = doorsHeading(status);
  $("doors-icon").src = ICONS + STATUS_ICONS.doors[status.connection !== "ok" ? "unknown" : heading.state];
  $("doors-subject").textContent = `${heading.subject}:`;
  $("doors-state").textContent = doorsWord(heading);
  renderCheck($("doors-check"), status, status.checkedAt);

  renderAction("alarm", status);
  renderAction("doors", status);
  renderDirection("alarm", status);
  renderDirection("doors", status);

  for (const category of ["alarm", "doors"]) {
    renderHistory(
      $(`history-${category}`),
      events.filter((e) => e.category === category),
      category,
      status.connection,
      status[category].changedAt
    );
  }
  if (combinedView()) renderCombined(status);
}

// ---------- Alternative C: alarm + doors on one screen ----------

const combinedView = () => params.get("alt") === "c";

function statusRow({ icon, label, value, when }) {
  const content = el("div", "list-item__content status-row");
  const iconBox = el("div", "list-item__icon");
  iconBox.append(img(ICONS + icon));
  const text = el("div", "list-item__text");
  text.append(el("p", "list-item__title", label), el("p", "list-item__meta", when));
  content.append(iconBox, text, el("span", "status-row__value", value));
  return content;
}

function renderCombined(status) {
  const ok = status.connection === "ok";
  const sensor = ok ? status.alarm.state : "unknown";
  $("combined-hero").dataset.stale = String(!ok || status.lastReportMinutes >= STALE_AFTER_MINUTES);
  renderCombinedOverlay(status, sensor);
  const heading = doorsHeading(status);
  const doorsValue = heading.subject === TEXT.labels.doors ? cap(doorsWord(heading)) : `${heading.subject} ${doorsWord(heading)}`;
  $("combined-image").alt = `Lastbilen sedd ovanifrån. ${doorsValue}. Larm ${SV.alarm[status.alarm.state]}.`;

  // checking / failed: one line under the drawing; otherwise the times sit in the rows
  const check = $("combined-check");
  if (ok && status.lastReportMinutes < STALE_AFTER_MINUTES) check.replaceChildren();
  else renderCheck(check, status, status.checkedAt);

  const when = (t) => (ok ? TEXT.since(t) : TEXT.lastKnown);
  $("combined-status").replaceChildren(
    ...[
      statusRow({ icon: STATUS_ICONS.doors[heading.state], label: TEXT.labels.doors, value: C_BUSY_TEXT[cBusy]?.doors || doorsValue, when: when(status.checkedAt) }),
      statusRow({ icon: STATUS_ICONS.alarm[status.alarm.state], label: TEXT.labels.alarm, value: C_BUSY_TEXT[cBusy]?.alarm || cap(SV.alarm[status.alarm.state]), when: when(status.checkedAt) }),
    ].map((row, i, all) => {
      const li = el("li", "list-item");
      li.append(row);
      if (i < all.length - 1) li.append(img(ICONS + "divider-line.svg", "list-item__divider"));
      return li;
    })
  );

  renderDirection("combined", status);

  // Recent: today + yesterday from both, attention first, without the events the rows above already say
  const container = $("history-combined");
  container.replaceChildren();
  if (!ok && status.connection === "failed") {
    container.append(el("p", "history__empty", TEXT.historyFailed));
    return;
  }
  if (!events.length) {
    container.append(el("p", "history__empty", TEXT.empty.all));
    return;
  }
  const current = (e) => sameTime(e.when, status[e.category].changedAt);
  const recent = events.filter((e) => !current(e) && ["Today", "Yesterday"].includes(dayOf(e)));
  const shown = [...recent.filter((e) => e.attention), ...recent.filter((e) => !e.attention)].slice(0, MAX_SHOWN);
  if (shown.length) container.append(renderGroup(TEXT.recent, shown.map(eventRow)));
  const link = el("button", "history-link");
  link.type = "button";
  link.append(el("span", null, TEXT.seeAllPage));
  link.addEventListener("click", () => openHistoryPage("all", events, link));
  container.append(link);
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------- Alternative C: tap the cab for the alarm ----------
// Kept small for the user test (does the drawing show the state?): the doors only show their state
// (they are closed and locked at the truck), and the only tap is the cab = alarm on / off, like
// tapping the truck in B. With a door not locked the alarm can't go on: the door pulses and a hint
// says so. The overlay is built once and updated, so the door and sensor transitions can run.

const C_SWING = { driver: 35, passenger: -35 }; // degrees the door leaf swings out around its hinge
const C_BUSY_TEXT = { alarmOn: { alarm: "Slår på…" }, alarmOff: { alarm: "Stänger av…" } };
const C_HINT = { alarmOn: "Tryck för att slå på", alarmOff: "Tryck för att stänga av", needsLock: "Lås dörrarna först" };
// image px (1024 x 1536) -> px in the cab crop (see [data-view="cab"] in styles.css)
const toFigure = (x, y) => ({ left: x * 0.376 - 22.6, top: y * 0.376 });

let cBusy = null; // null | "alarmOn" | "alarmOff"
let cNudge = false; // tapped the cab while a door wasn't locked
let cBuilt = false;
const cLayers = {};

const controlOn = () => params.get("control") === "on";
const allLocked = (status) => status.doors.list.every((d) => !d.open && d.state === "locked");

function buildCombinedOverlay() {
  const layer = $("combined-overlay");
  layer.classList.add("c-overlay");
  cLayers.sensor = svg("g", { class: "c-sensor" });
  cLayers.doors = svg("g", {});
  cLayers.cues = svg("g", { class: "c-cues" });
  cLayers.unknown = svg("g", {});
  for (const door of vehicleStatus.doors.list) {
    const g = DOOR_GEOMETRY[door.id];
    if (!g) continue;
    const [x1, y1, x2, y2] = g.edge;
    const leaf = svg("line", { class: "door-overlay__line c-door", x1, y1, x2, y2, "data-door": door.id });
    leaf.style.transformOrigin = `${x1}px ${y1}px`;
    cLayers.doors.append(leaf);
  }
  layer.replaceChildren(cLayers.sensor, cLayers.doors, cLayers.cues, cLayers.unknown);
  if (controlOn()) {
    const hits = svg("g", { class: "c-hits" });
    const { cx, cy } = ALARM_WAVES;
    hits.append(svg("circle", { class: "c-hit", cx, cy, r: 190, "data-hit": "cab" }));
    layer.append(hits);
    hits.addEventListener("click", () => combinedTap());
  }
  cBuilt = true;
}

function renderCombinedOverlay(status, sensor) {
  if (!cBuilt) buildCombinedOverlay();
  const ok = status.connection === "ok";
  $("combined-overlay").classList.toggle("c-overlay--off", !ok);

  // doors: shown while unlocked or open; the open one swings out
  for (const leaf of cLayers.doors.querySelectorAll(".c-door")) {
    const door = status.doors.list.find((d) => d.id === leaf.dataset.door);
    const shown = ok && (door.open || door.state === "unlocked");
    leaf.classList.toggle("c-door--hidden", !shown);
    leaf.classList.toggle("c-door--nudge", cNudge && shown);
    leaf.classList.toggle("door-overlay__line--open", door.open);
    leaf.style.transform = door.open ? `rotate(${C_SWING[door.id]}deg)` : "rotate(0deg)";
  }

  // sensor: waves (on) / slash (off); rebuilt only when the state changes, so the blink keeps going
  const mode = ok ? sensor : "hidden";
  if (cLayers.sensor.dataset.mode !== mode) {
    const wasOff = cLayers.sensor.dataset.mode === "off";
    // animate only a change made here, not the first draw
    cLayers.sensor.classList.toggle("c-sensor--changed", Boolean(cLayers.sensor.dataset.mode));
    cLayers.sensor.dataset.mode = mode;
    cLayers.sensor.replaceChildren(...(ok ? sensorShapes(sensor, ALARM_WAVES) : []));
    if (mode === "on" && wasOff) {
      const { cx, cy } = ALARM_WAVES;
      cLayers.sensor.append(svg("circle", { class: "c-burst", cx, cy, r: 170 })); // one pulse when it turns on
    }
  }
  cLayers.unknown.replaceChildren(...(ok ? [] : sensorShapes("unknown", ALARM_WAVES)));

  // cue on the cab: spinner while waiting; a breathing ring + hint only when a tap can do something
  const { cx, cy } = ALARM_WAVES;
  const cues = [];
  const hint = $("combined-hint");
  let text = null;
  if (!controlOn()) {
    // status only: no ring, no hint
  } else if (ok && cBusy) {
    cues.push(svg("circle", { class: "c-busy", cx, cy, r: 55 }));
  } else if (ok && cNudge) {
    text = C_HINT.needsLock;
  } else if (ok && status.alarm.state === "on") {
    text = C_HINT.alarmOff;
  } else if (ok && allLocked(status)) {
    cues.push(svg("circle", { class: "c-tap", cx, cy, r: 92 }));
    text = C_HINT.alarmOn;
  }
  hint.hidden = !text;
  if (text) {
    const pos = toFigure(cx, 640);
    hint.textContent = text;
    hint.style.left = `${pos.left}px`;
    hint.style.top = `${pos.top}px`;
  }
  cLayers.cues.replaceChildren(...cues);
}

function cLog(category, icon, title) {
  const t = nowText();
  events.unshift({ category, icon, title, when: `Today • ${t.slice(7)}`, source: "app" });
  return t;
}

function combinedTap() {
  const status = vehicleStatus;
  if (cBusy || status.connection !== "ok") return;
  if (status.alarm.state === "off" && !allLocked(status)) {
    // can't turn on: point at the door that isn't locked
    cNudge = true;
    renderStatus(status);
    clearTimeout(combinedTap.nudgeTimer);
    combinedTap.nudgeTimer = setTimeout(() => {
      cNudge = false;
      renderStatus(vehicleStatus);
    }, 1800);
    return;
  }
  cNudge = false;
  combinedCommand(status.alarm.state === "on" ? "alarmOff" : "alarmOn");
}

function combinedCommand(command) {
  cBusy = command;
  renderStatus(vehicleStatus);
  setTimeout(() => {
    const on = command === "alarmOn";
    vehicleStatus.alarm = {
      state: on ? "on" : "off",
      changedAt: cLog("alarm", on ? "motion-sensor-cab.svg" : "motion-sensor-cab-disabled.svg", (on ? "Larmet har slagits på" : "Larmet har stängts av")),
    };
    vehicleStatus.lastReportMinutes = 0;
    vehicleStatus.checkedAt = vehicleStatus.alarm.changedAt;
    cBusy = null;
    renderStatus(vehicleStatus);
  }, 1200);
}

// ---------- Action slot ----------
// Trucks without remote control: nothing (the slot stays empty).
// Trucks with remote control: a button, a confirm step for unlocking, then the truck's confirmation.

// The stamp above changing to e.g. "Today, 09:45" with "Doors: locked" is the truck's confirmation.
const actionState = { alarm: null, doors: null }; // null | "confirm" | "working" | { failed }

function note(html, failed) {
  const p = el("p", failed ? "action-note action-note--failed" : "action-note");
  p.innerHTML = html;
  return p;
}

function button(label, onClick, { secondary = false, disabled = false, working = false } = {}) {
  const b = el("button", secondary ? "button button--secondary" : "button");
  b.type = "button";
  b.disabled = disabled || working;
  if (working) b.append(el("span", "spinner"));
  b.append(el("span", null, label));
  if (onClick) b.addEventListener("click", onClick);
  return b;
}

function renderAction(category, status) {
  const slot = $(`${category}-action`);
  slot.replaceChildren();
  const s = actionState[category];

  if (s && s.failed) slot.append(note(TEXT.failedCommand, true));

  if (category === "alarm") renderAlarmTruck(status, s);
  if (!canControl(category, status) || usesTruckButton(category, status)) return;

  const command =
    category === "alarm"
      ? status.alarm.state === "on" ? "alarmOff" : "alarmOn"
      : doorsState(status) === "locked" ? "unlock" : "lock";
  const offline = status.connection !== "ok";

  if (s === "confirm") {
    slot.append(note(TEXT.confirmUnlock));
    const row = el("div", "action-buttons");
    row.append(
      button(TEXT.buttons.cancel, () => setAction(category, null), { secondary: true }),
      button(TEXT.buttons.confirmUnlock, () => runCommand(category, command))
    );
    slot.append(row);
    return;
  }

  const blocked = command === "lock" && openDoors(status).length > 0; // an open door can't be locked
  const working = s === "working";
  const label = working ? TEXT.buttons.working[command] : blocked ? TEXT.buttons.closeFirst : TEXT.buttons[command];
  const onClick = command === "unlock" ? () => setAction(category, "confirm") : () => runCommand(category, command);
  const row = el("div", "action-buttons");
  row.append(button(label, onClick, { working, disabled: offline || blocked, secondary: command === "unlock" || command === "alarmOff" }));
  slot.append(row);
}

// The truck as the on/off button (role="switch"). A cue on the cab shows where it reacts:
// alarm off = a soft ring breathing on the sensor spot ("touch here"); alarm on = the blinking waves.
// While the truck confirms, a spinner turns on the same spot and taps are ignored; the state only
// changes once the truck has confirmed (stamp and heading update too).
function renderAlarmTruck(status, s) {
  const fig = $("alarm-figure");
  const overlay = $("alarm-overlay");
  overlay.querySelectorAll(".alarm-cue").forEach((n) => n.remove());
  const active = usesTruckButton("alarm", status);
  fig.classList.toggle("truck-button", active);
  if (!active) {
    $("alarm-hint").hidden = true;
    $("alarm-coach").hidden = true;
    ["role", "tabindex", "aria-checked", "aria-label", "aria-disabled"].forEach((a) => fig.removeAttribute(a));
    delete fig.dataset.working;
    return;
  }
  const on = status.alarm.state === "on";
  const working = s === "working";
  const offline = status.connection !== "ok";
  fig.setAttribute("role", "switch");
  fig.tabIndex = 0;
  fig.setAttribute("aria-checked", String(on));
  fig.setAttribute("aria-label", working ? TEXT.buttons.working[on ? "alarmOff" : "alarmOn"] : TEXT.truckButton(on));
  fig.setAttribute("aria-disabled", String(working || offline));
  if (working) fig.dataset.working = "true";
  else delete fig.dataset.working;

  // hint pill under the sensor spot: says what a tap does (or what is happening)
  // Same rule as C: the alarm can only go on when all doors are locked. Until then no ring and no
  // "Tap to turn on"; a tap says "Lock the doors first".
  const canTurnOn = allLocked(status);
  const hint = $("alarm-hint");
  const hintText = working
    ? TEXT.truckHint.working[on ? "on" : "off"]
    : bNudge
      ? C_HINT.needsLock
      : on || canTurnOn
        ? TEXT.truckHint[on ? "on" : "off"]
        : null;
  hint.hidden = offline || !hintText;
  if (hintText) hint.textContent = hintText;
  renderCoach(!offline && !working);

  if (offline) return; // the question mark is already there
  const { cx, cy } = ALARM_WAVES;
  if (working) {
    const busy = svg("circle", { class: "alarm-cue alarm-busy", cx, cy, r: 46 });
    overlay.append(busy);
  } else if (!on && canTurnOn) {
    overlay.append(svg("circle", { class: "alarm-cue alarm-tap", cx, cy, r: 92 }));
  }
}

// First-visit popup pointing at the sensor spot. Closes with "Got it" or the first tap on the truck,
// and stays closed (sessionStorage).
let bNudge = false; // B: tapped the truck to turn the alarm on while a door wasn't locked
const COACH_KEY = "mta.truckCoachSeen";
const coachSeen = () => {
  try {
    return sessionStorage.getItem(COACH_KEY) === "1";
  } catch {
    return false;
  }
};
function closeCoach() {
  try {
    sessionStorage.setItem(COACH_KEY, "1");
  } catch {
    // storage blocked: closes for this view only
  }
  $("alarm-coach").hidden = true;
}
function renderCoach(show) {
  $("alarm-coach").hidden = !(show && !coachSeen() && params.get("coach") !== "off");
}
$("alarm-coach-ok").addEventListener("click", (e) => {
  e.stopPropagation();
  closeCoach();
  $("alarm-figure").focus();
});

function toggleAlarmFromTruck() {
  closeCoach();
  const fig = $("alarm-figure");
  if (!fig.classList.contains("truck-button") || fig.getAttribute("aria-disabled") === "true") return;
  if (vehicleStatus.alarm.state === "off" && !allLocked(vehicleStatus)) {
    bNudge = true;
    renderStatus(vehicleStatus);
    clearTimeout(toggleAlarmFromTruck.nudgeTimer);
    toggleAlarmFromTruck.nudgeTimer = setTimeout(() => {
      bNudge = false;
      renderStatus(vehicleStatus);
    }, 1800);
    return;
  }
  bNudge = false;
  runCommand("alarm", vehicleStatus.alarm.state === "on" ? "alarmOff" : "alarmOn");
}

$("alarm-figure").addEventListener("click", () => {
  // a swipe across the truck switches tabs; it must not also toggle the alarm
  if ($("alarm-hero").dataset.dragged === "true") return;
  toggleAlarmFromTruck();
});
$("alarm-figure").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleAlarmFromTruck();
  }
});

function setAction(category, state) {
  actionState[category] = state;
  renderAction(category, vehicleStatus);
}

// Simulated round trip to the truck. Replace with the real API call.
function runCommand(category, command) {
  setAction(category, "working");
  setTimeout(() => {
    if (params.get("result") === "fail") {
      actionState[category] = { failed: true };
    } else {
      const t = nowText();
      const when = `Today • ${t.slice(7)}`;
      const logged = {
        alarmOn: { category: "alarm", icon: "motion-sensor-cab.svg", title: "Larmet har slagits på" },
        alarmOff: { category: "alarm", icon: "motion-sensor-cab-disabled.svg", title: "Larmet har stängts av" },
        lock: { category: "doors", icon: "lock-locked.svg", title: "Dörrarna har låsts" },
        unlock: { category: "doors", icon: "lock-unlocked.svg", title: "Dörrarna har låsts upp" },
      }[command];
      events.unshift({ ...logged, when, source: "app" }); // newest first, in the history too
      if (command === "alarmOn" || command === "alarmOff") {
        vehicleStatus.alarm = { state: command === "alarmOn" ? "on" : "off", changedAt: t };
      } else {
        const state = command === "lock" ? "locked" : "unlocked";
        vehicleStatus.doors.list.forEach((d) => (d.state = state));
        vehicleStatus.doors.changedAt = t;
      }
      vehicleStatus.lastReportMinutes = 0;
      vehicleStatus.checkedAt = t;
      actionState[category] = null;
    }
    renderStatus(vehicleStatus);
  }, 1500);
}

function reconnect() {
  vehicleStatus.connection = "checking";
  renderStatus(vehicleStatus);
  setTimeout(() => {
    vehicleStatus.connection = "ok";
    vehicleStatus.lastReportMinutes = 0;
    vehicleStatus.checkedAt = nowText();
    renderStatus(vehicleStatus);
  }, 1200);
}

// ---------- Tabs ----------

const tabs = [...document.querySelectorAll('[role="tab"]')];

// from: "left" | "right" slides the new panel in from that side (used by swipe).
function selectTab(tab, { focus = false, from = null } = {}) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    const panel = $(t.getAttribute("aria-controls"));
    panel.hidden = !selected;
    if (selected && from) {
      panel.dataset.enter = "";
      void panel.offsetWidth; // restart the slide animation
      panel.dataset.enter = from;
    }
  }
  if (focus) tab.focus();
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    selectTab(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
  });
});

// ---------- Swipe on the truck image ----------
// Swipe left = next tab (Doors), swipe right = previous tab (Alarm). Vertical scrolling still
// works (touch-action: pan-y). Swipes that start at the screen edge are left to the iOS back gesture.

const SWIPE_MIN = 50; // px of horizontal travel
const EDGE = 20; // px from the screen edge

function enableSwipe(area) {
  let start = null;
  area.addEventListener("pointerdown", (e) => {
    area.dataset.dragged = "false";
    if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
    start = { x: e.clientX, y: e.clientY };
  });
  area.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    // moved more than a tap: not a press on the truck button
    area.dataset.dragged = String(Math.hypot(dx, dy) > 10);
    if (combinedView()) return; // one screen, no tabs to swipe between
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const current = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const next = current + (dx < 0 ? 1 : -1);
    if (next < 0 || next >= tabs.length) return;
    selectTab(tabs[next], { from: dx < 0 ? "right" : "left" });
  });
  area.addEventListener("pointercancel", () => (start = null));
}

document.querySelectorAll(".status-hero").forEach(enableSwipe);

// ---------- Start ----------

const params = new URLSearchParams(location.search);

// Test prototype alternatives (A = today's app lives in a/):
//   ?alt=b  photo with overlays (the "3D"/image variant): photo, tap the truck for the alarm, split history
//   ?alt=c  simple line drawing of the cab, alarm + doors on one screen
if (params.get("alt") === "b") {
  if (!params.has("truck")) params.set("truck", "photo");
  if (!params.has("history")) params.set("history", "split");
}
if (params.get("alt") === "c") params.set("truck", "cab");

// Night mode: follow the phone's setting, or force it with ?theme=dark / ?theme=light.
const forcedTheme = ["dark", "light"].includes(params.get("theme")) ? params.get("theme") : null;
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  document.documentElement.dataset.theme = forcedTheme || (darkQuery.matches ? "dark" : "light");
};
applyTheme();
darkQuery.addEventListener("change", applyTheme);
document.documentElement.dataset.layout = params.get("layout") === "simple" ? "simple" : "image";
if (params.get("alarm") === "on" || params.get("alarm") === "off") vehicleStatus.alarm.state = params.get("alarm");
// User test: a different situation for each alternative, so the second and third are answered
// from the screen, not from memory. ?s = the alternative's place in the session (set by the A/B/C
// switcher: 1 = first shown, 2 = second; A is always third and has situation 3 built in).
//   s=1  driver door open, alarm off, the alarm went off last night (motion in the cab)
//   s=2  all doors locked, alarm on, nothing happened last night
if (params.get("s") === "2") {
  vehicleStatus.alarm = { state: "on", changedAt: "today, 09:31" };
  vehicleStatus.doors.list.forEach((d) => Object.assign(d, { state: "locked", open: false }));
  vehicleStatus.doors.changedAt = "today, 09:30";
  events.splice(0, events.length,
    { category: "alarm", icon: "motion-sensor-cab.svg", title: "Larmet har slagits på", when: "Today • 09:31" },
    { category: "doors", icon: "lock-locked.svg", title: "Dörrarna har låsts", when: "Today • 09:30" },
    { category: "doors", icon: "cab-door-left.svg", title: "Förardörren har öppnats", when: "Today • 09:28" },
    { category: "alarm", icon: "motion-sensor-cab-disabled.svg", title: "Larmet har stängts av", when: "Today • 06:15" },
    { category: "doors", icon: "lock-unlocked.svg", title: "Dörrarna har låsts upp", when: "Today • 06:15" },
    { category: "alarm", icon: "speaker-panic-alarm.svg", title: "Larmet gick: panikknappen trycktes", when: "Tuesday • 03:09", where: "Hytten" },
  );
}
if (params.get("doors") === "locked") {
  vehicleStatus.doors.list.forEach((d) => Object.assign(d, { state: "locked", open: false }));
  vehicleStatus.doors.changedAt = "today, 09:30";
}
if (params.has("open")) {
  const ids = params.get("open").split(",");
  vehicleStatus.doors.list.forEach((d) => {
    d.open = ids.includes(d.id);
    if (d.open) d.state = "unlocked"; // an open door can't be locked
  });
}
if (["checking", "failed"].includes(params.get("connection"))) vehicleStatus.connection = params.get("connection");
if (params.get("remote") === "1") vehicleStatus.remoteControl = true;
if (params.get("events") === "none") events.splice(0, events.length);
// User test: all three alternatives only show the state (no lock / alarm commands, like today's
// app), so they are compared on how well they show it. ?control=on brings back tapping the truck
// (B) or the cab (C) to turn the alarm on / off, for a later test.
if (controlOn() && params.get("truck") === "photo") vehicleStatus.remoteAlarm = true;
if (params.get("stale") === "1") vehicleStatus.lastReportMinutes = 45;

if (combinedView()) {
  document.querySelector(".tabs").hidden = true;
  $("panel-alarm").hidden = true;
  $("panel-doors").hidden = true;
  $("panel-combined").hidden = false;
}
renderStatus(vehicleStatus);
if (params.get("tab") === "doors" && !combinedView()) selectTab($("tab-doors"));

$("back-button").addEventListener("click", () => window.history.back());
