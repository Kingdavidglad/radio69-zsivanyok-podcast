/* Rádió69 – ingyenes, böngészőbe épített hangos köszöntés.
   Csak a főoldal index.html fájljába illeszd be a hivatkozást.
*/
(() => {
  'use strict';

  if (document.documentElement.dataset.radio69WelcomeLoaded === 'true') return;
  document.documentElement.dataset.radio69WelcomeLoaded = 'true';

  const greeting = 'Üdvözöljük a Rádió69 oldalán! Köszönjük, hogy ellátogatott hozzánk. Jó böngészést és kellemes rádiózást kívánunk!';
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  function initialize() {
    if (document.getElementById('radio69WelcomeButton')) return;

    const style = document.createElement('style');
    style.id = 'radio69WelcomeStyles';
    style.textContent = `
      #radio69WelcomeButton {
        position: fixed;
        left: 18px;
        bottom: 18px;
        z-index: 10000;
        max-width: calc(100vw - 36px);
        padding: 11px 15px;
        border: 1px solid rgba(98, 233, 241, .55);
        border-radius: 999px;
        background: linear-gradient(115deg, rgba(31, 20, 57, .97), rgba(12, 30, 48, .97));
        color: #f7f6fc;
        box-shadow: 0 8px 28px rgba(0, 0, 0, .34), 0 0 20px rgba(181, 138, 255, .18);
        font: 700 12px/1.3 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: .1px;
        cursor: pointer;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      #radio69WelcomeButton:hover {
        border-color: #b58aff;
        box-shadow: 0 8px 30px rgba(0, 0, 0, .4), 0 0 24px rgba(181, 138, 255, .28);
      }
      #radio69WelcomeButton:focus-visible {
        outline: 3px solid #62e9f1;
        outline-offset: 3px;
      }
      #radio69WelcomeButton:disabled {
        opacity: .75;
        cursor: not-allowed;
      }
      @media (max-width: 480px) {
        #radio69WelcomeButton { left: 10px; bottom: 10px; padding: 10px 12px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'radio69WelcomeButton';
    button.textContent = supported ? '🔊 Köszöntés meghallgatása' : 'A hangos köszöntés nem támogatott';
    button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    button.title = supported
      ? 'Kattints a köszöntés meghallgatásához. Ha a böngésző blokkolja az automatikus lejátszást, ezzel elindíthatod.'
      : 'Ez a böngésző nem támogatja a beépített beszédszintetizátort.';
    if (!supported) button.disabled = true;
    document.body.appendChild(button);

    if (!supported) return;

    let speaking = false;
    let autoAttempted = false;

    function resetButton() {
      speaking = false;
      button.textContent = '🔊 Köszöntés meghallgatása';
      button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    }

    function speakGreeting() {
      if (!supported) return;

      if (window.speechSynthesis.speaking || speaking) {
        window.speechSynthesis.cancel();
        resetButton();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.lang = 'hu-HU';
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.volume = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const hungarianVoice = voices.find(voice => /^hu([_-]|$)/i.test(voice.lang));
        if (hungarianVoice) utterance.voice = hungarianVoice;

        utterance.onstart = () => {
          speaking = true;
          button.textContent = '⏹ Köszöntés leállítása';
          button.setAttribute('aria-label', 'Rádió69 hangos köszöntés leállítása');
        };
        utterance.onend = resetButton;
        utterance.onerror = resetButton;
        window.speechSynthesis.speak(utterance);
      } catch (_error) {
        resetButton();
      }
    }

    button.addEventListener('click', speakGreeting);

    // A köszöntést laponként, böngészőfülönként legfeljebb egyszer próbáljuk automatikusan elindítani.
    // A böngésző ezt blokkolhatja; a meghallgatás gomb ettől függetlenül elérhető marad.
    try {
      const storageKey = 'radio69WelcomeAttemptedV2';
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, '1');
        autoAttempted = true;
      }
    } catch (_error) {
      autoAttempted = true;
    }

    if (autoAttempted && document.visibilityState === 'visible') {
      // Azonnal megpróbáljuk elindítani a köszöntést, amint a DOM elkészült.
      // A hallható automatikus lejátszást a böngésző továbbra is blokkolhatja.
      speakGreeting();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
