// User-test switcher: a small A / B / C pill for the moderator to move between the alternatives.
//
// Hidden from participants (they would tap through A / B / C and skip the flow). The moderator
// shows / hides it by pressing and holding the status bar (the 9:41 strip at the top) for about a
// second; it then stays shown for this browser tab (sessionStorage). ?mod=1 shows it right away,
// ?switcher=off never shows it (e.g. for screenshots).
//
// A switch always starts the new alternative from the vehicle list (Fordon -> Demo FH Classic ->
// Larm och lås), so every alternative begins the same way as the first one. Keeps ?theme=….
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get("switcher") === "off") return;

  const KEY = "mta.moderator";
  const read = () => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  };
  const write = (on) => {
    try {
      sessionStorage.setItem(KEY, on ? "1" : "0");
    } catch {
      // storage blocked: the pill still toggles on this page
    }
  };
  if (params.get("mod") === "1") write(true);

  const inA = /\/a\/(index\.html)?$/.test(location.pathname);
  const root = inA ? "../" : "./";
  const theme = params.get("theme");
  const extra = theme ? `&theme=${encodeURIComponent(theme)}` : "";
  const inFlow = /\/(vehicles|dashboard)\.html$/.test(location.pathname);
  const current = inA ? "a" : params.get("alt") || (inFlow ? "b" : "");

  const links = [
    { id: "a", label: "A", title: "A · Dagens app" },
    { id: "b", label: "B", title: "B · Foto med markeringar" },
    { id: "c", label: "C", title: "C · Linjeteckning, en skärm" },
  ];

  const nav = document.createElement("nav");
  nav.className = inFlow ? "alt-switcher alt-switcher--flow" : "alt-switcher";
  nav.setAttribute("aria-label", "Testalternativ");
  for (const l of links) {
    const a = document.createElement("a");
    a.href = `${root}vehicles.html?alt=${l.id}${extra}`;
    a.textContent = l.label;
    a.title = l.title;
    if (l.id === current) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  nav.hidden = !read();

  // Press and hold the status bar (~0.8 s) to show / hide the pill. A short tap does nothing.
  const bar = document.querySelector(".status-bar");
  if (bar) {
    let timer = null;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        nav.hidden = !nav.hidden;
        write(!nav.hidden);
        if (navigator.vibrate) navigator.vibrate(30);
      }, 800);
    };
    const stop = () => clearTimeout(timer);
    bar.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => bar.addEventListener(t, stop));
    bar.addEventListener("contextmenu", (e) => e.preventDefault()); // no long-press menu on the images
    bar.style.webkitUserSelect = "none";
    bar.style.userSelect = "none";
    bar.style.webkitTouchCallout = "none";
  }

  const style = document.createElement("style");
  style.textContent = `
    .alt-switcher { position: fixed; top: 64px; right: max(8px, calc(50% - 215px + 8px)); z-index: 20;
      display: flex; gap: 2px; padding: 2px; border-radius: 99px; background: rgba(20,20,20,.08);
      font: 600 12px/20px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; opacity: .7; }
    .alt-switcher[hidden] { display: none; }
    .alt-switcher a { min-width: 24px; padding: 0 6px; border-radius: 99px; color: #575757; text-align: center; text-decoration: none; }
    .alt-switcher a[aria-current="page"] { background: #212121; color: #fff; }
    .alt-switcher:hover, .alt-switcher:focus-within { opacity: 1; }
    .alt-switcher--flow { top: 120px; }
    .status-bar img { -webkit-user-drag: none; pointer-events: none; }
    :root[data-theme="dark"] .alt-switcher { background: rgba(255,255,255,.12); }
    :root[data-theme="dark"] .alt-switcher a { color: #b0b0b0; }
    :root[data-theme="dark"] .alt-switcher a[aria-current="page"] { background: #f2f2f2; color: #141414; }
  `;
  document.head.append(style);
  document.body.append(nav);
})();
