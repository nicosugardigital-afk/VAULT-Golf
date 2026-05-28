/**
 * VAULT — SplitText animation
 *
 * Letter-by-letter reveal for the hero h1.
 * Pure vanilla JS — no dependencies, no GSAP, no npm.
 *
 * Easing: cubic-bezier(0.215, 0.61, 0.355, 1)  ≈  Power3.out
 * Duration per character: 1000 ms
 * Stagger: 50 ms per character
 *
 * The .outline class on the second .title-row span is left on
 * the parent element and is never touched — all manipulation
 * happens only on the text content inside each row.
 */

(function () {
  'use strict';

  var STAGGER_MS   = 50;   // delay increment between characters
  var DURATION_MS  = 1000; // matches transition duration in split-text.css

  /**
   * Split the text content of a .title-row span into individual
   * .st-char child spans.  Returns the array of char spans created
   * so that the caller can assign transition-delays in a global
   * stagger sequence that spans all three rows.
   *
   * @param  {HTMLElement} rowEl   — a .title-row span
   * @returns {HTMLElement[]}       — the newly created .st-char spans
   */
  function splitRow(rowEl) {
    var text     = rowEl.textContent;
    var fragment = document.createDocumentFragment();
    var chars    = [];

    for (var i = 0; i < text.length; i++) {
      var ch   = text[i];
      var span = document.createElement('span');
      span.className = 'st-char';

      // Replace regular space with non-breaking space so the browser
      // does not collapse the whitespace inside inline-block context.
      span.textContent = (ch === ' ') ? ' ' : ch;

      fragment.appendChild(span);
      chars.push(span);
    }

    // Replace text content with the new spans in one DOM operation.
    rowEl.textContent = '';
    rowEl.appendChild(fragment);

    return chars;
  }

  /**
   * Main init — runs on DOMContentLoaded.
   */
  function initSplitText() {
    var heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;

    var rows = heroTitle.querySelectorAll('.title-row');
    if (!rows.length) return;

    // Collect all char spans across all rows so we can apply a
    // single continuous stagger index.
    var allChars = [];

    for (var r = 0; r < rows.length; r++) {
      var charSpans = splitRow(rows[r]);
      for (var c = 0; c < charSpans.length; c++) {
        allChars.push(charSpans[c]);
      }
    }

    // Apply staggered transition-delays and then trigger the reveal
    // in the next animation frame so the browser has painted the
    // initial opacity:0 state before we add .is-visible.
    requestAnimationFrame(function () {
      // A second rAF ensures the initial paint with opacity:0 has
      // been committed before we start the transitions.
      requestAnimationFrame(function () {
        for (var i = 0; i < allChars.length; i++) {
          var delay = i * STAGGER_MS;
          allChars[i].style.transitionDelay = delay + 'ms';
          allChars[i].classList.add('is-visible');
        }
      });
    });
  }

  // Attach to DOMContentLoaded (or fire immediately if already ready).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplitText);
  } else {
    initSplitText();
  }

}());
