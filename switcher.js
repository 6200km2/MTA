// User-test switcher: a small A / B / C pill in the top-right of the app bar, for the moderator to
// move between the three alternatives during a session. ?switcher=off hides it (e.g. for screenshots).
// Keeps ?theme=… when switching.
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get("switcher") === "off") return;

  const inA = /\/a\/(index\.html)?$/.test(location.pathname);
  const root = inA ? "../" : "./";
  const theme = params.get("theme");
  const extra = theme ? `&theme=${encodeURIComponent(theme)}` : "";
  const current = inA ? "a" : params.get("alt") || "";

  const links = [
    { id: "a", label: "A", title: "A · Today's app", href: `${root}a/index.html${theme ? `?theme=${encodeURIComponent(theme)}` : ""}` },
    { id: "b", label: "B", title: "B · Photo with overlays", href: `${root}index.html?alt=b${extra}` },
    { id: "c", label: "C", title: "C · Line drawing, one screen", href: `${root}index.html?alt=c${extra}` },
  ];

  const nav = document.createElement("nav");
  nav.className = "alt-switcher";
  nav.setAttribute("aria-label", "Test alternatives");
  for (const l of links) {
    const a = document.createElement("a");
    a.href = l.href;
    a.textContent = l.label;
    a.title = l.title;
    if (l.id === current) a.setAttribute("aria-current", "page");
    nav.append(a);
  }

  const style = document.createElement("style");
  style.textContent = `
    .alt-switcher { position: fixed; top: 64px; right: max(8px, calc(50% - 215px + 8px)); z-index: 20;
      display: flex; gap: 2px; padding: 2px; border-radius: 99px; background: rgba(20,20,20,.08);
      font: 600 12px/20px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; opacity: .7; }
    .alt-switcher a { min-width: 24px; padding: 0 6px; border-radius: 99px; color: #575757; text-align: center; text-decoration: none; }
    .alt-switcher a[aria-current="page"] { background: #212121; color: #fff; }
    .alt-switcher:hover, .alt-switcher:focus-within { opacity: 1; }
    :root[data-theme="dark"] .alt-switcher { background: rgba(255,255,255,.12); }
    :root[data-theme="dark"] .alt-switcher a { color: #b0b0b0; }
    :root[data-theme="dark"] .alt-switcher a[aria-current="page"] { background: #f2f2f2; color: #141414; }
  `;
  document.head.append(style);
  document.body.append(nav);
})();
