/**
 * glare-hover.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vanilla JS GlareHover mouse-tracking light-streak effect for .hero-meta.
 *
 * How it works
 * ─────────────
 * 1. An absolutely-positioned overlay div (.glare-overlay) is injected inside
 *    .hero-meta at page load.
 * 2. The overlay is 250 % wide (configured via GLARE_SIZE_PCT) so the linear-
 *    gradient streak can sweep completely across the element in both directions
 *    without ever showing a hard edge.
 * 3. On mousemove the cursor's horizontal position within the element is mapped
 *    to a translateX value so the centre of the gradient streak sits under the
 *    cursor.
 * 4. On mouseleave the overlay fades out; on mouseenter it fades back in.
 *
 * The CSS transition (800 ms, ease) defined in glare-hover.css smooths every
 * positional update automatically — no requestAnimationFrame loop needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── Configuration ─────────────────────────────────────────────────────── */
  var SELECTOR       = '.hero-meta';   // element(s) to receive the effect
  var GLARE_SIZE_PCT = 250;            // overlay width as % of the element
  /* The overlay left offset re-centres it: -(SIZE-100)/2 %
     e.g. 250 % wide → left = -75 % so translateX(0%) = centred            */
  var GLARE_LEFT_PCT = -((GLARE_SIZE_PCT - 100) / 2); // → -75

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  /**
   * Ensure the element has position:relative and overflow:hidden so the
   * absolutely-positioned overlay is clipped correctly.
   */
  function ensureContainerStyles(el) {
    var cs = window.getComputedStyle(el);
    if (cs.position === 'static') {
      el.style.position = 'relative';
    }
    if (cs.overflow !== 'hidden') {
      el.style.overflow = 'hidden';
    }
  }

  /**
   * Build and inject the glare overlay div into `container`.
   * Returns the overlay element.
   */
  function createOverlay(container) {
    var overlay = document.createElement('div');
    overlay.className = 'glare-overlay';
    /* Start the streak off to the left so its first animated position is a
       visible sweep rather than a jump from centre.                        */
    overlay.style.transform = 'translateX(-100%)';
    container.appendChild(overlay);
    return overlay;
  }

  /**
   * Given the mouse event and the bounding rect of the container, return
   * the cursor's horizontal position as a fraction 0–1.
   */
  function getCursorFraction(e, rect) {
    var x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }

  /**
   * Convert the 0-1 cursor fraction to the translateX value (in %) that
   * places the centre of the oversized overlay under the cursor.
   *
   * The overlay is GLARE_SIZE_PCT wide and positioned at GLARE_LEFT_PCT.
   * We need translateX such that:
   *
   *   overlayLeft + translateX + (overlayWidth / 2) = cursorX
   *
   * Working in percentage-of-container units:
   *   GLARE_LEFT_PCT + translateX_pct + (GLARE_SIZE_PCT / 2) = fraction * 100
   *   translateX_pct = fraction * 100 - GLARE_LEFT_PCT - GLARE_SIZE_PCT / 2
   *
   * Because translateX on the overlay is relative to its own width, we must
   * convert from container-% to overlay-% by multiplying by 100/GLARE_SIZE_PCT.
   */
  function fractionToTranslateX(fraction) {
    /* Position in container-% where we want the overlay centre */
    var targetContainerPct = fraction * 100;

    /* Current centre of the overlay in container-% (when translateX = 0) */
    var overlayCentrePct = GLARE_LEFT_PCT + GLARE_SIZE_PCT / 2; // -75 + 125 = 50

    /* Required shift in container-% */
    var shiftContainerPct = targetContainerPct - overlayCentrePct;

    /* Convert to overlay-relative % */
    var translateXPct = shiftContainerPct * (100 / GLARE_SIZE_PCT);

    return translateXPct;
  }

  /* ── Initialisation ─────────────────────────────────────────────────────── */

  function initGlareHover() {
    var containers = document.querySelectorAll(SELECTOR);
    if (!containers.length) { return; }

    containers.forEach(function (container) {
      ensureContainerStyles(container);
      var overlay = createOverlay(container);

      /* Cache the bounding rect on mouseenter for performance; invalidate on
         window resize so it stays accurate after layout changes.           */
      var rect = null;

      container.addEventListener('mouseenter', function () {
        rect = container.getBoundingClientRect();
        overlay.classList.add('glare-active');
      });

      container.addEventListener('mousemove', function (e) {
        if (!rect) { rect = container.getBoundingClientRect(); }
        var fraction   = getCursorFraction(e, rect);
        var translateX = fractionToTranslateX(fraction);
        overlay.style.transform = 'translateX(' + translateX.toFixed(2) + '%)';
      });

      container.addEventListener('mouseleave', function () {
        overlay.classList.remove('glare-active');
        /* Keep the last translateX so the fade-out tracks from that position
           rather than snapping back.                                        */
      });

      /* Invalidate cached rect on resize so repositioning stays accurate */
      window.addEventListener('resize', function () {
        rect = null;
      }, { passive: true });
    });
  }

  /* ── Bootstrap ──────────────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlareHover);
  } else {
    initGlareHover();
  }

}());
