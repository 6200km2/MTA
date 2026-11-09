// Event history shown on the Alarm & Lock screen.
// Edit this data to change the list; the markup below is generated from it.
const ICONS = "assets/icons/";

const historyGroups = [
  {
    label: "Recent",
    items: [
      { icon: "cab-door-left.svg", title: "Driver door has opened", meta: "Today • 14:05" },
      { icon: "motion-sensor-cab.svg", title: "Motion is detected in the cab", meta: "Yesterday • 02:06" },
      { icon: "speaker-panic-alarm.svg", title: "Panic Alarm has been activated", meta: "Tuesday • 03:09" },
    ],
  },
  {
    label: "Last week",
    items: [
      { icon: "front-grill-open.svg", title: "Engine hatch has been opened", meta: "2020-09-02 • 14:04" },
    ],
  },
  {
    label: "Last week",
    items: [
      {
        icon: "motion-sensor-trailer-shape.svg",
        iconClass: "icon-shape--trailer",
        title: "Alarm has been triggered in a connected trailer",
        meta: "2020-07-30 • 04:04",
      },
    ],
  },
  {
    label: "Older",
    items: [
      { icon: "cab-tilt-warning.svg", title: "Cab has been tilted", meta: "2020-05-06 • 17:59" },
    ],
  },
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderItem(item, isLast) {
  const li = el("li", "list-item");
  const content = el("div", "list-item__content");

  const iconBox = el("div", "list-item__icon");
  const icon = el("img", item.iconClass);
  icon.src = ICONS + item.icon;
  icon.alt = "";
  iconBox.append(icon);

  const text = el("div", "list-item__text");
  text.append(el("p", "list-item__title", item.title), el("p", "list-item__meta", item.meta));

  content.append(iconBox, text);
  li.append(content);

  if (!isLast) {
    const divider = el("img", "list-item__divider");
    divider.src = ICONS + "divider-line.svg";
    divider.alt = "";
    li.append(divider);
  }
  return li;
}

function renderHistory(container, groups) {
  for (const group of groups) {
    const section = el("section", "list-group");
    section.append(el("p", "list-group__label", group.label));

    const list = el("ul", "list");
    group.items.forEach((item, i) => list.append(renderItem(item, i === group.items.length - 1)));
    section.append(list);

    container.append(section);
  }
}

renderHistory(document.getElementById("history"), historyGroups);

document.getElementById("back-button").addEventListener("click", () => window.history.back());
