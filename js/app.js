// UI, voice selection, speech queue and viseme playback synced to the TTS engine.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    stage: $('avatar'), text: $('text'), speak: $('speak'), sample: $('sample'),
    voice: $('voice'), rate: $('rate'), pitch: $('pitch'), rateOut: $('rate-out'), pitchOut: $('pitch-out'),
    caption: $('caption'), status: $('status'), langBtns: document.querySelectorAll('[data-lang]'),
    picker: $('picker'),
  };
  const LOOKS = window.AvatarLooks;

  const SAMPLES = {
    en: 'Hello! I am your talking head. Type any text in the box, press the button, and I will read it aloud while my lips follow the words.',
    he: 'שלום! אני הדמות המדברת שלך. כתבו טקסט כלשהו בתיבה, לחצו על הכפתור, ואני אקרא אותו בקול רם, והשפתיים שלי יזוזו לפי המילים.',
  };

  // Voice names are the only gender signal the Web Speech API gives us.
  const FEMALE_HINTS = ['female', 'woman', 'zira', 'aria', 'jenny', 'michelle', 'samantha', 'karen', 'victoria',
    'susan', 'hazel', 'libby', 'sonia', 'emma', 'ava', 'allison', 'serena', 'moira', 'tessa', 'fiona', 'kate',
    'amy', 'joanna', 'salli', 'kimberly', 'ivy', 'kendra', 'nicky', 'catherine', 'natasha', 'clara', 'jane',
    'nancy', 'sara', 'hila', 'carmit', 'yael', 'noa', 'ella', 'michal', 'google us english', 'google uk english female'];
  const MALE_HINTS = ['male', 'david', 'mark', 'guy', 'asaf', 'avri', 'daniel', 'alex', 'fred', 'george', 'ryan',
    'eric', 'christopher', 'james', 'william', 'thomas', 'aaron', 'arthur', 'oliver', 'rishi', 'roger',
    'andrew', 'brian', 'davis', 'tony', 'jason', 'liam', 'evan', 'gordon', 'lee'];

  const synth = window.speechSynthesis;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('th.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('th.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  const state = {
    lang: store.get('lang', 'en'),
    look: LOOKS.find((l) => l.id === store.get('look', '')) || LOOKS[0],
    voices: [],
    session: 0,          // bumps on every speak/stop so stale utterance events are ignored
    pending: 0,          // utterances queued in the current session
    play: null,          // active viseme playback
    ups: store.get('ups', { en: 11, he: 11 }), // timeline units per second at rate 1, learned over time
  };

  let avatar = window.createAvatar(els.stage, state.look);

  // ---------- Avatar picker ----------
  function renderPicker() {
    els.picker.innerHTML = '';
    LOOKS.forEach((look) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(look === state.look));
      b.innerHTML = window.renderAvatarThumbnail(look) + `<span>${look.name}</span>`;
      b.addEventListener('click', () => setLook(look));
      els.picker.appendChild(b);
    });
  }

  function setLook(look) {
    if (look === state.look) return;
    stop();
    state.look = look;
    store.set('look', look.id);
    avatar = window.createAvatar(els.stage, look);
    els.picker.querySelectorAll('[role="radio"]').forEach((b, i) => b.setAttribute('aria-checked', String(LOOKS[i] === look)));
    renderVoices();
  }

  // ---------- Voices ----------
  const langOf = (v) => v.lang.toLowerCase().replace('_', '-');
  const matchesLang = (v, lang) => (lang === 'he' ? /^(he|iw)\b/.test(langOf(v)) : /^en\b/.test(langOf(v)));

  function scoreVoice(v, lang) {
    const name = v.name.toLowerCase();
    const wantFemale = state.look.gender !== 'male';
    let s = 0;
    if (FEMALE_HINTS.some((h) => name.includes(h))) s += wantFemale ? 10 : -10;
    else if (MALE_HINTS.some((h) => name.includes(h))) s += wantFemale ? -10 : 10;
    if (/natural|neural|online|premium|enhanced/.test(name)) s += 3;
    if (lang === 'en' && langOf(v) === 'en-us') s += 1;
    if (v.default) s += 0.5;
    return s;
  }

  function loadVoices() {
    state.voices = synth ? synth.getVoices() : [];
    renderVoices();
  }

  function renderVoices() {
    const lang = state.lang;
    const list = state.voices.filter((v) => matchesLang(v, lang))
      .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
    const saved = store.get(voiceKey(), null);

    els.voice.innerHTML = '';
    list.forEach((v) => {
      const o = document.createElement('option');
      o.value = v.voiceURI;
      o.textContent = `${v.name} (${v.lang})`;
      els.voice.appendChild(o);
    });
    if (list.some((v) => v.voiceURI === saved)) els.voice.value = saved;
    els.voice.disabled = list.length === 0;

    if (!synth) {
      setStatus('This browser does not support speech synthesis. Try Chrome, Edge or Safari.', 'error');
    } else if (state.voices.length && list.length === 0) {
      setStatus(lang === 'he'
        ? 'No Hebrew voice is installed on this device. On Windows use Microsoft Edge (it has the online voice "Hila"), or add Hebrew under Settings → Time & language → Speech. On Android install Hebrew in Google Text-to-Speech; on iPhone the Hebrew voice "Carmit" is built in.'
        : 'No English voice was found on this device.', 'warn');
    } else {
      setStatus('');
    }
  }

  // Remembered per language and per avatar gender, so switching avatars switches voices.
  const voiceKey = () => `voice.${state.lang}.${state.look.gender}`;

  function currentVoice() {
    return state.voices.find((v) => v.voiceURI === els.voice.value) || null;
  }

  // ---------- Language ----------
  function setLang(lang, { keepText = false } = {}) {
    const prev = state.lang;
    state.lang = lang;
    store.set('lang', lang);
    els.langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.documentElement.dataset.lang = lang;
    els.text.dir = lang === 'he' ? 'rtl' : 'ltr';
    els.text.lang = lang;
    if (!keepText) {
      const t = els.text.value.trim();
      if (!t || t === SAMPLES[prev]) els.text.value = SAMPLES[lang];
    }
    renderVoices();
  }

  // ---------- Text chunking ----------
  // Long utterances get cut off by some engines (Chrome), but every utterance boundary costs a
  // pause (online voices fetch each one separately), so pack whole sentences into ~200-char chunks.
  const MAX_CHUNK = 200;

  function splitChunks(text) {
    const sentences = text.replace(/\s*\n+\s*/g, '\n').match(/[^.!?…\n]+[.!?…]*|[.!?…]+/g) || [];
    const pieces = [];
    for (let s of sentences) {
      s = s.trim();
      if (!/[\p{L}\p{N}]/u.test(s)) continue;
      if (s.length <= MAX_CHUNK) { pieces.push(s); continue; }
      let buf = '';
      for (const part of s.match(/[^,;:،]+[,;:،]*/g)) {
        if (buf && (buf + part).length > MAX_CHUNK) { pieces.push(buf.trim()); buf = ''; }
        buf += part;
      }
      if (buf.trim()) pieces.push(buf.trim());
    }
    const chunks = [];
    for (const p of pieces) {
      const last = chunks.length - 1;
      if (last >= 0 && chunks[last].length + 1 + p.length <= MAX_CHUNK) chunks[last] += ' ' + p;
      else chunks.push(p);
    }
    return chunks;
  }

  // ---------- Captions ----------
  function renderCaption(text, words) {
    els.caption.textContent = '';
    els.caption.dir = state.lang === 'he' ? 'rtl' : 'ltr';
    let pos = 0;
    const spans = words.map((w) => {
      els.caption.append(text.slice(pos, w.charStart));
      const span = document.createElement('span');
      span.textContent = text.slice(w.charStart, w.charEnd);
      els.caption.append(span);
      pos = w.charEnd;
      return span;
    });
    els.caption.append(text.slice(pos));
    return spans;
  }

  function highlight(p, idx) {
    if (p.hl === idx) return;
    if (p.spans[p.hl]) p.spans[p.hl].classList.remove('on');
    if (p.spans[idx]) p.spans[idx].classList.add('on');
    p.hl = idx;
  }

  // ---------- Speech ----------
  function adaptRate(measuredUps, weight) {
    const rate = Number(els.rate.value);
    const base = measuredUps / rate;
    const old = state.ups[state.lang] || 11;
    state.ups[state.lang] = Math.min(25, Math.max(4, old + (base - old) * weight));
    store.set('ups', state.ups);
  }

  function startPlayback(tl, text) {
    state.play = {
      tl, cursor: 0, segIdx: 0, hl: -1, wordIdx: -1,
      boundary: false, lastB: null, started: performance.now() / 1000,
      spans: renderCaption(text, tl.words),
    };
  }

  function wordIndexAt(words, charIndex) {
    for (let i = 0; i < words.length; i++) if (words[i].charEnd > charIndex) return i;
    return -1;
  }

  function onBoundary(p, e) {
    if (e.name && e.name !== 'word') return;
    const idx = wordIndexAt(p.tl.words, e.charIndex);
    if (idx < 0) return;
    const now = performance.now() / 1000;
    if (p.lastB && idx > p.lastB.idx) {
      const du = p.tl.words[idx].unitStart - p.tl.words[p.lastB.idx].unitStart;
      const dt = now - p.lastB.t;
      if (dt > 0.05 && du > 0) adaptRate(du / dt, 0.25);
    }
    p.boundary = true;
    p.lastB = { idx, t: now };
    p.wordIdx = idx;
    p.cursor = p.tl.words[idx].unitStart;
    p.segIdx = 0;
    highlight(p, idx);
  }

  function endPlayback(p) {
    // Without boundary events, learn the speaking speed from how long the chunk took.
    if (!p.boundary) {
      const dur = performance.now() / 1000 - p.started;
      const last = p.tl.words[p.tl.words.length - 1];
      if (last && dur > 0.4) adaptRate(last.unitEnd / dur, 0.5);
    }
    if (state.play === p) state.play = null;
    avatar.setViseme('rest');
  }

  function speak() {
    const text = els.text.value.trim();
    if (!text || !synth) return;
    stop();
    const session = ++state.session;
    const chunks = splitChunks(text);
    const voice = currentVoice();
    const lang = state.lang;
    state.pending = chunks.length;
    setSpeaking(true);

    chunks.forEach((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : (lang === 'he' ? 'he-IL' : 'en-US');
      u.rate = Number(els.rate.value);
      u.pitch = Number(els.pitch.value);
      const tl = window.Visemes.buildTimeline(chunk, lang);
      let p = null;

      const ensureStarted = () => {
        if (!p) { startPlayback(tl, chunk); p = state.play; }
        return p;
      };
      const finish = () => {
        if (session !== state.session) return;
        if (p) endPlayback(p);
        if (--state.pending <= 0) setSpeaking(false);
      };

      u.onstart = () => { if (session === state.session) ensureStarted(); };
      u.onboundary = (e) => { if (session === state.session) onBoundary(ensureStarted(), e); };
      u.onend = finish;
      u.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') setStatus('Speech error: ' + e.error, 'error');
        finish();
      };
      synth.speak(u);
    });
  }

  function stop() {
    state.session++;
    if (synth) synth.cancel();
    state.play = null;
    avatar.setViseme('rest');
    setSpeaking(false);
  }

  function setSpeaking(on) {
    els.speak.classList.toggle('stop', on);
    els.speak.querySelector('.label').textContent = on ? 'Stop' : 'Read aloud';
    els.speak.setAttribute('aria-label', on ? 'Stop reading' : 'Read text aloud');
  }

  function setStatus(msg, kind) {
    els.status.textContent = msg;
    els.status.className = 'status' + (kind ? ' ' + kind : '');
    els.status.hidden = !msg;
  }

  // ---------- Animation loop ----------
  function advance(p, dt) {
    const tl = p.tl;
    p.cursor += dt * state.ups[state.lang] * Number(els.rate.value);
    if (p.boundary) {
      // Don't run ahead of the engine: wait at the gap until the next word's boundary arrives.
      const next = tl.words[p.wordIdx + 1];
      const limit = next ? next.unitStart - 0.001 : tl.total;
      if (p.cursor > limit) p.cursor = limit;
    }
    if (p.cursor >= tl.total) { avatar.setViseme('rest'); return; }

    const segs = tl.segs;
    if (p.cursor < segs[p.segIdx].start) p.segIdx = 0;
    while (p.segIdx < segs.length - 1 && p.cursor >= segs[p.segIdx].start + segs[p.segIdx].dur) p.segIdx++;
    avatar.setViseme(segs[p.segIdx].v);

    if (!p.boundary) {
      const idx = tl.words.findIndex((w) => p.cursor < w.unitEnd);
      if (idx >= 0 && p.cursor >= tl.words[idx].unitStart) highlight(p, idx);
    }
  }

  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.play) advance(state.play, dt);
    avatar.tick(dt);
    requestAnimationFrame(loop);
  }

  // ---------- Wire up ----------
  els.speak.addEventListener('click', () => (els.speak.classList.contains('stop') ? stop() : speak()));
  els.sample.addEventListener('click', () => { els.text.value = SAMPLES[state.lang]; });
  els.langBtns.forEach((b) => b.addEventListener('click', () => { stop(); setLang(b.dataset.lang); }));
  els.voice.addEventListener('change', () => store.set(voiceKey(), els.voice.value));
  els.text.addEventListener('input', () => {
    const r = window.Visemes.hebrewRatio(els.text.value);
    if (r > 0.6 && state.lang !== 'he') setLang('he', { keepText: true });
    else if (r < 0.2 && els.text.value.trim().length > 3 && state.lang !== 'en') setLang('en', { keepText: true });
  });
  const syncRange = (input, out) => {
    const upd = () => { out.textContent = Number(input.value).toFixed(1) + '×'; store.set(input.id, input.value); };
    input.value = store.get(input.id, input.value);
    input.addEventListener('input', upd);
    upd();
  };
  syncRange(els.rate, els.rateOut);
  syncRange(els.pitch, els.pitchOut);
  window.addEventListener('pagehide', stop);

  if (synth) {
    synth.addEventListener?.('voiceschanged', loadVoices);
    if ('onvoiceschanged' in synth && !synth.addEventListener) synth.onvoiceschanged = loadVoices;
    // Some mobile browsers populate voices late and never fire voiceschanged.
    let tries = 0;
    const poll = setInterval(() => { loadVoices(); if (state.voices.length || ++tries > 20) clearInterval(poll); }, 250);
  }
  renderPicker();
  setLang(state.lang);
  loadVoices();
  requestAnimationFrame(loop);
})();
