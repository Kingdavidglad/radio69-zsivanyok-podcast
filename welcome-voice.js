/* Rádió69 – előre elkészített magyar hangos köszöntés.
   A beszédhangot a radio69-udvozles.mp3 fájl tartalmazza.
   Tedd ezt a két fájlt ugyanabba a mappába (a weboldal gyökérmappájába).
*/
(() => {
  'use strict';

  if (document.documentElement.dataset.radio69WelcomeLoaded === 'true') return;
  document.documentElement.dataset.radio69WelcomeLoaded = 'true';

  // Ennek a szövegnek megfelelően készült az MP3-felvétel.
  const greeting = 'Üdvözlünk a Rádió69 oldalán! Örülünk, hogy benéztél hozzánk. Kapcsolódj ki, élvezd műsorainkat és a jó zenéket. Kellemes rádiózást kívánunk!';
  const supported = typeof window.Audio === 'function';
  const audio = supported ? new Audio('radio69-udvozles.mp3') : null;
  if (audio) {
    audio.preload = 'auto';
    audio.volume = 0.95;
  }

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
      ? 'Az üdvözlés előre felvett hanggal szól. Ha az automatikus lejátszást a böngésző blokkolja, kattints ide.'
      : 'Ez a böngésző nem támogatja a hang lejátszását.';
    if (!supported) button.disabled = true;
    document.body.appendChild(button);

    if (!supported || !audio) return;

    let speaking = false;

    function resetButton() {
      speaking = false;
      button.textContent = '🔊 Köszöntés meghallgatása';
      button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    }

    function playGreeting() {
      if (!audio) return;

      if (speaking || !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        resetButton();
        return;
      }

      try {
        audio.currentTime = 0;
        speaking = true;
        button.textContent = '⏹ Köszöntés leállítása';
        button.setAttribute('aria-label', 'Rádió69 hangos köszöntés leállítása');
        const playback = audio.play();
        if (playback && typeof playback.then === 'function') {
          playback.catch(resetButton);
        }
      } catch (_error) {
        resetButton();
      }
    }

    audio.addEventListener('ended', resetButton);
    audio.addEventListener('error', resetButton);
    button.addEventListener('click', playGreeting);

    // Automatikus indítás: a böngésző letilthatja, ezért a kézi indítógomb mindig elérhető.
    const storageKey = 'radio69WelcomeAttemptedV4';
    let shouldAttempt = true;
    try {
      if (sessionStorage.getItem(storageKey)) shouldAttempt = false;
      else sessionStorage.setItem(storageKey, '1');
    } catch (_error) {
      // A tárhely hiánya nem akadályozza a kézi hangindítást.
    }

    if (shouldAttempt && document.visibilityState === 'visible') {
      window.setTimeout(playGreeting, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
