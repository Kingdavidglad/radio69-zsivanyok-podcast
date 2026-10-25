/* Rádió69 – természetes üdvözlőhang MP3-fájlból.
   A teljesen azonos, jó minőségű hang minden látogatónál MP3/WAV hangfájllal biztosítható.
   A fájl neve: radio69-udvozles.mp3, helye: az index.html mellett, a repository fő mappájában.
*/
(() => {
  'use strict';

  if (document.documentElement.dataset.radio69WelcomeLoaded === 'true') return;
  document.documentElement.dataset.radio69WelcomeLoaded = 'true';

  const audioUrl = new URL('radio69-udvozles.mp3', document.baseURI).href;
  const greeting = new Audio(audioUrl);
  greeting.preload = 'auto';
  greeting.volume = 1;

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
      @media (max-width: 480px) { #radio69WelcomeButton { left: 10px; bottom: 10px; padding: 10px 12px; font-size: 11px; } }
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'radio69WelcomeButton';
    button.textContent = '🔊 Köszöntés meghallgatása';
    button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    button.title = 'A Rádió69 üdvözlőhangjának lejátszása';
    button.setAttribute('aria-live', 'polite');
    document.body.appendChild(button);

    function resetButton() {
      button.textContent = '🔊 Köszöntés meghallgatása';
      button.setAttribute('aria-label', 'Rádió69 hangos köszöntés meghallgatása');
    }

    async function playGreeting() {
      if (!greeting.paused) {
        greeting.pause();
        greeting.currentTime = 0;
        resetButton();
        return;
      }
      try {
        greeting.currentTime = 0;
        await greeting.play();
        button.textContent = '⏹ Köszöntés leállítása';
        button.setAttribute('aria-label', 'Rádió69 hangos köszöntés leállítása');
      } catch (_error) {
        // A böngésző blokkolhatja az automatikus lejátszást; kattintásra újrapróbálható.
        resetButton();
      }
    }

    button.addEventListener('click', playGreeting);
    greeting.addEventListener('play', () => {
      button.textContent = '⏹ Köszöntés leállítása';
      button.setAttribute('aria-label', 'Rádió69 hangos köszöntés leállítása');
    });
    greeting.addEventListener('ended', resetButton);
    greeting.addEventListener('pause', resetButton);
    greeting.addEventListener('error', () => {
      button.textContent = '⚠️ A hangfájl nem érhető el';
      button.title = 'Ellenőrizd, hogy a radio69-udvozles.mp3 fájl a repository fő mappájában van-e.';
    });

    // Egy automatikus lejátszási kísérlet munkamenetenként. A böngésző a hangtalan
    // automatikus lejátszást engedélyezheti, a hangos indítást viszont letilthatja.
    const storageKey = 'radio69WelcomeAudioAttemptedV1';
    let shouldAttempt = true;
    try {
      if (sessionStorage.getItem(storageKey)) shouldAttempt = false;
      else sessionStorage.setItem(storageKey, '1');
    } catch (_error) {
      // Ha a munkamenet-tárhely nem elérhető, egy próbálkozás attól még lehetséges.
    }

    if (shouldAttempt && document.visibilityState === 'visible') {
      window.setTimeout(() => { playGreeting(); }, 350);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
