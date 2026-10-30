
/* Rádió69 × Zsiványok Podcast — közönségüzenetek beküldése. */
(() => {
  'use strict';

  const form = document.getElementById('audienceMessageForm');
  if (!form) return;

  const status = document.getElementById('audienceMessageStatus');
  const submitButton = document.getElementById('audienceSubmitButton');
  const fallback = document.getElementById('audienceMessageFallback');
  const value = (id) => String(document.getElementById(id)?.value || '').trim();

  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };

  const emailDraft = () => {
    const typeLabels = {
      topic_suggestion: 'Témát javasolok',
      question: 'Kérdést küldök a műsorvezetőknek',
      guest_recommendation: 'Vendéget ajánlok',
      editorial_message: 'Helyesbítés / egyéb üzenet'
    };

    const lines = [
      'Közönségüzenet – Rádió69 × Zsiványok Podcast',
      '',
      'Üzenet típusa: ' + (typeLabels[value('audienceMessageType')] || 'Nincs megadva'),
      'Név: ' + (value('audienceName') || 'Nincs megadva'),
      'E-mail-cím: ' + (value('audienceEmail') || 'Nincs megadva'),
      'Téma / vendég neve: ' + (value('audienceSubject') || 'Nincs megadva'),
      '',
      'Üzenet:',
      value('audienceMessage')
    ];

    return 'mailto:zsivanyokpodcast@gmail.com?subject='
      + encodeURIComponent('Közönségüzenet – Rádió69 × Zsiványok Podcast')
      + '&body=' + encodeURIComponent(lines.join('\n'));
  };

  const showEmailFallback = () => {
    if (!fallback) return;
    const link = fallback.querySelector('a');
    if (link) link.href = emailDraft();
    fallback.hidden = false;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    // Rejtett botcsapda.
    if (value('audienceWebsite')) {
      form.reset();
      setStatus('Köszönjük az üzenetet!');
      return;
    }

    const config = window.RADIO69_SUPABASE_CONFIG || {};
    const baseUrl = String(config.url || '').trim().replace(/\/+$/, '');
    const apiKey = String(config.publishableKey || config.anonKey || '').trim();

    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl)
      || !/^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(apiKey)) {
      setStatus('Az online üzenetküldés beállítása jelenleg nem érhető el. Használd az e-mailes lehetőséget.', true);
      showEmailFallback();
      return;
    }

    const payload = {
      message_type: value('audienceMessageType'),
      name: value('audienceName') || null,
      email: value('audienceEmail') || null,
      subject: value('audienceSubject') || null,
      message: value('audienceMessage'),
      privacy_acknowledged: document.getElementById('audiencePrivacy')?.checked === true,
      status: 'new'
    };

    if (!payload.privacy_acknowledged) {
      setStatus('A beküldéshez kérjük, olvasd el és nyugtázd az adatvédelmi tájékoztatót.', true);
      document.getElementById('audiencePrivacy')?.focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Beküldés folyamatban…';
    }

    if (fallback) fallback.hidden = true;
    setStatus('Az üzenet biztonságos beküldése folyamatban…');

    try {
      const response = await fetch(`${baseUrl}/rest/v1/audience_messages`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        throw new Error(`Submission failed (${response.status})`);
      }

      form.reset();
      setStatus('Köszönjük! Az üzeneted sikeresen megérkezett a Rádió69 × Zsiványok Podcast szerkesztőségéhez.');
    } catch (error) {
      console.error('Audience message submission failed:', error);
      setStatus('Most nem sikerült elküldeni az üzenetet. Próbáld újra, vagy használd az e-mailes lehetőséget.', true);
      showEmailFallback();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Üzenet beküldése <span aria-hidden="true">↗</span>';
      }
    }
  });
})();
