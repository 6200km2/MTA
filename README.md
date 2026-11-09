# MTA

"My truck" app screens built from the Figma file `My truck`.

## Screens

- **Alarm & Lock** (`index.html`, Figma node `1:18814`): alarm and door status, plus the event history.

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

- Edit the event history list in `app.js` (`historyGroups`).
- Colors, fonts and spacing are the variables at the top of `styles.css`.
- Icons are in `assets/icons/`, exported from Figma.
