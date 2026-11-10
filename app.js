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

// Each fact is said once: the heading says what and which ("Driver door: unlocked"), the stamp says
// when it started ("Today, 14:05"), the direction says what to do ("Lock it at the truck.").
// The stamp shows when that state started (changedAt).
// People check it against their own memory ("that's when I left"), the way drivers pull the handle
// to make sure. Keep it consistent with the events below.
//
// lastReportMinutes = minutes since the backend last heard from the truck. It is not shown as a
// time (what it means is unclear to people); it only decides when to warn that the state may be old.
// connection: "ok" | "checking" | "failed".
const STALE_AFTER_MINUTES = 30;

const vehicleStatus = {
  connection: "ok",
  lastReportMinutes: 4,
  remoteControl: false, // true when this truck can be locked / armed from the app
  remoteAlarm: false, // alarm only can be turned on / off from the app (photo version, for comparison)
  alarm: { state: "off", changedAt: "today, 14:04" },
  doors: {
    changedAt: "today, 14:05",
    // state: "locked" | "unlocked"; open: true when the door is physically open.
    list: [
      { id: "driver", name: "Driver door", state: "unlocked", open: true },
      { id: "passenger", name: "Passenger door", state: "locked", open: false },
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
  const waveClass = (i) => (mode === "on" ? `alarm-wave alarm-wave--${i + 1}` : "alarm-wave alarm-wave--off");
  const shapes = [svg("circle", { class: "alarm-wave__dot", cx, cy, r: 14 })];
  radii.forEach((r, i) => {
    for (const mid of [0, 180]) {
      shapes.push(svg("path", { class: waveClass(i), d: `M${pt(r, mid - spread)} A${r} ${r} 0 0 1 ${pt(r, mid + spread)}` }));
    }
  });
  if (mode === "off") {
    const d = 105; // slash from top-left to bottom-right, as far as the waves reach
    const line = { x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d };
    shapes.push(svg("line", { class: "alarm-slash__gap", ...line }), svg("line", { class: "alarm-slash", ...line }));
  }
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
    title: "Driver door has opened",
    when: "Today • 14:05",
  },
  {
    category: "doors",
    icon: "lock-locked.svg",
    title: "Doors have been locked",
    when: "Yesterday • 18:20",
  },
  {
    category: "doors",
    icon: "cab-door-left.svg",
    title: "Passenger door has opened",
    when: "Monday • 07:45",
  },
  {
    category: "alarm",
    icon: "motion-sensor-cab-disabled.svg",
    title: "Alarm has been turned off",
    when: "Today • 14:04",
  },
  {
    category: "alarm",
    icon: "motion-sensor-cab.svg",
    // mentor feedback: say what set the alarm off, not only that it went off
    title: "Alarm went off: motion in the cab",
    when: "Yesterday • 02:06",
    where: "Cab",
    attention: true,
    direction: "Check the cab when you're back at the truck.",
  },
  {
    category: "alarm",
    icon: "speaker-panic-alarm.svg",
    title: "Alarm went off: panic button pressed",
    when: "Tuesday • 03:09",
    where: "Cab",
  },
];

const TEXT = {
  // Time only ("Today, 14:05"): the heading right above says what the time is for.
  since: (t) => t.charAt(0).toUpperCase() + t.slice(1),
  direction: {
    closeAndLock: (many) => `Close and lock ${many ? "them" : "it"} at the truck.`,
    lock: (many) => `Lock ${many ? "them" : "it"} at the truck.`,
    alarmOn: "Turn it on when you lock the truck.",
    alarmNeedsLock: "The alarm can only be on when all doors are locked.",
  },
  stale: (m) => `May be out of date. Last report from the truck ${m} min ago`,
  checking: "Checking with the truck…",
  failed: "Couldn't reach the truck. Showing the last known state.",
  tryAgain: "Try again",
  recent: "Recent",
  toCheck: (n) => `${n} to check`,
  seeAllPage: "See all history",
  truckHint: { on: "Tap to turn off", off: "Tap to turn on", working: { on: "Turning off…", off: "Turning on…" } },
  truckButton: (on) => (on ? "Alarm on. Tap the truck to turn it off" : "Alarm off. Tap the truck to turn it on"),
  historyTitle: { alarm: "Alarm history", doors: "Door history", all: "History" },
  lastKnown: "Last known state",
  dayGroup: { Today: "Today", Yesterday: "Yesterday", other: "Earlier" },
  seeAll: (n, more) => (more ? `See all history (${n} more)` : `See history (${n})`),
  showLess: "Show less",
  // Empty history is common on real trucks (mentor): say what will show up here instead of a blank.
  empty: {
    alarm: "The alarm hasn't gone off. If it does, you'll see here what set it off.",
    doors: "No door events yet. Opened and locked doors will show up here.",
    all: "Nothing has happened yet. Alarms and door events will show up here.",
  },
  historyFailed: "History couldn't be loaded.",
  buttons: {
    alarmOn: "Turn on alarm",
    alarmOff: "Turn off alarm",
    lock: "Lock doors",
    closeFirst: "Close the door to lock",
    unlock: "Unlock doors",
    cancel: "Cancel",
    confirmUnlock: "Unlock",
    working: { alarmOn: "Turning on…", alarmOff: "Turning off…", lock: "Locking…", unlock: "Unlocking…" },
  },
  confirmUnlock: "<strong>Unlock all doors?</strong> Anyone near the truck can open them.",
  failedCommand: "<strong>The truck didn't respond.</strong> Nothing was changed. Check at the truck or try again.",
};

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

// Demo clock: the demo data is set around 14:00, so actions continue from 14:32 (one minute per
// action) instead of the real time, which could read as earlier than the demo events.
let demoMinutes = 14 * 60 + 32;
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
  const meta = item.where ? `${item.when} • ${item.where}` : item.when;
  text.append(el("p", "list-item__title", item.title), el("p", "list-item__meta", meta));

  content.append(iconBox, text);

  if (needsCheck(item)) {
    const unchecked = isUnchecked(item);
    content.classList.toggle("list-item__content--unchecked", unchecked);
    const box = el("button", "check-toggle");
    box.type = "button";
    box.setAttribute("aria-pressed", String(!unchecked));
    box.setAttribute("aria-label", unchecked ? `Mark "${item.title}" as checked` : `"${item.title}" checked. Mark as not checked`);
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
// stamp above already say it ("Driver door: open / Today, 14:05"). Everything is one tap away.
const MAX_SHOWN = 2;
const expanded = { alarm: false, doors: false };
const sameTime = (when, changedAt) =>
  when.replace(" •", ",").toLowerCase() === String(changedAt || "").toLowerCase();

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
  return { subject: "Doors", state: doorsState(status) };
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
    shapes.push(svg("line", { class: "door-overlay__line", x1, y1, x2, y2 }));
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
    if (notLocked.length && !canControl("doors", status)) {
      const names = notLocked.map((x) => x.name.toLowerCase()).join(" and ");
      const verb = openDoors(status).length ? "Close and lock" : "Lock";
      return { text: `${verb} the ${names} at the truck. ${TEXT.direction.alarmNeedsLock}`, urgent: false };
    }
    return directionFor("alarm", status);
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
    sensor === "unknown" ? "Truck seen from above, alarm state unknown" : `Truck seen from above, alarm ${sensor}`;
  $("alarm-overlay").replaceChildren(...sensorShapes(sensor, ALARM_WAVES));
  $("alarm-icon").src = ICONS + STATUS_ICONS.alarm[sensor];
  $("alarm-state").textContent = status.alarm.state;
  renderCheck($("alarm-check"), status, status.alarm.changedAt);

  // Doors
  const doors = doorsState(status);
  $("doors-hero").dataset.stale = String(stale);
  $("doors-hero").dataset.view = view;
  $("doors-image").src = TRUCK_IMAGES[view];
  const open = openDoors(status);
  $("doors-image").alt = open.length
    ? `Truck seen from above. Open: ${open.map((d) => d.name).join(", ")}`
    : `Truck seen from above, doors ${doors}`;
  renderDoorOverlay(status);
  const heading = doorsHeading(status);
  $("doors-icon").src = ICONS + STATUS_ICONS.doors[status.connection !== "ok" ? "unknown" : heading.state];
  $("doors-subject").textContent = `${heading.subject}:`;
  $("doors-state").textContent = heading.state;
  renderCheck($("doors-check"), status, status.doors.changedAt);

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
  $("combined-overlay").replaceChildren(...(ok ? [...doorShapes(status), ...sensorShapes(sensor, ALARM_WAVES)] : sensorShapes("unknown", ALARM_WAVES)));
  const heading = doorsHeading(status);
  const doorsValue = heading.subject === "Doors" ? cap(heading.state) : `${heading.subject} ${heading.state}`;
  $("combined-image").alt = `Truck seen from above. ${doorsValue}. Alarm ${status.alarm.state}.`;

  // checking / failed: one line under the drawing; otherwise the times sit in the rows
  const check = $("combined-check");
  if (ok && status.lastReportMinutes < STALE_AFTER_MINUTES) check.replaceChildren();
  else renderCheck(check, status, status.doors.changedAt);

  const when = (t) => (ok ? TEXT.since(t) : TEXT.lastKnown);
  $("combined-status").replaceChildren(
    ...[
      statusRow({ icon: STATUS_ICONS.doors[heading.state], label: "Doors", value: doorsValue, when: when(status.doors.changedAt) }),
      statusRow({ icon: STATUS_ICONS.alarm[status.alarm.state], label: "Alarm", value: cap(status.alarm.state), when: when(status.alarm.changedAt) }),
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

// ---------- Action slot ----------
// Trucks without remote control: nothing (the slot stays empty).
// Trucks with remote control: a button, a confirm step for unlocking, then the truck's confirmation.

// The stamp above changing to e.g. "Today, 14:40" with "Doors: locked" is the truck's confirmation.
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
  const hint = $("alarm-hint");
  hint.hidden = offline;
  hint.textContent = working ? TEXT.truckHint.working[on ? "on" : "off"] : TEXT.truckHint[on ? "on" : "off"];
  renderCoach(!offline && !working);

  if (offline) return; // the question mark is already there
  const { cx, cy } = ALARM_WAVES;
  if (working) {
    const busy = svg("circle", { class: "alarm-cue alarm-busy", cx, cy, r: 46 });
    overlay.append(busy);
  } else if (!on) {
    overlay.append(svg("circle", { class: "alarm-cue alarm-tap", cx, cy, r: 92 }));
  }
}

// First-visit popup pointing at the sensor spot. Closes with "Got it" or the first tap on the truck,
// and stays closed (sessionStorage).
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
        alarmOn: { category: "alarm", icon: "motion-sensor-cab.svg", title: "Alarm has been turned on" },
        alarmOff: { category: "alarm", icon: "motion-sensor-cab-disabled.svg", title: "Alarm has been turned off" },
        lock: { category: "doors", icon: "lock-locked.svg", title: "Doors have been locked" },
        unlock: { category: "doors", icon: "lock-unlocked.svg", title: "Doors have been unlocked" },
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
if (params.get("doors") === "locked") {
  vehicleStatus.doors.list.forEach((d) => Object.assign(d, { state: "locked", open: false }));
  vehicleStatus.doors.changedAt = "today, 14:10";
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
// Photo version only: the alarm can be turned on / off from the app (compare with the line drawing)
if (params.get("truck") === "photo") vehicleStatus.remoteAlarm = true;
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
