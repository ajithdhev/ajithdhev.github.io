/* Scroll reveal -- fades content in as it enters the viewport.
   CSS hides `.reveal` only while `html.js` is set, so this script is what
   makes the page visible. Every failure path reveals everything immediately,
   so content is never trapped behind opacity:0. */
(function () {
  "use strict";

  var els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  function showAll() {
    for (var i = 0; i < els.length; i++) els[i].classList.add("in");
  }

  // Old browser / no IntersectionObserver, or reduced motion -- just show it.
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  els.forEach(function (el) { io.observe(el); });

  // Safety net: if anything wedges the observer, reveal everything on load.
  window.addEventListener("load", function () {
    setTimeout(showAll, 1200);
  });
})();
