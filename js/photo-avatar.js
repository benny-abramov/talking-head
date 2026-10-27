// Photo avatar: a portrait whose mouth, eyelids, irises and head are animated by warping a
// triangle mesh built on MediaPipe face landmarks (WebGL). The inside of the mouth (teeth,
// tongue) is painted on a 2D overlay, since the photo itself has a closed mouth.
// Landmarks are precomputed for bundled photos and detected in the browser for uploaded ones;
// either way the photo never leaves the device.
(function (global) {
  'use strict';

  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  // MediaPipe face mesh landmark indices.
  const UPPER_OUTER = [185, 40, 39, 37, 0, 267, 269, 270, 409];
  const UPPER_INNER = [191, 80, 81, 82, 13, 312, 311, 310, 415];
  const LOWER_INNER = [95, 88, 178, 87, 14, 317, 402, 318, 324];
  const LOWER_OUTER = [146, 91, 181, 84, 17, 314, 405, 321, 375];
  const CORNERS = [61, 291, 78, 308];
  // Inner lip contour: upper lip left->right, then lower lip right->left.
  const OPENING = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
  const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
    152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const EYES = [
    { corners: [33, 133], upper: [246, 161, 160, 159, 158, 157, 173], lower: [7, 163, 144, 145, 153, 154, 155] },
    { corners: [263, 362], upper: [466, 388, 387, 386, 385, 384, 398], lower: [249, 390, 373, 374, 380, 381, 382] },
  ];
  const IRIS = [468, 469, 470, 471, 472, 473, 474, 475, 476, 477];
  const BROWS = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

  // The photo already has its own resting expression, so "rest" means: leave the mouth as photographed.
  const NEUTRAL_W = 24;
  const SHAPES = Object.fromEntries(Object.entries(global.Visemes.SHAPES).map(([k, s]) =>
    [k, k === 'rest' ? { ...s, open: 0, teeth: 0, tongue: 0, smile: 0, w: NEUTRAL_W } : s]));
  const KEYS = ['w', 'open', 'round', 'teeth', 'tongue', 'tongueUp', 'smile'];

  const STAGE_ASPECT = 460 / 400; // height / width, matches the cartoon stage

  // ---------- Landmark detection ----------
  let landmarker = null;
  function getLandmarker() {
    if (!landmarker) {
      landmarker = import(`${MP}/vision_bundle.mjs`).then(async ({ FilesetResolver, FaceLandmarker }) => {
        const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
        return FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL },
          runningMode: 'IMAGE',
          numFaces: 1,
        });
      });
      landmarker.catch(() => { landmarker = null; }); // allow a retry after a network failure
    }
    return landmarker;
  }

  // Normalized [x, y] pairs (0..1 of the image size).
  async function detectLandmarks(img) {
    const lm = await getLandmarker();
    const face = lm.detect(img).faceLandmarks[0];
    if (!face) throw new Error('No face was found in this photo. Try a clear, front-facing portrait.');
    return face.map((p) => [+p.x.toFixed(5), +p.y.toFixed(5)]);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load the photo.'));
      img.src = src;
    });
  }

  // ---------- Geometry helpers ----------
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Bowyer-Watson Delaunay triangulation; fine for the ~550 points used here.
  function triangulate(pts) {
    const n = pts.length;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const d = Math.max(maxX - minX, maxY - minY) * 20;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const P = pts.concat([[cx - d, cy - d], [cx, cy + d], [cx + d, cy - d]]);

    const tri = (a, b, c) => {
      const [ax, ay] = P[a], [bx, by] = P[b], [qx, qy] = P[c];
      const D = 2 * (ax * (by - qy) + bx * (qy - ay) + qx * (ay - by));
      if (Math.abs(D) < 1e-9) return { v: [a, b, c], x: 0, y: 0, r2: Infinity };
      const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = qx * qx + qy * qy;
      const x = (a2 * (by - qy) + b2 * (qy - ay) + c2 * (ay - by)) / D;
      const y = (a2 * (qx - bx) + b2 * (ax - qx) + c2 * (bx - ax)) / D;
      return { v: [a, b, c], x, y, r2: (ax - x) ** 2 + (ay - y) ** 2 };
    };

    let tris = [tri(n, n + 1, n + 2)];
    for (let i = 0; i < n; i++) {
      const [x, y] = P[i];
      const edges = new Map();
      const keep = [];
      for (const t of tris) {
        if ((x - t.x) ** 2 + (y - t.y) ** 2 < t.r2) {
          const [a, b, c] = t.v;
          for (const [p, q] of [[a, b], [b, c], [c, a]]) {
            const key = p < q ? p + ',' + q : q + ',' + p;
            edges.set(key, edges.has(key) ? null : [p, q]);
          }
        } else {
          keep.push(t);
        }
      }
      tris = keep;
      for (const e of edges.values()) if (e) tris.push(tri(e[0], e[1], i));
    }
    return tris.map((t) => t.v).filter((v) => v[0] < n && v[1] < n && v[2] < n);
  }

  // ---------- WebGL ----------
  const VS = `
    attribute vec2 a_pos; attribute vec2 a_uv; uniform vec4 u_crop; varying vec2 v_uv;
    void main() {
      vec2 p = (a_pos - u_crop.xy) / u_crop.zw;
      gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
      v_uv = a_uv;
    }`;
  const FS = `
    precision mediump float; uniform sampler2D u_tex; varying vec2 v_uv;
    void main() { gl_FragColor = texture2D(u_tex, v_uv); }`;

  function createRenderer(canvas, img, positions, uvs, indices) {
    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) throw new Error('This browser cannot display photo avatars (WebGL is unavailable).');
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buffer = (data, loc) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const l = gl.getAttribLocation(prog, loc);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
      return b;
    };
    buffer(uvs, 'a_uv');
    const posBuf = buffer(positions, 'a_pos');

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const cropLoc = gl.getUniformLocation(prog, 'u_crop');

    return function draw(crop) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform4f(cropLoc, crop.x, crop.y, crop.w, crop.h);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    };
  }

  // ---------- Rig ----------
  function buildRig(container, img, norm) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const L = norm.map(([x, y]) => [x * W, y * H]);

    // Face frame: origin at the mouth centre, x along the eye line, units of mouth half-width.
    const mc = mid(L[61], L[291]);
    const hw = dist(L[61], L[291]) / 2;
    const eyeC = EYES.map((e) => mid(L[e.corners[0]], L[e.corners[1]]));
    const ang = Math.atan2(eyeC[1][1] - eyeC[0][1], eyeC[1][0] - eyeC[0][0]);
    const cos = Math.cos(ang), sin = Math.sin(ang);

    // Mesh vertices: landmarks, two looser rings around the face (so hair follows the head a
    // little), and the fixed image border.
    const verts = L.map(([x, y], i) => ({ x, y, i, head: 1 }));
    const fc = mid(L[10], L[152]);
    for (const [scale, head] of [[1.3, 0.6], [1.75, 0.2]]) {
      for (const i of FACE_OVAL) {
        const x = fc[0] + (L[i][0] - fc[0]) * scale, y = fc[1] + (L[i][1] - fc[1]) * scale;
        if (x > 2 && x < W - 2 && y > 2 && y < H - 2) verts.push({ x, y, head });
      }
    }
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      verts.push({ x: t * W, y: 0, head: 0 }, { x: t * W, y: H, head: 0 });
      if (k > 0 && k < 6) verts.push({ x: 0, y: t * H, head: 0 }, { x: W, y: t * H, head: 0 });
    }

    const roles = new Map();
    const tag = (list, role) => list.forEach((i) => roles.set(i, role));
    tag(UPPER_OUTER, 'upperOuter'); tag(UPPER_INNER, 'upperInner');
    tag(LOWER_OUTER, 'lowerOuter'); tag(LOWER_INNER, 'lowerInner');
    tag(CORNERS, 'corner'); tag(IRIS, 'iris'); tag(BROWS, 'brow');

    const eyes = EYES.map((e, k) => {
      const ew = dist(L[e.corners[0]], L[e.corners[1]]) / 2;
      const gaps = e.upper.map((u, j) => L[e.lower[j]][1] - L[u][1]);
      e.upper.forEach((u, j) => roles.set(u, { lid: gaps[j] }));
      const lowerY = L[e.lower[3]][1];
      return { c: eyeC[k], ew, gap: gaps[3], lowerY };
    });

    for (const v of verts) {
      const dx = v.x - mc[0], dy = v.y - mc[1];
      v.u = (dx * cos + dy * sin) / hw;
      v.v = (-dx * sin + dy * cos) / hw;
      v.role = v.i !== undefined ? roles.get(v.i) : undefined;
      if (v.role === 'iris') v.eye = eyes[dist([v.x, v.y], eyes[0].c) < dist([v.x, v.y], eyes[1].c) ? 0 : 1];
    }

    const tris = triangulate(verts.map((v) => [v.x, v.y]));
    const indices = new Uint16Array(tris.flat());
    const uvs = new Float32Array(verts.flatMap((v) => [v.x / W, v.y / H]));
    const positions = new Float32Array(verts.length * 2);

    // Frame the head like the cartoon stage: face ~45% of the width, chin ~75% down.
    const xs = FACE_OVAL.map((i) => L[i][0]);
    const faceW = Math.max(...xs) - Math.min(...xs);
    let cw = faceW / 0.45, ch = cw * STAGE_ASPECT;
    const fit = Math.min(1, W / cw, H / ch);
    cw *= fit; ch *= fit;
    const crop = {
      x: Math.min(Math.max(fc[0] - cw / 2, 0), W - cw),
      y: Math.min(Math.max(L[152][1] - ch * 0.75, 0), H - ch),
      w: cw, h: ch,
    };

    const glCanvas = container.querySelector('.photo-gl');
    const overlay = container.querySelector('.photo-mouth');
    const scale = Math.min(2, 900 / cw);
    for (const c of [glCanvas, overlay]) { c.width = Math.round(cw * scale); c.height = Math.round(ch * scale); }
    const draw = createRenderer(glCanvas, img, positions, uvs, indices);
    const ctx = overlay.getContext('2d');
    const sc = overlay.width / crop.w;
    const toCanvas = (j) => [(positions[j * 2] - crop.x) * sc, (positions[j * 2 + 1] - crop.y) * sc];

    function deform(c, m) {
      const k = hw / 23;                     // photo px per cartoon mouth unit
      const gap = Math.max(0, c.open) * k * 0.8;
      const up = gap * 0.25, down = gap * 0.75;
      const wScale = 1 + ((c.w - NEUTRAL_W) / NEUTRAL_W) * 0.6;
      const lift = c.smile * k * 0.35;
      const blink = 1 - m.eyeOpen;
      const browLift = c.open * 0.12 * m.talk * k * 0.6;
      const rot = (m.rot * 0.7 * Math.PI) / 180;
      const bob = (m.bob + c.open * 0.06) * k * 0.5;
      const pivot = [L[152][0], L[152][1] + hw * 2];
      const rc = Math.cos(rot), rs = Math.sin(rot);

      verts.forEach((v, j) => {
        let fx = 0, fy = 0; // displacement in the face frame
        const role = v.role;
        const r = Math.hypot(v.u, v.v * 1.1);
        if (v.head === 1) {
          if (role === 'upperInner') fy = -up;
          else if (role === 'upperOuter') fy = -up * 0.85;
          else if (role === 'lowerInner') fy = down;
          else if (role === 'lowerOuter') fy = down * 0.95;
          else if (role === 'corner') fy = down * 0.35 - up * 0.2;
          else {
            // Jaw drops below the mouth; skin above the upper lip lifts slightly.
            fy += down * Math.exp(-((Math.max(0, Math.abs(v.u) - 0.6) / 1.4) ** 2)) * smoothstep(-0.2, 0.6, v.v);
            if (v.v < 0) fy -= up * 0.6 * Math.exp(-r * r);
          }
          const lipish = typeof role === 'string' && role !== 'iris' && role !== 'brow';
          const g = lipish ? 1 : Math.exp(-((r / 1.3) ** 2));
          fx += (wScale - 1) * v.u * hw * g;
          fy -= lift * Math.min(1, Math.abs(v.u)) ** 2 * (lipish ? 1 : Math.exp(-((r / 1.6) ** 2)));
        }
        let x = v.x + fx * cos - fy * sin;
        let y = v.y + fx * sin + fy * cos;

        if (v.head === 1) {
          if (role && role.lid !== undefined) {
            y += blink * role.lid * 0.92;
          } else if (role === 'iris') {
            const e = v.eye;
            y += blink * (e.lowerY - v.y) * 0.85 + (m.gazeY / 17) * e.ew * 0.3 * m.eyeOpen;
            x += (m.gazeX / 17) * e.ew * 0.45 * m.eyeOpen;
          } else if (role === 'brow') {
            y -= browLift;
          } else if (!role) {
            // Skin between brow and upper lid follows the lid down during a blink.
            for (const e of eyes) {
              const ex = Math.abs(v.x - e.c[0]), ey = v.y - e.c[1];
              if (ex < e.ew * 1.25 && ey < 0 && ey > -e.ew * 1.1) {
                y += blink * e.gap * 0.9 * (1 - ex / (e.ew * 1.25)) * (1 + ey / (e.ew * 1.1));
              }
            }
          }
        }

        if (v.head > 0) {
          const px = x - pivot[0], py = y - pivot[1];
          const a = v.head;
          x = pivot[0] + (px * rc - py * rs - px) * a + px;
          y = pivot[1] + (px * rs + py * rc - py) * a + py + bob * a;
        }
        positions[j * 2] = x;
        positions[j * 2 + 1] = y;
      });
    }

    function drawMouth(c) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      const pts = OPENING.map(toCanvas);
      const gapPx = dist(toCanvas(13), toCanvas(14));
      if (gapPx < 0.8) return;
      const widthPx = dist(pts[0], pts[10]);
      const center = mid(toCanvas(13), toCanvas(14));

      ctx.save();
      ctx.globalAlpha = Math.min(1, gapPx / 4);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.clip();

      const bg = ctx.createRadialGradient(center[0], center[1], 0, center[0], center[1], widthPx * 0.6);
      bg.addColorStop(0, '#5a1e22');
      bg.addColorStop(1, '#1f0709');
      ctx.fillStyle = bg;
      ctx.fillRect(center[0] - widthPx, center[1] - widthPx, widthPx * 2, widthPx * 2);

      if (c.tongue > 0.05) {
        const low = toCanvas(14);
        ctx.fillStyle = `rgba(170, 78, 86, ${c.tongue.toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(low[0], low[1] - gapPx * (0.12 + c.tongueUp * 0.35), widthPx * 0.3, gapPx * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper teeth hang from the upper lip, tapering away toward the corners.
      const th = Math.min(gapPx * 0.55, widthPx * 0.16) * c.teeth;
      if (th > 0.5) {
        const edge = pts.slice(0, 11);
        ctx.beginPath();
        edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        for (let i = edge.length - 1; i >= 0; i--) {
          const t = Math.sin((Math.PI * i) / (edge.length - 1)) ** 1.5;
          ctx.lineTo(edge[i][0], edge[i][1] + th * t);
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(0, center[1] - gapPx * 0.5, 0, center[1] + gapPx * 0.2);
        g.addColorStop(0, '#d9d0c3');
        g.addColorStop(1, '#a89c8d');
        ctx.fillStyle = g;
        ctx.globalAlpha *= 0.95;
        ctx.fill();
      }

      // Soft shadow just inside the lips.
      ctx.lineWidth = Math.max(1.5, widthPx * 0.04);
      ctx.strokeStyle = 'rgba(30, 6, 8, 0.55)';
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    return function render(c, m) {
      deform(c, m);
      draw(crop);
      drawMouth(c);
    };
  }

  // ---------- Avatar ----------
  function createPhotoAvatar(container, look, onError) {
    container.innerHTML =
      '<div class="photo-stage">' +
      `<img class="photo-still" alt="" src="${look.photo}">` +
      '<canvas class="photo-gl"></canvas><canvas class="photo-mouth"></canvas>' +
      '<p class="photo-note">Preparing the face…</p></div>';
    const note = container.querySelector('.photo-note');
    const cur = { ...SHAPES.rest };
    let target = SHAPES.rest;
    const idle = global.createIdleMotion();
    let render = null;

    (async () => {
      const img = await loadImage(look.photo);
      const saved = look.landmarks && await fetch(look.landmarks).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!saved) note.textContent = 'Finding the face (first time only)…';
      const norm = saved || look.detected || (look.detected = await detectLandmarks(img));
      render = buildRig(container, img, norm);
      container.querySelector('.photo-still').remove();
      note.remove();
    })().catch((e) => {
      note.textContent = e.message;
      if (onError) onError(e);
    });

    return {
      setViseme(name) { target = SHAPES[name] || SHAPES.rest; },
      tick(dt) {
        const a = 1 - Math.exp(-dt * 22);
        for (const key of KEYS) cur[key] += (target[key] - cur[key]) * a;
        const m = idle(dt, target !== SHAPES.rest);
        if (render) render(cur, m);
      },
    };
  }

  global.PhotoAvatar = { create: createPhotoAvatar, detectLandmarks, loadImage };
})(window);
