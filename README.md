# ajithdhev.com

Personal site of **Ajithkumar Dhevarajan** — AI Product Manager, Toronto.

Static, dependency-light, no build step. Hosted on GitHub Pages with the
custom domain `ajithdhev.com`.

## Stack
- Hand-written semantic HTML + one CSS file (system fonts → instant paint).
- `light` / `dark` / `system` theme switch, resolved pre-paint (no flash),
  persisted in `localStorage`.
- 3D neural particle hero via [Three.js](https://threejs.org/) loaded from a
  CDN import map. Fails silently and degrades to a fully usable static page;
  honours `prefers-reduced-motion`; pauses when the tab is hidden; lighter on
  mobile.

## Structure
```
index.html            single page
404.html              not-found page
CNAME                 custom domain (ajithdhev.com)
favicon.svg           theme-adaptive monogram
robots.txt sitemap.xml
assets/css/styles.css
assets/js/theme.js     theme switch
assets/js/neural.js    3D particle field
```

## Local preview
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy
Push to `main`. GitHub Pages serves the repo root automatically (this is the
`ajithdhev.github.io` user site). Content edits = edit `index.html` and push.
