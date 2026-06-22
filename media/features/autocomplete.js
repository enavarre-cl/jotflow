/**
 * Composer autocomplete popups: emoji picker (😀 button), :shortcode emoji autocomplete,
 * and @file mention autocomplete (workspace files resolved by the host).
 */
import { $, escapeHtml } from '../core/dom.js';
import { vscode } from '../core/vscode.js';

const inputEl = /** @type {HTMLTextAreaElement} */ ($('input'));
const emojiBtn = $('emojiBtn');
const emojiPicker = $('emojiPicker');

// ---- Emoji picker ----
  const EMOJI_CATS = [
    { icon: '😀', emojis: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾' },
    { icon: '👍', emojis: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦶 👂 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🙇 🤦 🤷 👮 🕵️ 💂 👷 🤴 👸 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🏃 💃 🕺 👯 🧖 🧗 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 🤽 🤾 🤹' },
    { icon: '🐶', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦏 🐪 🐫 🦒 🐃 🐄 🐎 🐖 🐏 🐑 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🕊️ 🐇 🦝 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 🍀 🍁 🍂 🍃 🌷 🌹 🌺 🌸 🌼 🌻 🌙 ⭐ 🌟 ✨ ⚡ 💥 🔥 🌈 ☀️ ⛅ ☁️ ❄️ ⛄ 💧 🌊' },
    { icon: '🍕', emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🌮 🌯 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾' },
    { icon: '⚽', emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🪁 🎣 🤿 🎽 🎿 🛷 🥌 🎯 🎮 🕹️ 🎰 🎲 🧩 ♟️ 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 🚀 ✈️ 🚁 🚂 🚆 🚊 ⛵ 🚤 🛳️ ⚓ 🚦 🗺️ 🗽 🗼 🏰 🏯 🎡 🎢 🎠 ⛲ 🏖️ 🏝️ 🏔️ ⛰️ 🌋 🏕️ ⛺ 🏠 🏡 🏢 🏬 🏥 🏦 🏨 🏪 🏫 🏛️' },
    { icon: '💡', emojis: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📸 📹 🎥 📞 ☎️ 📟 📠 📺 📻 🧭 ⏰ 🕰️ ⌛ ⏳ 🔋 🔌 💡 🔦 🕯️ 🧯 💸 💵 💴 💶 💷 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⛏️ 🛠️ 🗡️ ⚔️ 🔫 🛡️ 🔩 ⚙️ 🧲 🔬 🔭 📡 💉 🩸 💊 🩹 🩺 🚪 🛏️ 🛋️ 🚽 🚿 🛁 🧴 🧷 🧹 🧺 🧻 🧼 🧽 🔑 🗝️ 📦 📫 📮 📜 📄 📑 📊 📈 📉 📅 📆 📋 📌 📎 📏 📐 ✂️ 🖊️ 🖍️ 📝 ✏️ 🔍 🔎 🔒 🔓 🔐 🔔 🔕 📢 📣 💬 💭 🗯️' },
    { icon: '❤️', emojis: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⚛️ ☢️ ☣️ ✴️ 🆚 🅰️ 🅱️ 🆎 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 🚫 💯 💢 ♨️ 🔞 ❗ ❓ ❕ ❔ ‼️ ⁉️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ ❎ ✔️ 💲 💱 ©️ ®️ ™️ 🔟 #️⃣ ▶️ ⏸️ ⏹️ ⏭️ ⏮️ ⏩ ⏪ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ 🔀 🔁 🔂 🔄 ➕ ➖ ➗ ✖️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✨ ⭐ 🌟 💫' },
  ];
  let emojiBuilt = false;
  function insertAtCursor(text) {
    const s = inputEl.selectionStart, e = inputEl.selectionEnd, v = inputEl.value;
    inputEl.value = v.slice(0, s) + text + v.slice(e);
    inputEl.selectionStart = inputEl.selectionEnd = s + text.length;
    inputEl.focus();
    inputEl.dispatchEvent(new Event('input'));
  }
  function buildEmojiPicker() {
    if (emojiBuilt) return;
    emojiBuilt = true;
    const tabs = document.createElement('div'); tabs.id = 'emojiTabs';
    const grid = document.createElement('div'); grid.id = 'emojiGrid';
    emojiPicker.appendChild(tabs);
    emojiPicker.appendChild(grid);
    const showCat = (cat) => {
      grid.innerHTML = '';
      for (const em of cat.emojis.split(' ').filter(Boolean)) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = em;
        const tip = emojiTitle(em); // associated :name shortcuts, if any
        if (tip) b.title = tip;
        b.addEventListener('click', () => insertAtCursor(em));
        grid.appendChild(b);
      }
      grid.scrollTop = 0;
    };
    EMOJI_CATS.forEach((cat, i) => {
      const t = document.createElement('button');
      t.type = 'button'; t.textContent = cat.icon;
      t.addEventListener('click', () => {
        [...tabs.children].forEach((c) => c.classList.remove('active'));
        t.classList.add('active');
        showCat(cat);
      });
      if (i === 0) t.classList.add('active');
      tabs.appendChild(t);
    });
    showCat(EMOJI_CATS[0]);
  }

// ---- Emoji autocomplete when typing :name (WhatsApp/Slack style) ----
  const EMOJI_SHORTCODES = {
    smile: '😄', smiley: '😃', grin: '😁', laughing: '😆', joy: '😂', risa: '😂', rofl: '🤣',
    blush: '😊', innocent: '😇', wink: '😉', heart_eyes: '😍', enamorado: '😍', kiss: '😘', beso: '😘',
    yum: '😋', sunglasses: '😎', cool: '😎', star_struck: '🤩', party: '🥳', fiesta: '🥳',
    smirk: '😏', unamused: '😒', pensive: '😔', triste: '😔', confused: '😕', cry: '😢',
    sob: '😭', llorar: '😭', angry: '😠', enojado: '😠', rage: '😡', triumph: '😤',
    thinking: '🤔', pensando: '🤔', shush: '🤫', flushed: '😳', hot: '🥵', cold: '🥶', frio: '🥶',
    scream: '😱', fearful: '😨', sleepy: '😴', dormir: '😴', drool: '🤤', dizzy_face: '😵',
    sick: '🤢', vomit: '🤮', sneeze: '🤧', mask: '😷', money_mouth: '🤑', cowboy: '🤠',
    clown: '🤡', payaso: '🤡', poop: '💩', caca: '💩', ghost: '👻', fantasma: '👻', skull: '💀',
    calavera: '💀', alien: '👽', robot: '🤖', wave: '👋', hola: '👋', raised_hand: '✋', ok_hand: '👌',
    ok: '👌', v: '✌️', peace: '✌️', crossed_fingers: '🤞', rock: '🤘', call_me: '🤙',
    point_right: '👉', point_left: '👈', point_up: '☝️', point_down: '👇', thumbsup: '👍', like: '👍',
    thumbsdown: '👎', fist: '✊', punch: '👊', clap: '👏', aplauso: '👏', raised_hands: '🙌',
    pray: '🙏', rezar: '🙏', gracias: '🙏', handshake: '🤝', muscle: '💪', fuerza: '💪',
    selfie: '🤳', brain: '🧠', cerebro: '🧠', eyes: '👀', ojos: '👀', tongue: '👅', lips: '👄',
    heart: '❤️', corazon: '❤️', orange_heart: '🧡', yellow_heart: '💛', green_heart: '💚',
    blue_heart: '💙', purple_heart: '💜', black_heart: '🖤', white_heart: '🤍', broken_heart: '💔',
    two_hearts: '💕', sparkling_heart: '💖', cupid: '💘', fire: '🔥', fuego: '🔥', sparkles: '✨',
    star: '⭐', estrella: '⭐', star2: '🌟', dizzy: '💫', zap: '⚡', rayo: '⚡', boom: '💥',
    hundred: '💯', cien: '💯', tada: '🎉', party_popper: '🎉', confetti: '🎊', balloon: '🎈',
    globo: '🎈', gift: '🎁', regalo: '🎁', check: '✅', x: '❌', warning: '⚠️', cuidado: '⚠️',
    question: '❓', pregunta: '❓', exclamation: '❗', bulb: '💡', idea: '💡', rocket: '🚀',
    cohete: '🚀', computer: '💻', laptop: '💻', phone: '📱', movil: '📱', email: '📧',
    calendar: '📅', clock: '⏰', reloj: '⏰', money: '💰', dinero: '💰', gem: '💎', diamante: '💎',
    tool: '🔧', wrench: '🔧', hammer: '🔨', gear: '⚙️', lock: '🔒', key: '🔑', llave: '🔑',
    dog: '🐶', perro: '🐶', cat: '🐱', gato: '🐱', fox: '🦊', zorro: '🦊', bear: '🐻', oso: '🐻',
    panda: '🐼', tiger: '🐯', lion: '🦁', leon: '🦁', pig: '🐷', cerdo: '🐷', frog: '🐸', rana: '🐸',
    monkey: '🐵', mono: '🐵', chicken: '🐔', penguin: '🐧', pinguino: '🐧', bee: '🐝', abeja: '🐝',
    bug: '🐛', butterfly: '🦋', mariposa: '🦋', turtle: '🐢', tortuga: '🐢', snake: '🐍',
    dragon: '🐉', octopus: '🐙', pulpo: '🐙', fish: '🐟', pez: '🐟', whale: '🐋', ballena: '🐋',
    shark: '🦈', tiburon: '🦈', unicorn: '🦄', unicornio: '🦄', horse: '🐴', caballo: '🐴',
    flower: '🌸', flor: '🌸', rose: '🌹', rosa: '🌹', sunflower: '🌻', tree: '🌳', arbol: '🌳',
    cactus: '🌵', clover: '🍀', trebol: '🍀', sun: '☀️', sol: '☀️', moon: '🌙', luna: '🌙',
    rainbow: '🌈', arcoiris: '🌈', snowflake: '❄️', nieve: '❄️', snowman: '⛄', wave_water: '🌊',
    ola: '🌊', apple: '🍎', manzana: '🍎', banana: '🍌', platano: '🍌', grapes: '🍇', uvas: '🍇',
    strawberry: '🍓', fresa: '🍓', watermelon: '🍉', sandia: '🍉', peach: '🍑', lemon: '🍋',
    limon: '🍋', avocado: '🥑', aguacate: '🥑', bread: '🍞', pan: '🍞', cheese: '🧀', queso: '🧀',
    egg: '🥚', huevo: '🥚', meat: '🍖', carne: '🍖', hotdog: '🌭', hamburger: '🍔', hamburguesa: '🍔',
    fries: '🍟', papas: '🍟', pizza: '🍕', taco: '🌮', burrito: '🌯', salad: '🥗', ensalada: '🥗',
    spaghetti: '🍝', pasta: '🍝', ramen: '🍜', sushi: '🍣', rice: '🍚', arroz: '🍚', cake: '🍰',
    pastel: '🍰', birthday: '🎂', cumple: '🎂', cookie: '🍪', galleta: '🍪', chocolate: '🍫',
    candy: '🍬', dulce: '🍬', lollipop: '🍭', icecream: '🍨', helado: '🍦', popcorn: '🍿',
    coffee: '☕', cafe: '☕', tea: '🍵', beer: '🍺', cerveza: '🍺', beers: '🍻', wine: '🍷',
    vino: '🍷', cocktail: '🍸', champagne: '🍾', cheers: '🥂', salud: '🥂', soccer: '⚽',
    futbol: '⚽', basketball: '🏀', football: '🏈', baseball: '⚾', tennis: '🎾', tenis: '🎾',
    game: '🎮', juego: '🎮', dice: '🎲', dado: '🎲', dart: '🎯', diana: '🎯', music: '🎵',
    musica: '🎵', guitar: '🎸', guitarra: '🎸', mic: '🎤', microfono: '🎤', headphones: '🎧',
    art: '🎨', arte: '🎨', movie: '🎬', pelicula: '🎬', camera: '📷', camara: '📷', car: '🚗',
    coche: '🚗', auto: '🚗', bus: '🚌', bike: '🚲', bici: '🚲', plane: '✈️', avion: '✈️',
    ship: '🚢', barco: '🚢', train: '🚆', tren: '🚆', house: '🏠', casa: '🏠', building: '🏢',
    hospital: '🏥', school: '🏫', escuela: '🏫', earth: '🌍', tierra: '🌍', world: '🌍',
  };
  const SHORTCODE_ENTRIES = Object.entries(EMOJI_SHORTCODES);
  // Inverse map emoji -> names (for tooltips in the grid).
  const EMOJI_TO_NAMES = {};
  for (const [name, em] of SHORTCODE_ENTRIES) (EMOJI_TO_NAMES[em] = EMOJI_TO_NAMES[em] || []).push(name);
  const emojiTitle = (em) => (EMOJI_TO_NAMES[em] ? EMOJI_TO_NAMES[em].slice(0, 4).map((n) => ':' + n).join('  ') : '');

  // Autocomplete popup, shared and positioned above the active textarea.
  const emojiSuggest = document.createElement('div');
  emojiSuggest.id = 'emojiSuggest';
  emojiSuggest.className = 'hidden';
  document.body.appendChild(emojiSuggest);
  let suggestItems = [];
  let suggestActive = 0;
  let suggestTa = null; // textarea in use
  const suggestOpen = () => !emojiSuggest.classList.contains('hidden');

  function colonQuery(ta) {
    const pos = ta.selectionStart;
    const m = ta.value.slice(0, pos).match(/(?:^|\s):([a-z0-9_+\-]{1,})$/i);
    return m ? { q: m[1].toLowerCase(), start: pos - m[1].length - 1 } : null;
  }
  function hideSuggest() { emojiSuggest.classList.add('hidden'); suggestItems = []; }
  function renderSuggest() {
    emojiSuggest.innerHTML = '';
    suggestItems.forEach(([name, em], i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'sug-row' + (i === suggestActive ? ' active' : '');
      row.innerHTML = '<span class="sug-em">' + em + '</span><span class="sug-name">:' + escapeHtml(name) + '</span>';
      row.addEventListener('mousedown', (e) => { e.preventDefault(); acceptSuggest(em); });
      emojiSuggest.appendChild(row);
    });
  }
  function positionSuggest(ta) {
    const r = ta.getBoundingClientRect();
    emojiSuggest.style.left = Math.round(r.left) + 'px';
    emojiSuggest.style.bottom = Math.round(window.innerHeight - r.top + 4) + 'px';
  }
  function updateSuggest(ta) {
    suggestTa = ta;
    const c = colonQuery(ta);
    if (!c || c.q.length < 1) { hideSuggest(); return; }
    const starts = [], incl = [], seen = new Set();
    for (const [name, em] of SHORTCODE_ENTRIES) {
      if (name.startsWith(c.q) && !seen.has(em)) { seen.add(em); starts.push([name, em]); }
    }
    for (const [name, em] of SHORTCODE_ENTRIES) {
      if (!name.startsWith(c.q) && name.includes(c.q) && !seen.has(em)) { seen.add(em); incl.push([name, em]); }
    }
    suggestItems = starts.concat(incl).slice(0, 8);
    if (!suggestItems.length) { hideSuggest(); return; }
    suggestActive = 0;
    renderSuggest();
    positionSuggest(ta);
    emojiSuggest.classList.remove('hidden');
  }
  function moveSuggest(d) {
    suggestActive = (suggestActive + d + suggestItems.length) % suggestItems.length;
    renderSuggest();
  }
  function acceptSuggest(em) {
    const ta = suggestTa;
    if (!ta) { hideSuggest(); return; }
    const c = colonQuery(ta);
    if (!c) { hideSuggest(); return; }
    const pos = ta.selectionStart, v = ta.value;
    ta.value = v.slice(0, c.start) + em + ' ' + v.slice(pos);
    ta.selectionStart = ta.selectionEnd = c.start + em.length + 1;
    hideSuggest();
    ta.focus();
    ta.dispatchEvent(new Event('input'));
  }
  // true if the key was consumed by the popup (navigation/accept/close).
  function handleSuggestKeydown(e) {
    if (!suggestOpen()) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggest(1); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggest(-1); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptSuggest(suggestItems[suggestActive][1]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); hideSuggest(); return true; }
    return false;
  }
  // Connects autocomplete to any textarea.
  function setupEmojiAutocomplete(ta) {
    ta.addEventListener('input', () => updateSuggest(ta));
    ta.addEventListener('blur', () => setTimeout(hideSuggest, 150));
  }

// ---- @file mention autocomplete (workspace files resolved by the extension) ----
  const fileSuggest = document.createElement('div');
  fileSuggest.id = 'fileSuggest';
  fileSuggest.className = 'hidden';
  document.body.appendChild(fileSuggest);
  let fileItems = [];   // relative paths
  let fileActive = 0;
  let fileTa = null;
  let fileReq = 0;      // matches async results to the latest query
  const fileOpen = () => !fileSuggest.classList.contains('hidden');

  // `@` followed by a partial path (no spaces) at the caret.
  function atQuery(ta) {
    const pos = ta.selectionStart;
    const m = ta.value.slice(0, pos).match(/(?:^|\s)@([^\s@]*)$/);
    return m ? { q: m[1], start: pos - m[1].length - 1 } : null;
  }
  function hideFiles() { fileSuggest.classList.add('hidden'); fileItems = []; }
  function renderFiles() {
    fileSuggest.innerHTML = '';
    fileItems.forEach((path, i) => {
      const name = path.split('/').pop();
      const dir = path.slice(0, path.length - name.length);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'sug-row file' + (i === fileActive ? ' active' : '');
      row.title = path;
      row.innerHTML = '<span class="sug-file">' + escapeHtml(name) + '</span>'
        + (dir ? '<span class="sug-path">' + escapeHtml(dir) + '</span>' : '');
      row.addEventListener('mousedown', (e) => { e.preventDefault(); acceptFile(path); });
      fileSuggest.appendChild(row);
    });
  }
  function positionFiles(ta) {
    const r = ta.getBoundingClientRect();
    fileSuggest.style.left = Math.round(r.left) + 'px';
    fileSuggest.style.bottom = Math.round(window.innerHeight - r.top + 4) + 'px';
  }
  function updateFiles(ta) {
    fileTa = ta;
    const c = atQuery(ta);
    if (!c) { hideFiles(); return; }
    vscode.postMessage({ type: 'atFiles', q: c.q, reqId: ++fileReq }); // resolved async by the extension
  }
  // Called when the extension returns matches.
  function onFileResults(q, files, reqId) {
    if (reqId !== fileReq || !fileTa) return;       // stale response
    const c = atQuery(fileTa);
    if (!c || c.q !== q) return;                    // query moved on
    fileItems = (files || []).slice(0, 10);
    if (!fileItems.length) { hideFiles(); return; }
    fileActive = 0;
    renderFiles();
    positionFiles(fileTa);
    fileSuggest.classList.remove('hidden');
  }
  function moveFiles(d) { fileActive = (fileActive + d + fileItems.length) % fileItems.length; renderFiles(); }
  function acceptFile(path) {
    const ta = fileTa;
    const c = ta && atQuery(ta);
    if (!ta || !c) { hideFiles(); return; }
    const pos = ta.selectionStart, v = ta.value;
    const insert = '@' + path + ' ';
    ta.value = v.slice(0, c.start) + insert + v.slice(pos);
    ta.selectionStart = ta.selectionEnd = c.start + insert.length;
    hideFiles();
    ta.focus();
    ta.dispatchEvent(new Event('input'));
  }
  function handleFileKeydown(e) {
    if (!fileOpen()) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFiles(1); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveFiles(-1); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptFile(fileItems[fileActive]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); hideFiles(); return true; }
    return false;
  }
  function setupFileAutocomplete(ta) {
    ta.addEventListener('input', () => updateFiles(ta));
    ta.addEventListener('blur', () => setTimeout(hideFiles, 150));
  }

// Wires the emoji button, the close-on-outside-click, and binds both autocompletes to the main input.
export function initAutocomplete() {
  emojiBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    buildEmojiPicker();
    emojiPicker.classList.toggle('hidden');
  });
  document.addEventListener('click', (ev) => {
    const tgt = /** @type {any} */ (ev.target);
    if (!emojiPicker.classList.contains('hidden') && !emojiPicker.contains(tgt) && tgt !== emojiBtn && !emojiBtn.contains(tgt)) {
      emojiPicker.classList.add('hidden');
    }
  });
  setupEmojiAutocomplete(inputEl);
  setupFileAutocomplete(inputEl);
}

export { setupEmojiAutocomplete, setupFileAutocomplete, handleSuggestKeydown, handleFileKeydown, onFileResults, insertAtCursor };
