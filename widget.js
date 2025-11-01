/* clock-md3-v1.js – Minimal Rounded MD3 Clock */
(() => {
  const template = document.createElement('template');
  template.innerHTML = `
<style>
:host{display:inline-block;width:100%;max-width:480px}
.widget{
  padding:calc(20px*var(--s)); 
  background:var(--sfc); 
  border-radius:999px; 
  box-shadow:0 4px 16px rgba(0,0,0,.15); 
  color:var(--txt); 
  backdrop-filter:blur(12px); 
  text-align:center; 
  position:relative; 
  overflow:hidden; 
  cursor:pointer; 
  user-select:none;
  font-family:'Google Sans',sans-serif;
}
.time{
  font-size:calc(5.5rem*var(--s)); 
  font-weight:500; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  gap:4px; 
  line-height:1; 
  opacity:0; 
  transform:translateY(10px); 
  animation:f .5s .2s forwards;
}
.blink{animation:b 1.2s infinite}
.ring{
  position:absolute; inset:0; 
  border:2px solid #6750A4; 
  border-radius:999px; 
  opacity:0; 
  transform:scale(.8); 
  pointer-events:none; 
  transition:.2s
}
.ring.active{opacity:1; transform:scale(1); animation:p 1.5s ease-out}
.menu{
  position:fixed; bottom:24px; left:50%; 
  transform:translateX(-50%) translateY(100px); 
  background:var(--sfc); 
  border-radius:28px; 
  padding:16px 0; 
  box-shadow:0 8px 24px rgba(0,0,0,.25); 
  min-width:200px; 
  z-index:1000; 
  opacity:0; 
  visibility:hidden; 
  transition:.4s; 
  backdrop-filter:blur(12px)
}
.menu.open{opacity:1; visibility:visible; transform:translateX(-50%) translateY(0)}
.item{
  display:flex; align-items:center; justify-content:space-between; 
  padding:12px 24px; font:.9rem 500; color:var(--txt); 
  cursor:pointer; transition:.2s
}
.item:hover{background:#6750A412}
.item select{background:0;border:none;color:#6750A4;font-weight:500;cursor:pointer}
.divider{height:1px;background:rgba(0,0,0,.12);margin:8px 24px}
@keyframes f{to{opacity:1;transform:none}}
@keyframes b{50%{opacity:0}}
@keyframes p{0%{transform:scale(.8);opacity:0}50%{opacity:1}100%{transform:scale(1.1);opacity:0}}
</style>

<div class="widget" part="widget">
  <div class="ring"></div>
  <div class="time">
    <span class="h">12</span><span class="blink">:</span><span class="m">00</span>
  </div>
</div>

<div class="menu" part="menu">
  <div class="item">Size <select class="size"><option value="0.7">Small</option><option value="1" selected>Medium</option><option value="1.4">Large</option></select></div>
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
      this.menu = shadow.querySelector('.menu');
      this.sizeSel = shadow.querySelector('.size');
      this.themeSel = shadow.querySelector('.theme');

      this.longTimer = null;
      this.applyAttrs();
      this.initEvents();
      this.startClock();
    }

    attributeChangedCallback() { this.applyAttrs(); }

    applyAttrs() {
      const sizeMap = { small: '0.7', medium: '1', large: '1.4' };
      const s = sizeMap[this.getAttribute('size') || 'medium'];
      this.widget.style.setProperty('--s', s);

      const theme = this.getAttribute('theme') || 'auto';
      this.themeSel.value = theme;
      this.updateTheme(theme);
    }

    updateTheme(val) {
      const isDark = val === 'dark' || (val === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const root = document.documentElement;
      root.style.setProperty('--sfc', isDark ? '#1C1B1F' : '#F8F9FA');
      root.style.setProperty('--txt', isDark ? '#E6E1E5' : '#1C1B1F');
    }

    initEvents() {
      ['mousedown', 'touchstart'].forEach(ev => this.widget.addEventListener(ev, e => this.startPress(e), { passive: true }));
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => this.widget.addEventListener(ev, () => this.cancelPress()));

      this.sizeSel.addEventListener('change', () => {
        this.setAttribute('size', this.sizeSel.selectedOptions[0].text.toLowerCase());
        this.closeMenu();
      });
      this.themeSel.addEventListener('change', () => {
        this.setAttribute('theme', this.themeSel.value);
        this.closeMenu();
      });

      document.addEventListener('click', e => {
        if (!this.widget.contains(e.target) && !this.menu.contains(e.target)) this.closeMenu();
      });

      window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
        if (this.getAttribute('theme') === 'auto') this.updateTheme('auto');
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
      };
      tick(); setInterval(tick, 1000);
    }

    flip(el, val) {
      if (el.textContent === val) return;
      const flipper = document.createElement('div');
      flipper.style = 'position:absolute;inset:0;perspective:1000px;transform-style:preserve-3d;';
      const front = this.clone(el, el.textContent, 'rotateX(0deg)');
      const back = this.clone(el, val, 'rotateX(180deg)');
      flipper.append(front, back);
      el.style.position = 'relative'; el.style.overflow = 'hidden'; el.textContent = '';
      el.appendChild(flipper);
      requestAnimationFrame(() => {
        front.style.transform = 'rotateX(-180deg)';
        back.style.transform = 'rotateX(0deg)';
        front.style.transition = back.style.transition = 'transform .4s cubic-bezier(.2,0,0,1)';
      });
      setTimeout(() => { el.textContent = val; el.style = ''; }, 400);
    }

    clone(src, txt, rot) {
      const d = document.createElement('div');
      d.textContent = txt;
      const s = getComputedStyle(src);
      d.style = `position:absolute;inset:0;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;transform:${rot};font-size:${s.fontSize};font-weight:${s.fontWeight};color:${s.color};letter-spacing:${s.letterSpacing};`;
      return d;
    }
  }

  customElements.define('clock-md3-v1', MD3Clock);
})();
