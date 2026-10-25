/* Rádió69 × Zsiványok – interaktív sztorikerék */
(() => {
  'use strict';
  const wheel = document.getElementById('storyWheelDisc');
  const button = document.getElementById('storyWheelSpinButton');
  const status = document.getElementById('storyWheelStatus');
  const link = document.getElementById('storyWheelResultLink');
  if (!wheel || !button || !status || !link) return;

  const topics = [
    { name: 'ZeneDoboz', description: 'Egy adásnyi zenei érdekesség vár rád.', href: 'cikkek/zenedoboz-radio69-musorrend.html' },
    { name: 'Magyar TOP 40', description: 'Nézd meg, mi történik a slágerlistában!', href: 'cikkek/magyar-radio-top-40-vasarnap.html' },
    { name: 'Podcastvendég', description: 'Fedezd fel, mitől lesz emlékezetes egy beszélgetés.', href: 'cikkek/jo-podcast-vendeg-zsivanyok.html' },
    { name: 'Rádió69', description: 'Nézz körül a Rádió69 zenei világában.', href: 'cikkek/radio69-hits-remix-zenei-kinalat.html' },
    { name: 'Kulisszák mögött', description: 'Less be a podcastkészítés folyamatába!', href: 'cikkek/igy-keszul-zsivanyok-podcast.html' },
    { name: 'Podcasttippek', description: 'Kapj ötleteket egy podcast elindításához.', href: 'cikkek/mi-kell-podcast-inditasahoz.html' }
  ];
  let currentRotation = 0;
  let spinning = false;

  button.addEventListener('click', () => {
    if (spinning) return;
    spinning = true;
    button.disabled = true;
    link.hidden = true;
    status.textContent = 'Pörög a kerék… vajon melyik sztori kerül sorra?';

    const winnerIndex = Math.floor(Math.random() * topics.length);
    // A szektor közepét igazítjuk a felül álló mutatóhoz.
    const targetAngle = winnerIndex * 60 + 30;
    const remainder = ((currentRotation % 360) + 360) % 360;
    const correction = ((360 - targetAngle - remainder) % 360 + 360) % 360;
    currentRotation += 5 * 360 + correction;

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 40 : 5000;
    wheel.style.transitionDuration = reducedMotion ? '1ms' : '4.8s';
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    window.setTimeout(() => {
      const winner = topics[winnerIndex];
      status.innerHTML = `A te témád most: <strong>${winner.name}</strong> — ${winner.description}`;
      link.href = winner.href;
      link.innerHTML = 'Megnézem a témát <span aria-hidden="true">↗</span>';
      link.hidden = false;
      button.disabled = false;
      button.innerHTML = '<span aria-hidden="true">✦</span> Pörgetek még egyet <span aria-hidden="true">↗</span>';
      spinning = false;
    }, duration);
  });
})();
