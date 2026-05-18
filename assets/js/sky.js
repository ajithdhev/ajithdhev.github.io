/* "The sky when I was born" - a faithful, lightweight interactive star map.
   Not astronomically recomputed: it's a stable, seeded star field styled like
   the keepsake poster (Ooty, 04 Jan 1993). Drag to rotate. Vanilla canvas, no
   dependencies; every failure path is silent (the caption still tells the story). */
(function () {
  "use strict";

  var canvas = document.getElementById("skycanvas");
  if (!canvas) return;
  var ctx;
  try { ctx = canvas.getContext("2d"); } catch (e) { return; }
  if (!ctx) return;

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- seeded RNG (mulberry32) so the sky is identical every visit ----
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = rng(19930104); // birth date as the seed

  // ---- build the star field in a unit disk ----
  var STAR_N = 460;
  var stars = [];
  for (var i = 0; i < STAR_N; i++) {
    var rr = Math.sqrt(rnd()) * 0.985;        // uniform across the disk
    var a0 = rnd() * Math.PI * 2;
    var bright = rnd();
    stars.push({
      a0: a0, rr: rr,
      x: rr * Math.cos(a0), y: rr * Math.sin(a0),
      size: 0.45 + bright * bright * 2.0,     // most tiny, a few prominent
      base: 0.35 + bright * 0.65,
      phase: rnd() * Math.PI * 2,
      tw: 0.6 + rnd() * 1.4
    });
  }

  // ---- constellation lines: link the brightest stars to near neighbours ----
  var anchors = stars.slice().sort(function (a, b) { return b.size - a.size; }).slice(0, 26);
  var edges = [];
  anchors.forEach(function (s, idx) {
    var near = anchors
      .map(function (o, j) {
        var dx = o.x - s.x, dy = o.y - s.y;
        return { j: j, d: dx * dx + dy * dy };
      })
      .filter(function (o) { return o.j !== idx; })
      .sort(function (a, b) { return a.d - b.d; });
    var links = 1 + (idx % 2);                // 1-2 links each
    for (var k = 0; k < links && k < near.length; k++) {
      if (near[k].d > 0.16) continue;         // no long sky-spanning lines
      var a = Math.min(idx, near[k].j), b = Math.max(idx, near[k].j);
      var key = a + "-" + b;
      if (edges.indexOf(key) === -1) edges.push(key);
    }
  });
  var edgePairs = edges.map(function (k) {
    var p = k.split("-"); return [anchors[+p[0]], anchors[+p[1]]];
  });

  // ---- theme-independent palette: the medallion stays night-sky dark in
  //      both light and dark mode, matching the poster keepsake ----
  var INK = "#05070d", STAR = "255,255,255", LINE = "255,255,255";

  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  function resize() {
    var box = canvas.getBoundingClientRect();
    var css = Math.max(220, Math.min(box.width || 360, 560));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.round(css * dpr);
    H = canvas.height = Math.round(css * dpr);
    canvas.style.height = css + "px";
    R = (W / 2) * 0.94; cx = W / 2; cy = H / 2;
  }

  var rot = -0.35, vel = 0, dragging = false, lastX = 0, t0 = Date.now();

  function draw() {
    var time = (Date.now() - t0) / 1000;
    ctx.clearRect(0, 0, W, H);

    // medallion background
    var g = ctx.createRadialGradient(cx, cy * 0.82, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#0c1120");
    g.addColorStop(1, INK);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // rim
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeStyle = "rgba(" + LINE + ",.55)";
    ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    var cos = Math.cos(rot), sin = Math.sin(rot);
    function px(s) { return cx + (s.x * cos - s.y * sin) * R; }
    function py(s) { return cy + (s.x * sin + s.y * cos) * R; }

    // constellation lines
    ctx.lineWidth = Math.max(0.6, dpr * 0.6);
    ctx.strokeStyle = "rgba(" + LINE + ",.22)";
    ctx.beginPath();
    for (var e = 0; e < edgePairs.length; e++) {
      ctx.moveTo(px(edgePairs[e][0]), py(edgePairs[e][0]));
      ctx.lineTo(px(edgePairs[e][1]), py(edgePairs[e][1]));
    }
    ctx.stroke();

    // stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = reduced ? 1 : (0.78 + 0.22 * Math.sin(time * s.tw + s.phase));
      var alpha = Math.min(1, s.base * tw);
      var x = px(s), y = py(s), rad = s.size * dpr;
      if (s.size > 1.5) {
        var gl = ctx.createRadialGradient(x, y, 0, x, y, rad * 3.4);
        gl.addColorStop(0, "rgba(" + STAR + "," + (alpha * 0.5) + ")");
        gl.addColorStop(1, "rgba(" + STAR + ",0)");
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(x, y, rad * 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(" + STAR + "," + alpha + ")";
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  var running = false, rafId = 0;
  function frame() {
    if (!dragging) {
      vel *= 0.95;
      rot += vel + (reduced ? 0 : 0.0006);     // gentle drift unless reduced
    }
    draw();
    if (running) rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    if (reduced) { draw(); running = false; }   // static single frame
    else rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  // ---- drag to rotate (mouse + touch via pointer events) ----
  function down(e) {
    dragging = true; vel = 0;
    lastX = (e.touches ? e.touches[0].clientX : e.clientX);
    canvas.style.cursor = "grabbing";
  }
  function move(e) {
    if (!dragging) return;
    var x = (e.touches ? e.touches[0].clientX : e.clientX);
    var dx = (x - lastX) / Math.max(120, R / dpr);
    rot += dx; vel = dx * 0.6; lastX = x;
    if (reduced) draw();                          // no loop in reduced mode
    if (e.cancelable) e.preventDefault();
  }
  function up() { dragging = false; canvas.style.cursor = "grab"; }

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move, { passive: false });
  window.addEventListener("mouseup", up);
  canvas.addEventListener("touchstart", down, { passive: true });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", up);

  // ---- only animate while on screen; pause with the tab ----
  resize();
  var io = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function (en) {
        en[0] && en[0].isIntersecting ? start() : stop();
      }, { threshold: 0.05 })
    : null;
  if (io) io.observe(canvas); else start();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (!io || canvas.getBoundingClientRect().top < window.innerHeight) start();
  });

  var rt = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); draw(); }, 150);
  });
})();
