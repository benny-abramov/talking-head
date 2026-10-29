// 3D avatar: a GLB character rendered by TalkingHead (three.js). The model has a real mouth,
// teeth and tongue; our viseme timeline drives its Oculus viseme blend shapes directly, so the
// browser's speech (including Hebrew) keeps working. TalkingHead adds blinks, eye contact and
// idle head/body motion. Modules come from the import map in index.html.
(function (global) {
  'use strict';

  // Our viseme names -> [Oculus viseme in the model, strength]. TalkingHead's own lip-sync uses
  // about 0.6 for most shapes and 0.9 for lip closures (PP, FF).
  const OCULUS = {
    MBP: ['PP', 0.9], AI: ['aa', 0.9], E: ['E', 0.75], O: ['O', 0.85], U: ['U', 0.8],
    FV: ['FF', 0.9], L: ['nn', 0.6], TH: ['TH', 0.7], CDG: ['DD', 0.6], CH: ['CH', 0.7], R: ['RR', 0.6],
  };
  const KEYS = [...new Set(Object.values(OCULUS).map(([v]) => v))];

  let modulePromise = null;
  const loadModule = () => (modulePromise = modulePromise || import('talkinghead'));

  function create3DAvatar(container, look, onError) {
    container.innerHTML = '<div class="avatar3d"><p class="photo-note">Loading the 3D avatar…</p></div>';
    const box = container.firstChild;
    const note = box.querySelector('.photo-note');
    const weights = Object.fromEntries(KEYS.map((k) => [k, 0]));
    let target = null; // [oculus viseme, strength], or null at rest
    let head = null;
    let disposed = false;

    loadModule()
      .then(async ({ TalkingHead }) => {
        if (disposed) return;
        head = new TalkingHead(box, {
          lipsyncModules: [],          // our own viseme engine does the lip-sync
          cameraView: 'head',
          cameraRotateEnable: false,
          avatarMood: 'happy',
        });
        await head.showAvatar({ url: look.model, body: 'F', avatarMood: 'happy', lipsyncLang: 'en' }, (ev) => {
          if (ev.lengthComputable) note.textContent = `Loading the 3D avatar… ${Math.round((ev.loaded / ev.total) * 100)}%`;
        });
        if (disposed) { head.dispose(); return; }
        note.remove();
        if (look.credit) box.insertAdjacentHTML('beforeend', `<p class="avatar-credit">${look.credit}</p>`);
      })
      .catch((e) => {
        note.textContent = 'The 3D avatar could not be loaded: ' + (e && e.message ? e.message : e);
        if (onError) onError(e);
      });

    return {
      setViseme(name) { target = OCULUS[name] || null; },
      tick(dt) {
        if (!head || !head.mtAvatar) return;
        const a = 1 - Math.exp(-dt * 20);
        for (const k of KEYS) {
          const goal = target && target[0] === k ? target[1] : 0;
          weights[k] += (goal - weights[k]) * a;
          const mt = head.mtAvatar['viseme_' + k];
          if (!mt) continue;
          // Hand the shape back to TalkingHead once it has faded out.
          const v = goal === 0 && weights[k] < 0.01 ? null : weights[k];
          if (mt.realtime !== v) Object.assign(mt, { realtime: v, needsUpdate: true });
        }
      },
      dispose() {
        disposed = true;
        if (head) head.dispose();
      },
    };
  }

  global.Avatar3D = { create: create3DAvatar };
})(window);
