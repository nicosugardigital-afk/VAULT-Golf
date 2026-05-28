/* ==========================================
   VAULT — Lanyard / 3D Membership Card
   Physics-based pendulum swing + mouse tilt
   Pure vanilla JS, no dependencies
   ========================================== */

(function initLanyard() {
  'use strict';

  /* ---- Build HTML structure ---- */

  function buildLanyardHTML() {
    return `
<div class="lanyard-wrap" id="lanyardWrap" aria-hidden="true">
  <div class="lanyard-hook"></div>
  <div class="lanyard-band" id="lanyardBand"></div>
  <div class="lanyard-clip"></div>
  <div class="lanyard-card" id="lanyardCard">
    <div class="card-hole"></div>
    <div class="lanyard-card-face">
      <img
        src="Vault-Logos/PNG/Vault-Wort-Bildmarke-horizontal-weiss.png"
        alt="VAULT Indoor Golf Club"
        class="card-logo"
        draggable="false"
      />
      <div class="card-body">
        <div class="card-divider"></div>
        <div class="card-text">Members Only</div>
        <div class="card-divider"></div>
      </div>
      <div class="card-footer">
        <div class="card-sub">Köln &middot; 2026</div>
        <div class="card-bar"></div>
      </div>
    </div>
    <div class="lanyard-card-outline"></div>
  </div>
  <span class="lanyard-hint">Bewegen</span>
</div>`;
  }

  /* ---- Inject into DOM ---- */

  function injectLanyard() {
    var heroInner = document.querySelector('.hero-inner');
    if (!heroInner) return;

    // Wrap existing hero children in .hero-content
    var heroContent = document.createElement('div');
    heroContent.className = 'hero-content';

    // Move all existing children into heroContent
    while (heroInner.firstChild) {
      heroContent.appendChild(heroInner.firstChild);
    }

    // Build lanyard element
    var lanyardContainer = document.createElement('div');
    lanyardContainer.innerHTML = buildLanyardHTML().trim();
    var lanyardWrap = lanyardContainer.firstChild;

    // Prepend lanyard, then hero content
    heroInner.appendChild(lanyardWrap);
    heroInner.appendChild(heroContent);
  }

  /* ---- Physics constants ---- */

  var PHYSICS = {
    // Pendulum stiffness (spring restoring force, higher = snappier return)
    stiffness: 0.045,
    // Damping per frame (0 = no friction, 1 = instant stop; ~0.88 feels natural)
    damping: 0.875,
    // How strongly the mouse pulls the card (degrees of influence)
    mouseStrength: 18,
    // Max swing angle in degrees
    maxAngle: 28,
    // Max forward/back tilt in degrees (rotateX)
    maxTiltX: 12,
    // How smoothly tiltX follows target (0–1, lower = slower follow)
    tiltXSmoothing: 0.06,
    // Idle gentle sway amplitude (degrees)
    idleAmplitude: 1.2,
    // Idle sway frequency (radians per frame at 60fps)
    idleFrequency: 0.012,
  };

  /* ---- State ---- */

  var state = {
    // Pendulum Y-axis swing
    angle: 0,           // current rotateY angle (degrees)
    velocity: 0,        // angular velocity
    // Mouse-driven tiltX
    tiltX: 0,           // current rotateX (degrees, positive = top tilts away)
    tiltXTarget: 0,     // target tiltX from mouse
    // Idle animation clock
    idleClock: 0,
    // Mouse position normalised: -1 (left) to +1 (right)
    mouseNormX: 0,
    mouseNormY: 0,
    // Whether mouse is on the page
    mouseActive: false,
    mouseLastMoved: 0,
    // RAF handle
    rafId: null,
    // Whether reduced motion is requested
    reducedMotion: false,
  };

  /* ---- Element references (populated after inject) ---- */
  var card = null;
  var band = null;

  /* ---- Reduced motion check ---- */
  function checkReducedMotion() {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    state.reducedMotion = mq.matches;
    mq.addEventListener('change', function (e) {
      state.reducedMotion = e.matches;
    });
  }

  /* ---- Mouse / touch tracking ---- */

  function onMouseMove(e) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    // Normalise: 0 at center, ±1 at edges
    state.mouseNormX = ((e.clientX / vw) - 0.5) * 2;
    state.mouseNormY = ((e.clientY / vh) - 0.5) * 2;
    state.mouseActive = true;
    state.mouseLastMoved = performance.now();
  }

  function onTouchMove(e) {
    if (!e.touches.length) return;
    var t = e.touches[0];
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    state.mouseNormX = ((t.clientX / vw) - 0.5) * 2;
    state.mouseNormY = ((t.clientY / vh) - 0.5) * 2;
    state.mouseActive = true;
    state.mouseLastMoved = performance.now();
  }

  function onMouseLeave() {
    state.mouseActive = false;
  }

  /* ---- Physics tick ---- */

  function tick() {
    if (state.reducedMotion) {
      // Static display — apply zero transform
      if (card) card.style.transform = 'rotateY(0deg) rotateX(0deg)';
      if (band) band.style.transform = 'none';
      state.rafId = requestAnimationFrame(tick);
      return;
    }

    var now = performance.now();
    var mouseIdleMs = now - state.mouseLastMoved;

    // Target angle: mouse drives it when active
    var targetAngle = 0;
    if (state.mouseActive && mouseIdleMs < 3000) {
      targetAngle = state.mouseNormX * PHYSICS.mouseStrength;
    }

    // Spring force toward target (not just center — toward where mouse points)
    var springForce = -PHYSICS.stiffness * (state.angle - targetAngle);

    // Update velocity and angle
    state.velocity = (state.velocity + springForce) * PHYSICS.damping;
    state.angle += state.velocity;

    // Clamp swing
    if (state.angle > PHYSICS.maxAngle) {
      state.angle = PHYSICS.maxAngle;
      state.velocity *= -0.3; // soft bounce off limit
    } else if (state.angle < -PHYSICS.maxAngle) {
      state.angle = -PHYSICS.maxAngle;
      state.velocity *= -0.3;
    }

    // tiltX: vertical mouse position creates forward/back tilt
    // Positive mouseNormY = cursor below center → card top tilts toward viewer
    if (state.mouseActive && mouseIdleMs < 3000) {
      state.tiltXTarget = -state.mouseNormY * PHYSICS.maxTiltX;
    } else {
      // Gentle idle: small pendulum gravity-like settle
      state.tiltXTarget = 2; // slight perpetual forward lean (natural hang)
    }
    state.tiltX += (state.tiltXTarget - state.tiltX) * PHYSICS.tiltXSmoothing;

    // Idle sway when mouse not active — very subtle
    var idleContribution = 0;
    if (!state.mouseActive || mouseIdleMs > 2000) {
      state.idleClock += PHYSICS.idleFrequency;
      idleContribution = Math.sin(state.idleClock) * PHYSICS.idleAmplitude;
    }

    var finalAngle = state.angle + idleContribution;

    // Apply transforms to card
    if (card) {
      card.style.transform =
        'rotateY(' + finalAngle.toFixed(3) + 'deg) ' +
        'rotateX(' + state.tiltX.toFixed(3) + 'deg)';
    }

    // Band: skew slightly to follow card swing — gives rope tension feel
    if (band) {
      // skewX mirrors the card rotation scaled down
      var bandSkew = finalAngle * 0.18;
      band.style.transform = 'skewX(' + bandSkew.toFixed(2) + 'deg)';
    }

    state.rafId = requestAnimationFrame(tick);
  }

  /* ---- Card pointer interaction: grab & drag ---- */
  // Dragging the card directly gives immediate strong impulse

  var drag = {
    active: false,
    startX: 0,
    startAngle: 0,
    lastX: 0,
    lastVX: 0,
  };

  function onCardPointerDown(e) {
    drag.active = true;
    drag.startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    drag.startAngle = state.angle;
    drag.lastX = drag.startX;
    drag.lastVX = 0;
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag.active) return;
    var x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    var dx = x - drag.startX;
    // Map horizontal drag distance to angle
    var vw = window.innerWidth;
    state.angle = drag.startAngle + (dx / vw) * 90;
    state.angle = Math.max(-PHYSICS.maxAngle, Math.min(PHYSICS.maxAngle, state.angle));
    drag.lastVX = x - drag.lastX;
    drag.lastX = x;
  }

  function onPointerUp() {
    if (!drag.active) return;
    drag.active = false;
    // Release with current drag velocity as impulse
    state.velocity = drag.lastVX * 0.25;
  }

  /* ---- Init ---- */

  function init() {
    checkReducedMotion();
    injectLanyard();

    card = document.getElementById('lanyardCard');
    band = document.getElementById('lanyardBand');

    if (!card) return; // bail if inject failed

    // Mouse/touch tracking on whole page
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    // Direct drag on card
    card.addEventListener('mousedown', onCardPointerDown);
    card.addEventListener('touchstart', onCardPointerDown, { passive: false });
    document.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('touchmove', onPointerMove, { passive: true });
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);

    // Kick off with a small nudge so the card visibly swings in on load
    state.angle = -8;
    state.velocity = 0.6;

    // Start physics loop
    state.rafId = requestAnimationFrame(tick);
  }

  /* ---- Entry point: run after DOM ready ---- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
