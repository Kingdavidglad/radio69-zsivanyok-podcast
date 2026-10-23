/* Rádió69 – díjmentes, böngészőbe épített hangos köszöntés.
   A magyar nyelvű, nőinek tűnő hangokat részesíti előnyben, különösen a Natural/Online hangokat.
   A ténylegesen elérhető hangok a látogató böngészőjétől és operációs rendszerétől függenek.
*/
(() => {
  'use strict';

  if (document.documentElement.dataset.radio69WelcomeLoaded === 'true') return;
  document.documentElement.dataset.radio69WelcomeLoaded = 'true';

  const greeting = 'Üdvözlünk a Rádió69 oldalán! Örülünk, hogy benéztél hozzánk. Kapcsolódj ki, élvezd műsorainkat és a jó zenéket. Kellemes rádiózást kívánunk!';
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = supported ? window.speechSynthesis : null;

  function initialize() {
    if (document.getElementById('radio69WelcomeButton')) return;

    const style = document.createElement('style');
    style.id = 'radio69WelcomeStyles';
    style.textContent = `
      #radio69WelcomeButton {
        position: fixed; left: 18px; bottom: 18px; z-index: 10000;
        max-width: calc(100vw - 36px); padding: 11px 15px;
        border: 1px solid rgba(98, 233, 241, .55); border-radius: 999px;
        background: linear-gradient(115deg, rgba(31, 20, 57, .97), rgba(12, 30, 48, .97));
        color: #f7f6fc;
        box-shadow: 0 8px 28px rgba(0, 0, 0, .34), 0 0 20px rgba(181, 138, 255, .18);
        font: 700 12px/1.3 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: .1px; cursor: pointer; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      }
      #radio69WelcomeButton:hover { border-color: #b58aff; box-shadow: 0 8px 30px rgba(0, 0, 0, .4), 0 0 24px rgba(181, 138, 255, .28); }
      #radio69WelcomeButton:focus-visible { outline: 3px solid #62e9f1; outline-offset: 3px; }
      #radio69WelcomeButton:disabled { opacity: .75; cursor: not-allowed; }
      @media (max-width: 480px) { #radio69WelcomeButton { left: 10px; bottom: 10px; padding: 10px 12px; font-size: 11px; } }
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'radio69WelcomeButton';
    button.textContent = supported ? '🔊 Köszöntés meghallgatása' : 'A hangos köszöntés nem támogatott';
    button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    button.title = supported
      ? 'Női magyar hangot választ, ha elérhető. Ha az automatikus lejátszást a böngésző blokkolja, kattints ide.'
      : 'Ez a böngésző nem támogatja a beépített beszédszintetizátort.';
    if (!supported) button.disabled = true;
    document.body.appendChild(button);

    if (!supported) return;

    let speaking = false;
    let autoStartedOrAttempted = false;
    let voiceWaitTimer = null;

    function resetButton() {
      speaking = false;
      button.textContent = '🔊 Köszöntés meghallgatása';
      button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    }

    function getPreferredHungarianVoice() {
      const voices = synth.getVoices() || [];
      const huVoices = voices.filter(voice => /^hu(?:[-_]|$)/i.test(voice.lang || '') || /hungarian|magyar/i.test(voice.name || ''));
      if (!huVoices.length) return null;

      // A Web Speech API nem ad külön nemet a hangokhoz, ezért név alapján csak becsülni lehet.
      const femaleHints = /(no[eé]mi|anna|katalin|judit|ildik[oó]|[eé]va|zs[oó]fia|t[ií]mea|[aá]gnes|j[uú]lia|emese|enik[oő]|kinga|vikt[oó]ria|eszter|female|woman|n[oő]i)/i;
      const naturalHints = /(natural|neural|online)/i;
      const rank = voice => {
        let score = 0;
        const label = `${voice.name || ''} ${voice.voiceURI || ''}`;
        if (femaleHints.test(label)) score += 100;
        if (naturalHints.test(label)) score += 25;
        if (voice.default) score += 5;
        return score;
      };
      return huVoices.sort((a, b) => rank(b) - rank(a))[0];
    }

    function speakGreeting() {
      if (!supported) return;

      if (synth.speaking || speaking) {
        synth.cancel();
        resetButton();
        return;
      }

      try {
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.lang = 'hu-HU';
        utterance.rate = 0.94;
        utterance.pitch = 1.03;
        utterance.volume = 0.95;

        const selectedVoice = getPreferredHungarianVoice();
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => {
          speaking = true;
          button.textContent = '⏹ Köszöntés leállítása';
          button.setAttribute('aria-label', 'Rádió69 hangos köszöntés leállítása');
        };
        utterance.onend = resetButton;
        utterance.onerror = resetButton;
        synth.speak(utterance);
      } catch (_error) {
        resetButton();
      }
    }

    button.addEventListener('click', speakGreeting);

    // A hanglista néhány böngészőben csak később töltődik be. Ilyenkor megvárjuk,
    // hogy legyen esélyünk a megfelelő magyar hangot kiválasztani.
    function attemptAutoGreeting() {
      if (autoStartedOrAttempted || document.visibilityState !== 'visible') return;
      autoStartedOrAttempted = true;
      speakGreeting();
    }

    const storageKey = 'radio69WelcomeAttemptedV3';
    let shouldAttempt = true;
    try {
      if (sessionStorage.getItem(storageKey)) shouldAttempt = false;
      else sessionStorage.setItem(storageKey, '1');
    } catch (_error) {
      // Ha a tárhely nem érhető el, ettől még megpróbáljuk egyszer elindítani.
    }

    if (shouldAttempt && document.visibilityState === 'visible') {
      if (synth.getVoices().length) {
        attemptAutoGreeting();
      } else {
        const onVoicesChanged = () => {
          if (!synth.getVoices().length) return;
          synth.removeEventListener('voiceschanged', onVoicesChanged);
          if (voiceWaitTimer) window.clearTimeout(voiceWaitTimer);
          attemptAutoGreeting();
        };
        synth.addEventListener('voiceschanged', onVoicesChanged);
        voiceWaitTimer = window.setTimeout(() => {
          synth.removeEventListener('voiceschanged', onVoicesChanged);
          attemptAutoGreeting();
        }, 1200);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
