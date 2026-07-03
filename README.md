# Glass Pool

An original, browser-first pool prototype designed for Meta Ray-Ban Display Web Apps.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Meta Ray-Ban Display setup

After this repo is pushed to GitHub and GitHub Pages is enabled, add this URL as a Web App in the Meta AI app:

```text
https://colinhu07.github.io/game-pigeon-meta1/
```

In the Meta AI app, enable Developer Mode, then go to:

```text
Devices -> Display Glasses settings -> App connections -> Web apps -> Add a web app
```

Use:

```text
Name: Glass Pool
URL:  https://colinhu07.github.io/game-pigeon-meta1/
```

## Controls

Glasses input maps to standard web key events:

- Left/right swipe: aim cue
- Up/down swipe: adjust shot power
- Index pinch, tap, or Enter: start charging, then use the same action again to shoot
- Middle pinch / Escape: cancel charge or reset after game over
- Ball-in-hand: swipe up/down/left/right to move the cue ball, then index pinch / Enter to place it
- Desktop only: hold Space to charge and release Space to shoot
- Desktop only: Shift + arrows adjust spin

## GitHub Pages deployment

This repo includes a checked-in static build under `docs/`, so it can be published by GitHub Pages without a GitHub Actions workflow.

In the GitHub repo, open:

```text
Settings -> Pages
```

Set:

```text
Source: Deploy from a branch
Branch: main
Folder: /docs
```

When you change the app, refresh the static Pages build before pushing:

```bash
npm run build:docs
```

## Validation

```bash
npm run build
npm test
```
