// Corrector ortográfico del webview: carga un diccionario hunspell (es/en) y expone
// correct()/suggest() vía nspell (bundle en spell-engine.js → window.nspell).
// Los .aff/.dic se sirven desde media/dict y se cargan con fetch (CSP connect-src).
(function () {
  let speller = null;     // instancia nspell activa (o null = corrector desactivado)
  let activeLang = null;  // 'es' | 'en' | null
  let loadToken = null;   // identifica la carga en vuelo (evita carreras al cambiar idioma)
  const cache = {};       // lang -> nspell (no recargar el mismo diccionario)
  const listeners = [];
  let customWords = { es: [], en: [] }; // palabras propias POR IDIOMA
  const applied = {};                   // lang -> palabras actualmente inyectadas en cache[lang]

  function emitReady() { listeners.forEach((f) => { try { f(); } catch (_) { /* nada */ } }); }

  // Sincroniza la instancia nspell de `lang` con customWords[lang]: AGREGA las nuevas y QUITA las
  // borradas (nspell.add no se deshace solo; sin esto, una palabra eliminada seguiría aceptándose).
  function syncCustom(lang) {
    const sp = cache[lang];
    if (!sp) return;
    const want = customWords[lang] || [];
    const have = applied[lang] || [];
    for (const w of have) if (want.indexOf(w) === -1) { try { sp.remove(w); } catch (_) { /* nada */ } }
    for (const w of want) if (have.indexOf(w) === -1) { try { sp.add(w); } catch (_) { /* nada */ } }
    applied[lang] = want.slice();
  }

  async function fetchText(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('dict ' + r.status);
    return r.text();
  }

  // Activa el corrector para `lang` ('es'|'en'); cualquier otro valor lo desactiva.
  async function setLang(lang) {
    if (lang !== 'es' && lang !== 'en') { speller = null; activeLang = null; loadToken = null; emitReady(); return; }
    if (activeLang === lang && speller) return;
    if (cache[lang]) { speller = cache[lang]; activeLang = lang; syncCustom(lang); emitReady(); return; }
    const d = (window.SPELL_DICTS || {})[lang];
    if (!d || !window.nspell) { speller = null; activeLang = null; emitReady(); return; }
    const token = loadToken = {};
    try {
      const [aff, dic] = await Promise.all([fetchText(d.aff), fetchText(d.dic)]);
      if (loadToken !== token) return; // otra carga más reciente ganó
      const sp = window.nspell(aff, dic);
      cache[lang] = sp;
      applied[lang] = [];
      syncCustom(lang);
      speller = sp; activeLang = lang;
      emitReady();
    } catch (_) {
      if (loadToken === token) { speller = null; activeLang = null; emitReady(); }
    }
  }

  // Reemplaza las palabras propias (mapa {es,en} del backend) y las aplica a cada diccionario.
  function setWords(map) {
    const clean = (a) => (Array.isArray(a) ? a.filter((w) => typeof w === 'string' && w) : []);
    customWords = { es: clean(map && map.es), en: clean(map && map.en) };
    for (const k in cache) syncCustom(k); // reconcilia (agrega nuevas, quita borradas)
    emitReady();
  }

  window.LangSpell = {
    setLang,
    setWords,
    add(w) {
      const l = activeLang;
      if (w && l && customWords[l] && customWords[l].indexOf(w) === -1) {
        customWords[l].push(w);
        syncCustom(l);
      }
    },
    ready() { return !!speller; },
    lang() { return activeLang; },
    // Sin corrector activo → todo se considera correcto (no subraya nada).
    correct(w) { return speller ? speller.correct(w) : true; },
    suggest(w) { return speller ? speller.suggest(w).slice(0, 8) : []; },
    onReady(f) { if (typeof f === 'function') listeners.push(f); },
  };
})();
