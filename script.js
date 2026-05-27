// ============================================================
// Google Sheets Integration via Google Apps Script
//
// Dein Google Sheet ist bereits hinterlegt (ID im doPost-Code unten).
// Du musst nur noch das Apps Script deployen und die URL eintragen.
//
// Setup-Anleitung:
// 1. Öffne https://script.google.com → Neues Projekt
// 2. Ersetze den gesamten Inhalt mit folgendem Code:
//
//    function doPost(e) {
//      const sheet = SpreadsheetApp
//        .openById('1NaOK7TDs3T0K0EJsvHVS1PMrsMr7V6HjVpAjsA4aZ24')
//        .getActiveSheet();
//      const p = e.parameter;
//      sheet.appendRow([
//        new Date().toLocaleString('de-DE'),
//        p.firstName || '', p.lastName  || '',
//        p.email     || '', p.phone     || '',
//        p.handicap  || '', p.referral  || ''
//      ]);
//      return ContentService
//        .createTextOutput('OK')
//        .setMimeType(ContentService.MimeType.TEXT);
//    }
//
// 3. Bereitstellen → Als Web-App bereitstellen
//    - Ausführen als: Ich (dein Google-Konto)
//    - Zugriff: Alle (auch anonym)
//    - Klicke "Bereitstellen" → eine URL erscheint
//      Format: https://script.google.com/macros/s/AKfycb.../exec
//
// 4. Diese /exec-URL unten eintragen (NICHT die Spreadsheet-URL!):
//
// WICHTIG: Die Spreadsheet-URL (docs.google.com/spreadsheets/...)
// ist NICHT dieselbe wie die Script-URL. Du brauchst die /exec-URL
// die du nach dem Deployen bekommst.
//
// GitHub Pages: Nutzt mode:'no-cors' → Eintrag landet im Sheet,
// Serverantwort kann nicht gelesen werden (normales Verhalten).
// ============================================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJqO9ITCR46e0DwFpoGtvUaEinbAeiNvaRYDj9dblmsyJWOQjnxKsh35pVlwOpTYhKkQ/exec';

// ============================================================
// BorderGlow — Vanilla JS (portiert aus @react-bits/BorderGlow)
// ============================================================
const VAULT_GLOW_HSL  = '0 0 82';
const VAULT_COLORS    = ['#d8d8d8', '#f0f0f0', '#b8b8b8'];
const VAULT_INTENSITY = 1.0;

const GRAD_POSITIONS = ['80% 55%','69% 34%','8% 6%','41% 38%','86% 85%','82% 18%','51% 4%'];
const GRAD_KEYS      = ['--gradient-one','--gradient-two','--gradient-three','--gradient-four','--gradient-five','--gradient-six','--gradient-seven'];
const COLOR_MAP      = [0, 1, 2, 0, 1, 2, 1];

function setGlowVars(el) {
  const parts = VAULT_GLOW_HSL.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  const [h, s, l] = parts ? [parts[1], parts[2], parts[3]] : [40, 65, 60];
  const base = `${h}deg ${s}% ${l}%`;
  const stops = [100, 60, 50, 40, 30, 20, 10];
  const keys  = ['','-60','-50','-40','-30','-20','-10'];
  stops.forEach((op, i) => {
    el.style.setProperty(
      `--glow-color${keys[i]}`,
      `hsl(${base} / ${Math.min(op * VAULT_INTENSITY, 100)}%)`
    );
  });
}

function setGradientVars(el) {
  GRAD_POSITIONS.forEach((pos, i) => {
    const color = VAULT_COLORS[COLOR_MAP[i]] || VAULT_COLORS[0];
    el.style.setProperty(
      GRAD_KEYS[i],
      `radial-gradient(at ${pos}, ${color} 0px, transparent 50%)`
    );
  });
  el.style.setProperty('--gradient-base', `linear-gradient(${VAULT_COLORS[0]} 0 100%)`);
}

function initBorderGlow(card) {
  setGlowVars(card);
  setGradientVars(card);

  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    const x  = e.clientX - rect.left;
    const y  = e.clientY - rect.top;
    const cx = rect.width  / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;

    let kx = Infinity, ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
    card.style.setProperty('--cursor-angle',   `${angle.toFixed(3)}deg`);
  });
}

document.querySelectorAll('.border-glow-card').forEach(initBorderGlow);

// ============================================================
// Scroll Reveal
// ============================================================
const revealEls = document.querySelectorAll('.manifest, .pillars, .waitlist');
revealEls.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => io.observe(el));

// ============================================================
// Smooth scroll
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});

// ============================================================
// Warteliste-Formular → Google Sheets
// ============================================================
const form    = document.getElementById('waitlistForm');
const success = document.getElementById('successState');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.firstName || !data.lastName || !data.email || !data.consent) {
      return;
    }

    // Google Sheets: versteckter Form-Submit ins iframe — kein CORS-Problem,
    // e.parameter in Apps Script wird zuverlässig befüllt.
    if (GOOGLE_SCRIPT_URL !== 'HIER_DEINE_SCRIPT_EXEC_URL_EINTRAGEN') {
      const ghost = document.createElement('form');
      ghost.method = 'POST';
      ghost.action = GOOGLE_SCRIPT_URL;
      ghost.target = 'vault-sink';
      ghost.style.display = 'none';
      ['firstName','lastName','email','phone','handicap','referral'].forEach(k => {
        const inp = document.createElement('input');
        inp.type  = 'hidden';
        inp.name  = k;
        inp.value = data[k] || '';
        ghost.appendChild(inp);
      });
      document.body.appendChild(ghost);
      ghost.submit();
      document.body.removeChild(ghost);
    }

    // Lokaler Fallback (Demo / Entwicklung)
    window.__vaultWaitlist = window.__vaultWaitlist || [];
    window.__vaultWaitlist.push({ ...data, ts: new Date().toISOString() });

    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
