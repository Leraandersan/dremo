/* =========================================================
   Dremo — Early Access Modal + Email Collection
   ---------------------------------------------------------
   Currently configured: Google Forms
   Form: https://docs.google.com/forms/d/e/1FAIpQLSfEDYpbpCS0g19lRrjP4Pe7e6HxSOXyfbfkVpLOFsT4cf4XvA/formResponse
   Entry ID: entry.1351194870

   All submissions land in your linked Google Sheet
   (open the form → Responses tab → Sheets icon to view).

   Browser localStorage backup is also active under key
   "dremo_early_access_signups" in case a request fails.
   ========================================================= */

const CONFIG = {
  mode: 'googleform',    // 'googleform' | 'formspree'
  endpoint: 'https://docs.google.com/forms/d/e/1FAIpQLSfEDYpbpCS0g19lRrjP4Pe7e6HxSOXyfbfkVpLOFsT4cf4XvA/formResponse',
  googleEntryId: 'entry.1351194870',
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

  /** Save to browser as a backup so emails never get lost */
  function saveLocally(email) {
    try {
      const key = 'dremo_early_access_signups';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ email, ts: new Date().toISOString(), page: location.pathname });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* private mode etc — ignore */ }
  }

  /** Submit to Formspree (JSON, returns success/failure) */
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
      return;
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
        // localStorage still has the email — proceed to success state
      }

      // Success state
      if (body) body.style.display = 'none';
      success.classList.add('show');
      setTimeout(closeModal, 3200);
    });
  }
})();
