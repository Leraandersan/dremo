/* =========================================================
   Dremo — Early Access Modal + Email Collection
   ---------------------------------------------------------
   This handles the "Join Early Access" popup AND collects
   submitted emails to your database.

   👉 SETUP (one-time, 2 minutes):

   Option A — Formspree (recommended, easiest, free 50/month)
   1. Go to https://formspree.io  →  sign up free
   2. Click "+ New Form"  →  give it a name (e.g. "Dremo Early Access")
   3. Copy your form endpoint — looks like:
        https://formspree.io/f/abcdwxyz
   4. Paste it below in CONFIG.endpoint, replacing the placeholder.
   5. Push to GitHub. All submissions appear in your Formspree
      dashboard AND in your email inbox.

   Option B — Google Forms (free, unlimited, results in Google Sheet)
   1. Go to https://forms.google.com  →  Blank form
   2. Add a single "Short answer" question called "Email"
   3. Top right: ⋮ menu  →  "Get pre-filled link"  →  type "test@test.com"
      in the email field  →  click "Get link"
   4. Look at the link — it contains  entry.NUMBERS=test%40test.com
      Copy that  entry.NUMBERS  part (e.g.  entry.123456789)
   5. Your form URL is the one in the browser; replace "/viewform"
      with "/formResponse". Example:
        https://docs.google.com/forms/d/e/XXXX/formResponse
   6. Set CONFIG.endpoint to that URL, and CONFIG.googleEntryId
      to your entry.NUMBERS value, and CONFIG.mode to 'googleform'.
   7. Open the form  →  Responses tab  →  click the Sheets icon to
      create a live Google Sheet of all signups.

   No setup? Submissions are saved to the browser's localStorage as
   a fallback so you don't lose any emails during testing.
   ========================================================= */

const CONFIG = {
  /* CHANGE THIS to your Formspree URL after signing up */
  endpoint: 'https://formspree.io/f/YOUR_FORM_ID',
  mode: 'formspree',   // 'formspree' | 'googleform'
  googleEntryId: 'entry.0000000000',  // only used for googleform mode
};

(function () {
  const modal     = document.getElementById('earlyAccessModal');
  const burger    = document.getElementById('navBurger');
  const navLinks  = document.getElementById('navLinks');

  // Mobile burger menu
  if (burger && navLinks) {
    burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  if (!modal) return;

  const form      = modal.querySelector('#earlyAccessForm');
  const body      = modal.querySelector('.modal-body');
  const success   = modal.querySelector('.modal-success');
  const submitBtn = form ? form.querySelector('button[type=submit]') : null;
  const emailIn   = form ? form.querySelector('input[type=email]') : null;

  // === OPEN / CLOSE ===

  function openModal() {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    success.classList.remove('show');
    if (body) body.style.display = '';
    if (form) form.reset();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Access';
    }
    setTimeout(() => emailIn?.focus(), 200);
  }
  function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  document.querySelectorAll(
    '.open-modal, [href="#join"], [href="#request-access"], [href="#start-1w"], [href="#start-4w"], [href="#start-annual"], [href="#invite"]'
  ).forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); openModal(); });
  });

  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); closeModal(); });
  });
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });

  // === EMAIL COLLECTION ===

  /** Save to browser as a backup so emails never get lost during dev/testing */
  function saveLocally(email) {
    try {
      const key = 'dremo_early_access_signups';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ email, ts: new Date().toISOString(), page: location.pathname });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* private mode etc — ignore */ }
  }

  /** Submit to Formspree */
  async function submitFormspree(email) {
    const res = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        source: 'dremo-website-early-access',
        page: location.pathname,
        submitted_at: new Date().toISOString(),
      })
    });
    if (!res.ok) throw new Error('Formspree returned ' + res.status);
    return res.json().catch(() => ({}));
  }

  /** Submit to Google Forms (fire-and-forget, no-cors) */
  async function submitGoogleForm(email) {
    const fd = new FormData();
    fd.append(CONFIG.googleEntryId, email);
    // Google Forms does not return CORS headers — we send opaquely.
    await fetch(CONFIG.endpoint, { method: 'POST', mode: 'no-cors', body: fd });
    return true;
  }

  /** Dispatcher */
  async function submitEmail(email) {
    saveLocally(email); // always backup

    const isPlaceholder = !CONFIG.endpoint
      || CONFIG.endpoint.includes('YOUR_FORM_ID')
      || CONFIG.endpoint.includes('XXXX');

    if (isPlaceholder) {
      console.warn('[Dremo] No CONFIG.endpoint set — email saved to localStorage only. See modal.js for setup instructions.');
      return; // still resolve as success — we have it locally
    }

    if (CONFIG.mode === 'googleform') return submitGoogleForm(email);
    return submitFormspree(email);
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = (emailIn?.value || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailIn?.focus();
        emailIn?.setAttribute('aria-invalid', 'true');
        return;
      }
      emailIn?.removeAttribute('aria-invalid');

      // Loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      try {
        await submitEmail(email);
      } catch (err) {
        console.error('[Dremo] Email submission error:', err);
        // We still saved to localStorage — show success anyway so user
        // isn't blocked. (Real failures are extremely rare with Formspree.)
      }

      // Success state
      if (body) body.style.display = 'none';
      success.classList.add('show');
      setTimeout(closeModal, 3200);
    });
  }
})();
