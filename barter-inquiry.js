/* Rádió69 × Zsiványok Podcast — direct barter inquiry submission to Supabase. */
(() => {
  'use strict';
  const form = document.getElementById('mediaInquiryForm');
  if (!form) return;
  const status = document.getElementById('mediaInquiryStatus');
  const submitButton = document.getElementById('barterSubmitButton');
  const emailFallback = document.getElementById('emailFallback');
  const field = (id) => String(document.getElementById(id)?.value || '').trim();
  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? '#fda4af' : '';
  };
  const safeTrack = (name, params) => {
    try { window.RADIO69_ANALYTICS?.track(name, params || {}); } catch (_) { /* Analytics is optional. */ }
  };
  const emailDraft = () => {
    const formats = Array.from(form.querySelectorAll('input[name="format"]:checked')).map(el => el.value);
    const lines = [
      'Barter együttműködési megkeresés – Rádió69 × Zsiványok Podcast', '',
      'Vállalkozás / szervezet: ' + field('businessName'),
      'Kapcsolattartó: ' + field('contactName'),
      'Kapcsolati e-mail-cím: ' + field('contactEmail'),
      'Együttműködés célja: ' + field('campaignGoal'),
      'Érdeklődő megjelenések: ' + (formats.length ? formats.join(', ') : 'Még nincs kiválasztva'),
      'Barterben felajánlott termék / szolgáltatás: ' + field('barterOffer'),
      'Tervezett időszak: ' + (field('campaignPeriod') || 'Nincs megadva'),
      'A felajánlás becsült értéke: ' + (field('barterValue') || 'Nincs megadva'),
      'Célközönség / földrajzi fókusz: ' + (field('campaignAudience') || 'Nincs megadva'), '',
      'A barter felajánlás és a megjelenés részletei:', field('campaignDetails') || 'Nincs megadva'
    ];
    return 'mailto:zsivanyokpodcast@gmail.com?subject=' + encodeURIComponent('Barter együttműködési megkeresés – ' + field('businessName')) + '&body=' + encodeURIComponent(lines.join('\n'));
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    // Honeypot: silently discard bot submissions without storing user-provided data.
    if (field('businessWebsite')) {
      form.reset();
      setStatus('Köszönjük, a megkeresésedet feldolgozásra jelöltük.');
      return;
    }

    const config = window.RADIO69_SUPABASE_CONFIG || {};
    const baseUrl = String(config.url || '').trim().replace(/\/+$/, '');
    const apiKey = String(config.publishableKey || config.anonKey || '').trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) || !/^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(apiKey)) {
      setStatus('Az online űrlap technikai beállítása hiányzik. Használd az e-mailes alternatívát.', true);
      if (emailFallback) { emailFallback.href = emailDraft(); emailFallback.hidden = false; }
      return;
    }

    const formats = Array.from(form.querySelectorAll('input[name="format"]:checked')).map(el => el.value).slice(0, 6);
    const payload = {
      business_name: field('businessName'),
      contact_name: field('contactName'),
      contact_email: field('contactEmail'),
      campaign_goal: field('campaignGoal'),
      formats,
      barter_offer: field('barterOffer'),
      campaign_period: field('campaignPeriod'),
      barter_value: field('barterValue'),
      campaign_audience: field('campaignAudience'),
      campaign_details: field('campaignDetails'),
      privacy_acknowledged: document.getElementById('privacyAcknowledged')?.checked === true
    };

    if (!payload.privacy_acknowledged) {
      setStatus('A beküldéshez kérjük, olvasd el és nyugtázd az adatvédelmi tájékoztatót.', true);
      document.getElementById('privacyAcknowledged')?.focus();
      return;
    }

    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Beküldés folyamatban…'; }
    if (emailFallback) emailFallback.hidden = true;
    setStatus('A megkeresés biztonságos beküldése folyamatban…');
    safeTrack('barter_inquiry_submit', { form_name: 'media_inquiry' });

    try {
      const response = await fetch(`${baseUrl}/rest/v1/barter_inquiries`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Submission failed (${response.status})`);

      safeTrack('barter_inquiry_success', { form_name: 'media_inquiry' });
      form.reset();
      setStatus('Sikeres beküldés! A bartermegkeresés rögzült. E-mailes visszaigazolás nem automatikus; a megkereséseket az üzemeltető a Supabase felületén tekintheti meg.');
    } catch (_) {
      safeTrack('barter_inquiry_error', { form_name: 'media_inquiry' });
      setStatus('Most nem sikerült elküldeni a megkeresést. Az adatbázis beállítását ellenőrizni kell; addig az e-mailes alternatívával elküldheted.', true);
      if (emailFallback) { emailFallback.href = emailDraft(); emailFallback.hidden = false; }
    } finally {
      if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Bartermegkeresés biztonságos beküldése <span aria-hidden="true">↗</span>'; }
    }
  });
})();
