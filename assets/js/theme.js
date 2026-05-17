/* Theme switch: light / dark / system. Pre-paint resolution happens inline in
   <head>; this wires the toggle UI, persistence, and live system changes. */
(function () {
  "use strict";
  var root = document.documentElement;
  var mql = window.matchMedia("(prefers-color-scheme: dark)");
  var buttons = document.querySelectorAll(".theme button");

  function stored() { try { return localStorage.getItem("theme"); } catch (e) { return null; } }
  function save(v)  { try { localStorage.setItem("theme", v); } catch (e) {} }

  function resolve(mode) {
    return mode === "system" ? (mql.matches ? "dark" : "light") : mode;
  }

  function apply(mode) {
    var theme = resolve(mode);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    });

    // keep the browser UI (status bar) in sync
    var meta = document.querySelector('meta[name="theme-color"]:not([media])') ||
               document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0B0D11" : "#ffffff");

    // let the 3D field recolour itself
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
  }

  var mode = stored() || "system";
  apply(mode);

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.dataset.mode;
      save(mode);
      apply(mode);
    });
  });

  // react to OS theme flips while in "system" mode
  var onSys = function () { if ((stored() || "system") === "system") apply("system"); };
  if (mql.addEventListener) mql.addEventListener("change", onSys);
  else if (mql.addListener) mql.addListener(onSys);
})();
