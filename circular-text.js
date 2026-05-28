// ============================================================
// VAULT — Circular Spinning Text Widget
//
// Builds a fixed-position circular text element in the
// bottom-right corner of the viewport.
//
// The outer ring div rotates continuously via CSS animation.
// Each character span is rotated and translated outward to sit
// evenly around the circumference.
//
// No dependencies — vanilla JS only.
// ============================================================

(function initCircularText() {
  const TEXT   = 'VAULT*INDOOR*GOLF*MEMBERS*ONLY*CLUB*';
  const RADIUS = window.innerWidth < 768 ? 30 : 46; // smaller on mobile

  // ── Build DOM ──────────────────────────────────────────────

  const widget = document.createElement('div');
  widget.className = 'circular-text-widget';
  widget.setAttribute('aria-hidden', 'true'); // purely decorative

  const ring = document.createElement('div');
  ring.className = 'circular-text-ring';

  const chars  = TEXT.split('');
  const total  = chars.length;
  const step   = 360 / total; // degrees per character

  chars.forEach(function(char, i) {
    const span = document.createElement('span');
    span.textContent = char;

    // Rotate the span to the correct position around the circle,
    // then push it outward by RADIUS pixels.
    // Each span's transform-origin is at its own centre (set in CSS),
    // so the rotation pivots around the container's midpoint after
    // the margin-top/-left correction applied in CSS.
    const angleDeg = step * i;
    span.style.transform =
      'rotate(' + angleDeg + 'deg) translateY(-' + RADIUS + 'px)';

    ring.appendChild(span);
  });

  widget.appendChild(ring);

  // ── Hover: toggle fast spin ────────────────────────────────

  widget.addEventListener('mouseenter', function() {
    ring.classList.add('fast');
  });

  widget.addEventListener('mouseleave', function() {
    ring.classList.remove('fast');
  });

  // ── Mount ─────────────────────────────────────────────────

  document.body.appendChild(widget);
})();
