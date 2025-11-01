/* clock-md3-v1.js – embeddable MD3 clock */
(() => {
  const template = document.createElement('template');
  template.innerHTML = `
<style>
:host{display:inline-block;width:100%;max-width:480px}
.widget{padding:calc(24px*var(--s));background:var(--surface);border-radius:28px;box-shadow:0 4px 12px rgba(0,0,0,.15);color:var(--on-surface);backdrop-filter:blur(12px);text-align:center;position:relative;overflow:hidden;cursor:pointer;user-select:none}
.time{font-size:calc(6rem*var(--s));font-weight:500;display:flex;align-items:center;justify-content:center;gap:4px;opacity:0;transform:translateY(20px);animation:f 0.6s .3s forwards}
.date{font-size:calc(1.25rem*var(--s));color:var(--variant);margin-top:8px;opacity:0;transform:translateY(15px);animation:f 0.6s .4s forwards}
.greeting{font-size:calc(1rem*var(--s));color:var(--variant);margin-top:16px;opacity:0;transform:translateY(10px);animation:f 0.6s .5s forwards}
.blink{animation:b 1.2s infinite;font-size:calc(6rem*var(--s))}
@keyframes f{to{opacity:1;transform:none}}
@keyframes b{50%{opacity:0}}
.ring{position:absolute;inset:0;border:2px solid var(--primary);border-radius:28px;opacity:0;transform:scale(.8);transition:.2s;pointer-events:none}
.ring.active{opacity:1;transform:scale(1);animation:p 1.5s ease-out}
@keyframes p{0%{transform:scale(.8);opacity:0}50%{opacity:1}100%{transform:scale(1.1);opacity:0}}
.menu{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--surface);border-radius:28px;padding:16px 0;box-shadow:0 8px 24px rgba(0,0,0,.25);min-width:200px;z-index:1000;opacity:0;visibility:hidden;transition:.4s;backdrop-filter:blur(12px)}
.menu.open{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}
.item{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;font:.9rem 500;color:var(--on-surface);cursor:pointer;transition:.2s}
.item:hover{background:rgba(103,80,164,.12)}
.item select{background:0 0;border:none;color:var(--primary);font-weight:500;cursor:pointer}
.divider{height:1px;background:rgba(0,0,0,.12);margin:8px 24px}
@media(max-width:480px){.widget{padding:calc(20px*var(--s))}}
</style>

<div class="widget" part="widget">
  <div class="ring"></div>
  <div class="time"><span class="h">12</span><span class="blink">:</span><span class="m">00</span></div>
  <div class="date"></div>
  <div class="greeting"></div>
</div>

<div class="menu" part="menu">
  <div class="item">Size <select class="size"><option value="0.8">Small</option><option value="1" selected>Medium</option><option value="1.3">Large</option></select></div>
  <div class="divider"></div>
  <div class="item">Theme <select class="theme"><option value="light">Light</option><option value="dark">Dark</option><option value="auto">Auto</option></select></div>
</div>
`;

  class MD3Clock extends HTMLElement {
    static get observedAttributes() { return ['size', 'theme']; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(template.content.cloneNode(true));

      this.widget = shadow.querySelector('.widget');
      this.ring = shadow.querySelector('.ring');
      this.h = shadow.querySelector('.h');
      this.m = shadow.querySelector('.m');
      this.dateEl = shadow.querySelector('.date');
      this.greetEl = shadow.querySelector('.greeting');
      this.menu = shadow.querySelector('.menu');
      this.sizeSel = shadow.querySelector('.size');
      this.themeSel = shadow.querySelector('.theme');

      this.longTimer = null;
      this.initEvents();
      this.applyAttrs();
      this.startClock();
    }

    attributeChangedCallback(name) { this.applyAttrs(); }

    applyAttrs() {
      const sizeMap = { small: '0.8', medium: '1', large: '1.3' };
      const s = sizeMap[this.getAttribute('size') || 'medium'];
      this.widget.style.setProperty('--s', s);

      const theme = this.getAttribute('theme') || 'auto';
      this.themeSel.value = theme;
      this.updateTheme(theme);
    }

    updateTheme(val) {
      if (val === 'auto') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', val);
      }
      const isDark = getComputedStyle(document.documentElement).getPropertyValue('--widget-theme').trim() === 'dark';
      const root = document.documentElement;
      root.style.setProperty('--surface', isDark ? '#1C1B1F' : '#F8F9FA');
      root.style.setProperty('--on-surface', isDark ? '#E6E1E5' : '#1C1B1F');
      root.style.setProperty('--variant', isDark ? '#CAC4D0' : '#49454F');
      root.style.setProperty('--primary', '#6750A4');
    }

    initEvents() {
      // long-press
      ['mousedown', 'touchstart'].forEach(ev => this.widget.addEventListener(ev, e => this.startPress(e), { passive: true }));
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => this.widget.addEventListener(ev, () => this.cancelPress()));

      // menu
      this.sizeSel.addEventListener('change', () => { this.setAttribute('size', this.sizeSel.selectedOptions[0].text.toLowerCase()); this.closeMenu(); });
      this.themeSel.addEventListener('change', () => { this.setAttribute('theme', this.themeSel.value); this.closeMenu(); });

      document.addEventListener('click', e => {
        if (!this.widget.contains(e.target) && !this.menu.contains(e.target)) this.closeMenu();
      });
    }

    startPress(e) {
      if (e.button && e.button !== 0) return;
      this.longTimer = setTimeout(() => {
        this.ring.classList.add('active');
        setTimeout(() => this.openMenu(), 300);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 1500);
    }
    cancelPress() { clearTimeout(this.longTimer); this.ring.classList.remove('active'); }

    openMenu() { this.menu.classList.add('open'); }
    closeMenu() { this.menu.classList.remove('open'); }

    startClock() {
      const tick = () => {
        const now = new Date();
        const h12 = now.getHours() % 12 || 12;
        const m = now.getMinutes().toString().padStart(2, '0');
        if (this.h.textContent !== h12.toString()) this.flip(this.h, h12);
        if (this.m.textContent !== m) this.flip(this.m, m);

        this.dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        const hr = now.getHours();
        const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 21 ? 'Good evening' : 'Good night';
        if (this.greetEl.textContent !== greet) {
          this.greetEl.style.opacity = '0';
          setTimeout(() => { this.greetEl.textContent = greet; this.greetEl.style.opacity = '1'; }, 200);
        }
      };
      tick(); setInterval(tick, 1000);
    }

    flip(el, newVal) {
      if (el.textContent === newVal) return;
      const flipper = document.createElement('div');
      flipper.style = 'position:absolute;inset:0;perspective:1000px;transform-style:preserve-3d;';
      const front = this.cloneStyle(el, el.textContent, 'rotateX(0deg)');
      const back  = this.cloneStyle(el, newVal, 'rotateX(180deg)');
      flipper.append(front, back);
      el.style.position = 'relative'; el.style.overflow = 'hidden'; el.textContent = '';
      el.appendChild(flipper);
      requestAnimationFrame(() => {
        front.style.transform = 'rotateX(-180deg)';
        back.style.transform  = 'rotateX(0deg)';
        front.style.transition = back.style.transition = 'transform .4s cubic-bezier(.2,0,0,1)';
      });
      setTimeout(() => { el.textContent = newVal; el.style = ''; }, 400);
    }
    cloneStyle(src, txt, rot) {
      const d = document.createElement('div');
      d.textContent = txt;
      const s = getComputedStyle(src);
      d.style = `position:absolute;inset:0;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;transform:${rot};font-size:${s.fontSize};font-weight:${s.fontWeight};color:${s.color};letter-spacing:${s.letterSpacing};`;
      return d;
    }
  }

  customElements.define('clock-md3-v1', MD3Clock);
})();
