// Light theme for the compact overlay. The overlay's colors are hardcoded dark Tailwind classes and inline
// rgba styles, so instead of overriding each one we pick the app's own Pure Black theme and invert the
// panel (black -> white, hues kept by the 180deg rotate), re-inverting images so icons look normal.
// The settings modal renders in the headlessui portal, outside the panel, so it isn't affected.

declare const TARGET_LANG: 'en' | 'ko' | 'ja' | 'ru';

const STORAGE_KEY = 'etor-cf-overlay-light';
const LABELS = { en: 'Light Theme', ko: '라이트 테마', ja: 'ライトテーマ', ru: 'Светлая тема' };
const ACTIVE = ['bg-blue-500', 'text-white', 'border-blue-500'];
const INACTIVE = ['bg-slate-100', 'text-slate-700', 'border-slate-300', 'hover:bg-slate-200'];
// The three theme buttons (Original, Pure Black, Custom) are the only ones with exactly these classes.
const THEME_BUTTON = 'button.flex-1.px-3.py-2.rounded-md.text-sm.transition-all';
const INVERT = 'invert(1) hue-rotate(180deg)';
// Skip minimalist mode (bg-transparent) and the metric bar: their background is the game, not black.
const PANEL = 'html.etor-light .overlay-window-shell:not(.metric-bar-window) > .overlay-primary-panel:not(.bg-transparent)';

const style = document.createElement('style');
style.textContent = `
${PANEL} { filter: ${INVERT}; }
${PANEL} img { filter: ${INVERT}; }
${PANEL} * { text-shadow: none !important; }
`;
document.head.appendChild(style);

const isLight = () => localStorage.getItem(STORAGE_KEY) === '1';

function setActive(btn: Element, active: boolean): void {
  btn.classList.remove(...(active ? INACTIVE : ACTIVE));
  btn.classList.add(...(active ? ACTIVE : INACTIVE));
}

function apply(): void {
  const light = isLight();
  document.documentElement.classList.toggle('etor-light', light);
  for (const btn of document.querySelectorAll('.etor-light-btn')) {
    setActive(btn, light);
    const pureBlack = btn.parentElement?.querySelectorAll(THEME_BUTTON)[1];
    if (!pureBlack) continue;
    // Pure Black is still the app's theme underneath, so it's only dimmed. Vue resets className when the
    // mode changes, so a surviving etor-dimmed means the mode is still Pure Black.
    if (light) {
      setActive(pureBlack, false);
      pureBlack.classList.add('etor-dimmed');
    } else if (pureBlack.classList.contains('etor-dimmed')) {
      setActive(pureBlack, true);
      pureBlack.classList.remove('etor-dimmed');
    }
  }
}

function setLight(light: boolean): void {
  localStorage.setItem(STORAGE_KEY, light ? '1' : '0');
  // After Vue has re-rendered the theme buttons for the new mode.
  requestAnimationFrame(apply);
}

export function addLightThemeButton(root: Element | Document): void {
  for (const row of new Set(Array.from(root.querySelectorAll(THEME_BUTTON), b => b.parentElement!))) {
    if (row.querySelector('.etor-light-btn')) continue;
    const themeButtons = row.querySelectorAll(THEME_BUTTON);
    if (themeButtons.length !== 3) continue;

    themeButtons.forEach(b => b.addEventListener('click', () => setLight(false)));
    const btn = document.createElement('button');
    btn.className = 'etor-light-btn flex-1 px-3 py-2 rounded-md text-sm transition-all border';
    btn.textContent = LABELS[TARGET_LANG];
    btn.addEventListener('click', () => {
      (themeButtons[1] as HTMLElement).click();
      setLight(true);
    });
    row.appendChild(btn);
  }
  apply();
}
