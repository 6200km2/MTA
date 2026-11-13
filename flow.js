// Start flow (user test): carries ?alt= and ?theme= from page to page and sets the theme.
// Fordon -> Instrumentbräda -> Larm och lås opens the chosen alternative (A, B or C).
(function () {
  const params = new URLSearchParams(location.search);
  const alt = ["a", "b", "c"].includes(params.get("alt")) ? params.get("alt") : "b";
  const theme = ["dark", "light"].includes(params.get("theme")) ? params.get("theme") : null;

  const dark = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => { document.documentElement.dataset.theme = theme || (dark.matches ? "dark" : "light"); };
  apply();
  dark.addEventListener("change", apply);

  const situation = params.get("s"); // which situation the alternative shows (see app.js)
  const keep = (extra) => {
    const q = new URLSearchParams(extra);
    if (situation) q.set("s", situation);
    if (theme) q.set("theme", theme);
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  // Where "Larm och lås" goes for each alternative
  const alarmLink = alt === "a" ? `a/index.html${keep({})}` : `index.html${keep({ alt })}`;

  document.querySelectorAll("[data-flow]").forEach((el) => {
    const to = el.dataset.flow;
    if (to === "dashboard") el.href = `dashboard.html${keep({ alt })}`;
    if (to === "vehicles") el.href = `vehicles.html${keep({ alt })}`;
    if (to === "alarm") el.href = alarmLink;
  });
})();
