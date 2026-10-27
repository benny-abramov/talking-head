// Text -> viseme timeline for English and Hebrew.
// Browser TTS doesn't expose phonemes, so visemes are approximated from spelling
// and laid out on a timeline measured in abstract "units" (roughly one short sound each).
(function (global) {
  'use strict';

  // Mouth shape presets, in the avatar's SVG coordinate space.
  //   w: half-width, open: gap between lips, up/low: lip thickness,
  //   round: 0.6 = pointed corners .. 1 = round (O/U), teeth/tongue: visibility 0..1,
  //   tongueUp: 0 = resting low .. 1 = raised to the teeth (L, TH),
  //   smile: how far the mouth corners lift (rounded shapes can't smile much)
  const SHAPES = {
    rest: { w: 27, open: 3,  up: 4, low: 6, round: 0.7,  teeth: 0.9, tongue: 0,   tongueUp: 0,   smile: 7 },
    MBP:  { w: 23, open: 0,  up: 4, low: 5, round: 0.75, teeth: 0,   tongue: 0,   tongueUp: 0,   smile: 4 },
    AI:   { w: 26, open: 20, up: 4, low: 6, round: 0.85, teeth: 0.9, tongue: 0.7, tongueUp: 0,   smile: 3 },
    E:    { w: 29, open: 9,  up: 4, low: 6, round: 0.65, teeth: 1,   tongue: 0.3, tongueUp: 0,   smile: 4.5 },
    O:    { w: 16, open: 17, up: 5, low: 6, round: 1.0,  teeth: 0.3, tongue: 0.5, tongueUp: 0,   smile: 1 },
    U:    { w: 11, open: 7,  up: 6, low: 7, round: 1.0,  teeth: 0,   tongue: 0,   tongueUp: 0,   smile: 0.5 },
    FV:   { w: 24, open: 4,  up: 4, low: 3, round: 0.7,  teeth: 1,   tongue: 0,   tongueUp: 0,   smile: 3.5 },
    L:    { w: 25, open: 11, up: 4, low: 6, round: 0.8,  teeth: 0.9, tongue: 1,   tongueUp: 1,   smile: 3 },
    TH:   { w: 25, open: 7,  up: 4, low: 6, round: 0.75, teeth: 1,   tongue: 1,   tongueUp: 0.4, smile: 3.5 },
    CDG:  { w: 25, open: 6,  up: 4, low: 6, round: 0.75, teeth: 1,   tongue: 0.2, tongueUp: 0,   smile: 4 },
    CH:   { w: 18, open: 8,  up: 5, low: 7, round: 0.9,  teeth: 1,   tongue: 0,   tongueUp: 0,   smile: 1.5 },
    R:    { w: 17, open: 6,  up: 5, low: 7, round: 0.95, teeth: 0.6, tongue: 0,   tongueUp: 0,   smile: 1.5 },
  };

  const VOWELS = new Set(['AI', 'E', 'O', 'U']);
  const weightOf = (v) => (VOWELS.has(v) ? 1.0 : 0.6);

  // ---------- English ----------
  // Ordered longest-first; checked before single letters.
  const EN_RULES = [
    ['ough', ['O']], ['tch', ['CH']], ['igh', ['AI']],
    ['th', ['TH']], ['sh', ['CH']], ['ch', ['CH']], ['ph', ['FV']], ['wh', ['U']],
    ['ck', ['CDG']], ['ng', ['CDG']], ['qu', ['CDG', 'U']],
    ['oo', ['U']], ['ee', ['E']], ['ea', ['E']], ['ai', ['E']], ['ay', ['E']], ['oa', ['O']],
    ['ou', ['AI', 'U']], ['ow', ['O', 'U']], ['oi', ['O', 'E']], ['oy', ['O', 'E']],
    ['au', ['O']], ['aw', ['O']], ['ie', ['E']], ['ei', ['E']], ['ue', ['U']], ['ew', ['U']],
  ];
  const EN_SINGLE = {
    a: 'AI', e: 'E', i: 'E', o: 'O', u: 'AI', y: 'E',
    b: 'MBP', m: 'MBP', p: 'MBP', f: 'FV', v: 'FV', l: 'L', w: 'U', r: 'R', j: 'CH',
  };
  const DIGIT = ['CDG', 'AI'];

  function englishWord(word) {
    let s = word.toLowerCase().replace(/[’']/g, '');
    // Silent trailing "e" (make, time) unless it's the word's only vowel (the, me).
    if (s.length > 2 && s.endsWith('e') && !/[aeiouy]/.test(s[s.length - 2]) && /[aeiouy]/.test(s.slice(0, -1))) {
      s = s.slice(0, -1);
    }
    const out = [];
    let i = 0;
    outer: while (i < s.length) {
      for (const [pat, vs] of EN_RULES) {
        if (s.startsWith(pat, i)) { out.push(...vs); i += pat.length; continue outer; }
      }
      const ch = s[i++];
      if (ch === s[i]) i++; // doubled letters sound once
      if (/[0-9]/.test(ch)) out.push(...DIGIT);
      else out.push(EN_SINGLE[ch] || 'CDG');
    }
    return out;
  }

  // ---------- Hebrew ----------
  const HE_LETTERS = {
    'א': 'AI', 'ב': 'MBP', 'ג': 'CDG', 'ד': 'CDG', 'ה': 'AI', 'ו': 'O', 'ז': 'CDG', 'ח': 'CDG',
    'ט': 'CDG', 'י': 'E', 'כ': 'CDG', 'ך': 'CDG', 'ל': 'L', 'מ': 'MBP', 'ם': 'MBP', 'נ': 'CDG',
    'ן': 'CDG', 'ס': 'CDG', 'ע': 'AI', 'פ': 'MBP', 'ף': 'FV', 'צ': 'CH', 'ץ': 'CH', 'ק': 'CDG',
    'ר': 'R', 'ש': 'CH', 'ת': 'CDG',
  };
  // Letters that usually carry a vowel sound in unpointed text.
  const HE_MATRES = new Set(['א', 'ה', 'ו', 'י', 'ע']);
  const NIQQUD = {
    'ֱ': 'E', 'ֲ': 'AI', 'ֳ': 'O', 'ִ': 'E', 'ֵ': 'E', 'ֶ': 'E',
    'ַ': 'AI', 'ָ': 'AI', 'ֹ': 'O', 'ֺ': 'O', 'ֻ': 'U', 'ׇ': 'O',
  };
  const HAS_NIQQUD = /[ֱ-ׇֻ]/;
  const SIN_DOT = 'ׂ';

  // True if the letter at i carries a sin dot (marks follow their letter, in any order).
  function hasSinDot(letters, i) {
    for (let j = i + 1; j < letters.length && /[֑-ׇ]/.test(letters[j]); j++) {
      if (letters[j] === SIN_DOT) return true;
    }
    return false;
  }

  function hebrewWord(word) {
    const letters = [...word];
    const pointed = HAS_NIQQUD.test(word);
    const isLetter = (c) => c in HE_LETTERS;
    const out = [];
    let implicit = 0;
    letters.forEach((c, i) => {
      if (c in NIQQUD) { out.push(NIQQUD[c]); return; }
      if (/[0-9]/.test(c)) { out.push(...DIGIT); return; }
      if (!isLetter(c)) return;
      // Leading ו is the conjunction "ve-".
      if (c === 'ו' && out.length === 0 && letters.length > 2) { out.push('FV', 'E'); return; }
      // A sin dot among the following marks turns ש (sh) into s.
      out.push(c === 'ש' && hasSinDot(letters, i) ? 'CDG' : HE_LETTERS[c]);
      if (pointed || HE_MATRES.has(c)) return;
      // Unpointed text omits most vowels: guess one between consecutive consonants.
      const next = letters.slice(i + 1).find(isLetter);
      if (next && !HE_MATRES.has(next)) out.push(implicit++ % 3 === 2 ? 'E' : 'AI');
    });
    return out;
  }

  function genericWord(word) {
    const out = [];
    [...word].forEach((_, i) => out.push(i % 2 ? 'AI' : 'CDG'));
    return out;
  }

  const HEBREW_RE = /[֐-׿]/;

  function wordVisemes(word, lang) {
    if (HEBREW_RE.test(word)) return hebrewWord(word);
    if (/[a-z0-9]/i.test(word)) return englishWord(word);
    return lang === 'he' ? hebrewWord(word) : genericWord(word);
  }

  // Builds { segs: [{v, start, dur}], words: [{charStart, charEnd, unitStart, unitEnd}], total }
  function buildTimeline(text, lang) {
    const segs = [];
    const words = [];
    let units = 0;

    const push = (v, dur) => {
      const last = segs[segs.length - 1];
      if (last && last.v === v) {
        const extra = v === 'rest' ? dur : dur * 0.4;
        last.dur += extra;
        units += extra;
      } else {
        segs.push({ v, start: units, dur });
        units += dur;
      }
    };

    const tokenRe = /[\p{L}\p{M}\p{N}'’]+|[^\p{L}\p{M}\p{N}'’]+/gu;
    let m;
    while ((m = tokenRe.exec(text))) {
      const tok = m[0];
      if (/[\p{L}\p{N}]/u.test(tok)) {
        const word = { charStart: m.index, charEnd: m.index + tok.length, unitStart: units, unitEnd: 0 };
        wordVisemes(tok, lang).forEach((v) => push(v, weightOf(v)));
        word.unitEnd = units;
        words.push(word);
      } else if (/[.!?…:;\n]/.test(tok)) {
        push('rest', 3.0);
      } else if (/[,،—–\-]/.test(tok)) {
        push('rest', 1.5);
      } else {
        push('rest', 0.3);
      }
    }
    return { segs, words, total: units };
  }

  function hebrewRatio(text) {
    const he = (text.match(/[א-ת]/g) || []).length;
    const en = (text.match(/[a-z]/gi) || []).length;
    return he + en === 0 ? 0 : he / (he + en);
  }

  global.Visemes = { SHAPES, buildTimeline, hebrewRatio };
})(window);
