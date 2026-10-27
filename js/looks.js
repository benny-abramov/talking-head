// Avatar looks. All share the same head geometry (face ~x120-280, y108-344, eyes y222, mouth y296)
// so the animated mouth/eyes fit every look. `back`, `under` and `front` are extra SVG layers:
// behind the body, on the face below the features, and on top of everything.
// Functions receive the id prefix `p` so gradient references stay unique per instance.
(function (global) {
  'use strict';

  // Ring of circles along an ellipse, for curly hair.
  function curls(cx, cy, rx, ry, r, from, to, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
      s += `<circle cx="${(cx + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}"/>`;
    }
    return s;
  }

  const glasses = (color) =>
    `<g fill="rgba(255,255,255,0.12)" stroke="${color}" stroke-width="3.5"><circle cx="162" cy="222" r="23"/><circle cx="238" cy="222" r="23"/></g>` +
    `<path d="M185 219 Q200 210 215 219 M139 218 L121 212 M261 218 L279 212" stroke="${color}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;

  const MALE_FACE = 'M200 108 C142 108 120 156 120 222 C120 284 142 330 200 343 C258 330 280 284 280 222 C280 156 258 108 200 108 Z';

  const LOOKS = [
    {
      id: 'maya', name: 'Maya', gender: 'female',
      skin: ['#ffe2cc', '#eebb96'], skinShade: '#e7ae88', neckShade: '#d39878',
      hair: ['#7a4529', '#3d2215'], shine: '#a8683f',
      iris: '#3f7a5a', brow: '#4a2c1c', lips: '#d65f6e', top: ['#3aa79a', '#21796f'],
      earrings: { type: 'stud', color: '#f2c14e' },
      hairBack: 'M200 58 C112 58 78 140 84 236 C88 316 70 372 92 420 C120 432 150 410 160 380 L240 380 C250 410 280 432 308 420 C330 372 312 316 316 236 C322 140 288 58 200 58 Z',
      hairFront: 'M118 228 C104 140 150 82 206 82 C262 82 300 136 284 230 C278 186 266 158 246 140 C226 160 176 170 146 160 C134 178 124 200 118 228 Z',
    },
    {
      id: 'amara', name: 'Amara', gender: 'female',
      skin: ['#b07a55', '#7d4f33'], skinShade: '#7a4a2e', neckShade: '#5f3822', blush: '#d0626a',
      hair: ['#2e211a', '#120c09'],
      iris: '#4a2a17', brow: '#1d130e', lips: '#a24f56', top: ['#f2b63c', '#d89416'],
      earrings: { type: 'hoop', color: '#f2c14e' },
      back: (p) => `<g fill="url(#${p}-hair)"><ellipse cx="200" cy="200" rx="120" ry="125"/>${curls(200, 200, 120, 125, 30, 0, 360, 19)}</g>`,
      hairFront: 'M118 215 C112 130 150 96 200 96 C250 96 288 130 282 215 C270 170 240 140 200 138 C160 140 130 170 118 215 Z',
      front: (p) => `<g fill="url(#${p}-hair)">${curls(200, 205, 84, 92, 17, 200, 340, 10)}</g>`,
    },
    {
      id: 'yuki', name: 'Yuki', gender: 'female',
      skin: ['#ffe6d0', '#f0c7a2'], skinShade: '#e9b994', neckShade: '#d9a37f',
      hair: ['#2a2a33', '#101015'], shine: '#5a5a6a',
      iris: '#3b2a20', brow: '#1d1d22', lips: '#e0707c', top: ['#e3575c', '#b9363c'],
      earrings: { type: 'stud', color: '#ffffff' },
      hairBack: 'M200 70 C120 70 92 140 92 220 C92 270 96 300 104 320 L296 320 C304 300 308 270 308 220 C308 140 280 70 200 70 Z',
      hairFront: 'M116 230 C108 130 150 84 200 84 C250 84 292 130 284 230 C280 205 278 190 276 177 C250 182 150 182 124 177 C122 190 120 205 116 230 Z',
    },
    {
      id: 'noa', name: 'Noa', gender: 'female',
      skin: ['#ffe7d6', '#f4c4a6'], skinShade: '#edb796', neckShade: '#dca283',
      hair: ['#c4602f', '#8a3a17'], shine: '#e08a55',
      iris: '#3f6fb0', brow: '#9a4a22', lips: '#d9636f', top: ['#7d6bd1', '#5a49b0'],
      back: (p) => `<circle cx="200" cy="66" r="36" fill="url(#${p}-hair)"/>`,
      hairBack: 'M200 72 C130 72 104 130 108 214 L292 214 C296 130 270 72 200 72 Z',
      hairFront: 'M118 222 C108 142 150 92 200 92 C250 92 292 142 282 222 C278 176 264 146 244 132 C222 122 178 122 156 132 C136 146 122 176 118 222 Z',
      under: '<g fill="#c97a52" opacity="0.55"><circle cx="146" cy="258" r="1.6"/><circle cx="154" cy="252" r="1.4"/><circle cx="160" cy="260" r="1.5"/><circle cx="140" cy="264" r="1.3"/><circle cx="254" cy="258" r="1.6"/><circle cx="246" cy="252" r="1.4"/><circle cx="240" cy="260" r="1.5"/><circle cx="260" cy="264" r="1.3"/></g>',
      front: glasses('#3a2a4a'),
    },
    {
      id: 'sofia', name: 'Sofia', gender: 'female',
      skin: ['#ffe5d2', '#f2c3a0'], skinShade: '#ebb592', neckShade: '#d9a07f',
      hair: ['#f3d27a', '#c9a04a'], shine: '#fff0b8',
      iris: '#4a86c5', brow: '#a07a3a', lips: '#e3687a', top: ['#f08bb0', '#d36690'],
      earrings: { type: 'stud', color: '#9fd8ff' },
      hairBack: 'M200 56 C108 56 74 140 82 240 C86 300 66 330 80 370 C70 400 92 430 120 420 C150 430 160 400 160 380 L240 380 C240 400 250 430 280 420 C308 430 330 400 320 370 C334 330 314 300 318 240 C326 140 292 56 200 56 Z',
      hairFront: 'M118 236 C100 140 150 80 210 80 C270 80 304 140 284 236 C282 200 276 170 262 150 C240 168 200 150 182 130 C170 160 140 170 130 190 C124 205 120 220 118 236 Z',
    },
    {
      id: 'layla', name: 'Layla', gender: 'female',
      skin: ['#f1c9a1', '#d9a173'], skinShade: '#cf966a', neckShade: '#b97f56',
      hair: ['#c86a7f', '#9c4a5e'], // headscarf
      iris: '#5a3b22', brow: '#3a2618', lips: '#c4606b', top: ['#5b6b8c', '#3f4d6b'],
      neck: false, ears: false,
      hairBack: 'M200 70 C110 70 84 150 88 240 C90 310 92 350 70 400 C110 430 150 440 200 440 C250 440 290 430 330 400 C308 350 310 310 312 240 C316 150 290 70 200 70 Z',
      front: (p) =>
        `<path fill="url(#${p}-hair)" fill-rule="evenodd" d="M200 74 C118 74 94 150 98 232 C102 306 142 358 200 362 C258 358 298 306 302 232 C306 150 282 74 200 74 Z M200 118 C150 118 128 160 128 222 C128 290 160 336 200 340 C240 336 272 290 272 222 C272 160 250 118 200 118 Z"/>` +
        '<path d="M150 96 C180 86 220 86 250 96" stroke="#e59aab" stroke-width="3" fill="none" opacity="0.5" stroke-linecap="round"/>',
    },
    {
      id: 'daniel', name: 'Daniel', gender: 'male',
      skin: ['#ffdcc2', '#e9b48e'], skinShade: '#e2a882', neckShade: '#cf9572',
      hair: ['#3b2a20', '#1f150f'],
      iris: '#5a3b22', brow: '#2b1d14', browWidth: 6, lips: '#c97a72', top: ['#3b5b8c', '#263f66'],
      lashes: false, face: MALE_FACE, blushOpacity: 0.12,
      hairFront: 'M121 240 L121 196 C114 126 152 82 202 82 C258 82 292 128 279 196 L279 240 L273 240 C272 196 266 168 252 150 C228 160 190 156 168 146 C150 160 132 190 127 240 Z',
    },
    {
      id: 'sam', name: 'Sam', gender: 'male',
      skin: ['#f6d2b8', '#dfa985'], skinShade: '#d89f7c', neckShade: '#c48a68',
      hair: ['#d4d4d4', '#9a9a9a'],
      iris: '#3f6a8a', brow: '#8a8a8a', browWidth: 6, lips: '#b8706a', top: ['#6b8f5e', '#4c6b40'],
      lashes: false, face: MALE_FACE, blushOpacity: 0.12,
      hairFront: 'M122 236 L122 196 C118 140 150 96 200 96 C250 96 282 140 278 196 L278 236 L272 236 C270 196 262 170 250 152 C236 138 216 126 200 128 C184 126 164 138 150 152 C138 170 130 196 128 236 Z',
      under: '<path fill="#bdbdbd" d="M122 236 C120 300 152 352 200 358 C248 352 280 300 278 236 L272 236 C270 270 256 296 240 306 C230 292 216 288 200 289 C184 288 170 292 160 306 C144 296 130 270 128 236 Z"/>',
      front: '<path fill="#a9a9a9" d="M170 292 C176 280 192 278 200 284 C208 278 224 280 230 292 C222 288 210 287 200 290 C190 287 178 288 170 292 Z"/>' + glasses('#333'),
    },
  ];

  global.AvatarLooks = LOOKS;
})(window);
