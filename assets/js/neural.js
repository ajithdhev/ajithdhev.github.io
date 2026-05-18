/* 3D neural particle field -- subtle, theme-aware, mobile-safe.
   Loads Three.js from the import map. Every failure path is silent: the page
   is plain static HTML, so the site is fully usable if this never runs. */

(async function () {
  "use strict";

  var canvas = document.getElementById("neural");
  if (!canvas) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // cheap WebGL capability check before we even fetch the library
  try {
    var probe = document.createElement("canvas");
    if (!(probe.getContext("webgl") || probe.getContext("experimental-webgl"))) return;
  } catch (e) { return; }

  var THREE;
  try {
    THREE = await import("three");
  } catch (e) {
    return; // CDN blocked / offline -- no 3D, no error noise
  }

  var W = window.innerWidth, H = window.innerHeight;
  var COUNT = W < 600 ? 34 : W < 1000 ? 54 : 72;
  var LINK_DIST = W < 600 ? 1.55 : 1.35;       // connection radius
  var MAX_SEG = COUNT * 6;                      // capped line segments

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W < 600 ? 1.5 : 2));
  renderer.setSize(W, H, false);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
  camera.position.z = 6;

  var group = new THREE.Group();
  scene.add(group);

  // ---- nodes ----
  var BX = 5.2, BY = 3.2, BZ = 2.4;
  var pos = new Float32Array(COUNT * 3);
  var vel = new Float32Array(COUNT * 3);
  for (var i = 0; i < COUNT; i++) {
    pos[i * 3]     = (Math.random() * 2 - 1) * BX;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * BY;
    pos[i * 3 + 2] = (Math.random() * 2 - 1) * BZ;
    vel[i * 3]     = (Math.random() - 0.5) * 0.0024;
    vel[i * 3 + 1] = (Math.random() - 0.5) * 0.0024;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0024;
  }

  // soft round sprite for the dots
  var tx = document.createElement("canvas"); tx.width = tx.height = 64;
  var tc = tx.getContext("2d");
  var g = tc.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  tc.fillStyle = g; tc.fillRect(0, 0, 64, 64);
  var sprite = new THREE.CanvasTexture(tx);

  var ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  var ptMat = new THREE.PointsMaterial({
    size: 0.13, map: sprite, transparent: true,
    depthWrite: false, sizeAttenuation: true
  });
  group.add(new THREE.Points(ptGeo, ptMat));

  // ---- links ----
  var segPos = new Float32Array(MAX_SEG * 2 * 3);
  var lnGeo = new THREE.BufferGeometry();
  lnGeo.setAttribute("position", new THREE.BufferAttribute(segPos, 3));
  var lnMat = new THREE.LineBasicMaterial({ transparent: true });
  var lines = new THREE.LineSegments(lnGeo, lnMat);
  group.add(lines);

  function rebuildLinks() {
    var n = 0;
    for (var a = 0; a < COUNT; a++) {
      var ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      for (var b = a + 1; b < COUNT; b++) {
        var dx = ax - pos[b * 3], dy = ay - pos[b * 3 + 1], dz = az - pos[b * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          if (n >= MAX_SEG) break;
          var o = n * 6;
          segPos[o] = ax; segPos[o + 1] = ay; segPos[o + 2] = az;
          segPos[o + 3] = pos[b * 3]; segPos[o + 4] = pos[b * 3 + 1]; segPos[o + 5] = pos[b * 3 + 2];
          n++;
        }
      }
    }
    lnGeo.setDrawRange(0, n * 2);
    lnGeo.attributes.position.needsUpdate = true;
  }

  // ---- theme colours (read straight from CSS variables) ----
  function setColors() {
    var cs = getComputedStyle(document.documentElement);
    var rgb = (cs.getPropertyValue("--net") || "154,184,255").trim().split(",");
    var alpha = parseFloat(cs.getPropertyValue("--net-alpha")) || 0.5;
    var col = new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    ptMat.color = col; ptMat.opacity = Math.min(1, alpha + 0.35);
    lnMat.color = col; lnMat.opacity = alpha * 0.5;
  }
  setColors();
  window.addEventListener("themechange", setColors);

  // ---- pointer parallax ----
  var px = 0, py = 0, txr = 0, tyr = 0;
  if (!reduced) {
    window.addEventListener("pointermove", function (e) {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  // ---- resize ----
  var rAF = 0;
  window.addEventListener("resize", function () {
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(function () {
      W = window.innerWidth; H = window.innerHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    });
  });

  // ---- render loop ----
  function step() {
    for (var i = 0; i < COUNT; i++) {
      pos[i * 3]     += vel[i * 3];
      pos[i * 3 + 1] += vel[i * 3 + 1];
      pos[i * 3 + 2] += vel[i * 3 + 2];
      if (Math.abs(pos[i * 3])     > BX) vel[i * 3]     *= -1;
      if (Math.abs(pos[i * 3 + 1]) > BY) vel[i * 3 + 1] *= -1;
      if (Math.abs(pos[i * 3 + 2]) > BZ) vel[i * 3 + 2] *= -1;
    }
    ptGeo.attributes.position.needsUpdate = true;
    rebuildLinks();

    txr += (py * 0.18 - txr) * 0.04;
    tyr += (px * 0.30 - tyr) * 0.04;
    group.rotation.x = txr;
    group.rotation.y = tyr + Date.now() * 0.00002;

    renderer.render(scene, camera);
  }

  var running = true;
  function frame() {
    if (!running) return;
    step();
    requestAnimationFrame(frame);
  }

  // reveal the canvas once the first frame is on screen
  requestAnimationFrame(function () {
    step();
    canvas.classList.add("on");
    if (!reduced) requestAnimationFrame(frame);  // static single frame if reduced-motion
  });

  // pause when the tab is hidden -- saves battery, zero cost when away
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { running = false; }
    else if (!reduced) { running = true; requestAnimationFrame(frame); }
  });
})();
