// 2D SVG avatar with a parametric mouth, blinking, gaze and gentle head motion.
(function (global) {
  'use strict';

  const CX = 200;
  const MOUTH_Y = 296;
  const EYE_Y = 222;

  const MARKUP = `
<svg viewBox="0 0 400 460" role="img" aria-label="Animated talking head" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="av-skin" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#ffe2cc"/><stop offset="1" stop-color="#eebb96"/>
    </radialGradient>
    <linearGradient id="av-hair" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7a4529"/><stop offset="1" stop-color="#3d2215"/>
    </linearGradient>
    <linearGradient id="av-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3aa79a"/><stop offset="1" stop-color="#21796f"/>
    </linearGradient>
    <clipPath id="av-mouth-clip"><path id="av-clip-path"/></clipPath>
    <clipPath id="av-eye-clip-l"><ellipse cx="162" cy="${EYE_Y}" rx="17" ry="11.5"/></clipPath>
    <clipPath id="av-eye-clip-r"><ellipse cx="238" cy="${EYE_Y}" rx="17" ry="11.5"/></clipPath>
  </defs>

  <g class="av-headpart">
    <path fill="url(#av-hair)" d="M200 58 C112 58 78 140 84 236 C88 316 70 372 92 420 C120 432 150 410 160 380 L240 380 C250 410 280 432 308 420 C330 372 312 316 316 236 C322 140 288 58 200 58 Z"/>
  </g>

  <path fill="#e7ae88" d="M172 300 L172 392 Q200 440 228 392 L228 300 Z"/>
  <path fill="#d39878" opacity="0.7" d="M172 312 Q200 350 228 312 L228 300 L172 300 Z"/>
  <path fill="url(#av-top)" d="M64 460 C70 410 118 388 168 384 Q200 424 232 384 C282 388 330 410 336 460 Z"/>

  <g class="av-headpart">
    <ellipse cx="120" cy="238" rx="11" ry="20" fill="#eab48f"/>
    <ellipse cx="280" cy="238" rx="11" ry="20" fill="#eab48f"/>
    <circle cx="119" cy="264" r="4" fill="#f2c14e"/>
    <circle cx="281" cy="264" r="4" fill="#f2c14e"/>

    <path fill="url(#av-skin)" d="M200 108 C142 108 120 156 120 222 C120 292 158 340 200 344 C242 340 280 292 280 222 C280 156 258 108 200 108 Z"/>

    <ellipse cx="150" cy="272" rx="16" ry="10" fill="#ff8a8a" opacity="0.28"/>
    <ellipse cx="250" cy="272" rx="16" ry="10" fill="#ff8a8a" opacity="0.28"/>

    <g id="av-brows">
      <path d="M142 196 Q160 184 182 192" stroke="#4a2c1c" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M218 192 Q240 184 258 196" stroke="#4a2c1c" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    </g>

    <g id="av-eye-l">
      <ellipse cx="162" cy="${EYE_Y}" rx="17" ry="11.5" fill="#fff"/>
      <g clip-path="url(#av-eye-clip-l)"><g id="av-iris-l">
        <circle cx="162" cy="${EYE_Y + 1}" r="8.5" fill="#3f7a5a"/>
        <circle cx="162" cy="${EYE_Y + 1}" r="4.2" fill="#1b1b1b"/>
        <circle cx="165" cy="${EYE_Y - 2.5}" r="2.2" fill="#fff"/>
      </g></g>
      <path d="M143 220 Q162 204 181 219 M145 218 L139 213" stroke="#2b1a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
    <g id="av-eye-r">
      <ellipse cx="238" cy="${EYE_Y}" rx="17" ry="11.5" fill="#fff"/>
      <g clip-path="url(#av-eye-clip-r)"><g id="av-iris-r">
        <circle cx="238" cy="${EYE_Y + 1}" r="8.5" fill="#3f7a5a"/>
        <circle cx="238" cy="${EYE_Y + 1}" r="4.2" fill="#1b1b1b"/>
        <circle cx="241" cy="${EYE_Y - 2.5}" r="2.2" fill="#fff"/>
      </g></g>
      <path d="M219 219 Q238 204 257 220 M255 218 L261 213" stroke="#2b1a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>

    <path d="M201 246 Q197 259 199 264 Q204 267 209 263" stroke="#c98d6c" stroke-width="2.2" fill="none" stroke-linecap="round"/>

    <g id="av-mouth">
      <path id="av-lips" fill="#d65f6e"/>
      <path id="av-inner" fill="#4a1520" stroke="#8a3340" stroke-width="1.4" stroke-linejoin="round"/>
      <g clip-path="url(#av-mouth-clip)">
        <ellipse id="av-tongue" fill="#e8808c"/>
        <rect id="av-teeth" fill="#fbfbf8" rx="2"/>
      </g>
    </g>

    <path fill="url(#av-hair)" d="M118 228 C104 140 150 82 206 82 C262 82 300 136 284 230 C278 186 266 158 246 140 C226 160 176 170 146 160 C134 178 124 200 118 228 Z"/>
    <path d="M170 98 C200 92 236 100 258 124" stroke="#a8683f" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>
  </g>
</svg>`;

  const KEYS = ['w', 'open', 'up', 'low', 'round', 'teeth', 'tongue', 'tongueUp'];
  const f = (n) => n.toFixed(2);

  function mouthGeometry(p) {
    const ht = p.open * 0.4;           // jaw drops more than the upper lip rises
    const hb = p.open * 0.6;
    const k = p.round;
    const c = 4 / 3;                   // cubic control factor so the curve peaks at the given height
    const w = p.w;
    const wo = w + 3;
    const H = ht + p.up;
    const B = hb + p.low;
    const y = MOUTH_Y;

    const inner =
      `M${f(CX - w)},${y} C${f(CX - w * k)},${f(y - ht * c)} ${f(CX + w * k)},${f(y - ht * c)} ${f(CX + w)},${y} ` +
      `C${f(CX + w * k)},${f(y + hb * c)} ${f(CX - w * k)},${f(y + hb * c)} ${f(CX - w)},${y}Z`;

    // Outer lips with a small cupid's bow.
    const lips =
      `M${f(CX - wo)},${y} C${f(CX - wo * k * 0.95)},${f(y - H * 0.9)} ${f(CX - wo * 0.45)},${f(y - H * 1.15)} ${f(CX - wo * 0.2)},${f(y - H)} ` +
      `Q${CX},${f(y - H + 2)} ${f(CX + wo * 0.2)},${f(y - H)} ` +
      `C${f(CX + wo * 0.45)},${f(y - H * 1.15)} ${f(CX + wo * k * 0.95)},${f(y - H * 0.9)} ${f(CX + wo)},${y} ` +
      `C${f(CX + wo * k)},${f(y + B * c)} ${f(CX - wo * k)},${f(y + B * c)} ${f(CX - wo)},${y}Z`;

    return { inner, lips, ht, hb };
  }

  function createAvatar(container) {
    container.innerHTML = MARKUP;
    const q = (id) => container.querySelector('#' + id);
    const el = {
      headParts: container.querySelectorAll('.av-headpart'),
      lips: q('av-lips'), inner: q('av-inner'), clip: q('av-clip-path'),
      teeth: q('av-teeth'), tongue: q('av-tongue'),
      eyeL: q('av-eye-l'), eyeR: q('av-eye-r'), irisL: q('av-iris-l'), irisR: q('av-iris-r'),
      brows: q('av-brows'),
    };

    const shapes = global.Visemes.SHAPES;
    const cur = { ...shapes.rest };
    let target = shapes.rest;
    let time = 0;
    let nextBlink = 1.5;
    let blinkT = -1;
    const gaze = { x: 0, y: 0 };
    const gazeTarget = { x: 0, y: 0 };
    let nextGaze = 2;
    let talk = 0; // smoothed "how much is she talking", drives head/brow motion

    function setViseme(name) {
      target = shapes[name] || shapes.rest;
    }

    function drawMouth() {
      const g = mouthGeometry(cur);
      el.lips.setAttribute('d', g.lips);
      el.inner.setAttribute('d', g.inner);
      el.clip.setAttribute('d', g.inner);

      el.teeth.setAttribute('x', f(CX - cur.w * 0.75));
      el.teeth.setAttribute('y', f(MOUTH_Y - g.ht - 1));
      el.teeth.setAttribute('width', f(cur.w * 1.5));
      el.teeth.setAttribute('height', f(Math.min(g.ht + 1.5, 7.5)));
      el.teeth.setAttribute('opacity', f(cur.teeth));

      el.tongue.setAttribute('cx', CX);
      el.tongue.setAttribute('cy', f(MOUTH_Y + g.hb - 1 - cur.tongueUp * (g.hb + g.ht) * 0.6));
      el.tongue.setAttribute('rx', f(cur.w * 0.6));
      el.tongue.setAttribute('ry', f(3 + g.hb * 0.45));
      el.tongue.setAttribute('opacity', f(cur.tongue));
    }

    function tick(dt) {
      time += dt;

      // Ease mouth toward target viseme (coarticulation for free).
      const a = 1 - Math.exp(-dt * 22);
      for (const key of KEYS) cur[key] += (target[key] - cur[key]) * a;
      drawMouth();

      talk += ((target === shapes.rest ? 0 : 1) - talk) * (1 - Math.exp(-dt * 3));

      // Blink.
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) blinkT = 0;
      let s = 1;
      if (blinkT >= 0) {
        blinkT += dt;
        const d = 0.16;
        s = 1 - 0.92 * Math.sin(Math.min(blinkT / d, 1) * Math.PI);
        if (blinkT >= d) {
          blinkT = -1;
          nextBlink = 2 + Math.random() * 4;
          if (Math.random() < 0.15) nextBlink = 0.25; // occasional double blink
        }
      }
      const eyeT = `matrix(1 0 0 ${f(s)} 0 ${f(EYE_Y * (1 - s))})`;
      el.eyeL.setAttribute('transform', eyeT);
      el.eyeR.setAttribute('transform', eyeT);

      // Gaze: mostly at the viewer, with small wanders.
      nextGaze -= dt;
      if (nextGaze <= 0) {
        const look = Math.random() < 0.6;
        gazeTarget.x = look ? 0 : (Math.random() - 0.5) * 6;
        gazeTarget.y = look ? 0 : (Math.random() - 0.5) * 3;
        nextGaze = 1.2 + Math.random() * 3;
      }
      const ga = 1 - Math.exp(-dt * 12);
      gaze.x += (gazeTarget.x - gaze.x) * ga;
      gaze.y += (gazeTarget.y - gaze.y) * ga;
      const irisT = `translate(${f(gaze.x)} ${f(gaze.y)})`;
      el.irisL.setAttribute('transform', irisT);
      el.irisR.setAttribute('transform', irisT);

      // Brows lift a little with open vowels while talking.
      el.brows.setAttribute('transform', `translate(0 ${f(-cur.open * 0.12 * talk - Math.sin(time * 0.7) * 0.4)})`);

      // Head sway and breathing; a touch more lively while talking.
      const rot = Math.sin(time * 0.6) * 1.2 + Math.sin(time * 1.7) * 0.4 * (1 + talk) + Math.sin(time * 3.1) * 0.6 * talk;
      const bob = Math.sin(time * 1.2) * 1.2 + cur.open * 0.06;
      const headT = `rotate(${f(rot)} 200 380) translate(0 ${f(bob)})`;
      el.headParts.forEach((g) => g.setAttribute('transform', headT));
    }

    drawMouth();
    return { setViseme, tick };
  }

  global.createAvatar = createAvatar;
})(window);
