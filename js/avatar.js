// 2D SVG avatar with a parametric mouth, blinking, gaze and gentle head motion.
// The look (hair, colours, accessories) comes from js/looks.js.
(function (global) {
  'use strict';

  const CX = 200;
  const MOUTH_Y = 296;
  const EYE_Y = 222;

  const DEFAULT_FACE = 'M200 108 C142 108 120 156 120 222 C120 292 158 340 200 344 C242 340 280 292 280 222 C280 156 258 108 200 108 Z';

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

  function eye(x, side, look, p) {
    const flick = side === 'l' ? `M${x - 17} 218 L${x - 23} 213` : `M${x + 17} 218 L${x + 23} 213`;
    const lid = look.lashes === false
      ? `<path d="M${x - 18} 219 Q${x} 206 ${x + 18} 219" stroke="#3a2a22" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : `<path d="M${x - 19} 220 Q${x} 204 ${x + 19} 219 ${flick}" stroke="#2b1a12" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return `
    <g data-part="eye">
      <ellipse cx="${x}" cy="${EYE_Y}" rx="17" ry="11.5" fill="#fff"/>
      <g clip-path="url(#${p}-eye-${side})"><g data-part="iris">
        <circle cx="${x}" cy="${EYE_Y + 1}" r="8.5" fill="${look.iris}"/>
        <circle cx="${x}" cy="${EYE_Y + 1}" r="4.2" fill="#1b1b1b"/>
        <circle cx="${x + 3}" cy="${EYE_Y - 2.5}" r="2.2" fill="#fff"/>
      </g></g>
      ${lid}
    </g>`;
  }

  function earrings(e) {
    if (!e) return '';
    if (e.type === 'hoop') {
      return `<g fill="none" stroke="${e.color}" stroke-width="2.5"><circle cx="119" cy="268" r="8"/><circle cx="281" cy="268" r="8"/></g>`;
    }
    return `<circle cx="119" cy="264" r="4" fill="${e.color}"/><circle cx="281" cy="264" r="4" fill="${e.color}"/>`;
  }

  // Builds the SVG for a look. `p` prefixes ids so several avatars can share a page.
  function buildMarkup(look, p) {
    const part = (x) => (typeof x === 'function' ? x(p) : x || '');
    const hair = (d) => (d ? `<path fill="url(#${p}-hair)" d="${d}"/>` : '');
    const rest = mouthGeometry(global.Visemes.SHAPES.rest);
    const blush = look.blush || '#ff8a8a';
    const blushOpacity = look.blushOpacity ?? 0.28;
    const browW = look.browWidth || 4.5;

    return `
<svg viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="${p}-skin" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="${look.skin[0]}"/><stop offset="1" stop-color="${look.skin[1]}"/>
    </radialGradient>
    <linearGradient id="${p}-hair" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${look.hair[0]}"/><stop offset="1" stop-color="${look.hair[1]}"/>
    </linearGradient>
    <linearGradient id="${p}-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${look.top[0]}"/><stop offset="1" stop-color="${look.top[1]}"/>
    </linearGradient>
    <clipPath id="${p}-mouth"><path data-part="clip" d="${rest.inner}"/></clipPath>
    <clipPath id="${p}-eye-l"><ellipse cx="162" cy="${EYE_Y}" rx="17" ry="11.5"/></clipPath>
    <clipPath id="${p}-eye-r"><ellipse cx="238" cy="${EYE_Y}" rx="17" ry="11.5"/></clipPath>
  </defs>

  <g data-part="head">${part(look.back)}${hair(look.hairBack)}</g>

  ${look.neck === false ? '' : `
  <path fill="${look.skinShade}" d="M172 300 L172 392 Q200 440 228 392 L228 300 Z"/>
  <path fill="${look.neckShade}" opacity="0.7" d="M172 312 Q200 350 228 312 L228 300 L172 300 Z"/>`}
  <path fill="url(#${p}-top)" d="M64 460 C70 410 118 388 168 384 Q200 424 232 384 C282 388 330 410 336 460 Z"/>

  <g data-part="head">
    ${look.ears === false ? '' : `
    <ellipse cx="120" cy="238" rx="11" ry="20" fill="${look.skinShade}"/>
    <ellipse cx="280" cy="238" rx="11" ry="20" fill="${look.skinShade}"/>
    ${earrings(look.earrings)}`}

    <path fill="url(#${p}-skin)" d="${look.face || DEFAULT_FACE}"/>

    <ellipse cx="150" cy="272" rx="16" ry="10" fill="${blush}" opacity="${blushOpacity}"/>
    <ellipse cx="250" cy="272" rx="16" ry="10" fill="${blush}" opacity="${blushOpacity}"/>
    ${part(look.under)}

    <g data-part="brows" stroke="${look.brow}" stroke-width="${browW}" fill="none" stroke-linecap="round">
      <path d="M142 196 Q160 184 182 192"/><path d="M218 192 Q240 184 258 196"/>
    </g>

    ${eye(162, 'l', look, p)}
    ${eye(238, 'r', look, p)}

    <path d="M201 246 Q197 259 199 264 Q204 267 209 263" stroke="${look.neckShade}" stroke-width="2.2" fill="none" stroke-linecap="round"/>

    <g>
      <path data-part="lips" fill="${look.lips}" d="${rest.lips}"/>
      <path data-part="inner" fill="#4a1520" stroke="#7a2c38" stroke-width="1.4" stroke-linejoin="round" d="${rest.inner}"/>
      <g clip-path="url(#${p}-mouth)">
        <ellipse data-part="tongue" fill="#e8808c" opacity="0"/>
        <rect data-part="teeth" fill="#fbfbf8" rx="2" opacity="0"/>
      </g>
    </g>

    ${hair(look.hairFront)}
    ${look.shine ? `<path d="M170 98 C200 92 236 100 258 124" stroke="${look.shine}" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>` : ''}
    ${part(look.front)}
  </g>
</svg>`;
  }

  let instances = 0;

  function createAvatar(container, look) {
    container.innerHTML = buildMarkup(look, 'av' + ++instances);
    const q = (name) => container.querySelector(`[data-part="${name}"]`);
    const qa = (name) => container.querySelectorAll(`[data-part="${name}"]`);
    const el = {
      head: qa('head'), eyes: qa('eye'), irises: qa('iris'), brows: q('brows'),
      lips: q('lips'), inner: q('inner'), clip: q('clip'), teeth: q('teeth'), tongue: q('tongue'),
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
      el.eyes.forEach((e) => e.setAttribute('transform', eyeT));

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
      el.irises.forEach((e) => e.setAttribute('transform', irisT));

      // Brows lift a little with open vowels while talking.
      el.brows.setAttribute('transform', `translate(0 ${f(-cur.open * 0.12 * talk - Math.sin(time * 0.7) * 0.4)})`);

      // Head sway and breathing; a touch more lively while talking.
      const rot = Math.sin(time * 0.6) * 1.2 + Math.sin(time * 1.7) * 0.4 * (1 + talk) + Math.sin(time * 3.1) * 0.6 * talk;
      const bob = Math.sin(time * 1.2) * 1.2 + cur.open * 0.06;
      const headT = `rotate(${f(rot)} 200 380) translate(0 ${f(bob)})`;
      el.head.forEach((g) => g.setAttribute('transform', headT));
    }

    drawMouth();
    return { setViseme, tick };
  }

  // Static head-and-shoulders preview for the avatar picker.
  function renderThumbnail(look) {
    return buildMarkup(look, 'th-' + look.id).replace('viewBox="0 0 400 460"', 'viewBox="50 40 300 300"');
  }

  global.createAvatar = createAvatar;
  global.renderAvatarThumbnail = renderThumbnail;
})(window);
