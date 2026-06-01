'use strict';
/* global THREE */

/**
 * VAULT — 3D Golf Ball Scroll Experience
 *
 * Phase 0  scroll=0           : Ball sits at the "." in CLUB.
 * Phase 1  hero scrolling     : Ball drifts down, dimples rotate
 * Phase 2  post-hero          : Ball floats in background behind text
 * Phase 3  manifest at top    : BG→video swap. Ball fades out permanently.
 *                               Scroll-up no longer reverses anything.
 *
 * Logo is a CSS overlay (never rotates) — always faces camera.
 * Ball texture = dimples only.
 */
(function () {

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── DOM ──────────────────────────────────────────────────────────────────
  var wrapEl   = document.getElementById('vault-ball-wrap');
  var canvas   = document.getElementById('vault-ball-canvas');
  var heroSec  = document.querySelector('.hero');
  var maniSec  = document.querySelector('.manifest');
  var bgLayer  = document.querySelector('.bg-layer');
  var bgVid    = document.querySelector('.bg-video');
  var promoVid = document.getElementById('vaultVideo');
  var clubRow  = document.querySelector('.club-row');

  if (!wrapEl || !canvas || !heroSec || !maniSec || !clubRow) return;

  // ── Constants ─────────────────────────────────────────────────────────────
  var IS_MOBILE    = window.innerWidth < 768;
  var INTERNAL_RES = IS_MOBILE ? 180 : 260;
  // Max ball size at video trigger (halved from previous per user request)
  var MAX_SIZE = IS_MOBILE
                 ? Math.min(window.innerWidth * 0.55, 220)
                 : Math.min(window.innerWidth * 0.36, 490);
  var HEADER_H = 72;

  // ── Three.js ──────────────────────────────────────────────────────────────
  var renderer, scene, camera, ballMesh;
  var threeReady      = false;
  var lastRenderSize  = INTERNAL_RES;

  // ── Scroll/phase state ────────────────────────────────────────────────────
  var bgPhase           = false;
  var vidActive         = false;
  var vidPreloaded      = false;
  var permanentlyDone   = false;
  var rafPending        = false;
  var ballRevealed      = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t)    { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function ease(t)       { t = clamp01(t); return t * t * (3 - 2 * t); }

  // =========================================================================
  // Three.js setup
  // =========================================================================
  function setupScene() {
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 3.2;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(INTERNAL_RES, INTERNAL_RES, false); // CSS handles visual size

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.52));

    var key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(1.5, 2.5, 4);
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xddeeff, 0.28);
    fill.position.set(-3, 0.5, 2);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0x888888, 0.16);
    rim.position.set(0, -2, -3);
    scene.add(rim);

    var geo = new THREE.SphereGeometry(1, 72, 72);

    buildBallTexture().then(function (tex) {
      var mat = new THREE.MeshStandardMaterial({
        map:       tex,
        roughness: 0.50,
        metalness: 0.02
      });
      ballMesh = new THREE.Mesh(geo, mat);
      scene.add(ballMesh);
      threeReady = true;
      clearTimeout(failTimer);
      doRender();
      update();
    });
  }

  // =========================================================================
  // Ball texture: dimples only (logo is a DOM overlay — always faces camera)
  // =========================================================================
  // Logo baked into texture so it rotates with the ball — makes rotation visible
  function buildBallTexture() {
    return new Promise(function (resolve) {
      var W = 1024, H = 512;
      var tc = document.createElement('canvas');
      tc.width = W; tc.height = H;
      var ctx = tc.getContext('2d');

      ctx.fillStyle = '#f8f8f6';
      ctx.fillRect(0, 0, W, H);

      paintDimples(ctx, W, H);

      function finish() {
        var tex = new THREE.CanvasTexture(tc);
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      }

      // Logo at UV (0.25, 0.5) = front face in Three.js SphereGeometry.
      // UV formula: x = -cos(u·2π)·sin(v·π), z = sin(u·2π)·sin(v·π)
      // At u=0.25, v=0.5 → x=0, z=1 (front face, facing camera).
      var img = new Image();
      img.onload = function () {
        var s   = 110;
        var lx  = W * 0.25; // texture x for front face
        var ly  = H * 0.50; // texture y for equator
        ctx.drawImage(img, lx - s / 2, ly - s / 2, s, s);
        finish();
      };
      img.onerror = finish;
      img.src = 'Vault-Logos/PNG/Vault-Bildmarke-schwarz.png';
    });
  }

  function paintDimples(ctx, W, H) {
    var R   = 6.5;
    var SX  = 25;
    var SY  = 21;
    var cx  = W / 2, cy = H / 2;
    var logoU  = W * 0.25; // same UV as logo draw position
    var logoV  = H * 0.50;
    var EXC    = 88;       // clear zone radius around logo

    for (var row = -1, maxR = Math.ceil(H / SY) + 2; row < maxR; row++) {
      for (var col = -1, maxC = Math.ceil(W / SX) + 2; col < maxC; col++) {
        var x = col * SX + (row & 1 ? SX / 2 : 0);
        var y = row * SY;

        if (Math.hypot(x - logoU, y - logoV) < EXC) continue;

        // Shadow
        var gs = ctx.createRadialGradient(x + 1.5, y + 2, 0, x, y, R);
        gs.addColorStop(0,   'rgba(130,130,130,0.62)');
        gs.addColorStop(0.5, 'rgba(175,175,175,0.26)');
        gs.addColorStop(1,   'rgba(215,215,215,0)');
        ctx.fillStyle = gs;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        var gh = ctx.createRadialGradient(x - 1.2, y - 1.5, 0, x, y, R * 0.60);
        gh.addColorStop(0, 'rgba(255,255,255,0.52)');
        gh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gh;
        ctx.beginPath();
        ctx.arc(x, y, R * 0.60, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function doRender() {
    if (!threeReady || !renderer) return;
    renderer.render(scene, camera);
  }

  // =========================================================================
  // Position wrapper + scale renderer resolution to match display size
  // =========================================================================
  function positionWrap(cx, cy, size) {
    var s = Math.round(size);
    wrapEl.style.left   = (cx - s / 2) + 'px';
    wrapEl.style.top    = (cy - s / 2) + 'px';
    wrapEl.style.width  = s + 'px';
    wrapEl.style.height = s + 'px';

    // Keep Three.js pixel resolution in sync so ball stays sharp as it grows
    if (renderer) {
      var dpr    = Math.min(window.devicePixelRatio, 2);
      var needed = Math.min(Math.ceil(s * dpr), 700);
      if (Math.abs(needed - lastRenderSize) > 25) {
        lastRenderSize = needed;
        renderer.setSize(needed, needed, false); // false = don't overwrite CSS
      }
    }
  }

  // ── Z-index phase toggle ──────────────────────────────────────────────────
  function setBgPhase(active) {
    if (active === bgPhase) return;
    bgPhase = active;
    wrapEl.classList.toggle('bg-phase', active);
  }

  // =========================================================================
  // Scroll-driven update
  // =========================================================================
  function update() {
    rafPending = false;

    // Once video is running, don't touch the ball or video state
    if (permanentlyDone) return;

    var sy  = window.scrollY;
    var vw  = window.innerWidth;
    var vh  = window.innerHeight;

    var heroH   = heroSec.offsetHeight;
    var trigger = maniSec.offsetTop - HEADER_H;

    // Period size: use computed font-size, NOT getBoundingClientRect().height.
    // Inline .st-char height = full line-box height (line-height × font-size),
    // which is many times larger than the visual period glyph (~22 % of font-size).
    var heroTitle = document.querySelector('.hero-title');
    var fontSize  = heroTitle
                    ? parseFloat(getComputedStyle(heroTitle).fontSize)
                    : 60;
    // Period glyph diameter ≈ 22 % of cap font-size for Archivo 900
    var pSize = Math.max(fontSize * 0.22, 8);

    // Period char position
    var dotEl = clubRow.querySelector('.st-char:last-child');
    var dotCX = vw / 2;
    // Fallback Y: where the CLUB row roughly sits
    var dotCY = vh * 0.50;

    if (dotEl) {
      var r = dotEl.getBoundingClientRect();
      dotCX = r.left + r.width / 2;
      // Period sits at the baseline. Move center up by ~1 ball-radius
      // so the ball visually replaces the "." without overlapping the "B"
      dotCY = r.bottom - pSize * 1.4;
    }

    var tx, ty, ts;

    // ── Phase 0: top of page ────────────────────────────────────────────────
    if (sy <= 0) {
      tx = dotCX; ty = dotCY; ts = pSize;
      setBgPhase(false);

    // ── Phase 1+2 combined: grow until manifest trigger ─────────────────────
    // Size and position are decoupled:
    //   sizeT  → ease over [0, trigger]  (ball reaches MAX_SIZE exactly at trigger)
    //   posT   → ease over [0, heroH]    (position settles when hero is gone)
    // This works even when trigger < heroH (manifest appears before hero is gone).
    } else if (sy < trigger) {
      var sizeT = ease(clamp01(sy / Math.max(trigger, 1)));
      var posT  = ease(clamp01(sy / Math.max(heroH,  1)));
      ts = lerp(pSize, MAX_SIZE, sizeT);
      tx = lerp(dotCX, vw * 0.50, posT);
      ty = lerp(dotCY, vh * 0.36 + 76, posT); // +76 px ≈ 2 cm at 96 dpi
      setBgPhase(true); // immediately behind content once any scroll happens
      if (sizeT > 0.35 && !vidPreloaded) preloadVideo();

    // ── Phase 3: manifest hit viewport top → activate video, hide ball ───────
    } else {
      activateVideo();
      return;
    }

    // Rotation normalised to [0, trigger] so the ball completes exactly N full
    // turns and the logo faces the camera at BOTH start (sy=0) and end (sy=trigger).
    // rotT is linear (not eased) so spin speed is constant throughout the scroll.
    if (ballMesh) {
      var rotT = sy / Math.max(trigger, 1); // 0 → 1 over the whole scroll range
      ballMesh.rotation.y = rotT * 2 * Math.PI * 2; // 2 full Y-axis rotations
      ballMesh.rotation.x = rotT * 1 * Math.PI * 2; // 1 full X-axis rotation
    }

    positionWrap(tx, ty, ts);
    if (threeReady) doRender();
  }

  // =========================================================================
  // Video control (one-way: no deactivation once started)
  // =========================================================================
  function preloadVideo() {
    if (!promoVid || vidPreloaded) return;
    vidPreloaded = true;
    promoVid.preload = 'auto';
    promoVid.load();
  }

  function activateVideo() {
    if (vidActive) return;
    vidActive       = true;
    permanentlyDone = true;   // lock — scroll-up won't undo anything

    // Fade out 3D ball permanently
    wrapEl.classList.add('hidden');

    // Swap background
    bgLayer && bgLayer.classList.add('vault-active');
    bgVid   && bgVid.classList.add('fading');

    if (!promoVid) return;

    promoVid.currentTime = 0;
    promoVid.playbackRate = 1.0;
    promoVid.play().catch(function () {});
    promoVid.classList.add('active');

    // Stop on last frame — no loop, no restart
    promoVid.addEventListener('ended', function () {
      promoVid.pause();
      // Keep last frame visible (video stays at end)
    }, { once: true });
  }

  // =========================================================================
  // Event listeners
  // =========================================================================
  function scheduleUpdate() {
    if (permanentlyDone || rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });

  // =========================================================================
  // Reveal ball in sync with split-text title animation
  //
  // split-text.js applies .is-visible to all chars simultaneously via 2 rAFs
  // on DOMContentLoaded, then CSS transitions stagger them:
  //   – stagger: 50 ms × char-index
  //   – last char (index 26 = "."): delay 1 300 ms + duration 1 000 ms = 2 300 ms
  // We watch for .is-visible to appear, then wait 1 350 ms so the ball
  // replaces the "." at exactly the moment it would have faded in.
  // =========================================================================
  function revealAfterTitle() {
    if (ballRevealed) return;

    // 26 chars × 25 ms stagger + 50 ms buffer = 700 ms (matches 50%-faster split-text)
    var LAST_CHAR_DELAY = 700;

    function check() {
      // Any char with is-visible means the cascade has started
      var anyVisible = document.querySelector('.hero-title .st-char.is-visible');
      if (anyVisible) {
        setTimeout(function () {
          if (ballRevealed || permanentlyDone) return;
          ballRevealed = true;
          // rotation.y = 0 → UV (0.25, 0.5) faces camera → logo visible on reveal
          if (ballMesh) {
            ballMesh.rotation.y = 0;
            ballMesh.rotation.x = 0;
          }
          wrapEl.classList.add('ball-ready');
          // Re-sync rotation to current scroll after reveal
          setTimeout(function () { update(); }, 50);
        }, LAST_CHAR_DELAY);
      } else {
        setTimeout(check, 60);
      }
    }

    check();
    // Absolute fallback — show ball after 5 s regardless
    setTimeout(function () {
      if (!ballRevealed && !permanentlyDone) {
        ballRevealed = true;
        wrapEl && wrapEl.classList.add('ball-ready');
      }
    }, 5000);
  }

  // =========================================================================
  // Boot — after window.load so split-text.js has already run
  // =========================================================================
  var failTimer = setTimeout(function () {
    if (!threeReady) clubRow && clubRow.classList.add('ball-failed');
  }, 9000);

  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 80); return; }
    window.scrollTo(0, 0); // guarantee top position even if browser restored scroll
    setupScene();
    update();
    revealAfterTitle();
  }

  if (document.readyState === 'complete') {
    boot();
  } else {
    window.addEventListener('load', boot);
  }

}());
