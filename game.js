(() => {
  'use strict';

  const canvas = document.querySelector('#game-canvas');
  let ctx = canvas.getContext('2d');
  let viewWidth = canvas.width / 2;
  let viewHeight = canvas.height / 2;
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    coins: $('#coin-count'), level: $('#level-count'), realm: $('#realm-name'), objective: $('#objective'),
    state: $('#game-state'), tracker: $('#tracker-text'), chestCount: $('#chest-count'),
    score: $('#score-count'), highScore: $('#highscore-count'),
    hpHearts: $('#hp-hearts'), xpFill: $('#xp-fill'), xpText: $('#xp-text'),
    zoneWarning: $('#zone-warning'), zoneWarningTitle: $('#zone-warning-title'), zoneWarningText: $('#zone-warning-text'),
    bagCount: $('#bag-count'), bookCount: $('#book-count'), bagDialog: $('#bag-dialog'), bookDialog: $('#book-dialog'),
    bagGrid: $('#bag-grid'), bookGrid: $('#book-grid'), bagSummary: $('#bag-summary'), bookSummary: $('#book-summary'),
    shopInventory: $('#shop-inventory'), shopProducts: $('#shop-products'), styleDialog: $('#style-dialog'),
    styleGrid: $('#style-grid'),
    proximity: $('#npc-proximity'), proximityText: $('#proximity-text'), dialogueOptions: $('#dialogue-options'), dialogueHint: $('#dialogue-hint'),
    toast: $('#toast'),
    talk: $('#npc-dialogue'), shop: $('#shop-dialog'),
  };

  const DEFAULT_APPEARANCE = {
    shirt: '#bd6846', shirtDark: '#8e4938', hair: '#69452f', hat: '#765438', hatDark: '#493526',
    backpack: '#9b6939', backpackDark: '#65452e', pants: '#587a82', pantsDark: '#344e59', boots: '#614332', bootsDark: '#392b27',
    skin: '#e8bd91', hatStyle: 'adventurer', outfit: 'trail',
  };
  const DEFAULT_SAVE = {
    coins: 80, level: 1, shovel: false, slingshot: false, cocoa: 1, water: 1, highScore: 0,
    bag: [], discovered: {}, token: false, tokens: 0, tokenPayoutClaimed: false, ownedStyles: [], appearance: DEFAULT_APPEARANCE,
    xp: 0, upgrades: { damage: 0, hp: 0, bag: 0, boots: 0 },
    pirate: { spade: false, slingshot: false, outfit: false }, hatId: 'hat-default', outfitId: 'outfit-tunic',
  };
  let save = { ...DEFAULT_SAVE };
  try {
    const stored = JSON.parse(localStorage.getItem('skattejakt-save') || 'null');
    if (stored && typeof stored === 'object') save = { ...DEFAULT_SAVE, ...stored };
  } catch (_) { /* Spillet fungerer også når nettleseren blokkerer lokal lagring. */ }
  if (!Array.isArray(save.bag)) save.bag = [];
  if (!save.discovered || typeof save.discovered !== 'object') save.discovered = {};
  if (!Array.isArray(save.ownedStyles)) save.ownedStyles = [];
  save.appearance = { ...DEFAULT_APPEARANCE, ...(save.appearance || {}) };
  save.upgrades = { damage: 0, hp: 0, bag: 0, boots: 0, ...(save.upgrades || {}) };
  if (!Number.isFinite(save.xp)) save.xp = 0;
  save.pirate = { spade: false, slingshot: false, outfit: false, ...(save.pirate || {}) };

  const REALMS = {
    forest: { name: 'Den grønne skogen', unlock: 0, direction: 'Nord', width: 2500, height: 1900, ground: '#839c66', accent: '#d1dc9c', prop: 'tree' },
    autumn: { name: 'Høstskogen', unlock: 10, direction: 'Sør', width: 2500, height: 1900, ground: '#aa845d', accent: '#eac47a', prop: 'tree' },
    desert: { name: 'Sahara', unlock: 20, direction: 'Øst', width: 2550, height: 1950, ground: '#c4a66b', accent: '#f0d78f', prop: 'cactus' },
    snow: { name: 'Vinterlandet', unlock: 30, direction: 'Vest', width: 2500, height: 1950, ground: '#b7ccd0', accent: '#e5f2f1', prop: 'pine' },
  };
  const RARITIES = [
    { id: 'common', name: 'Common', color: '#96a37b', glow: '#d8e6a5' },
    { id: 'rare', name: 'Rare', color: '#65a7cf', glow: '#b6e2ff' },
    { id: 'epic', name: 'Epic', color: '#a876d5', glow: '#e3b4ff' },
    { id: 'legendary', name: 'Legendary', color: '#e0a53e', glow: '#ffe29a' },
  ];
  const ARTIFACTS = [
    { id: 'copper-key', name: 'Bøyd kobbernøkkel', rarity: 'Common', value: 8, desc: 'En gammel nøkkel med salt i sprekkene.', sprite: 'key', color: '#bd8750', accent: '#e2c27c' },
    { id: 'sea-glass', name: 'Sjøglasskule', rarity: 'Common', value: 10, desc: 'Sjøen har slipt glasset glatt og grønt.', sprite: 'marble', color: '#54aaa0', accent: '#a9e8d2' },
    { id: 'gull-feather', name: 'Måkefjær', rarity: 'Common', value: 12, desc: 'Lett som luft, med et lite sølvskjær.', sprite: 'feather', color: '#e8e0c8', accent: '#8db2a4' },
    { id: 'drift-charm', name: 'Drivved-amulet', rarity: 'Common', value: 15, desc: 'En liten lykkebringer skåret av drivved.', sprite: 'charm', color: '#a57445', accent: '#d0ae74' },
    { id: 'old-compass', name: 'Gammelt kompass', rarity: 'Rare', value: 32, desc: 'Nålen peker mot steder som ikke finnes på kartet.', sprite: 'compass', color: '#5595b8', accent: '#f0cf77' },
    { id: 'moon-shell', name: 'Måneskall', rarity: 'Rare', value: 38, desc: 'Skallet skinner svakt når månen står høyt.', sprite: 'shell', color: '#d68caa', accent: '#fff0c5' },
    { id: 'pocket-watch', name: 'Sjømannsur', rarity: 'Rare', value: 44, desc: 'Det tikker fortsatt, selv under vann.', sprite: 'watch', color: '#c6984e', accent: '#e8d99b' },
    { id: 'amber-lantern', name: 'Ravlykt', rarity: 'Rare', value: 48, desc: 'En bitte liten lykt med varmt ravlys.', sprite: 'lantern', color: '#df9d42', accent: '#fff0a8' },
    { id: 'sunken-crown', name: 'Den sunkne kronen', rarity: 'Epic', value: 95, desc: 'Kronen til en konge som forsvant i tåka.', sprite: 'crown', color: '#b47bd1', accent: '#f3d178' },
    { id: 'frost-vial', name: 'Frostglassflaske', rarity: 'Epic', value: 110, desc: 'Inni flasken virvler en snøstorm rundt.', sprite: 'vial', color: '#75b8cf', accent: '#e7f7ff' },
    { id: 'sand-scarab', name: 'Skarabé av sandstein', rarity: 'Epic', value: 125, desc: 'En ørkenamulett eldre enn Sahara selv.', sprite: 'scarab', color: '#449579', accent: '#e2bf66' },
    { id: 'tide-map', name: 'Kart over tidevann', rarity: 'Epic', value: 145, desc: 'Kartet forandrer seg med hver bølge.', sprite: 'map', color: '#7097bd', accent: '#f0d486' },
    { id: 'deep-heart', name: 'Havets hjerte', rarity: 'Legendary', value: 320, desc: 'En krystall som pulserer med lyset fra havet.', sprite: 'heart', color: '#d45669', accent: '#88d5da' },
    { id: 'phoenix-coin', name: 'Føniksens mynt', rarity: 'Legendary', value: 370, desc: 'Mynten er alltid varm og vender aldri feil vei.', sprite: 'phoenix', color: '#e47e39', accent: '#ffe07a' },
    { id: 'star-locket', name: 'Stjernefall-medaljong', rarity: 'Legendary', value: 430, desc: 'En bit av nattehimmelen fanget i gull.', sprite: 'star', color: '#7183d2', accent: '#fff1a4' },
    { id: 'pirate-emblem', name: 'Den tapte sjørøverlogoen', rarity: 'Legendary', value: 520, desc: 'Kapteinens emblem fra det siste store toktet.', sprite: 'emblem', color: '#8b5d36', accent: '#edc461' },
  ];
  const GEAR_ITEMS = [
    { id: 'shovel', name: 'Spade', desc: 'Grav opp kister fra jord med X', icon: '⛏️', price: 55 },
    { id: 'slingshot', name: 'Sprettert', desc: 'Skyt kister ned fra trærne', icon: '🏹', price: 65 },
    { id: 'cocoa', name: 'Varm kakao', desc: 'Holder deg varm i Vinterlandet', icon: '☕', price: 25, consumable: true },
    { id: 'water', name: 'Kaldt vann', desc: 'Kjøler deg ned i Sahara', icon: '🧴', price: 25, consumable: true },
  ];
  const UPGRADE_ITEMS = [
    { id: 'damage', name: 'Våpenskade', desc: 'Hakk hardere på ville dyr', icon: '⚔️', basePrice: 180, maxLevel: 10 },
    { id: 'hp', name: 'Maks helse', desc: 'Legg til to ekstra hjerter', icon: '❤️', basePrice: 220, maxLevel: 5 },
    { id: 'bag', name: 'Ryggsekk-plass', desc: 'Plass til 4 skatter til i sekken', icon: '🎒', basePrice: 150, maxLevel: 5 },
    { id: 'boots', name: 'Løpefart', desc: 'Løp litt raskere i alle soner', icon: '🥾', basePrice: 160, maxLevel: 10 },
  ];
  const BAG_BASE_SLOTS = 12;
  const BAG_SLOTS_PER_LEVEL = 4;
  const STYLE_ITEMS = [
    { id: 'hat-default', name: 'Standard Eventyrhatt', slot: 'hat', icon: '🤠', price: 0, apply: { hat: '#765438', hatDark: '#493526', hatStyle: 'adventurer' } },
    { id: 'hat-redcap', name: 'Rød Caps', slot: 'hat', icon: '🧢', price: 50, apply: { hat: '#c44a42', hatDark: '#7d2a2a', hatStyle: 'redcap' } },
    { id: 'hat-cowboy', name: 'Cowboyhatt', slot: 'hat', icon: '🤠', price: 150, apply: { hat: '#a8794a', hatDark: '#6c4a2b', hatStyle: 'cowboy' } },
    { id: 'hat-viking', name: 'Vikinghjelm', slot: 'hat', icon: '🪖', price: 300, apply: { hat: '#aab2b8', hatDark: '#5f676d', hatStyle: 'viking' } },
    { id: 'hat-crown', name: 'Gullkrone', slot: 'hat', icon: '👑', price: 600, apply: { hat: '#e0b94e', hatDark: '#906b28', hatStyle: 'crown' } },
    { id: 'hat-pirate', name: 'Pirathatt', slot: 'hat', icon: '🏴‍☠️', price: 0, token: true, apply: { hat: '#2f2a33', hatDark: '#16131a', hatStyle: 'pirate' } },
    { id: 'outfit-tunic', name: 'Grønn Tunika', slot: 'outfit', icon: '👕', price: 0, apply: { shirt: '#5f8f54', shirtDark: '#3d6038', outfit: 'tunic' } },
    { id: 'outfit-blue', name: 'Blå Utforskerjakke', slot: 'outfit', icon: '🧥', price: 100, apply: { shirt: '#4f87b4', shirtDark: '#30587a', outfit: 'coat' } },
    { id: 'outfit-red', name: 'Rød Eventyrfrakk', slot: 'outfit', icon: '🧥', price: 250, apply: { shirt: '#b7473f', shirtDark: '#7d2d2b', outfit: 'redcoat' } },
    { id: 'outfit-armor', name: 'Gullrustning', slot: 'outfit', icon: '🛡️', price: 500, apply: { shirt: '#d9b44f', shirtDark: '#9a762c', outfit: 'armor' } },
    { id: 'outfit-pirate', name: 'Piratfrakk', slot: 'outfit', icon: '🏴‍☠️', price: 0, token: true, apply: { shirt: '#7c2d33', shirtDark: '#4a1a20', outfit: 'piratecoat' } },
  ];
  const PIRATE_TOKEN = { id: 'pirate-token', name: 'Pirate Token', rarity: 'Legendary', value: 0, desc: 'En glitrende gullmynt med dødningshode. Kapteinen gir deg noe spesielt for den.', sprite: 'tokencoin', color: '#f0c545', accent: '#fff2a0' };
  const CHEST_ODDS = {
    forest: { rare: .035, epic: .0005, legendary: .00005 },
    autumn: { rare: .38, epic: .12, legendary: .003 },
    desert: { rare: .37, epic: .42, legendary: .08 },
    snow: { rare: .22, epic: .53, legendary: .22 },
  };
  const TOKEN_CHANCE = { Epic: .001, Legendary: .005 };
  const ARTIFACT_PIXELS = {
    key: ['....kk..', '...kmmk.', '...kmhk.', '....kk..', '.....k..', '...kkk..', '.....k..', '.....kk.'],
    marble: ['..kkkk..', '.kmmmmk.', 'kmmhhmmk', 'kmhmhmmk', 'kmmmmmmk', '.kmmmmk.', '..kkkk..', '........'],
    feather: ['......kk', '.....kmm', '....kmmk', '...kmmk.', '..kmmk...', '.kmmk....', 'kmmk.....', 'kk.......'],
    charm: ['...kkkk.', '..kmmmk..', '.kmmhmmk.', '.kmmmmmk.', '..kmmmk..', '...kkk...', '....k....', '...kkk...'],
    compass: ['..kkkk..', '.kmmmmk.', 'kmmhmmmk', 'kmmkhmmk', 'kmmhmmmk', '.kmmmmk.', '..kkkk..', '...aa...'],
    shell: ['...kkk..', '..kmmmk.', '.kmmmmmk', 'kmmhmmmk', 'kmmkkmmk', '.kmmmk..', '..kkk...', '........'],
    watch: ['..kkkk..', '.kmmmmk.', 'kmmhmmmk', 'kmmkkmmk', 'kmmhmmmk', '.kmmmmk.', '..kmmk..', '...kk...'],
    lantern: ['...kk...', '..kmmk..', '.kmaamk.', '.kmaamk.', '.kmaamk.', '..kmmk..', '..kmmk..', '...kk...'],
    crown: ['k......k', 'kk....kk', 'kmmkkmmk', 'kmmmmmmk', '.kmmmmk.', '.kmmhmmk', '.kkkkkk.', '........'],
    vial: ['...kk...', '..kmmk..', '..kmah..', '..kmmmk.', '..kmmmk.', '..kmmmk.', '...kkk..', '....k...'],
    scarab: ['..kmmk..', '.kmmmmk.', 'kmaahmmk', 'kmmmmmmk', '.kmmmmk.', '..kmmk..', '.kk..kk.', '........'],
    map: ['.kkkkkk.', 'kmmmmmmk', 'kmahmmmk', 'kmmhmmmk', 'kmmmamkk', 'kmmmmmmk', '.kkkkkk.', '...aa...'],
    heart: ['.kk..kk.', 'kmmkkmmk', 'kmmmmmmk', '.kmmmmk.', '..kmmk..', '...kk...', '....k...', '........'],
    phoenix: ['...k....', '..kamk..', '.kmmmk..', 'kmmhmmk.', '.kmmmmmk', '..kmmmk.', '.kk.k.k.', 'k..k..k.'],
    star: ['...k....', '..kmk...', 'kkmmmkk.', '.kmmmk..', 'kkmmmkk.', '..kmk...', '.kk.kk..', '........'],
    tokencoin: ['..kkkk..', '.kmmmmk.', 'kmhmmhmk', 'kmmkkmmk', 'kmmhhmmk', 'kmkmmkmk', '.kmmmmk.', '..kkkk..'],
    emblem: ['..kkkk..', '.kmmmmk.', 'kmmkkmmk', 'kmmhmmmk', 'kmmkkmmk', '.kmmmmk.', '..kkkk..', '...aa...'],
  };
  const GATES = [
    { realm: 'forest', x: 480, y: 55, label: 'SKOG', direction: 'N' },
    { realm: 'autumn', x: 480, y: 520, label: 'HØSTSKOG', direction: 'S' },
    { realm: 'desert', x: 900, y: 285, label: 'SAHARA', direction: 'E' },
    { realm: 'snow', x: 60, y: 285, label: 'VINTER', direction: 'W' },
  ];
  const HOUSE_DOOR = { x: 465, y: 256 };
  const SHOP_DOOR = { x: 640, y: 282 };
  const STYLE_DOOR = { x: 285, y: 252 };
  const LOBBY_OBSTACLES = [
    { x: 748, y: 200, radius: 30 },
    { x: 748, y: 380, radius: 27 }, { x: 205, y: 380, radius: 26 },
    { x: 342, y: 247, radius: 11 }, { x: 572, y: 370, radius: 13 },
    { x: 370, y: 383, radius: 12 }, { x: 570, y: 200, radius: 10 },
  ];
  const LOBBY_NPCS = [
    { id: 'milo', name: 'Milo', avatar: '🧑🏻‍🌾', x: 355, y: 322, phase: 0, pace: .11, route: [{ x: 336, y: 322 }, { x: 370, y: 318 }, { x: 392, y: 346 }, { x: 350, y: 355 }], nearbyLine: 'Milo vinker deg bort.', shirt: '#658b70', hat: '#79553a',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#668a55', shirtDark: '#3d5b3c', hair: '#70492f', skin: '#edc6a1', hat: '#527545', hatDark: '#334c35', hatStyle: 'cap', backpack: '#a36844', outfit: 'trail' },
      greeting: 'Hei, eventyrer! Så hyggelig å møte deg. Jeg heter Milo. Velkommen til Havneøya!', topics: [
        { label: 'Har du et tips til meg?', answer: 'Gjerne! En spade graver opp kister under jorda, og en sprettert får ned kister fra tretoppene.' },
        { label: 'Hva bør jeg ta med?', answer: 'Ta med vann til varme Sahara og kakao til kalde Vinterlandet. Utstyrsbua ligger rett borti gata.' },
        { label: 'Hvor går veiene?', answer: 'Skogen ligger nord, Høstskogen sør, Sahara øst og Vinterlandet vest. Portene viser hvilket nivå du trenger.' },
      ] },
    { id: 'tessa', name: 'Tessa', avatar: '🧑🏽‍🍳', x: 658, y: 310, phase: 2.1, pace: .06, route: [{ x: 650, y: 325 }, { x: 683, y: 328 }, { x: 690, y: 310 }, { x: 650, y: 314 }], nearbyLine: 'Tessa peker mot døra til Utstyrsbua.', shirt: '#c88055', hat: '#8f573e',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#d17b4e', shirtDark: '#934939', hair: '#49352e', skin: '#bd805b', hat: '#ead1a0', hatDark: '#ad8b60', hatStyle: 'chef', backpack: '#76553f', outfit: 'apron' },
      greeting: 'Hei hei! Velkommen til utstyrsbua. Skal jeg vise deg hva vi har på lager?', topics: [
        { label: 'Hva selger du her?', answer: 'Spader, spretterter, kakao og vann. Alt en eventyrer trenger for å passe på seg selv og finne skatter.' },
        { label: 'Jeg vil se på varene.', answer: 'Så klart! Kom inn i Utstyrsbua, så skal jeg vise deg hyllene.', action: 'enter-store' },
      ] },
    { id: 'jens', name: 'Jens Jungmann', avatar: '🧑🏼‍✈️', x: 526, y: 390, phase: 4.2, pace: .1, route: [{ x: 505, y: 378 }, { x: 548, y: 390 }, { x: 545, y: 415 }, { x: 507, y: 410 }], nearbyLine: 'Jens speider etter spor langs stien.', shirt: '#688db1', hat: '#66523d',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#557f9c', shirtDark: '#345269', hair: '#302b28', skin: '#e4c3a0', hat: '#547f9a', hatDark: '#354e5d', hatStyle: 'sailor', pants: '#594c40', outfit: 'sailor' },
      greeting: 'God dag, kaptein! Har du hørt siste nytt fra øya?', topics: [
        { label: 'Har du hørt om Pirate Token?', answer: 'Ryktet sier at en gylden Pirate Token kan ligge i en Epic eller Legendary kiste. Kapteinen i Havnehuset belønner den som finner den!' },
        { label: 'Er det noe spesielt med kistene?', answer: 'Hver kiste gjemmer en egen artefakt. Se på oppslagstavla i Havnehuset for sjansene i hver sone.' },
      ] },
    { id: 'old-sailor', name: 'Gamle Birk', avatar: '🧓🏻⚓', x: 154, y: 422, phase: 2.8, pace: .07,
      route: [{ x: 128, y: 414 }, { x: 157, y: 422 }, { x: 178, y: 416 }, { x: 151, y: 405 }], nearbyLine: 'Birk nynner en gammel sjørøversang.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#b56f4e', shirtDark: '#744634', hair: '#d0c3a3', skin: '#e5bc98', hat: '#d1b075', hatDark: '#816441', hatStyle: 'bonnet', pants: '#53656b', outfit: 'vest' },
      greeting: 'He-hei, landkrabbe! Jeg har seilt på disse vannene siden før du kunne gå.', topics: [
        { label: 'Har du et hint om kister?', answer: 'Følg grusstiene, men se også ved steinene. De gamle sjøfolkene gravde gjerne ned ting ved landemerker.' },
        { label: 'Hva er det med båten din?', answer: 'Den har sett flere stormer enn jeg kan telle. Akkurat som skattene, har den noen hemmeligheter.' },
      ] },
    { id: 'warden', name: 'Skogvokter Runa', avatar: '🧑🏾‍🌾', x: 325, y: 423, phase: 5.1, pace: .08,
      route: [{ x: 294, y: 412 }, { x: 329, y: 425 }, { x: 352, y: 400 }, { x: 320, y: 387 }], nearbyLine: 'Runa følger med på stiene og skogkanten.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#52784e', shirtDark: '#344f37', hair: '#272d28', skin: '#9f694d', hat: '#778849', hatDark: '#455636', hatStyle: 'cap', backpack: '#6c4932', outfit: 'cape' },
      greeting: 'Stiene er rolige i dag, men hold øynene åpne. Skogen skjuler mer enn bare kister.', topics: [
        { label: 'Er det farer på stiene?', answer: 'Ja. Jeg har sett feller ved steinete steder og mørke busker. Følg med på bakken når du utforsker.' },
        { label: 'Kan du peke ut sjeldne skatter?', dynamic: 'hint' },
      ] },
  ];
  const HOUSE_NPCS = [
    { id: 'keeper', name: 'Kaja Kasserer', avatar: '👩🏻‍💼', x: 680, y: 315, phase: 1.4, pace: .04, route: [{ x: 674, y: 315 }, { x: 688, y: 315 }, { x: 688, y: 320 }, { x: 674, y: 320 }], nearbyLine: 'Kaja løfter blikket fra kassa.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#a77755', shirtDark: '#694733', hair: '#76533c', skin: '#e9bd91', hat: '#d8c69b', hatDark: '#93805b', hatStyle: 'bonnet', outfit: 'vest' },
      greeting: 'Velkommen til Havnehuset! Jeg kjøper gjerne skattene du har funnet.', topics: [
        { label: 'Selg skattene i sekken min', action: 'sell' },
        { label: 'Hvor sjelden er skatten min?', dynamic: 'rarity' },
        { label: 'Hva kan jeg gjøre her?', answer: 'Her kan du sjekke samlingen din og selge sikrede artefakter. Det er bare å spørre meg.' },
        { label: 'La meg kikke rundt', action: 'dismiss' },
      ] },
    { id: 'archivist', name: 'Oda Arkivar', avatar: '👩🏽‍🏫', x: 287, y: 300, phase: 3.5, pace: .05, route: [{ x: 275, y: 300 }, { x: 294, y: 300 }, { x: 294, y: 322 }, { x: 275, y: 322 }], nearbyLine: 'Oda blar rolig gjennom et gammelt kart.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#8763a6', shirtDark: '#57406e', hair: '#bd7146', skin: '#c99068', hat: '#714d81', hatDark: '#463655', hatStyle: 'wizard', outfit: 'coat' },
      greeting: 'Jeg passer på gamle sjøkart og historier om skattene.', topics: [
        { label: 'Hva betyr sjeldenheten?', answer: 'Common er vanligst. Rare og Epic dukker sjeldnere opp, mens Legendary er den vanskeligste av de fire.' },
        { label: 'Kan jeg beholde samlingen?', answer: 'Alt du oppdager blir registrert i Skatteboka, selv om du senere selger gjenstanden.' },
      ] },
  ];
  HOUSE_NPCS.push(
    { id: 'captain', name: 'Kaptein Brann', avatar: '🧔🏻‍✈️', x: 745, y: 262, phase: 2.2, pace: .035, route: [{ x: 745, y: 262 }, { x: 760, y: 262 }, { x: 760, y: 266 }, { x: 745, y: 266 }], nearbyLine: 'Kapteinen stryker skjegget og myser mot deg.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#2f4f73', shirtDark: '#1f3550', hair: '#d8d2c4', skin: '#d9a97f', hat: '#26354f', hatDark: '#162235', hatStyle: 'pirate', pants: '#3a3a42', outfit: 'piratecoat' },
      greeting: 'Arrr! Jeg er Kaptein Brann. Har du kanskje funnet en gylden Pirate Token?', topics: [
        { label: 'Her er Pirate Token!', action: 'pirate-unlock' },
        { label: 'Hva får jeg for tokenet?', answer: 'Super Spade som graver dobbelt så raskt og gir 25 % ekstra på funnene, en sprettert til å skyte på dyr, og en ekte piratdrakt!' },
        { label: 'Hvor finner jeg en token?', answer: 'Den ligger i sjeldne kister, 0,1 % i Epic og 0,5 % i Legendary. Les tavla bak meg!' },
      ] },
    { id: 'board', object: true, static: true, name: 'Oppslagstavla', avatar: '📜', x: 480, y: 178, phase: 0, nearbyLine: 'Oppslagstavla: kister, soner og ryktet om Pirate Token.',
      greeting: 'OPPSLAGSTAVLA · ETTERLYST: SKATTEJEGERE! Hva vil du lese om?', topics: [
        { label: 'Kistetyper', answer: 'Common er vanligst. Rare, Epic og Legendary blir stadig sjeldnere og mer verdt.' },
        { label: 'Sjanser per sone', dynamic: 'odds' },
        { label: 'Rykte: Pirate Token', answer: 'Ryktet sier at en gylden Pirate Token kan ligge i Epic (0,1 %) og Legendary (0,5 %) kister. Lever den til kapteinen for Super Spade, sprettert og piratdrakt!' },
      ] },
  );
  const STYLE_NPCS = [
    { id: 'clerk', name: 'Lilje', avatar: '👩🏼‍🎤', x: 690, y: 302, phase: 1.1, pace: .05, route: [{ x: 690, y: 302 }, { x: 710, y: 302 }, { x: 710, y: 308 }, { x: 690, y: 308 }], nearbyLine: 'Lilje retter på en hatt ved disken.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#d46b9a', shirtDark: '#8e3d63', hair: '#6d3ba0', skin: '#f0c9a3', hat: '#f3d36b', hatDark: '#b99532', hatStyle: 'cowboy', outfit: 'tunic' },
      greeting: 'Velkommen til Klesbutikken! Gå bort til speilet eller disken for å prøve noe nytt.', topics: [
        { label: 'Vis meg garderoben', action: 'wardrobe' },
        { label: 'Hva er mest spesielt her?', answer: 'Pirathatten og piratfrakken får du bare gratis om du har funnet en Pirate Token. Gullkrona er dyrest ellers!' },
        { label: 'La meg kikke rundt', action: 'dismiss' },
      ] },
  ];
  const STORE_NPCS = [
    { id: 'tessa-inside', name: 'Tessa', avatar: '🧑🏽‍🍳', x: 690, y: 305, phase: 1.8, pace: .04, route: [{ x: 690, y: 305 }, { x: 701, y: 305 }, { x: 701, y: 310 }, { x: 690, y: 310 }], nearbyLine: 'Tessa gjør klar varene i hyllene.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#d17b4e', shirtDark: '#934939', hair: '#49352e', skin: '#bd805b', hat: '#ead1a0', hatDark: '#ad8b60', hatStyle: 'chef', outfit: 'apron' },
      greeting: 'Hei igjen! Velkommen inn. Her har jeg utstyr og noen skikkelig kule antrekk.', topics: [
        { label: 'Vis meg utstyret', action: 'shop-gear' },
        { label: 'Hvor finner jeg klær og hatter?', answer: 'Klesbutikken ligger i nordvest på øya. Der kan du prøve hatter og frakker i speilet!' },
        { label: 'Hva er oppgraderinger?', answer: 'Under Oppgraderinger får du skarpere våpen, flere hjerter, større ryggsekk og raskere støvler. Prisen stiger for hvert nivå.' },
        { label: 'Reagerer folk på skattene mine?', dynamic: 'rarity' },
        { label: 'La meg kikke rundt', action: 'dismiss' },
      ] },
    { id: 'shop-helper', name: 'Pip', avatar: '🧑🏼‍🔧', x: 370, y: 330, phase: 4.6, pace: .07, route: [{ x: 350, y: 325 }, { x: 385, y: 325 }, { x: 385, y: 350 }, { x: 350, y: 350 }], nearbyLine: 'Pip legger varer pent på plass.',
      appearance: { ...DEFAULT_APPEARANCE, shirt: '#4e8990', shirtDark: '#315b60', hair: '#b5814a', skin: '#e9c8a3', hat: '#b3a66d', hatDark: '#706640', hatStyle: 'cap', outfit: 'vest' },
      greeting: 'Jeg holder hyllene fulle. Noen varer er dyre, men de kule hattene er verdt det!', topics: [
        { label: 'Hva er det dyreste du har?', answer: 'Spaden og spretterten betaler seg fort. Og vil du se kul ut, er Klesbutikken i nordvest en tur verdt!' },
      ] },
  ];
  const TOKEN_BROKER = {
    id: 'token-broker', name: 'Myntemegleren', avatar: '🧔🏽‍💼', x: 850, y: 282, phase: 5.4,
    appearance: { ...DEFAULT_APPEARANCE, shirt: '#d5b54c', shirtDark: '#89662e', hair: '#49392f', skin: '#b87a53', hat: '#e0bf54', hatDark: '#8d6d2d', hatStyle: 'crown', outfit: 'royal' },
    greeting: 'Du fant Pirate Token! Jeg kan tilby deg én million mynter for flaksen din.',
    topics: [
      { label: 'Ta imot 1 000 000 mynter', action: 'million' },
      { label: 'Jeg vil beholde tokenet mitt', answer: 'Klokt valg! Du beholder tokenet og får fortsatt tilgang til spader og spretterter.' },
    ],
  };

  const game = {
    mode: 'lobby', selectedRealm: 'forest', realm: 'forest', world: null,
    player: { x: 480, y: 350, facing: 'down', moving: false },
    props: [], chests: [], worldNpcs: [], traps: [], animals: [], keys: new Set(), totalChests: 0, found: 0, rivalFound: 0,
    runBag: [], score: 0, hp: 5, warmth: 100, exposureClock: 0, lastTick: 0,
    frame: 0, hudClock: 0, toastTimeout: 0, sound: true, talkingTo: null, bookFilter: 'all', effects: [],
    proximityNpcId: null, dialogueTarget: '', dialogueShown: '', dialogueOptions: [], dialogueAfterTyping: [], dialogueClock: 0,
    interior: null, interiorReturnPosition: null, shopTab: 'gear', styleTab: 'hat', styleSelected: null, styleZone: false, projectiles: [], dig: null,
    tokenNpc: save.token && !save.tokenPayoutClaimed ? { x: 750, y: 340 } : null,
    attackTimer: 0, attackCooldown: 0, warningTimeout: 0, gateToastAt: -99,
  };
  game.hp = maxHp();

  function saveGame() {
    try { localStorage.setItem('skattejakt-save', JSON.stringify(save)); } catch (_) { /* Ikke kritisk for spillet. */ }
  }

  function ownedStyle(id) { const item = STYLE_ITEMS.find((entry) => entry.id === id); return Boolean(item && (item.price === 0 && !item.token || save.ownedStyles.includes(id) || (item.token && save.pirate.outfit))); }
  function applyEquipped() {
    const hat = STYLE_ITEMS.find((item) => item.id === save.hatId && ownedStyle(item.id)) || STYLE_ITEMS[0];
    const outfit = STYLE_ITEMS.find((item) => item.id === save.outfitId && ownedStyle(item.id)) || STYLE_ITEMS.find((item) => item.id === 'outfit-tunic');
    save.hatId = hat.id; save.outfitId = outfit.id;
    save.appearance = { ...DEFAULT_APPEARANCE, ...hat.apply, ...outfit.apply };
  }
  applyEquipped();

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function unlocked(realm) { return save.level >= REALMS[realm].unlock; }
  function hasTool(tool) { return Boolean(save[tool] || (tool === 'shovel' && save.pirate.spade) || (tool === 'slingshot' && save.pirate.slingshot)); }
  function xpForNextLevel(level = save.level) { return 100 + Math.max(0, level - 1) * 35; }
  function maxHp() { return 5 + Math.min(5, save.upgrades?.hp || 0) * 2; }
  function weaponDamage() { return 24 + (save.upgrades?.damage || 0) * 14; }
  function movementSpeed() { return 210 + (save.upgrades?.boots || 0) * 18; }
  function bagCapacity() { return BAG_BASE_SLOTS + (save.upgrades?.bag || 0) * BAG_SLOTS_PER_LEVEL; }
  function bagUsed() { return save.bag.length + game.runBag.length; }
  function bagFull() { return bagUsed() >= bagCapacity(); }
  function warnBagFull() { toast(`Ryggsekken er full (${bagUsed()}/${bagCapacity()})! Gå hjem og selg til Kaja, eller kjøp mer plass i Utstyrsbua.`, 3600); }
  function expeditionChestCount(level) { return 1 + Math.floor(Math.random() * 6) + Math.floor((level - 1) * 1.45); }

  function toast(message, duration = 3000) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    window.clearTimeout(game.toastTimeout);
    game.toastTimeout = window.setTimeout(() => ui.toast.classList.remove('show'), duration);
  }

  function showZoneWarning(realmId) {
    const messages = {
      autumn: 'En stor bjørn patruljerer de beste funnene. Ikke gå for nær!',
      desert: 'En gigantisk skorpion jager deg på kort og middels avstand. Ta med vann!',
      snow: 'Den aggressive vinterulven løper etter deg så snart du går inn i området. Ta med kakao!',
    };
    if (!messages[realmId]) return;
    ui.zoneWarningTitle.textContent = `⚠️ ADVARSEL: Farlig sone! · ${REALMS[realmId].name.toUpperCase()}`;
    ui.zoneWarningText.textContent = `Større sjanse for Epic & Legendary kister – pass opp for ville dyr! ${messages[realmId]}`;
    ui.zoneWarning.dataset.zone = realmId;
    ui.zoneWarning.classList.remove('hidden');
    window.clearTimeout(game.warningTimeout);
    game.warningTimeout = window.setTimeout(() => ui.zoneWarning.classList.add('hidden'), 5200);
  }

  function renderHealth() {
    const max = maxHp();
    const current = clamp(game.hp, 0, max);
    ui.hpHearts.replaceChildren();
    for (let i = 0; i < max; i++) {
      const heart = document.createElement('span');
      heart.className = `hp-heart${i < Math.floor(current) ? ' full' : i < current ? ' half' : ' empty'}`;
      heart.textContent = i < current ? '♥' : '♡';
      ui.hpHearts.append(heart);
    }
    const target = xpForNextLevel();
    ui.xpText.textContent = `${Math.floor(save.xp)} / ${target} XP`;
    ui.xpFill.style.width = `${clamp(save.xp / target * 100, 0, 100)}%`;
  }

  function awardXP(amount, reason) {
    if (amount <= 0) return;
    save.xp += amount;
    let levelsGained = 0;
    while (save.xp >= xpForNextLevel() && save.level < 100) {
      save.xp -= xpForNextLevel();
      save.level++;
      levelsGained++;
    }
    saveGame(); updateUI();
    toast(levelsGained ? `Nivå opp! Du er nå nivå ${save.level}.` : `+${amount} XP · ${reason}`, 2200);
  }

  function takeDamage(amount, source) {
    if (game.mode !== 'run' || amount <= 0) return;
    game.hp = Math.max(0, game.hp - amount);
    updateUI();
    toast(`${source} traff deg! −${amount} hjerte${amount === 1 ? '' : 'r'}.`, 1800);
    if (game.hp <= 0) respawnAtHouse();
  }

  function respawnAtHouse() {
    const lostCoins = Math.min(save.coins, Math.ceil(save.coins * .1));
    save.coins -= lostCoins;
    game.runBag = [];
    game.world = null; game.worldNpcs = []; game.traps = []; game.animals = []; game.projectiles = []; game.dig = null;
    game.mode = 'interior'; game.interior = 'house';
    game.interiorReturnPosition = { x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 29 };
    game.player = { x: 480, y: 445, facing: 'up', moving: false };
    game.hp = maxHp(); game.warmth = 100; game.proximityNpcId = null; game.talkingTo = null; game.score = 0; game.effects = [];
    game.keys.clear(); ui.proximity.classList.add('hidden');
    [ui.talk, ui.shop, ui.bagDialog, ui.bookDialog, ui.styleDialog].forEach((overlay) => overlay.classList.add('hidden'));
    saveGame(); updateUI();
    toast(`Du våknet i Havnehuset. Du mistet ${lostCoins} mynter og usikrede skatter.`, 4000);
    openNpcDialogue({ ...HOUSE_NPCS[0], greeting: 'Du er trygg her inne. Kaja hjalp deg tilbake fra villmarka.' });
  }

  function rarityForLevel(level, realm = 'forest') {
    const roll = Math.random();
    const odds = CHEST_ODDS[realm] || CHEST_ODDS.forest;
    const levelBonus = realm === 'forest' ? 0 : Math.min(level, 50) * .00015;
    const legendary = Math.min(.95, odds.legendary + levelBonus);
    const epic = Math.min(.98, legendary + odds.epic);
    const rare = Math.min(.995, epic + odds.rare);
    if (roll < legendary) return RARITIES[3];
    if (roll < epic) return RARITIES[2];
    if (roll < rare) return RARITIES[1];
    return RARITIES[0];
  }

  function artifactForRarity(rarity) {
    const choices = ARTIFACTS.filter((artifact) => artifact.rarity === rarity.name);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function findLandingSpot(tree, props, realm) {
    const reach = (tree.radius || 23) + 26;
    const angles = [Math.PI / 2, Math.PI * .72, Math.PI * .28, Math.PI, 0, Math.PI * 1.25, Math.PI * 1.75];
    const spots = angles.map((angle) => ({ x: tree.x + Math.cos(angle) * reach, y: tree.y + Math.sin(angle) * reach * .8 + 8 }));
    const clear = (spot) => spot.x > 40 && spot.y > 40 && spot.x < realm.width - 40 && spot.y < realm.height - 40
      && !props.some((prop) => prop !== tree && prop.radius && distance(spot, prop) < prop.radius + 16);
    return spots.find(clear) || spots[0];
  }

  function generateWorld(realmId, chestCount) {
    const realm = REALMS[realmId];
    const props = [];
    const player = { x: realm.width * 0.5, y: realm.height * 0.52, facing: 'down', moving: false };
    const propCount = realmId === 'forest' ? 132 : 110;
    for (let i = 0; i < propCount; i++) {
      const x = 55 + Math.random() * (realm.width - 110);
      const y = 55 + Math.random() * (realm.height - 110);
      if (distance({ x, y }, player) < 180) continue;
      const typeRoll = Math.random();
      const type = typeRoll < (realmId === 'desert' ? 0.45 : 0.63) ? realm.prop : typeRoll < 0.8 ? 'rock' : 'grass';
      props.push({ x, y, type, size: 0.72 + Math.random() * 0.64, shade: Math.floor(Math.random() * 3), radius: type === 'rock' ? 20 : type === 'grass' ? 0 : 23 });
    }

    const candidates = props.filter((prop) => ['tree', 'pine', 'cactus'].includes(prop.type) && distance(prop, player) > 260);
    const chests = [];
    for (let i = 0; i < chestCount; i++) {
      const roll = Math.random();
      let kind = save.level <= 1 && i === 0 ? 'ground' : roll < 0.2 ? 'buried' : roll < 0.38 ? 'tree' : 'ground';
      if (kind === 'tree' && !candidates.length) kind = 'ground';
      let point;
      let parent = null;
      let perch = null;
      let landing = null;
      if (kind === 'tree') {
        parent = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
        perch = { x: parent.x, y: parent.y - (parent.type === 'cactus' ? 24 : 35) * parent.size };
        landing = findLandingSpot(parent, props, realm);
        point = { ...perch };
      } else {
        let attempt = 0;
        do {
          point = { x: 80 + Math.random() * (realm.width - 160), y: 80 + Math.random() * (realm.height - 160) };
          attempt++;
        } while (attempt < 60 && (distance(point, player) < 260 || props.some((prop) => prop.radius && distance(point, prop) < prop.radius + 46) || chests.some((chest) => distance(point, chest) < 100)));
      }
      chests.push({ ...point, kind, parent, perch, landing, state: kind === 'ground' ? 'ready' : 'hidden', rarity: rarityForLevel(save.level, realmId), opened: false, id: i });
    }
    const trapCount = realmId === 'forest' ? 0 : Math.min(7, 2 + Math.floor(save.level / 5));
    const traps = [];
    for (let i = 0; i < trapCount; i++) {
      let point;
      let attempt = 0;
      do {
        point = { x: 100 + Math.random() * (realm.width - 200), y: 100 + Math.random() * (realm.height - 200) };
        attempt++;
      } while (attempt < 50 && (distance(point, player) < 450 || props.some((prop) => prop.radius && distance(point, prop) < prop.radius + 34)));
      traps.push({ ...point, triggered: false, id: i });
    }
    const exitPortal = { x: realm.width * .5, y: 74 };
    return { ...realm, id: realmId, props, chests, traps, exitPortal, player };
  }

  function createWorldNpcs(world) {
    const { width, height } = world;
    const centerX = width / 2;
    const centerY = height / 2;
    return [
      {
        id: 'rival', rival: true, name: 'Jens Skattespore', avatar: '🧑🏼‍✈️', x: centerX + 300, y: centerY + 120, phase: 1.8,
        nearbyLine: 'Jens har fått syn på ett av skattekartene.',
        appearance: { ...DEFAULT_APPEARANCE, shirt: '#557f9c', shirtDark: '#345269', hair: '#302b28', skin: '#e4c3a0', hat: '#547f9a', hatDark: '#354e5d', hatStyle: 'sailor', pants: '#594c40', outfit: 'sailor' },
        greeting: 'Jens her! Jeg har allerede funnet flere spor enn deg. Klar for et lite kappløp?',
        topics: [
          { label: 'Har du sett en sjelden kiste?', dynamic: 'hint' },
          { label: 'Pass deg for feller', dynamic: 'trap' },
          { label: 'Lykke til med jakten!', answer: 'Takk! Førstemann til neste kiste. Ikke bli hengende etter!' },
        ],
      },
      {
        id: 'map-warden', name: world.id === 'snow' ? 'Fjellvokter Runa' : 'Skogvokter Runa', avatar: '🧑🏾‍🌾',
        x: centerX - 320, y: centerY + 240, phase: 2.5, pace: .085,
        route: [{ x: centerX - 350, y: centerY + 240 }, { x: centerX - 250, y: centerY + 190 }, { x: centerX - 300, y: centerY + 310 }, { x: centerX - 390, y: centerY + 290 }],
        nearbyLine: 'Runa speider etter spor og farer.',
        appearance: { ...DEFAULT_APPEARANCE, shirt: '#52784e', shirtDark: '#344f37', hair: '#272d28', skin: '#9f694d', hat: '#778849', hatDark: '#455636', hatStyle: 'cap', backpack: '#6c4932', outfit: 'cape' },
        greeting: 'Jeg holder øye med denne villmarka. Ikke stol på hvert spor du finner.',
        topics: [{ label: 'Pek ut en Epic eller Legendary-kiste', dynamic: 'hint' }, { label: 'Hvor er fellene?', dynamic: 'trap' }],
      },
      {
        id: 'mystic-wanderer', name: 'Edda Vandrer', avatar: '🧙🏻‍♀️', x: centerX + 280, y: centerY - 300, phase: 3.4, pace: .045,
        route: [{ x: centerX + 260, y: centerY - 310 }, { x: centerX + 380, y: centerY - 220 }, { x: centerX + 330, y: centerY - 100 }, { x: centerX + 220, y: centerY - 220 }],
        nearbyLine: 'Edda gransker et gammelt kart.',
        appearance: { ...DEFAULT_APPEARANCE, shirt: '#785f9e', shirtDark: '#4a3c6b', hair: '#c29552', skin: '#d6a17f', hat: '#554477', hatDark: '#382d55', hatStyle: 'wizard', outfit: 'cape' },
        greeting: 'Kartene mine hvisker om skatter, men bare til den som lytter.',
        topics: [{ label: 'Hvilken retning bør jeg ta?', dynamic: 'hint' }, { label: 'Har du hørt noe om feller?', dynamic: 'trap' }],
      },
      {
        id: 'trail-scout', name: 'Speideren Sol', avatar: '🧑🏼‍🔭', x: centerX - 120, y: centerY - 330, phase: .7, pace: .07,
        route: [{ x: centerX - 150, y: centerY - 330 }, { x: centerX - 80, y: centerY - 250 }, { x: centerX - 180, y: centerY - 180 }, { x: centerX - 240, y: centerY - 260 }],
        nearbyLine: 'Sol ser utover området med kikkerten.',
        appearance: { ...DEFAULT_APPEARANCE, shirt: '#bd7950', shirtDark: '#704634', hair: '#553a2a', skin: '#ecc7a0', hat: '#c89955', hatDark: '#765633', hatStyle: 'cap', outfit: 'vest' },
        greeting: 'Jeg holder oversikt over terrenget. Hvis jeg ser noe, skal jeg gi deg et hint.',
        topics: [{ label: 'Hva er det vanskeligste å finne?', dynamic: 'hint' }, { label: 'Har du sett noen feller?', dynamic: 'trap' }],
      },
    ];
  }

  function createZoneAnimals(realmId, world) {
    if (realmId === 'forest') return [];
    const prize = world.chests.filter((chest) => ['Epic', 'Legendary'].includes(chest.rarity.name))
      .sort((a, b) => distance(world.player, a) - distance(world.player, b))[0] || world.chests[0];
    const center = prize ? { x: prize.x + 80, y: prize.y + 65 } : { x: world.width * .65, y: world.height * .55 };
    const spawn = { x: clamp(center.x, 140, world.width - 140), y: clamp(center.y, 140, world.height - 140) };
    const profiles = {
      autumn: { species: 'bear', name: 'Villbjørn', hp: 95, damage: 1, speed: 65, range: 78, color: '#99623e', accent: '#d2a76d', xp: 55, coins: 25 },
      desert: { species: 'scorpion', name: 'Kjempeskorpion', hp: 110, damage: 1.2, speed: 118, range: 205, color: '#b75d3f', accent: '#e7ad57', xp: 80, coins: 38 },
      snow: { species: 'wolf', name: 'Vinterulv', hp: 135, damage: 1.5, speed: 154, range: 390, color: '#8da9b2', accent: '#e5f2ed', xp: 110, coins: 55 },
    };
    const profile = profiles[realmId];
    return [{ ...profile, id: `beast-${realmId}`, x: spawn.x, y: spawn.y, anchor: spawn, hpNow: profile.hp, phase: Math.random() * 6, aggro: false, attacked: false, attackCooldown: 0, hitFlash: 0, moving: false, facing: 'down' }];
  }

  function updateAnimals(delta) {
    for (const animal of game.animals) {
      if (animal.dead) continue;
      animal.attackCooldown = Math.max(0, animal.attackCooldown - delta);
      animal.hitFlash = Math.max(0, animal.hitFlash - delta);
      const gap = distance(animal, game.player);
      const trigger = animal.species === 'bear' ? 82 : animal.species === 'scorpion' ? 185 : 340;
      if (animal.species === 'bear') {
        if (gap < trigger || animal.attacked) animal.aggro = true;
        if (gap > 185) { animal.aggro = false; animal.attacked = false; }
      } else if (gap < trigger) animal.aggro = true;
      else if (gap > trigger * 1.55) animal.aggro = false;

      if (animal.aggro) {
        const dx = game.player.x - animal.x;
        const dy = game.player.y - animal.y;
        const length = Math.hypot(dx, dy) || 1;
        animal.facing = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
        if (length > 32) {
          animal.moving = true;
          const speed = animal.speed;
          animal.x += dx / length * speed * delta;
          animal.y += dy / length * speed * delta;
        } else {
          animal.moving = false;
          if (animal.attackCooldown <= 0) {
            animal.attackCooldown = animal.species === 'wolf' ? 1.0 : 1.55;
            takeDamage(animal.damage, animal.name);
            if (game.mode !== 'run') return;
          }
        }
      } else {
        animal.moving = Math.sin(game.frame * .65 + animal.phase) > .35;
        animal.x = animal.anchor.x + Math.sin(game.frame * .28 + animal.phase) * 42;
        animal.y = animal.anchor.y + Math.cos(game.frame * .22 + animal.phase) * 26;
      }
    }
  }

  function meleeAttack() {
    if (game.mode !== 'run' || game.attackCooldown > 0) return;
    game.attackCooldown = .42;
    game.attackTimer = .24;
    const facing = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[game.player.facing] || { x: 0, y: 1 };
    const target = game.animals.filter((animal) => !animal.dead)
      .map((animal) => ({ animal, dx: animal.x - game.player.x, dy: animal.y - game.player.y }))
      .filter((item) => {
        const gap = Math.hypot(item.dx, item.dy);
        const facingDot = (item.dx * facing.x + item.dy * facing.y) / (gap || 1);
        return gap < 72 && facingDot > .22;
      })
      .sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))[0];
    if (!target) { playChime(); return; }
    damageAnimal(target.animal, weaponDamage(), 'nærkamp');
  }

  function damageAnimal(animal, damage, method) {
    if (!animal || animal.dead) return;
    animal.attacked = true; animal.aggro = true; animal.hitFlash = .2;
    animal.hpNow -= damage;
    playChime();
    if (animal.hpNow <= 0) {
      animal.dead = true;
      save.coins += animal.coins;
      saveGame(); updateUI();
      awardXP(animal.xp, `beseiret ${animal.name}`);
      game.effects.push({ type: 'float', x: animal.x, y: animal.y - 16, text: `+${animal.xp} XP`, age: 0, life: 1.2, color: '#f3d276' });
      toast(`${animal.name} beseiret med ${method}! +${animal.coins} mynter.`, 2300);
    } else toast(`${animal.name} fikk ${damage} skade!`, 1000);
  }

  function startExpedition(realmId = game.selectedRealm) {
    if (game.mode !== 'lobby') return;
    if (!unlocked(realmId)) {
      toast(`${REALMS[realmId].name} åpnes på nivå ${REALMS[realmId].unlock}.`);
      return;
    }
    const count = expeditionChestCount(save.level);
    game.selectedRealm = realmId;
    game.realm = realmId;
    game.world = generateWorld(game.realm, count);
    game.props = game.world.props;
    game.chests = game.world.chests;
    game.traps = game.world.traps;
    game.worldNpcs = createWorldNpcs(game.world);
    game.animals = createZoneAnimals(game.realm, game.world);
    game.player = game.world.player;
    game.mode = 'run';
    game.totalChests = count;
    game.found = 0;
    game.rivalFound = 0;
    game.runBag = [];
    game.score = 0;
    game.effects = [];
    game.warmth = 100;
    game.exposureClock = 0;
    updateUI();
    showZoneWarning(game.realm);
    toast(`${REALMS[game.realm].name}: ${count} kister venter. Utforsk i ditt eget tempo!`, 3500);
  }

  function buyItem(item) {
    if (game.mode !== 'interior' || game.interior !== 'store') {
      toast('Gå inn i Utstyrsbua for å handle.');
      return;
    }
    if (!['cocoa', 'water'].includes(item) && hasTool(item)) {
      toast(item === 'shovel' ? 'Du har allerede en spade.' : 'Du har allerede en sprettert.');
      return;
    }
    const product = GEAR_ITEMS.find((entry) => entry.id === item);
    if (!product) return;
    if (save.coins < product.price) {
      toast(`Du trenger ${product.price - save.coins} mynter til.`);
      return;
    }
    save.coins -= product.price;
    if (item === 'cocoa' || item === 'water') save[item] += 1;
    else save[item] = true;
    saveGame();
    updateUI();
    const labels = {
      shovel: 'Spaden er klar – se etter jord med et X og trykk E for å grave.',
      slingshot: 'Spretterten er klar – stå innen rekkevidde av et tre med en kiste og trykk F.',
      cocoa: `Du kjøpte kakao. Du har ${save.cocoa} kopp${save.cocoa === 1 ? '' : 'er'}.`,
      water: `Du kjøpte vann. Du har ${save.water} flaske${save.water === 1 ? '' : 'r'}.`,
    };
    toast(labels[item]);
    updateUI(); renderShopProducts();
  }

  function buyUpgrade(id) {
    if (game.mode !== 'interior' || game.interior !== 'store') return;
    const upgrade = UPGRADE_ITEMS.find((item) => item.id === id);
    if (!upgrade) return;
    const level = save.upgrades[id] || 0;
    if (level >= upgrade.maxLevel) { toast('Denne oppgraderingen er på maks nivå.'); return; }
    const price = upgrade.basePrice * (level + 1);
    if (save.coins < price) { toast(`Du trenger ${price - save.coins} mynter til.`); return; }
    save.coins -= price;
    save.upgrades[id] = level + 1;
    if (id === 'hp') { game.hp += 2; game.hp = Math.min(game.hp, maxHp()); }
    saveGame(); updateUI(); renderShopProducts();
    toast(`${upgrade.name} oppgradert til nivå ${level + 1}!`);
  }

  function renderShopProducts() {
    if (!ui.shopProducts) return;
    ui.shopProducts.replaceChildren();
    if (game.shopTab === 'gear') {
      GEAR_ITEMS.forEach((item) => {
        const owned = item.consumable ? false : hasTool(item.id);
        const count = item.consumable ? save[item.id] : 0;
        const row = document.createElement('div'); row.className = 'shop-product';
        const icon = document.createElement('span'); icon.className = 'shop-product-icon'; icon.textContent = item.icon;
        const copy = document.createElement('div'); copy.className = 'shop-product-copy';
        const title = document.createElement('strong'); title.textContent = item.name;
        const description = document.createElement('small'); description.textContent = item.desc;
        copy.append(title, description);
        const button = document.createElement('button'); button.className = 'buy-button'; button.type = 'button';
        button.disabled = owned || save.coins < item.price; button.textContent = owned ? 'Eier ✓' : `${item.price} ◉`;
        if (item.consumable && count) button.textContent = `${item.price} ◉ · ${count}×`;
        button.addEventListener('click', () => buyItem(item.id));
        row.append(icon, copy, button); ui.shopProducts.append(row);
      });
      return;
    }
    if (game.shopTab === 'upgrades') {
      UPGRADE_ITEMS.forEach((item) => {
        const level = save.upgrades[item.id] || 0;
        const maxLevel = item.maxLevel;
        const price = item.basePrice * (level + 1);
        const row = document.createElement('div'); row.className = 'shop-product upgrade-product';
        const icon = document.createElement('span'); icon.className = 'shop-product-icon'; icon.textContent = item.icon;
        const copy = document.createElement('div'); copy.className = 'shop-product-copy';
        const title = document.createElement('strong'); title.textContent = `${item.name} · lvl ${level}/${maxLevel}`;
        const description = document.createElement('small'); description.textContent = item.desc;
        copy.append(title, description);
        const button = document.createElement('button'); button.className = 'buy-button'; button.type = 'button';
        button.disabled = level >= maxLevel || save.coins < price;
        button.textContent = level >= maxLevel ? 'MAKS' : `${price.toLocaleString('no-NO')} ◉`;
        button.addEventListener('click', () => buyUpgrade(item.id));
        row.append(icon, copy, button); ui.shopProducts.append(row);
      });
      return;
    }
  }

  function styleItems(slot) { return STYLE_ITEMS.filter((item) => item.slot === slot); }

  function drawPreview(canvasId, appearance) {
    const target = $(canvasId);
    const pctx = target.getContext('2d');
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, target.width, target.height);
    pctx.fillStyle = '#e8dcb8'; pctx.fillRect(0, 0, target.width, target.height);
    pctx.fillStyle = '#c9b88d'; pctx.fillRect(0, 118, target.width, 32);
    pctx.imageSmoothingEnabled = false;
    pctx.setTransform(2.4, 0, 0, 2.4, 60, 112);
    const previous = ctx; ctx = pctx;
    try { drawPlayer({ facing: 'down', moving: false }, 0, 0, appearance); } finally { ctx = previous; }
  }

  function previewAppearance(itemId) {
    const item = STYLE_ITEMS.find((entry) => entry.id === itemId);
    const hat = item?.slot === 'hat' ? item : STYLE_ITEMS.find((entry) => entry.id === save.hatId);
    const outfit = item?.slot === 'outfit' ? item : STYLE_ITEMS.find((entry) => entry.id === save.outfitId);
    return { ...DEFAULT_APPEARANCE, ...hat.apply, ...outfit.apply };
  }

  function buyOrEquipStyle(item) {
    if (!ownedStyle(item.id)) {
      if (item.token) { toast('Denne låses opp med Pirate Token hos kapteinen i Havnehuset.'); return; }
      if (game.mode !== 'interior' || game.interior !== 'style') { toast('Kjøp klær inne i Klesbutikken.'); return; }
      if (save.coins < item.price) { toast(`Du trenger ${item.price - save.coins} mynter til.`); return; }
      save.coins -= item.price; save.ownedStyles.push(item.id);
    }
    if (item.slot === 'hat') save.hatId = item.id; else save.outfitId = item.id;
    applyEquipped(); saveGame(); updateUI(); renderWardrobe();
    toast(`${item.name} er på!`);
  }

  function renderWardrobe() {
    ui.styleGrid.replaceChildren();
    const slot = game.styleTab;
    $('#style-summary').textContent = game.styleSelected ? 'Forhåndsvisning til høyre. Trykk på knappen for å kjøpe eller ta på.' : 'Velg en gjenstand for å se den på figuren.';
    document.querySelectorAll('[data-style-tab]').forEach((button) => button.classList.toggle('active', button.dataset.styleTab === slot));
    drawPreview('#preview-current', save.appearance);
    drawPreview('#preview-try', previewAppearance(game.styleSelected));
    $('#preview-try-label').textContent = game.styleSelected ? STYLE_ITEMS.find((item) => item.id === game.styleSelected).name.toUpperCase() : 'PRØVER';
    styleItems(slot).forEach((item) => {
      const owned = ownedStyle(item.id);
      const equipped = (slot === 'hat' ? save.hatId : save.outfitId) === item.id;
      const row = document.createElement('article');
      row.className = `style-owned-card${game.styleSelected === item.id ? ' selected' : ''}`;
      row.addEventListener('click', () => { game.styleSelected = item.id; renderWardrobe(); });
      const icon = document.createElement('span'); icon.className = 'style-owned-icon'; icon.textContent = item.icon;
      const name = document.createElement('strong'); name.textContent = item.token && !owned ? `${item.name} · Pirate Token` : item.name;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'sell-one';
      button.textContent = equipped ? 'På' : owned ? 'Ta på' : item.token ? 'Låst' : `${item.price} ◉`;
      button.disabled = equipped || (item.token && !owned);
      button.addEventListener('click', (event) => { event.stopPropagation(); buyOrEquipStyle(item); });
      row.append(icon, name, button); ui.styleGrid.append(row);
    });
  }

  function updateUI() {
    ui.coins.textContent = save.coins.toLocaleString('no-NO');
    ui.level.textContent = save.level;
    ui.score.textContent = game.score.toLocaleString('no-NO');
    ui.highScore.textContent = (save.highScore || 0).toLocaleString('no-NO');
    ui.bagCount.textContent = String(save.bag.length + game.runBag.length);
    ui.bookCount.textContent = `${ARTIFACTS.filter((artifact) => save.discovered[artifact.id]).length}/16`;
    renderHealth();
    ui.realm.textContent = game.mode === 'run' ? REALMS[game.realm].name
      : game.mode === 'interior' ? game.interior === 'house' ? 'Havnehuset' : game.interior === 'style' ? 'Klesbutikken' : 'Utstyrsbua'
        : game.mode === 'lobby' ? 'Havneøya' : REALMS[game.realm].name;
    document.body.classList.toggle('in-run', game.mode === 'run');
    ui.state.textContent = game.mode === 'run' ? 'UTFORSKER' : game.mode === 'interior' ? 'INNE' : 'LOBBY';
    ui.objective.textContent = game.mode === 'run'
      ? game.realm === 'snow' ? `Utforsk · varme ${Math.ceil(game.warmth)}%`
        : game.realm === 'desert' ? `Utforsk · vann ${Math.ceil(game.warmth)}%` : 'Utforsk og finn skatter'
      : game.mode === 'interior' ? game.interior === 'house' ? 'Les tavla · snakk med kapteinen' : game.interior === 'style' ? 'Gå til speilet eller disken' : 'Snakk med Tessa for å handle'
        : 'B · Ryggsekk   ·   Gå til en portal';
    ui.chestCount.textContent = game.mode === 'run' ? `${game.found}/${game.totalChests} · JENS ${game.rivalFound}` : '0 / 0';
    const equipment = [];
    if (hasTool('shovel')) equipment.push(save.pirate.spade ? 'Super Spade' : 'Spade');
    if (hasTool('slingshot')) equipment.push('Sprettert');
    if (save.cocoa > 0) equipment.push(`${save.cocoa}× kakao`);
    if (save.water > 0) equipment.push(`${save.water}× vann`);
    if (save.token) equipment.push('Pirate Token ☠');
    if (save.pirate.outfit) equipment.push('Piratdrakt');
    ui.shopInventory.textContent = equipment.join(' · ') || 'Tom sekk';
    ui.tracker.textContent = game.mode === 'run' ? trackerText() : 'Gå til en portal · B = ryggsekk';
  }

  function drawArtifactPixels(targetCtx, artifact, x, y, size, silhouette = false) {
    const pattern = ARTIFACT_PIXELS[artifact.sprite] || ARTIFACT_PIXELS.charm;
    const cell = size / 8;
    const colors = silhouette
      ? { k: '#2d3935', m: '#56635c', h: '#7a8578', a: '#45534d' }
      : { k: '#342b2b', m: artifact.color, h: '#fff0a8', a: artifact.accent };
    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;
    for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
      const row = (pattern[rowIndex] || '').padEnd(8, '.').slice(0, 8);
      for (let column = 0; column < 8; column++) {
        const pixel = row[column];
        if (pixel === '.' || !colors[pixel]) continue;
        targetCtx.fillStyle = colors[pixel];
        targetCtx.fillRect(Math.round(x + column * cell), Math.round(y + rowIndex * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
    targetCtx.restore();
  }

  function createArtifactIcon(artifact, silhouette = false) {
    const icon = document.createElement('canvas');
    icon.width = 32; icon.height = 32;
    icon.className = 'artifact-icon-canvas';
    icon.setAttribute('aria-hidden', 'true');
    drawArtifactPixels(icon.getContext('2d'), artifact, 0, 0, 32, silhouette);
    return icon;
  }

  function bagCounts() {
    const counts = new Map();
    for (const id of [...save.bag, ...game.runBag]) counts.set(id, (counts.get(id) || 0) + 1);
    return counts;
  }

  function renderBag() {
    ui.bagGrid.replaceChildren();
    const counts = bagCounts();
    const secureCount = save.bag.length;
    const carryCount = game.runBag.length;
    ui.bagSummary.textContent = `${bagUsed()}/${bagCapacity()} plasser · ${counts.size} ulike · ${secureCount} sikret${carryCount ? ` · ${carryCount} med på ekspedisjonen` : ''}`;
    let saleTotal = 0;
    for (const id of save.bag) {
      const artifact = ARTIFACTS.find((item) => item.id === id);
      if (artifact) saleTotal += artifact.value;
    }
    $('#sell-all').disabled = secureCount === 0;
    $('#sell-all').innerHTML = secureCount ? `Selg sikrede funn · ${saleTotal} <span>◉</span>` : 'Ingen sikrede funn å selge <span>◉</span>';
    if (!counts.size) {
      const empty = document.createElement('p');
      empty.className = 'collection-empty';
      empty.textContent = 'Ryggsekken er tom. Åpne kister for å finne artefakter.';
      ui.bagGrid.append(empty);
      return;
    }
    for (const artifact of ARTIFACTS) {
      const count = counts.get(artifact.id) || 0;
      if (!count) continue;
      const secure = save.bag.filter((id) => id === artifact.id).length;
      const card = document.createElement('article');
      card.className = `artifact-card rarity-border-${artifact.rarity.toLowerCase()}`;
      card.append(createArtifactIcon(artifact));
      const detail = document.createElement('div'); detail.className = 'artifact-detail';
      const title = document.createElement('strong'); title.textContent = artifact.name;
      const badge = document.createElement('span'); badge.className = `rarity-pill rarity-${artifact.rarity.toLowerCase()}`; badge.textContent = artifact.rarity;
      const description = document.createElement('p'); description.textContent = artifact.desc;
      const meta = document.createElement('small'); meta.textContent = `×${count} · ${artifact.value} mynter per stk${secure < count ? ` · ${count - secure} usikret` : ''}`;
      detail.append(title, badge, description, meta);
      card.append(detail);
      const sell = document.createElement('button'); sell.className = 'sell-one'; sell.type = 'button'; sell.dataset.sellArtifact = artifact.id;
      sell.disabled = secure === 0; sell.textContent = secure ? 'Selg 1' : 'Ikke sikret';
      card.append(sell);
      ui.bagGrid.append(card);
    }
  }

  function renderBook() {
    ui.bookGrid.replaceChildren();
    const discoveredIds = Object.keys(save.discovered).filter((id) => ARTIFACTS.some((item) => item.id === id));
    ui.bookSummary.textContent = `${discoveredIds.length} av ${ARTIFACTS.length} artefakter oppdaget`;
    for (const artifact of [...ARTIFACTS, PIRATE_TOKEN]) {
      if (game.bookFilter !== 'all' && artifact.rarity !== game.bookFilter) continue;
      const discovered = Boolean(save.discovered[artifact.id]);
      const card = document.createElement('article');
      card.className = `artifact-card book-artifact ${discovered ? `rarity-border-${artifact.rarity.toLowerCase()}` : 'undiscovered'}`;
      card.append(createArtifactIcon(artifact, !discovered));
      const detail = document.createElement('div'); detail.className = 'artifact-detail';
      const title = document.createElement('strong'); title.textContent = discovered ? artifact.name : '???';
      const badge = document.createElement('span'); badge.className = `rarity-pill rarity-${artifact.rarity.toLowerCase()}`; badge.textContent = discovered ? artifact.rarity : 'Ukjent';
      const description = document.createElement('p'); description.textContent = discovered ? artifact.desc : 'Finn denne skatten for å fylle ut siden.';
      const meta = document.createElement('small'); meta.textContent = discovered ? (artifact.value ? `Salgsverdi · ${artifact.value} mynter` : 'Unik skatt · lever til kapteinen') : 'Ikke oppdaget';
      detail.append(title, badge, description, meta);
      card.append(detail);
      ui.bookGrid.append(card);
    }
  }

  function openBag() { closeBook(); ui.styleDialog.classList.add('hidden'); renderBag(); ui.bagDialog.classList.remove('hidden'); game.keys.clear(); }
  function openBook() { closeBag(); ui.styleDialog.classList.add('hidden'); renderBook(); ui.bookDialog.classList.remove('hidden'); game.keys.clear(); }
  function closeBag() { ui.bagDialog.classList.add('hidden'); }
  function closeBook() { ui.bookDialog.classList.add('hidden'); }

  function sellArtifact(id) {
    const index = save.bag.indexOf(id);
    if (index < 0) { toast('Den skatten er ikke sikret ennå. Kom trygt tilbake først.'); return; }
    const artifact = ARTIFACTS.find((item) => item.id === id);
    save.bag.splice(index, 1);
    save.coins += artifact.value;
    saveGame(); updateUI(); renderBag();
    awardXP(Math.max(5, Math.ceil(artifact.value / 10)), `solgte ${artifact.name}`);
    toast(`Solgt: ${artifact.name} · +${artifact.value} mynter.`);
  }

  function sellAllArtifacts() {
    if (!save.bag.length) return { count: 0, value: 0 };
    const value = save.bag.reduce((total, id) => total + (ARTIFACTS.find((item) => item.id === id)?.value || 0), 0);
    const count = save.bag.length;
    save.bag = [];
    save.coins += value;
    saveGame(); updateUI(); renderBag();
    awardXP(Math.max(5, Math.ceil(value / 10)), `solgte ${count} artefakter`);
    toast(`Solgte ${count} artefakter for ${value} mynter.`);
    return { count, value };
  }

  function npcPosition(npc) {
    let position;
    if (npc.static) position = { x: npc.x, y: npc.y, moving: false, facing: 'up' };
    else if (npc.id === 'token-broker' && game.tokenNpc) position = { ...game.tokenNpc, moving: false };
    else if (npc.rival) position = { x: npc.x, y: npc.y, moving: Boolean(npc.moving), facing: npc.facing || 'down' };
    else if (npc.route?.length > 1) {
      const time = game.frame * (npc.pace || .07) + (npc.phase || 0);
      const segment = Math.floor(time) % npc.route.length;
      const progress = time - Math.floor(time);
      const from = npc.route[segment];
      const to = npc.route[(segment + 1) % npc.route.length];
      const smooth = progress * progress * (3 - 2 * progress);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      position = {
        x: from.x + dx * smooth, y: from.y + dy * smooth, moving: progress < .84,
        facing: Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down',
      };
    } else {
      const pace = npc.id.includes('tessa') ? 0.55 : 0.32;
      position = {
        x: (npc.x ?? 480) + Math.sin(game.frame * pace + npc.phase) * 6,
        y: (npc.y ?? 340) + Math.cos(game.frame * pace * 0.8 + npc.phase) * 3,
        moving: Math.sin(game.frame * pace + npc.phase) > .65,
        facing: Math.cos(game.frame * pace + npc.phase) > 0 ? 'right' : 'left',
      };
    }
    if (game.proximityNpcId === npc.id || game.talkingTo?.id === npc.id) {
      const dx = game.player.x - position.x;
      const dy = game.player.y - position.y;
      return { ...position, moving: false, facing: Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down' };
    }
    return position;
  }

  function interiorNpcs() { return game.interior === 'house' ? HOUSE_NPCS : game.interior === 'style' ? STYLE_NPCS : STORE_NPCS; }

  function activeNpcs() {
    if (game.mode === 'interior') return interiorNpcs();
    if (game.mode === 'run') return game.worldNpcs;
    if (game.mode === 'lobby') return save.token && (!save.tokenPayoutClaimed || game.talkingTo?.id === 'token-broker') ? [...LOBBY_NPCS, TOKEN_BROKER] : LOBBY_NPCS;
    return [];
  }

  function scenePointToScreen(point) {
    const rect = canvas.getBoundingClientRect();
    if (game.mode === 'run') {
      const cam = camera();
      return {
        x: rect.left + (point.x - cam.x) * (rect.width / viewWidth),
        y: rect.top + (point.y - cam.y) * (rect.height / viewHeight),
      };
    }
    const scale = Math.min(viewWidth / 960, viewHeight / 560);
    const offsetX = (viewWidth - 960 * scale) / 2;
    const offsetY = (viewHeight - 560 * scale) / 2;
    return {
      x: rect.left + (offsetX + point.x * scale) * (rect.width / viewWidth),
      y: rect.top + (offsetY + point.y * scale) * (rect.height / viewHeight),
    };
  }

  function updateNpcProximity() {
    const active = ['lobby', 'interior', 'run'].includes(game.mode) && ui.talk.classList.contains('hidden');
    if (!active) {
      game.proximityNpcId = null; ui.proximity.classList.add('hidden'); return;
    }
    const nearest = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
      .sort((a, b) => distance(a.position, game.player) - distance(b.position, game.player))[0];
    if (!nearest || distance(nearest.position, game.player) > (nearest.npc.rival ? 90 : 76)) {
      game.proximityNpcId = null; ui.proximity.classList.add('hidden'); return;
    }
    game.proximityNpcId = nearest.npc.id;
    ui.proximityText.textContent = `${nearest.npc.nearbyLine || `${nearest.npc.name} vinker deg bort.`} · E / SPACE`;
    const screen = scenePointToScreen({ x: nearest.position.x, y: nearest.position.y - 34 });
    const bubble = ui.proximity.getBoundingClientRect();
    const width = bubble.width || 220;
    const height = bubble.height || 42;
    const left = clamp(screen.x - width / 2, 8, window.innerWidth - width - 8);
    const top = clamp(screen.y - height - 10, 58, window.innerHeight - height - 8);
    ui.proximity.style.left = `${left}px`;
    ui.proximity.style.top = `${top}px`;
    ui.proximity.classList.remove('hidden');
  }

  function rarestFound() {
    const ranks = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };
    return ARTIFACTS.filter((artifact) => save.discovered[artifact.id]).sort((a, b) => ranks[b.rarity] - ranks[a.rarity])[0] || null;
  }

  function rarityReaction() {
    const rarest = rarestFound();
    if (!rarest) return 'Du har ikke registrert noen artefakter ennå. Kistene der ute skjuler Common, Rare, Epic og Legendary funn.';
    if (rarest.rarity === 'Legendary') return `Oi! Du har funnet ${rarest.name} – en LEGENDARY skatt! Slike funn er det få som får se.`;
    if (rarest.rarity === 'Epic') return `Jeg så at du fant ${rarest.name}. En Epic artefakt er et skikkelig imponerende funn!`;
    if (rarest.rarity === 'Rare') return `${rarest.name} er Rare. Du begynner å få en flott samling!`;
    return `${rarest.name} er en fin Common skatt. Alle store samlinger må begynne et sted!`;
  }

  function compassDirection(from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    return ['øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest', 'nord', 'nordøst'][Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
  }

  function oddsText() {
    const pct = (value) => `${(value * 100).toLocaleString('no-NO', { maximumFractionDigits: 2 })} %`;
    const names = { forest: 'Skog', autumn: 'Høst', desert: 'Sahara', snow: 'Vinter' };
    return Object.entries(CHEST_ODDS).map(([zone, odds]) => `${names[zone]}: R ${pct(odds.rare)} · E ${pct(odds.epic)} · L ${pct(odds.legendary)}`).join('  |  ');
  }

  function unlockPirateRewards() {
    if (!save.token) return 'Du har ingen Pirate Token ennå. Finn den i en Epic eller Legendary kiste!';
    if (save.pirate.spade && save.pirate.slingshot && save.pirate.outfit) return 'Du har allerede fått alt tokenet gir deg. Bruk Super Spaden godt, kamerat!';
    save.pirate = { spade: true, slingshot: true, outfit: true };
    ['hat-pirate', 'outfit-pirate'].forEach((id) => { if (!save.ownedStyles.includes(id)) save.ownedStyles.push(id); });
    saveGame(); updateUI();
    game.effects.push({ type: 'float', x: game.talkingTo.x, y: game.talkingTo.y - 30, text: 'LÅST OPP!', age: 0, life: 2, color: '#ffe17c' });
    return 'Pirate Token! Her er Super Spade, sprettert og full piratdrakt. Ta på draktene i Klesbutikken. Tokenet beholder du som skatt!';
  }

  function treasureHint() {
    const chests = game.chests.filter((chest) => !chest.opened && ['Epic', 'Legendary'].includes(chest.rarity.name));
    if (!chests.length) return 'Akkurat nå kjenner jeg ingen Epic eller Legendary kiste i nærheten. Kom litt nærmere en kiste, så peker kompasset ditt ut veien.';
    const target = chests.sort((a, b) => distance(game.player, a) - distance(game.player, b))[0];
    return `Jeg kjenner en ${target.rarity.name} kiste mot ${compassDirection(game.player, target)}, omtrent ${Math.round(distance(game.player, target) / 24)} meter unna. Følg kompasset!`;
  }

  function trapHint() {
    const trap = game.traps.filter((item) => !item.triggered).sort((a, b) => distance(game.player, a) - distance(game.player, b))[0];
    if (!trap) return 'Jeg ser ingen aktive feller her akkurat nå, men hold deg unna mistenkelige steiner og løvhauger.';
    return `Pass på! Jeg så en felle mot ${compassDirection(game.player, trap)}, omtrent ${Math.round(distance(game.player, trap) / 24)} meter unna. Se etter et rødt glimt i bakken.`;
  }

  function setDialogueLine(text, options = []) {
    game.dialogueTarget = text;
    game.dialogueShown = '';
    game.dialogueIndex = 0;
    game.dialogueClock = 0;
    game.dialogueAfterTyping = options;
    $('#dialogue-text').textContent = '';
    ui.dialogueHint.textContent = '•••';
    renderDialogueOptions([]);
  }

  function updateDialogueTyping(delta) {
    if (!game.talkingTo || ui.talk.classList.contains('hidden') || game.dialogueIndex >= game.dialogueTarget.length) return;
    game.dialogueClock += delta;
    const characters = Math.floor(game.dialogueClock / .027);
    if (!characters) return;
    game.dialogueClock -= characters * .027;
    game.dialogueIndex = Math.min(game.dialogueTarget.length, game.dialogueIndex + characters);
    game.dialogueShown = game.dialogueTarget.slice(0, game.dialogueIndex);
    $('#dialogue-text').textContent = game.dialogueShown;
    if (game.dialogueIndex >= game.dialogueTarget.length) {
      ui.dialogueHint.textContent = 'VELG ET SVAR';
      renderDialogueOptions(game.dialogueAfterTyping);
    }
  }

  function finishTyping() {
    if (game.dialogueIndex >= game.dialogueTarget.length) return;
    game.dialogueIndex = game.dialogueTarget.length;
    game.dialogueShown = game.dialogueTarget;
    $('#dialogue-text').textContent = game.dialogueShown;
    ui.dialogueHint.textContent = 'VELG ET SVAR';
    renderDialogueOptions(game.dialogueAfterTyping);
  }

  function openNpcDialogue(npc) {
    if (!['lobby', 'interior', 'run'].includes(game.mode)) return;
    const position = npcPosition(npc);
    game.talkingTo = { ...npc, x: position.x, y: position.y };
    $('#dialogue-avatar').textContent = npc.avatar;
    $('#dialogue-name').textContent = npc.name;
    ui.talk.classList.remove('hidden');
    ui.proximity.classList.add('hidden');
    game.proximityNpcId = null;
    showNpcTopics();
    updateDialoguePosition();
    game.keys.clear();
  }

  function showNpcTopics() {
    if (!game.talkingTo) return;
    const options = game.talkingTo.topics.map((topic) => ({ label: topic.label, run: () => answerNpcTopic(topic) }));
    options.push({ label: 'Ha det!', goodbye: true });
    setDialogueLine(game.talkingTo.greeting, options);
  }

  function answerNpcTopic(topic) {
    if (topic.action === 'shop' || topic.action === 'shop-gear') { openShop('gear'); return; }
    if (topic.action === 'enter-store') { closeNpcDialogue(); enterInterior('store'); return; }
    if (topic.action === 'wardrobe') { closeNpcDialogue(); openWardrobe(); return; }
    if (topic.action === 'exit') { closeNpcDialogue(); leaveInterior(); return; }
    if (topic.action === 'dismiss') { closeNpcDialogue(); return; }
    let answer = topic.answer || '';
    if (topic.dynamic === 'rarity') answer = rarityReaction();
    if (topic.dynamic === 'hint') answer = treasureHint();
    if (topic.dynamic === 'trap') answer = trapHint();
    if (topic.dynamic === 'odds') answer = oddsText();
    if (topic.action === 'pirate-unlock') answer = unlockPirateRewards();
    if (topic.action === 'sell') {
      const sale = sellAllArtifacts();
      answer = sale.count ? `Takk for handelen! Jeg la ${sale.value} mynter i lommeboka di.` : 'Du har ingen sikrede artefakter å selge ennå. Kom tilbake etter neste tur!';
    }
    if (topic.action === 'million') {
      if (save.token && !save.tokenPayoutClaimed) {
        save.tokenPayoutClaimed = true; save.coins += 1000000; saveGame(); updateUI();
        answer = 'En million mynter, som avtalt! Og Pirate Token beholder du selvfølgelig.';
      } else answer = 'Tilbudet er allerede brukt. Ta godt vare på Pirate Token!';
    }
    const options = [{ label: 'Spør om noe annet', run: showNpcTopics }];
    if (game.talkingTo.id === 'token-broker' && save.tokenPayoutClaimed) options.push({ label: 'Takk, ha det!', run: closeNpcDialogue, primary: true });
    if (game.talkingTo.id === 'tessa-inside') options.push({ label: 'Gå inn i utstyrsbua', run: () => openShop('gear'), primary: true });
    options.push({ label: 'Ha det!', goodbye: true });
    setDialogueLine(answer, options);
  }

  function renderDialogueOptions(options) {
    game.dialogueOptions = options;
    const container = ui.dialogueOptions;
    container.replaceChildren();
    container.classList.toggle('hidden', options.length === 0);
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `dialogue-choice${option.primary ? ' primary' : ''}${option.goodbye ? ' goodbye' : ''}`;
      button.textContent = `${index + 1}. ${option.label}`;
      button.addEventListener('click', () => {
        if (game.dialogueIndex < game.dialogueTarget.length) { finishTyping(); return; }
        if (option.goodbye) closeNpcDialogue();
        else option.run?.();
      });
      container.append(button);
    });
  }

  function closeNpcDialogue() {
    ui.talk.classList.add('hidden');
    game.talkingTo = null;
    game.dialogueOptions = [];
  }

  function updateDialoguePosition() {
    if (!ui.talk.classList.contains('hidden')) { ui.proximity.classList.add('hidden'); return; }
    updateNpcProximity();
  }

  function openShop(tab = game.shopTab) {
    if (game.mode !== 'interior' || game.interior !== 'store') return;
    closeNpcDialogue();
    game.shopTab = tab;
    document.querySelectorAll('.shop-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.shopTab === tab));
    renderShopProducts();
    ui.shop.classList.remove('hidden');
    game.keys.clear();
    updateUI();
  }

  function closeShop() { ui.shop.classList.add('hidden'); }

  function openWardrobe() { closeBag(); closeBook(); game.styleSelected = null; renderWardrobe(); ui.styleDialog.classList.remove('hidden'); game.keys.clear(); }

  function enterInterior(place) {
    if (game.mode !== 'lobby') return;
    game.interiorReturnPosition = place === 'house' ? { x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 29 } : place === 'style' ? { x: STYLE_DOOR.x, y: STYLE_DOOR.y + 36 } : { x: SHOP_DOOR.x, y: SHOP_DOOR.y + 38 };
    game.interior = place;
    game.mode = 'interior';
    game.player = { x: 480, y: 460, facing: 'up', moving: false };
    if (place === 'house') game.hp = maxHp();
    game.styleZone = true;
    game.keys.clear(); updateUI();
    const host = interiorNpcs()[0];
    openNpcDialogue({
      ...host,
      greeting: place === 'house'
        ? `Velkommen inn i Havnehuset! ${rarestFound() ? rarityReaction() : 'Her kan du selge sikrede skatter og prate med folk i havna.'}`
        : place === 'style' ? 'Velkommen til Klesbutikken! Gå bort til speilet eller disken for å prøve klær og hatter.'
        : `Velkommen inn i Utstyrsbua! ${rarestFound() ? rarityReaction() : 'Se deg rundt, og kom bort til meg når du vil handle.'}`,
    });
  }

  function leaveInterior() {
    if (game.mode !== 'interior') return;
    closeNpcDialogue(); closeShop();
    game.mode = 'lobby';
    game.interior = null;
    game.player = { ...(game.interiorReturnPosition || { x: 480, y: 350 }), facing: 'down', moving: false };
    game.interiorReturnPosition = null;
    game.keys.clear(); updateUI();
    toast('Tilbake på Havneøya.');
  }

  function requestInteriorExit() {
    if (game.mode !== 'interior') return;
    const host = interiorNpcs()[0];
    openNpcDialogue({
      ...host,
      greeting: game.interior === 'house' ? 'Takk for besøket! Håper vi sees igjen.' : 'Ha det godt! Kom snart tilbake til Utstyrsbua.',
      topics: [
        { label: 'Tilbake til Havneøya', action: 'exit' },
        { label: 'Jeg blir litt til', action: 'dismiss' },
      ],
    });
  }

  function interactInterior() {
    if (game.mode !== 'interior' || !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
      || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden')) return;
    const exitDoor = { x: 480, y: 520 };
    if (distance(game.player, exitDoor) < 36) { leaveInterior(); return; }
    const npc = activeNpcs().map((person) => ({ person, position: npcPosition(person) }))
      .sort((a, b) => distance(a.position, game.player) - distance(b.position, game.player))[0];
    if (npc && distance(npc.position, game.player) < 62) { openNpcDialogue(npc.person); return; }
    toast(game.interior === 'house' ? 'Gå bort til Kaja eller Oda for å snakke.' : 'Gå bort til Tessa for å handle.');
  }

  function enterGate(realmId) {
    const realm = REALMS[realmId];
    if (!unlocked(realmId)) {
      if (game.frame - game.gateToastAt > 2.5) {
        toast(`${realm.name} åpnes på nivå ${realm.unlock}. Du er på nivå ${save.level}.`);
        game.gateToastAt = game.frame;
      }
      return;
    }
    startExpedition(realmId);
  }

  function returnFromRealm() {
    if (game.mode !== 'run') return;
    const recovered = game.runBag.length;
    save.bag.push(...game.runBag);
    game.runBag = [];
    saveGame();
    game.mode = 'lobby'; game.world = null; game.interior = null;
    game.animals = []; game.worldNpcs = []; game.traps = []; game.projectiles = []; game.dig = null;
    game.player = { x: 480, y: 350, facing: 'down', moving: false };
    game.score = 0; game.effects = [];
    if (save.token && !save.tokenPayoutClaimed) game.tokenNpc ||= { x: 750, y: 340 };
    updateUI();
    toast(recovered ? `Trygt tilbake! ${recovered} artefakter er sikret i ryggsekken.` : 'Trygt tilbake på Havneøya. Eventyret fortsetter!', 3200);
  }

  function checkAutomaticTransitions() {
    if (game.mode === 'lobby') {
      const blocked = !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
        || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden');
      if (blocked) return false;
      if (distance(game.player, HOUSE_DOOR) < 23) { enterInterior('house'); return true; }
      if (distance(game.player, SHOP_DOOR) < 23) { enterInterior('store'); return true; }
      if (distance(game.player, STYLE_DOOR) < 23) { enterInterior('style'); return true; }
      const gate = GATES.map((item) => ({ ...item, distance: distance(item, game.player) })).sort((a, b) => a.distance - b.distance)[0];
      if (gate && gate.distance < 27) { enterGate(gate.realm); return game.mode !== 'lobby'; }
    } else if (game.mode === 'interior') {
      const blocked = !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
        || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden');
      if (!blocked && distance(game.player, { x: 480, y: 520 }) < 23) { leaveInterior(); return true; }
      if (game.interior === 'style') {
        const near = !blocked && (distance(game.player, { x: 480, y: 185 }) < 55 || distance(game.player, { x: 680, y: 362 }) < 48);
        if (near && !game.styleZone) { game.styleZone = true; game.keys.clear(); openWardrobe(); return false; }
        if (!near && !blocked) game.styleZone = false;
      }
    } else if (game.mode === 'run' && game.world?.exitPortal && distance(game.player, game.world.exitPortal) < 30) {
      returnFromRealm(); return true;
    }
    return false;
  }

  function interactLobby() {
    if (game.mode !== 'lobby' || !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
      || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden')) return;
    if (distance(game.player, HOUSE_DOOR) < 68) { enterInterior('house'); return; }
    if (distance(game.player, SHOP_DOOR) < 68) { enterInterior('store'); return; }
    if (distance(game.player, STYLE_DOOR) < 68) { enterInterior('style'); return; }
    const nearbyNpc = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
      .sort((a, b) => distance(a.position, game.player) - distance(b.position, game.player))[0];
    if (nearbyNpc && distance(nearbyNpc.position, game.player) < 58) { openNpcDialogue(nearbyNpc.npc); return; }
    const gate = GATES.map((item) => ({ ...item, distance: distance(item, game.player) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (gate && gate.distance < 76) { enterGate(gate.realm); return; }
    toast('Gå nærmere en person, et hus eller en av broenes portaler.');
  }

  function handleCanvasClick(event) {
    if (!['lobby', 'interior', 'run'].includes(game.mode) || !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
      || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden')) return;
    const point = lobbyPointFromCanvasEvent(event);
    if (game.mode === 'run') {
      const clickedNpc = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
        .sort((a, b) => distance(a.position, point) - distance(b.position, point))[0];
      if (clickedNpc && distance(clickedNpc.position, point) < 42) openNpcDialogue(clickedNpc.npc);
      else meleeAttack();
      return;
    }
    if (game.mode === 'interior') {
      const clickedNpc = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
        .sort((a, b) => distance(a.position, point) - distance(b.position, point))[0];
      if (clickedNpc && distance(clickedNpc.position, point) < 38) { openNpcDialogue(clickedNpc.npc); return; }
      if (distance(point, { x: 480, y: 520 }) < 45) requestInteriorExit();
      return;
    }
    const clickedNpc = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
      .sort((a, b) => distance(a.position, point) - distance(b.position, point))[0];
    if (clickedNpc && distance(clickedNpc.position, point) < 36) { openNpcDialogue(clickedNpc.npc); return; }
    if (distance(point, HOUSE_DOOR) < 52) { enterInterior('house'); return; }
    if (distance(point, SHOP_DOOR) < 52) { enterInterior('store'); return; }
    if (distance(point, STYLE_DOOR) < 52) { enterInterior('style'); return; }
    const gate = GATES.map((item) => ({ ...item, distance: distance(item, point) })).sort((a, b) => a.distance - b.distance)[0];
    if (gate && gate.distance < 46) enterGate(gate.realm);
  }

  function lobbyPointFromCanvasEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(viewWidth / 960, viewHeight / 560);
    const offsetX = (viewWidth - 960 * scale) / 2;
    const offsetY = (viewHeight - 560 * scale) / 2;
    const localX = (event.clientX - rect.left) * (viewWidth / rect.width);
    const localY = (event.clientY - rect.top) * (viewHeight / rect.height);
    if (game.mode === 'run') {
      const cam = camera();
      return { x: localX + cam.x, y: localY + cam.y };
    }
    return { x: (localX - offsetX) / scale, y: (localY - offsetY) / scale };
  }

  function handleCanvasHover(event) {
    if (!['lobby', 'interior', 'run'].includes(game.mode) || !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
      || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden')) {
      canvas.style.cursor = 'default'; return;
    }
    const point = lobbyPointFromCanvasEvent(event);
    const overNpc = activeNpcs().some((npc) => distance(npcPosition(npc), point) < 32);
    const overDoor = game.mode === 'interior' ? distance({ x: 480, y: 520 }, point) < 42
      : game.mode === 'lobby' ? distance(HOUSE_DOOR, point) < 52 || distance(SHOP_DOOR, point) < 52 || distance(STYLE_DOOR, point) < 52 : false;
    const overGate = game.mode === 'lobby' && GATES.some((gate) => distance(gate, point) < 40);
    canvas.style.cursor = overNpc || overDoor || overGate ? 'pointer' : 'default';
  }

  function trackerText() {
    const nearest = game.chests.filter((chest) => !chest.opened).sort((a, b) => distance(game.player, a) - distance(game.player, b))[0];
    if (!nearest) return 'Alle kistene er funnet!';
    const d = distance(game.player, nearest);
    if (nearest.state === 'dropping') return 'Kista faller ned fra treet!';
    if (nearest.state === 'rising') return 'Kista kommer opp av jorda!';
    if (nearest.state === 'hidden' && nearest.kind === 'buried' && d < 92) return 'Mistenkelig jord · trykk E for å grave';
    if (nearest.state === 'hidden' && nearest.kind === 'tree' && d < SLING_RANGE) return 'Kiste i treet · trykk F for å skyte';
    if (nearest.state === 'ready' && d < 92) return 'Kiste i nærheten · trykk E';
    const angle = Math.atan2(nearest.y - game.player.y, nearest.x - game.player.x);
    const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
    return `Nærmeste kiste ${arrows[Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8]} · ${Math.round(d / 24)} m`;
  }

  const SLING_RANGE = 270;
  const CHEST_GRAVITY = 520;
  const canDigNow = (chest) => chest.state === 'hidden' && chest.kind === 'buried';
  const canOpenNow = (chest) => chest.state === 'ready';

  function nearestChest(maxDistance = 105, accept = () => true) {
    return game.chests.filter((chest) => !chest.opened && accept(chest) && distance(chest, game.player) <= maxDistance)
      .sort((a, b) => distance(a, game.player) - distance(b, game.player))[0] || null;
  }

  function nearestTreeChest(range = SLING_RANGE) {
    return nearestChest(range, (chest) => chest.kind === 'tree' && chest.state === 'hidden');
  }

  function chestPrompt(chest) {
    if (chest.opened || chest.state === 'dropping' || chest.state === 'rising') return null;
    if (chest.state === 'ready') return { range: 90, label: 'E · ÅPNE' };
    if (chest.kind === 'buried') return { range: 90, label: hasTool('shovel') ? 'E · GRAV' : 'TRENGER SPADE' };
    return { range: SLING_RANGE, label: hasTool('slingshot') ? 'F · SKYT' : 'TRENGER SPRETTERT' };
  }

  function faceToward(target) {
    const dx = target.x - game.player.x;
    const dy = target.y - game.player.y;
    game.player.facing = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
  }

  function burst(x, y, type, colors, count, power = 60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = power * (.35 + Math.random() * .65);
      game.effects.push({ type, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - power * .7, seed: Math.random() * 6, age: 0, life: (type === 'leaf' ? 1.1 : .5) + Math.random() * .55, color: colors[i % colors.length] });
    }
  }

  function leafColors() {
    return game.realm === 'autumn' ? ['#d17d45', '#daa04e', '#b5663f'] : game.realm === 'snow' ? ['#f2f8f0', '#d4e6e6', '#ffffff'] : game.realm === 'desert' ? ['#5c9b69', '#427a57'] : ['#4b8256', '#679357', '#3c7050'];
  }
  const DIRT_COLORS = ['#8c6a43', '#a8825a', '#6e5236'];

  function interactChest() {
    if (game.mode === 'lobby') { interactLobby(); return; }
    if (game.mode === 'interior') { interactInterior(); return; }
    if (game.mode !== 'run') return;
    const nearbyNpc = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
      .sort((a, b) => distance(a.position, game.player) - distance(b.position, game.player))[0];
    if (nearbyNpc && distance(nearbyNpc.position, game.player) < 62) { openNpcDialogue(nearbyNpc.npc); return; }
    const chest = nearestChest(105, (item) => canDigNow(item) || canOpenNow(item));
    if (!chest) {
      toast(nearestTreeChest()
        ? hasTool('slingshot') ? 'Den kista sitter fast i treet – skyt den ned med F!' : 'Kista sitter i et tre. Kjøp en sprettert i Utstyrsbua!'
        : 'Ingen kiste nær nok. Følg pilen nederst på kartet.');
      return;
    }
    if (canDigNow(chest) && !hasTool('shovel')) { toast('Jorda ser rørt ut her. Kjøp en spade i Utstyrsbua for å grave!'); return; }
    if (game.dig) return;
    if (bagFull()) { warnBagFull(); return; }
    const digging = canDigNow(chest);
    const base = digging ? 1.6 : .5;
    faceToward(chest);
    game.dig = { chest, mode: digging ? 'dig' : 'open', progress: 0, need: save.pirate.spade ? base / 2 : base, clock: 0, origin: { x: game.player.x, y: game.player.y } };
  }

  function updateDig(delta) {
    const dig = game.dig;
    if (!dig) return;
    const chest = dig.chest;
    const stale = dig.mode === 'dig' ? chest.state !== 'hidden' : chest.state !== 'ready';
    if (chest.opened || stale || distance(game.player, dig.origin) > 14 || distance(game.player, chest) > 130) { game.dig = null; return; }
    faceToward(chest);
    dig.progress += delta;
    dig.clock += delta;
    if (dig.clock >= .16) {
      dig.clock = 0;
      if (dig.mode === 'dig') {
        burst(chest.x + (Math.random() - .5) * 18, chest.y, 'dirt', DIRT_COLORS, 4, 52);
        playSound('dig');
      } else burst(chest.x, chest.y - 6, 'spark', [chest.rarity.glow], 1, 28);
    }
    if (dig.progress < dig.need) return;
    game.dig = null;
    if (dig.mode === 'dig') unearthChest(chest); else openChest(chest);
  }

  function unearthChest(chest) {
    chest.state = 'rising';
    chest.riseT = 0;
    burst(chest.x, chest.y, 'dirt', DIRT_COLORS, 18, 85);
    game.effects.push({ type: 'float', x: chest.x, y: chest.y - 26, text: 'FANT NOE!', age: 0, life: 1.4, color: '#ffe17c' });
    playSound('thud');
    toast('Spaden traff en kiste! Trykk E for å åpne den.', 2600);
  }

  function dropChest(chest) {
    if (chest.state !== 'hidden' || chest.kind !== 'tree') return;
    const { perch, landing } = chest;
    const height = Math.max(24, landing.y - perch.y);
    const fallTime = Math.sqrt(2 * height / CHEST_GRAVITY);
    chest.state = 'dropping';
    chest.fall = { x: perch.x, y: perch.y, vx: (landing.x - perch.x) / fallTime, vy: 0, bounces: 0, height };
    chest.x = landing.x; chest.y = landing.y;
    if (chest.parent) chest.parent.shake = .75;
    burst(perch.x, perch.y + 4, 'leaf', leafColors(), 14, 70);
    game.effects.push({ type: 'float', x: perch.x, y: perch.y - 18, text: 'TRÆFF!', age: 0, life: 1.2, color: '#ffe17c' });
  }

  function updateChests(delta) {
    for (const prop of game.props) if (prop.shake > 0) prop.shake = Math.max(0, prop.shake - delta);
    for (const chest of game.chests) {
      if (chest.state === 'rising') {
        chest.riseT += delta / .75;
        if (chest.riseT >= 1) { chest.state = 'ready'; chest.readyAt = game.frame; }
      } else if (chest.state === 'dropping') {
        const fall = chest.fall;
        fall.vy += CHEST_GRAVITY * delta;
        fall.x += fall.vx * delta;
        fall.y += fall.vy * delta;
        if (fall.y < chest.y) continue;
        fall.y = chest.y;
        if (fall.bounces < 2 && fall.vy > 70) {
          fall.vy = -fall.vy * .34; fall.vx = 0; fall.x = chest.x; fall.bounces++;
          burst(chest.x, chest.y + 6, 'dirt', DIRT_COLORS, 6, 40);
          playSound('thud');
        } else {
          chest.state = 'ready'; chest.readyAt = game.frame; chest.fall = null;
          burst(chest.x, chest.y + 6, 'dirt', DIRT_COLORS, 6, 34);
          toast('Kista falt ned fra treet! Trykk E for å åpne den.', 2600);
        }
      }
    }
  }

  function settleChest(chest) {
    if (chest.state !== 'hidden') return;
    if (chest.kind === 'tree') { chest.x = chest.landing.x; chest.y = chest.landing.y; }
    chest.state = 'ready';
  }

  function drawDigProgress(camX, camY) {
    const dig = game.dig;
    if (!dig) return;
    const x = dig.chest.x - camX; const y = dig.chest.y - camY - 34;
    ctx.fillStyle = '#2d312d'; ctx.fillRect(x - 22, y, 44, 7);
    ctx.fillStyle = save.pirate.spade ? '#f0c545' : dig.mode === 'dig' ? '#c99b5c' : '#8cc16f'; ctx.fillRect(x - 21, y + 1, 42 * clamp(dig.progress / dig.need, 0, 1), 5);
  }

  function drawShovel(x, y) {
    if (game.dig?.mode !== 'dig') return;
    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[game.player.facing] || [0, 1];
    const swing = Math.sin(game.frame * 16);
    ctx.save();
    ctx.translate(x + dir[0] * 15, y - 14 + dir[1] * 8);
    ctx.rotate((dir[0] || 1) * (.55 + swing * .45));
    ctx.fillStyle = '#6a4a2c'; ctx.fillRect(-1, -18, 3, 26);
    ctx.fillStyle = '#9a6d3c'; ctx.fillRect(-4, -20, 9, 3);
    ctx.fillStyle = '#3d4549'; ctx.fillRect(-5, 7, 11, 9);
    ctx.fillStyle = save.pirate.spade ? '#f0c545' : '#aeb9bb'; ctx.fillRect(-4, 7, 9, 7);
    ctx.restore();
  }

  function updateProjectiles(delta) {
    game.projectiles = game.projectiles.filter((shot) => {
      shot.life -= delta;
      if (shot.target.dead) return false;
      const dx = shot.target.x - shot.x; const dy = shot.target.y - shot.y; const gap = Math.hypot(dx, dy) || 1;
      const step = Math.min(gap, 470 * delta);
      shot.x += dx / gap * step; shot.y += dy / gap * step;
      shot.arc = Math.sin(clamp(1 - gap / (shot.total || gap), 0, 1) * Math.PI) * (shot.onHit ? 14 : 0);
      if (gap < (shot.onHit ? 8 : 22)) {
        if (shot.onHit) shot.onHit(); else damageAnimal(shot.target, shot.damage, 'sprettert');
        return false;
      }
      return shot.life > 0;
    });
  }

  function shootSlingshot() {
    if (game.mode !== 'run') return;
    if (!hasTool('slingshot')) { toast('Du trenger en sprettert. Kjøp en i Utstyrsbua eller få en av kapteinen.'); return; }
    if (game.attackCooldown > 0) return;
    const treeChest = nearestTreeChest();
    const animal = game.animals.filter((item) => !item.dead && distance(item, game.player) < 380)
      .sort((a, b) => distance(a, game.player) - distance(b, game.player))[0];
    if (treeChest && (!animal || !animal.aggro)) {
      if (bagFull()) { warnBagFull(); return; }
      game.attackCooldown = .5;
      game.dig = null;
      faceToward(treeChest);
      game.projectiles.push({ x: game.player.x, y: game.player.y - 14, target: { x: treeChest.perch.x, y: treeChest.perch.y }, total: distance(game.player, treeChest.perch), life: 1.2, onHit: () => dropChest(treeChest) });
      playSound('twang');
      return;
    }
    if (!animal) {
      const far = nearestChest(620, (chest) => chest.kind === 'tree' && chest.state === 'hidden');
      toast(far ? 'Treet med kista er for langt unna. Gå litt nærmere!' : 'Ingen dyr eller kister i tretoppene innen rekkevidde.');
      return;
    }
    game.attackCooldown = .55;
    game.projectiles.push({ x: game.player.x, y: game.player.y - 12, target: animal, damage: Math.max(10, Math.round(weaponDamage() * .6)), life: 1.2 });
    playChime();
  }

  function openChest(chest) {
    if (bagFull()) { warnBagFull(); return; }
    chest.opened = true;
    chest.openedAt = game.frame;
    game.found++;
    const artifact = artifactForRarity(chest.rarity);
    chest.artifact = artifact;
    game.runBag.push(artifact.id);
    save.discovered[artifact.id] = true;
    const xpReward = { Common: 15, Rare: 30, Epic: 60, Legendary: 100 }[artifact.rarity] || 15;
    const tokenFound = !save.token && Math.random() < (TOKEN_CHANCE[artifact.rarity] || 0);
    if (tokenFound) {
      save.token = true;
      save.tokens = (save.tokens || 0) + 1;
      save.discovered[PIRATE_TOKEN.id] = true;
      game.effects.push({ type: 'artifact', x: chest.x, y: chest.y - 66, artifact: PIRATE_TOKEN, age: 0, life: 4, color: '#ffe17c' });
      toast('PIRATE TOKEN! Gå til Kaptein Brann i Havnehuset for belønningen! ☠', 5600);
    }
    if (save.pirate.spade) {
      const bonus = Math.max(1, Math.round(artifact.value * .25));
      save.coins += bonus;
      game.effects.push({ type: 'float', x: chest.x, y: chest.y - 8, text: `+${bonus} MYNTER`, age: 0, life: 1.6, color: '#ffe17c' });
    }
    game.score += artifact.value;
    if (game.score > (save.highScore || 0)) save.highScore = game.score;
    game.effects.push({ type: 'artifact', x: chest.x, y: chest.y - 24, artifact, age: 0, life: 2.8, color: chest.rarity.glow });
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 24 + Math.random() * 70;
      game.effects.push({ type: 'spark', x: chest.x, y: chest.y - 4, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 20, age: 0, life: .45 + Math.random() * .42, color: chest.rarity.glow });
    }
    saveGame();
    playChime();
    awardXP(xpReward, `åpnet ${artifact.rarity}-kiste`);
    updateUI();
    if (!tokenFound) toast(`${artifact.name} · ${artifact.rarity}! Lagt til i Skatteboka.`);
    if (game.found + game.rivalFound >= game.totalChests) toast('Alle kistene er funnet. Finn portalen for å dra hjem!', 3500);
  }

  function useSupply() {
    if (game.mode !== 'run' || !['snow', 'desert'].includes(game.realm)) {
      if (game.mode === 'run') toast('Du trenger bare kakao eller vann i ekstremvær.');
      return;
    }
    const item = game.realm === 'snow' ? 'cocoa' : 'water';
    const label = item === 'cocoa' ? 'kakao' : 'vann';
    if (save[item] < 1) { toast(`Du er tom for ${label}! Kjøp mer i utstyrsbua.`); return; }
    save[item]--;
    game.warmth = Math.min(100, game.warmth + 62);
    saveGame();
    updateUI();
    toast(`${item === 'cocoa' ? 'Varm kakao' : 'En slurk vann'}! Måleren er nå ${Math.ceil(game.warmth)}%.`);
  }

  function tryMove(player, dx, dy, world) {
    const radius = 12;
    const canStand = (x, y) => {
      if (x < radius || y < radius || x > world.width - radius || y > world.height - radius) return false;
      return !world.props.some((prop) => prop.radius && Math.hypot(x - prop.x, y - (prop.y - prop.radius * 0.2)) < prop.radius + radius * 0.6);
    };
    const nextX = player.x + dx;
    const nextY = player.y + dy;
    if (canStand(nextX, player.y)) player.x = nextX;
    if (canStand(player.x, nextY)) player.y = nextY;
  }

  function lobbyCanStand(x, y) {
    if (x < 18 || x > 942 || y < 18 || y > 542) return false;
    const island = ((x - 480) / 310) ** 2 + ((y - 275) / 200) ** 2 <= 1;
    const bridge = (y < 147 && Math.abs(x - 480) < 25)
      || (y > 405 && Math.abs(x - 480) < 25)
      || (x < 220 && Math.abs(y - 282) < 25)
      || (x > 740 && Math.abs(y - 282) < 25);
    if (!island && !bridge) return false;
    if (LOBBY_OBSTACLES.some((obstacle) => Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.radius + 8)) return false;
    const inHall = x > 385 && x < 542 && y > 175 && y < 259;
    const inShop = x > 592 && x < 697 && y > 222 && y < 302;
    const inHallDoor = x > 449 && x < 481 && y > 220 && y < 270;
    const inShopDoor = x > 632 && x < 650 && y > 267 && y < 310;
    const inStyle = x > 240 && x < 330 && y > 196 && y < 252;
    const inStyleDoor = x > 269 && x < 301 && y > 232 && y < 270;
    return !(inHall && !inHallDoor) && !(inShop && !inShopDoor) && !(inStyle && !inStyleDoor);
  }

  function interiorCanStand(x, y) {
    if (x < 64 || x > 896 || y < 150 || y > 540) return false;
    const exitDoor = x > 440 && x < 520 && y > 500;
    const furniture = game.interior === 'house'
      ? [{ x: 480, y: 276, w: 190, h: 44 }, { x: 168, y: 264, w: 112, h: 150 }, { x: 820, y: 190, w: 70, h: 74 }, { x: 680, y: 315, w: 180, h: 58 }]
      : game.interior === 'style'
        ? [{ x: 680, y: 315, w: 190, h: 56 }, { x: 170, y: 220, w: 150, h: 40 }, { x: 790, y: 190, w: 140, h: 40 }, { x: 140, y: 340, w: 40, h: 60 }, { x: 330, y: 360, w: 40, h: 60 }, { x: 820, y: 400, w: 40, h: 60 }]
      : [{ x: 140, y: 312, w: 72, h: 274 }, { x: 252, y: 312, w: 72, h: 274 }, { x: 780, y: 312, w: 72, h: 274 }, { x: 892, y: 312, w: 72, h: 274 }, { x: 220, y: 223, w: 200, h: 36 }, { x: 745, y: 223, w: 210, h: 36 }, { x: 684, y: 305, w: 180, h: 56 }];
    return exitDoor || !furniture.some((item) => x > item.x - item.w / 2 && x < item.x + item.w / 2 && y > item.y - item.h / 2 && y < item.y + item.h / 2);
  }

  function updateWorldNpcRoutines(delta) {
    for (const npc of game.worldNpcs) {
      if (!npc.rival) continue;
      if (game.proximityNpcId === npc.id || game.talkingTo?.id === npc.id) { npc.moving = false; continue; }
      if (!npc.targetChest || npc.targetChest.opened) {
        npc.targetChest = game.chests.filter((chest) => !chest.opened)
          .sort((a, b) => distance(npc, a) - distance(npc, b))[0] || null;
        npc.waitingAtChest = 0;
      }
      const target = npc.targetChest;
      if (!target) { npc.moving = false; continue; }
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const gap = Math.hypot(dx, dy);
      npc.facing = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
      if (gap < 43) {
        npc.moving = false;
        npc.waitingAtChest = (npc.waitingAtChest || 0) + delta;
        if (npc.waitingAtChest > (target.state === 'hidden' ? 3 : 1.35)) claimChestForRival(npc, target);
      } else {
        npc.moving = true;
        const step = Math.min(gap - 38, 104 * delta);
        npc.x += dx / gap * step;
        npc.y += dy / gap * step;
      }
    }
  }

  function claimChestForRival(npc, chest) {
    if (chest.opened || game.mode !== 'run' || chest.state === 'dropping' || chest.state === 'rising') return;
    if (game.dig?.chest === chest) game.dig = null;
    settleChest(chest);
    chest.opened = true;
    chest.openedBy = 'rival';
    chest.openedAt = game.frame;
    chest.rivalArtifact = artifactForRarity(chest.rarity);
    game.rivalFound++;
    npc.nearbyLine = `Jens fant ${chest.rarity.name} før deg!`;
    npc.targetChest = null;
    npc.waitingAtChest = 0;
    toast(`Jens fant en ${chest.rarity.name} kiste før deg!`, 2400);
    updateUI();
    if (game.found + game.rivalFound >= game.totalChests) {
      toast('Jens fant den siste kista. Finn portalen hvis du vil hjem!', 3500);
    }
  }

  function updateTrapTriggers() {
    for (const trap of game.traps) {
      if (trap.triggered || distance(game.player, trap) > 20) continue;
      trap.triggered = true;
      takeDamage(1, 'Felle');
      if (game.mode !== 'run') return;
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        game.effects.push({ type: 'spark', x: trap.x, y: trap.y, vx: Math.cos(angle) * 44, vy: Math.sin(angle) * 44 - 18, age: 0, life: .35 + Math.random() * .3, color: '#ed7052' });
      }
      toast('Felle! Du mistet et hjerte. Se etter røde glimt på bakken.', 2600);
      updateUI();
    }
  }

  function moveTokenBroker(delta) {
    if (!save.token || save.tokenPayoutClaimed || !game.tokenNpc) return;
    const dx = game.player.x - game.tokenNpc.x;
    const dy = game.player.y - game.tokenNpc.y;
    const length = Math.hypot(dx, dy);
    if (length < 62) return;
    const step = Math.min(length - 60, 58 * delta);
    const nx = game.tokenNpc.x + dx / length * step;
    const ny = game.tokenNpc.y + dy / length * step;
    if (lobbyCanStand(nx, game.tokenNpc.y)) game.tokenNpc.x = nx;
    if (lobbyCanStand(game.tokenNpc.x, ny)) game.tokenNpc.y = ny;
  }

  function tick(timestamp) {
    const delta = game.lastTick ? Math.min((timestamp - game.lastTick) / 1000, 0.05) : 0;
    game.lastTick = timestamp;
    game.frame += delta;
    updateDialogueTyping(delta);
    game.effects = game.effects.filter((effect) => {
      effect.age += delta;
      effect.life -= delta;
      if (effect.type === 'spark' || effect.type === 'dirt') {
        effect.x += effect.vx * delta;
        effect.y += effect.vy * delta;
        effect.vy += (effect.type === 'dirt' ? 190 : 95) * delta;
      } else if (effect.type === 'leaf') {
        effect.x += (effect.vx * .35 + Math.sin(effect.age * 9 + effect.seed) * 22) * delta;
        effect.y += effect.vy * delta;
        effect.vy = Math.min(effect.vy + 120 * delta, 34);
      } else effect.y -= 18 * delta;
      return effect.life > 0;
    });
    if (game.mode === 'run') {
      game.attackTimer = Math.max(0, game.attackTimer - delta);
      game.attackCooldown = Math.max(0, game.attackCooldown - delta);
      let x = 0;
      let y = 0;
      const paused = !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden');
      if (!paused && (game.keys.has('ArrowLeft') || game.keys.has('a'))) x--;
      if (!paused && (game.keys.has('ArrowRight') || game.keys.has('d'))) x++;
      if (!paused && (game.keys.has('ArrowUp') || game.keys.has('w'))) y--;
      if (!paused && (game.keys.has('ArrowDown') || game.keys.has('s'))) y++;
      const length = Math.hypot(x, y) || 1;
      x /= length; y /= length;
      game.player.moving = Boolean(x || y);
      if (Math.abs(y) > Math.abs(x)) game.player.facing = y < 0 ? 'up' : 'down';
      else if (x) game.player.facing = x < 0 ? 'left' : 'right';
      const speed = movementSpeed();
      tryMove(game.player, x * speed * delta, y * speed * delta, game.world);
      if (checkAutomaticTransitions()) {
        render(); updateDialoguePosition(); requestAnimationFrame(tick); return;
      }
      updateWorldNpcRoutines(delta);
      updateAnimals(delta);
      updateDig(delta);
      updateChests(delta);
      updateProjectiles(delta);
      updateTrapTriggers();
      if (game.mode === 'run' && (game.realm === 'snow' || game.realm === 'desert')) {
        game.warmth = Math.max(0, game.warmth - delta * (game.realm === 'snow' ? .07 : .055));
        if (game.warmth <= 0) {
          game.exposureClock += delta;
          if (game.exposureClock >= 10) {
            game.exposureClock = 0;
            takeDamage(1, game.realm === 'snow' ? 'Kulda' : 'Heteslag');
          }
        } else game.exposureClock = 0;
      }
      if (game.mode === 'run') {
        game.hudClock += delta;
        if (game.hudClock >= .35) { game.hudClock = 0; updateUI(); }
      }
      if (game.mode !== 'run') { render(); updateDialoguePosition(); requestAnimationFrame(tick); return; }
    } else if (game.mode === 'lobby') {
      const paused = !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
        || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden') || !ui.styleDialog.classList.contains('hidden');
      let x = 0;
      let y = 0;
      if (!paused && (game.keys.has('ArrowLeft') || game.keys.has('a'))) x--;
      if (!paused && (game.keys.has('ArrowRight') || game.keys.has('d'))) x++;
      if (!paused && (game.keys.has('ArrowUp') || game.keys.has('w'))) y--;
      if (!paused && (game.keys.has('ArrowDown') || game.keys.has('s'))) y++;
      const length = Math.hypot(x, y) || 1;
      x /= length; y /= length;
      game.player.moving = Boolean(x || y);
      if (Math.abs(y) > Math.abs(x)) game.player.facing = y < 0 ? 'up' : 'down';
      else if (x) game.player.facing = x < 0 ? 'left' : 'right';
      const nextX = clamp(game.player.x + x * movementSpeed() * .9 * delta, 18, 942);
      const nextY = clamp(game.player.y + y * movementSpeed() * .9 * delta, 18, 542);
      if (lobbyCanStand(nextX, game.player.y)) game.player.x = nextX;
      if (lobbyCanStand(game.player.x, nextY)) game.player.y = nextY;
      moveTokenBroker(delta);
      checkAutomaticTransitions();
    } else if (game.mode === 'interior') {
      const paused = !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
        || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden')
        || !ui.styleDialog.classList.contains('hidden');
      let x = 0; let y = 0;
      if (!paused && (game.keys.has('ArrowLeft') || game.keys.has('a'))) x--;
      if (!paused && (game.keys.has('ArrowRight') || game.keys.has('d'))) x++;
      if (!paused && (game.keys.has('ArrowUp') || game.keys.has('w'))) y--;
      if (!paused && (game.keys.has('ArrowDown') || game.keys.has('s'))) y++;
      const length = Math.hypot(x, y) || 1; x /= length; y /= length;
      game.player.moving = Boolean(x || y);
      if (Math.abs(y) > Math.abs(x)) game.player.facing = y < 0 ? 'up' : 'down';
      else if (x) game.player.facing = x < 0 ? 'left' : 'right';
      const nextX = clamp(game.player.x + x * movementSpeed() * .85 * delta, 24, 936);
      const nextY = clamp(game.player.y + y * movementSpeed() * .85 * delta, 20, 540);
      if (interiorCanStand(nextX, game.player.y)) game.player.x = nextX;
      if (interiorCanStand(game.player.x, nextY)) game.player.y = nextY;
      checkAutomaticTransitions();
    }
    render();
    updateDialoguePosition();
    requestAnimationFrame(tick);
  }

  function pseudo(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function camera() {
    const width = viewWidth;
    const height = viewHeight;
    if (!game.world || game.mode === 'lobby' || game.mode === 'interior') {
      return { x: 0, y: 0 };
    }
    return {
      x: game.world.width < width ? (game.world.width - width) / 2 : clamp(game.player.x - width / 2, 0, game.world.width - width),
      y: game.world.height < height ? (game.world.height - height) / 2 : clamp(game.player.y - height / 2, 0, game.world.height - height),
    };
  }

  function renderGround(camX, camY, realmId) {
    const realm = REALMS[realmId];
    const ground = realm ? realm.ground : '#819a70';
    const water = realmId === 'snow' ? '#87acb2' : realmId === 'desert' ? '#528c99' : '#4d9596';
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    const tile = 16;
    const worldWidth = game.world ? game.world.width : 1500;
    const worldHeight = game.world ? game.world.height : 1100;
    const startX = Math.floor(camX / tile) * tile;
    const startY = Math.floor(camY / tile) * tile;
    for (let y = startY; y < camY + viewHeight + tile; y += tile) {
      for (let x = startX; x < camX + viewWidth + tile; x += tile) {
        const sx = x - camX;
        const sy = y - camY;
        const noise = pseudo(x / tile, y / tile);
        const outside = x + tile < 0 || y + tile < 0 || x > worldWidth || y > worldHeight;
        if (outside) {
          ctx.fillStyle = noise > 0.5 ? water : (realmId === 'snow' ? '#79a4ad' : '#43868f');
          ctx.fillRect(sx, sy, tile, tile);
          if (noise > 0.66) {
            ctx.fillStyle = '#d1e8d350'; ctx.fillRect(sx + (noise > .82 ? 3 : 8), sy + 5, 5, 1);
          }
          continue;
        }
        const edge = Math.min(x, y, worldWidth - x, worldHeight - y);
        if (edge < 40) {
          ctx.fillStyle = noise > .5 ? '#d7c38a' : '#c8b47d'; ctx.fillRect(sx, sy, tile, tile);
          if (noise > .72) { ctx.fillStyle = '#eee0ad'; ctx.fillRect(sx + 3, sy + 4, 2, 2); }
          continue;
        }

        let pathDistance = 999;
        if (realmId === 'forest' || realmId === 'autumn') {
          const trailY = worldHeight * .53 + Math.sin(x * .0031) * 128;
          pathDistance = Math.abs(y - trailY);
        } else if (realmId === 'desert') {
          const trailY = worldHeight * .52 + (x - worldWidth * .5) * .24 + Math.sin(x * .0024) * 82;
          pathDistance = Math.abs(y - trailY);
        } else if (realmId === 'snow') {
          const trailY = worldHeight * .5 - (x - worldWidth * .5) * .19 + Math.sin(x * .003) * 105;
          pathDistance = Math.abs(y - trailY);
        }
        if (pathDistance < 24) {
          const dirt = realmId === 'snow' ? ['#b2aa91', '#c0b99e', '#a59d86'] : realmId === 'desert' ? ['#b18b56', '#c09a60', '#a88450'] : realmId === 'autumn' ? ['#a98762', '#bd9c70', '#9e7d5b'] : ['#a98d64', '#b79a6d', '#9d825e'];
          ctx.fillStyle = dirt[Math.floor(noise * dirt.length)]; ctx.fillRect(sx, sy, tile, tile);
          if (noise > .34 && noise < .8) {
            ctx.fillStyle = '#746a564e'; ctx.fillRect(sx + Math.floor(noise * 10), sy + 5, 2, 2);
            ctx.fillStyle = '#ead7a250'; ctx.fillRect(sx + 10, sy + Math.floor(noise * 10), 2, 1);
          }
          if (pathDistance > 17 && noise > .8) {
            ctx.fillStyle = realmId === 'snow' ? '#edf2dc' : '#788f5a'; ctx.fillRect(sx + 2, sy + 12, 2, 3);
          }
        } else {
          const grass = realmId === 'snow'
            ? ['#b8cfd0', '#c1d6d3', '#adc6c7', '#c7d9d2']
            : realmId === 'autumn' ? ['#a98059', '#b58c60', '#9c7653', '#bd9769']
              : realmId === 'desert' ? ['#c5a66a', '#cfb579', '#b9965d', '#d3b97d']
                : ['#819a62', '#8ca56b', '#779258', '#93a96d'];
          ctx.fillStyle = grass[Math.floor(noise * grass.length)]; ctx.fillRect(sx, sy, tile, tile);
          const fleck = pseudo(x / tile + 19, y / tile + 31);
          if (fleck > .32 && fleck < .58) {
            ctx.fillStyle = realmId === 'snow' ? '#eff4e5' : realmId === 'autumn' ? '#d7ae63' : realmId === 'desert' ? '#e4cb90' : '#aab973';
            ctx.fillRect(sx + 3 + Math.floor(fleck * 5), sy + 4 + Math.floor(noise * 6), 2, 2);
          }
          if (noise > .88 && fleck > .78 && !['snow', 'desert'].includes(realmId)) {
            const flower = realmId === 'autumn' ? '#e9b45b' : noise > .95 ? '#f4e7c6' : '#dba4ab';
            ctx.fillStyle = '#4b7448'; ctx.fillRect(sx + 8, sy + 8, 2, 5);
            ctx.fillStyle = flower; ctx.fillRect(sx + 6, sy + 6, 2, 2); ctx.fillRect(sx + 10, sy + 6, 2, 2); ctx.fillRect(sx + 8, sy + 4, 2, 2);
            ctx.fillStyle = '#dfc868'; ctx.fillRect(sx + 8, sy + 6, 2, 2);
          }
        }
      }
    }
  }

  function shakeAngle(prop) {
    return prop.shake > 0 ? Math.sin(game.frame * 42) * .075 * Math.min(1, prop.shake * 2.2) : 0;
  }

  function drawTree(prop, x, y, snowy = false, biome = game.realm) {
    const s = prop.size;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.rotate(Math.sin(game.frame * 0.72 + prop.x * 0.025) * 0.014 + shakeAngle(prop));
    ctx.fillStyle = '#20372d66'; ctx.fillRect(-25, 3, 50, 8); ctx.fillRect(-19, 10, 38, 3);
    ctx.fillStyle = snowy ? '#6b7969' : '#634b36'; ctx.fillRect(-6, -9, 12, 31);
    ctx.fillStyle = snowy ? '#8b9690' : '#a78051'; ctx.fillRect(-2, -4, 3, 23);
    if (snowy) {
      const pine = prop.shade === 0 ? '#36574e' : '#42665c';
      [[-7, -52, 14], [-15, -44, 30], [-22, -36, 44], [-29, -28, 58], [-34, -20, 68], [-31, -12, 62], [-23, -4, 46]].forEach(([left, top, width], index) => {
        ctx.fillStyle = index % 2 ? pine : '#2d4c47'; ctx.fillRect(left, top, width, 10);
        ctx.fillStyle = '#e8f1e6'; ctx.fillRect(left + 4, top + 1, width - 12, 2);
        ctx.fillStyle = '#b8ced0'; ctx.fillRect(left + 9, top + 4, 4, 2);
      });
    } else {
      const autumn = biome === 'autumn';
      const colors = autumn
        ? prop.shade === 0 ? ['#b5663f', '#d17d45', '#98543c'] : prop.shade === 1 ? ['#bd8144', '#daa04e', '#a75c3c'] : ['#a94c3e', '#c76c43', '#8d453d']
          : prop.shade === 0 ? ['#3c7050', '#4b8256', '#356747'] : prop.shade === 1 ? ['#557e4b', '#679357', '#416f48'] : ['#34674c', '#4b825c', '#2c5b45'];
      [[-8, -49, 16], [-18, -41, 36], [-25, -33, 50], [-31, -25, 62], [-34, -17, 68], [-30, -9, 60], [-22, -1, 44], [-12, 7, 24]].forEach(([left, top, width], index) => {
        ctx.fillStyle = index % 3 === 0 ? colors[2] : index % 2 ? colors[0] : colors[1];
        ctx.fillRect(left, top, width, 9);
      });
      ctx.fillStyle = colors[2]; ctx.fillRect(-25, -31, 7, 7); ctx.fillRect(18, -17, 8, 7); ctx.fillRect(-17, -1, 7, 6);
      ctx.fillStyle = colors[1]; ctx.fillRect(-12, -42, 7, 5); ctx.fillRect(7, -34, 7, 5); ctx.fillRect(-4, -15, 8, 5);
      ctx.fillStyle = autumn ? '#f0c66b' : '#9ebc6b'; ctx.fillRect(12, -24, 5, 5);
    }
    ctx.restore();
  }

  function drawProp(prop, camX, camY) {
    const x = prop.x - camX;
    const y = prop.y - camY;
    if (x < -90 || y < -90 || x > viewWidth + 90 || y > viewHeight + 90) return;
    const s = prop.size;
    if (prop.type === 'tree') { drawTree(prop, x, y, false); return; }
    if (prop.type === 'pine') { drawTree(prop, x, y, true); return; }
    if (prop.type === 'cactus') {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(shakeAngle(prop));
      ctx.fillStyle = '#74634540'; ctx.beginPath(); ctx.ellipse(2, 4, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#427a57'; ctx.fillRect(-5, -29, 10, 37); ctx.fillRect(-17, -15, 9, 8); ctx.fillRect(-17, -22, 7, 15); ctx.fillRect(8, -23, 9, 8); ctx.fillRect(11, -29, 6, 14);
      ctx.strokeStyle = '#a5c077'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, -24); ctx.lineTo(-1, 2); ctx.moveTo(14, -21); ctx.lineTo(14, -15); ctx.stroke();
      ctx.restore(); return;
    }
    if (prop.type === 'rock') {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = '#1a322c55'; ctx.fillRect(-20, 5, 40, 8); ctx.fillRect(-13, 11, 27, 3);
      const stone = game.realm === 'snow' ? '#8da5aa' : game.realm === 'desert' ? '#8f805e' : game.realm === 'autumn' ? '#79684d' : '#69775f';
      ctx.fillStyle = '#3f4b42'; ctx.fillRect(-17, -5, 34, 14); ctx.fillRect(-12, -12, 24, 9); ctx.fillRect(-6, -17, 14, 7);
      ctx.fillStyle = stone; ctx.fillRect(-15, -6, 30, 13); ctx.fillRect(-11, -13, 22, 8); ctx.fillRect(-5, -18, 12, 6);
      ctx.fillStyle = '#ffffff47'; ctx.fillRect(-8, -14, 7, 3); ctx.fillRect(-13, -6, 4, 4);
      ctx.fillStyle = '#4a5147'; ctx.fillRect(9, -4, 4, 8); ctx.fillRect(2, -10, 3, 4);
      ctx.restore(); return;
    }
    ctx.fillStyle = game.realm === 'snow' ? '#f1f4df' : game.realm === 'desert' ? '#938459' : game.realm === 'autumn' ? '#e0ad57' : '#d9cf83';
    ctx.fillRect(x - 4 * s, y, 2 * s, 4 * s); ctx.fillRect(x - 1 * s, y - 2 * s, 2 * s, 5 * s); ctx.fillRect(x + 2 * s, y, 2 * s, 4 * s);
  }

  function drawAnimal(animal, camX, camY) {
    if (animal.dead) return;
    const x = animal.x - camX;
    const y = animal.y - camY;
    if (x < -100 || y < -100 || x > viewWidth + 100 || y > viewHeight + 100) return;
    const step = animal.moving ? Math.floor(game.frame * 8 + animal.phase) % 2 : 0;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (animal.facing === 'left') ctx.scale(-1, 1);
    ctx.fillStyle = '#20372d70'; ctx.fillRect(-25, 12, 50, 8);
    if (animal.species === 'bear') {
      const fur = animal.hitFlash > 0 ? '#f7e6d2' : animal.color;
      ctx.fillStyle = '#50382e'; ctx.fillRect(-20, -17, 41, 29); ctx.fillRect(-25, -10, 11, 22); ctx.fillRect(14, -9, 13, 20);
      ctx.fillStyle = fur; ctx.fillRect(-18, -16, 37, 26); ctx.fillRect(-23, -9, 9, 18); ctx.fillRect(14, -8, 10, 17);
      ctx.fillRect(-14, -25, 28, 15); ctx.fillRect(-11, -30, 22, 9);
      ctx.fillStyle = '#50382e'; ctx.fillRect(-14, -30, 7, 7); ctx.fillRect(7, -30, 7, 7);
      ctx.fillStyle = fur; ctx.fillRect(-12, -29, 4, 4); ctx.fillRect(8, -29, 4, 4);
      ctx.fillStyle = '#d2ab87'; ctx.fillRect(-7, -20, 16, 8); ctx.fillRect(-4, -17, 10, 4);
      ctx.fillStyle = '#241f20'; ctx.fillRect(4, -22, 3, 3); ctx.fillRect(3, -16, 4, 3);
      ctx.fillStyle = '#513a2f'; ctx.fillRect(-15, 9 + step, 9, 9); ctx.fillRect(8, 9 - step, 9, 9);
    } else if (animal.species === 'scorpion') {
      const shell = animal.hitFlash > 0 ? '#fff0cf' : animal.color;
      ctx.fillStyle = '#633d36'; ctx.fillRect(-20, -7, 39, 18); ctx.fillRect(-14, -14, 27, 9); ctx.fillRect(12, -3, 17, 11);
      ctx.fillStyle = shell; ctx.fillRect(-18, -6, 35, 14); ctx.fillRect(-12, -12, 24, 8); ctx.fillRect(13, -2, 14, 7);
      for (let i = 0; i < 4; i++) {
        const lx = -14 + i * 9;
        ctx.fillStyle = '#563530'; ctx.fillRect(lx, 7, 3, 8); ctx.fillRect(lx - 5, 14 + (i % 2) * 2, 8, 3);
        ctx.fillRect(lx + 3, -1, 3, 8); ctx.fillRect(lx + 2, 6 + (i % 2) * 2, 8, 3);
      }
      ctx.fillStyle = '#48302d'; ctx.fillRect(20, -6, 8, 4); ctx.fillRect(26, -10, 5, 5); ctx.fillRect(29, -15, 4, 6);
      ctx.fillStyle = animal.aggro ? '#f4d55f' : '#e7b34f'; ctx.fillRect(19, -7, 3, 3); ctx.fillRect(24, -3, 3, 3);
      ctx.fillStyle = '#251f21'; ctx.fillRect(20, -7, 2, 2);
    } else {
      const fur = animal.hitFlash > 0 ? '#fff4df' : animal.color;
      ctx.fillStyle = '#465863'; ctx.fillRect(-20, -9, 37, 22); ctx.fillRect(10, -18, 18, 19); ctx.fillRect(24, -14, 12, 10);
      ctx.fillStyle = fur; ctx.fillRect(-18, -8, 33, 18); ctx.fillRect(11, -17, 15, 16); ctx.fillRect(25, -13, 10, 7);
      ctx.fillStyle = '#526873'; ctx.fillRect(12, -25, 6, 10); ctx.fillRect(21, -24, 6, 10);
      ctx.fillStyle = fur; ctx.fillRect(14, -23, 3, 7); ctx.fillRect(22, -22, 3, 6);
      ctx.fillStyle = '#d9d5c8'; ctx.fillRect(28, -9, 8, 4); ctx.fillRect(30, -5, 5, 3);
      ctx.fillStyle = '#222b31'; ctx.fillRect(23, -14, 3, 3); ctx.fillRect(33, -8, 2, 2);
      ctx.fillStyle = '#35434a'; ctx.fillRect(-13, 7 + step, 6, 12); ctx.fillRect(-2, 7 - step, 6, 12); ctx.fillRect(10, 7 + step, 6, 12);
      ctx.fillStyle = '#aabec0'; ctx.fillRect(-27, -5, 11, 5); ctx.fillRect(-32, -2, 8, 5);
    }
    ctx.restore();
    if (animal.aggro || animal.hpNow < animal.hp) {
      const width = animal.species === 'bear' ? 44 : 40;
      ctx.fillStyle = '#2d312d'; ctx.fillRect(x - width / 2, y - 39, width, 5);
      ctx.fillStyle = '#b7413c'; ctx.fillRect(x - width / 2 + 1, y - 38, Math.max(1, (width - 2) * animal.hpNow / animal.hp), 3);
      ctx.fillStyle = '#fff0de'; ctx.font = '5px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText(animal.name.toUpperCase(), x, y - 43);
    }
  }

  function treeLeafColor(chest) {
    if (chest.parent?.type === 'cactus') return '#427a57';
    return game.realm === 'snow' ? '#36574e' : game.realm === 'autumn' ? '#c0723f' : '#3c7050';
  }

  function drawDigSpot(chest, x, y) {
    const gap = distance(game.player, chest);
    const mound = clamp((190 - gap) / 70, 0, 1);
    const twinkle = clamp((330 - gap) / 120, 0, 1);
    if (twinkle <= 0) return;
    if (mound > 0) {
      ctx.save(); ctx.globalAlpha = mound; ctx.translate(Math.round(x), Math.round(y));
      ctx.fillStyle = '#243b3055'; ctx.fillRect(-18, 6, 36, 5);
      ctx.fillStyle = '#6e5236'; ctx.fillRect(-17, 0, 34, 8); ctx.fillRect(-12, -5, 24, 6);
      ctx.fillStyle = '#8c6a43'; ctx.fillRect(-15, 0, 30, 6); ctx.fillRect(-10, -4, 20, 4);
      ctx.fillStyle = '#b08a5c'; ctx.fillRect(-8, -4, 9, 2); ctx.fillRect(-13, 1, 5, 2);
      ctx.fillStyle = '#f3e3b0';
      for (let i = -3; i <= 3; i++) { ctx.fillRect(i * 2 - 1, i * 2 - 3, 2, 2); ctx.fillRect(i * 2 - 1, -i * 2 - 3, 2, 2); }
      ctx.restore();
    }
    if (Math.sin(game.frame * 5 + chest.id * 2) > .2) {
      ctx.save(); ctx.globalAlpha = twinkle;
      const gx = Math.round(x + 14); const gy = Math.round(y - 10 - Math.sin(game.frame * 3 + chest.id) * 2);
      ctx.fillStyle = '#fff0a8'; ctx.fillRect(gx, gy - 4, 2, 9); ctx.fillRect(gx - 3, gy - 1, 8, 2);
      ctx.restore();
    }
  }

  function drawChest(chest, camX, camY) {
    const gx = chest.x - camX;
    const gy = chest.y - camY;
    const perched = chest.state === 'hidden' && chest.kind === 'tree';
    const dropping = chest.state === 'dropping';
    if (gx < -60 || gy < -90 || gx > viewWidth + 60 || gy > viewHeight + 60) return;
    if (chest.state === 'hidden' && chest.kind === 'buried') { drawDigSpot(chest, gx, gy); return; }
    const rarity = chest.rarity;
    const rising = chest.state === 'rising';
    let x = gx; let y = gy; let scale = 1;
    if (perched) { x = chest.perch.x - camX + Math.sin(game.frame * 1.6 + chest.id) * .6; y = chest.perch.y - camY; scale = .72; }
    else if (dropping) {
      x = chest.fall.x - camX; y = chest.fall.y - camY;
      scale = 1 - .28 * clamp((gy - y) / chest.fall.height, 0, 1);
    }
    const idle = chest.state === 'ready' && !chest.opened;
    const cy = Math.round(y + (idle ? Math.sin(game.frame * 3 + chest.id) * 1.2 : 0));

    if (dropping || chest.state === 'ready' || chest.opened) {
      const lift = dropping ? clamp((gy - y) / 70, 0, 1) : 0;
      ctx.fillStyle = '#243b3066';
      ctx.fillRect(gx - 16 + lift * 6, gy + 8, 32 - lift * 12, 5); ctx.fillRect(gx - 11 + lift * 5, gy + 12, 22 - lift * 10, 2);
    }
    const dugOut = chest.kind === 'buried' && (rising || chest.state === 'ready' || chest.opened);
    if (dugOut) {
      ctx.fillStyle = '#4a3827'; ctx.fillRect(gx - 22, gy + 2, 44, 10);
      ctx.fillStyle = '#6e5236'; ctx.fillRect(gx - 26, gy + 6, 12, 6); ctx.fillRect(gx + 15, gy + 6, 12, 6); ctx.fillRect(gx - 20, gy, 8, 5); ctx.fillRect(gx + 13, gy, 8, 5);
      ctx.fillStyle = '#8c6a43'; ctx.fillRect(gx - 24, gy + 6, 8, 3); ctx.fillRect(gx + 17, gy + 6, 8, 3); ctx.fillRect(gx - 18, gy, 5, 2);
    }

    ctx.save();
    if (rising) {
      const t = clamp(chest.riseT, 0, 1);
      ctx.beginPath(); ctx.rect(gx - 40, gy - 90, 80, 94); ctx.clip();
      ctx.translate(Math.round(x), Math.round(cy + (1 - t * (2 - t)) * 30 + Math.sin(game.frame * 60) * (1 - t) * 1.2));
    } else ctx.translate(Math.round(x), cy);
    ctx.scale(scale, scale);
    if (perched) {
      ctx.fillStyle = '#674d34'; ctx.fillRect(-16, 7, 32, 3);
      ctx.fillStyle = '#b18b55'; ctx.fillRect(-13, 4, 26, 3);
    }
    // Kiste med mørk pikselkontur, treplanker, gullbeslag og farget sjeldenhetskant.
    ctx.fillStyle = '#422f25'; ctx.fillRect(-15, -10, 30, 21);
    ctx.fillStyle = '#a96c32'; ctx.fillRect(-12, -7, 24, 15);
    ctx.fillStyle = '#cf9141'; ctx.fillRect(-12, -6, 24, 3);
    ctx.fillStyle = '#84502c'; ctx.fillRect(-12, -2, 24, 2); ctx.fillRect(-12, 4, 24, 2);
    ctx.fillStyle = '#f0ca69'; ctx.fillRect(-13, -10, 26, 2);
    ctx.fillRect(-14, -8, 3, 17); ctx.fillRect(11, -8, 3, 17);
    ctx.fillStyle = rarity.color; ctx.fillRect(-3, -8, 6, 17);
    ctx.fillStyle = '#fff0a8'; ctx.fillRect(-2, -1, 4, 5); ctx.fillRect(-1, 0, 2, 3);
    if (chest.opened) {
      const lift = Math.min(5, Math.floor((game.frame - (chest.openedAt || game.frame)) * 18));
      ctx.fillStyle = '#36281f'; ctx.fillRect(-12, -14 - lift, 24, 7);
      ctx.fillStyle = '#e3ad4c'; ctx.fillRect(-10, -13 - lift, 20, 3);
      ctx.fillStyle = '#fff0a8'; ctx.fillRect(-6, -5, 12, 2);
    } else {
      ctx.fillStyle = '#f8d87b'; ctx.fillRect(-11, -9, 22, 2);
    }
    ctx.restore();

    if (perched) {
      // Løvtuster foran kista, så den ser ut som den sitter fast i greinene.
      const leaf = treeLeafColor(chest);
      ctx.fillStyle = leaf; ctx.fillRect(Math.round(x) - 17, Math.round(cy) + 1, 10, 6); ctx.fillRect(Math.round(x) + 6, Math.round(cy) + 3, 12, 5); ctx.fillRect(Math.round(x) - 6, Math.round(cy) + 6, 12, 4);
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(Math.round(x) - 15, Math.round(cy) + 2, 4, 2);
    }
    if (rising) {
      ctx.fillStyle = '#6e5236'; ctx.fillRect(gx - 26, gy + 4, 12, 7); ctx.fillRect(gx + 14, gy + 4, 12, 7);
      ctx.fillStyle = '#8c6a43'; ctx.fillRect(gx - 24, gy + 4, 8, 3); ctx.fillRect(gx + 16, gy + 4, 8, 3);
    }
    if (!chest.opened && rarity.id !== 'common' && !rising && Math.sin(game.frame * 8 + chest.id) > .15) {
      const sparkleX = Math.round(x) + (Math.floor(game.frame * 5 + chest.id) % 2 ? 19 : -19) * scale;
      ctx.fillStyle = rarity.glow; ctx.fillRect(sparkleX, cy - 17 * scale, 2, 7); ctx.fillRect(sparkleX - 3, cy - 14 * scale, 8, 2);
    }
    if (perched && hasTool('slingshot') && distance(game.player, chest) <= SLING_RANGE) {
      const pulse = 1 + Math.sin(game.frame * 5) * .08;
      ctx.save(); ctx.translate(Math.round(x), cy); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-12, 0); ctx.moveTo(12, 0); ctx.lineTo(22, 0); ctx.moveTo(0, -22); ctx.lineTo(0, -12); ctx.moveTo(0, 12); ctx.lineTo(0, 22); ctx.stroke();
      ctx.restore();
    }
  }

  function drawEffects(camX, camY) {
    for (const effect of game.effects) {
      const x = Math.round(effect.x - camX);
      const y = Math.round(effect.y - camY);
      const alpha = clamp(effect.life / (effect.type === 'artifact' ? 2.8 : effect.type === 'float' ? 1.2 : .45), 0, 1);
      ctx.save(); ctx.globalAlpha = alpha;
      if (effect.type === 'artifact') {
        const left = x - 76;
        const top = y - 32;
        ctx.fillStyle = '#302b27'; ctx.fillRect(left, top, 152, 37);
        ctx.fillStyle = '#fff8dc'; ctx.fillRect(left + 2, top + 2, 148, 33);
        ctx.fillStyle = '#d4b76d'; ctx.fillRect(left + 3, top + 3, 146, 2);
        drawArtifactPixels(ctx, effect.artifact, left + 7, top + 7, 24);
        ctx.fillStyle = '#2b352f'; ctx.font = '5px "Press Start 2P", monospace'; ctx.textAlign = 'left';
        ctx.fillText(effect.artifact.name, left + 37, top + 17, 108);
        const rarity = RARITIES.find((item) => item.name === effect.artifact.rarity);
        ctx.fillStyle = rarity?.color || '#63735d'; ctx.font = '4px "Press Start 2P", monospace';
        ctx.fillText(`${effect.artifact.rarity} · ${effect.artifact.value} MYNTER`, left + 37, top + 29, 108);
      } else if (effect.type === 'float') {
        ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = '#342a20'; ctx.strokeText(effect.text, x + 1, y - 13);
        ctx.fillStyle = effect.color; ctx.fillText(effect.text, x, y - 14);
      } else if (effect.type === 'leaf') {
        const flip = Math.sin(effect.age * 9 + effect.seed) > 0;
        ctx.fillStyle = effect.color; ctx.fillRect(x, y, flip ? 4 : 3, 2); ctx.fillRect(x + 1, y - 1, 2, 1);
      } else if (effect.type === 'dirt') {
        ctx.fillStyle = effect.color; ctx.fillRect(x, y, 3, 3);
        ctx.fillStyle = '#00000026'; ctx.fillRect(x, y + 2, 3, 1);
      } else {
        const size = effect.life > .35 ? 3 : 2;
        ctx.fillStyle = effect.color; ctx.fillRect(x - size, y, size * 2 + 1, size);
        ctx.fillRect(x, y - size, size, size * 2 + 1);
        ctx.fillStyle = '#fff6c4'; ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();
    }
  }

  function drawRpgCompass(x, y, nearest = null) {
    const cx = Math.round(x);
    const cy = Math.round(y + 5);
    let angle = -Math.PI / 2;
    if (nearest) angle = Math.atan2(nearest.y - game.player.y, nearest.x - game.player.x);
    ctx.save();
    ctx.fillStyle = '#172f2d77'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e7cf83'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff2b9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const tick = i * Math.PI / 4;
      const inner = i % 2 ? 13 : 10;
      ctx.strokeStyle = i % 2 ? '#e9e2c1' : '#f0bd59'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(tick) * inner, cy + Math.sin(tick) * inner);
      ctx.lineTo(cx + Math.cos(tick) * 15, cy + Math.sin(tick) * 15); ctx.stroke();
    }
    ctx.fillStyle = '#ffdb70';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * 10, cy + Math.sin(angle) * 10);
    ctx.lineTo(cx + Math.cos(angle + 2.35) * 3, cy + Math.sin(angle + 2.35) * 3);
    ctx.lineTo(cx + Math.cos(angle - 2.35) * 3, cy + Math.sin(angle - 2.35) * 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff7d8'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.restore();
  }

  function drawExitPortal(portal, camX, camY) {
    const x = portal.x - camX; const y = portal.y - camY;
    ctx.fillStyle = '#1c3c3b66'; ctx.fillRect(x - 28, y + 16, 56, 9);
    ctx.strokeStyle = '#e0c36f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, 23, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#b7e5d966'; ctx.beginPath(); ctx.ellipse(x, y, 17, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c8f4dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + Math.sin(game.frame * 2) * 2, 15, 23, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff6d8'; ctx.fillRect(x - 42, y + 34, 84, 18);
    ctx.strokeStyle = '#3c5142'; ctx.lineWidth = 2; ctx.strokeRect(x - 42, y + 34, 84, 18);
    ctx.fillStyle = '#3d4c40'; ctx.font = '5px "Press Start 2P", monospace'; ctx.textAlign = 'center';
    ctx.fillText(distance(game.player, portal) < 50 ? 'GÅ HJEM' : 'PORTAL', x, y + 46);
  }

  function drawMeleeSwing(player, x, y) {
    if (game.attackTimer <= 0) return;
    const flicker = Math.floor(game.frame * 20) % 2;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#fff0a9';
    if (player.facing === 'up') {
      ctx.fillRect(-20, -51 - flicker * 3, 38, 3); ctx.fillRect(-26, -45, 4, 17); ctx.fillRect(17, -47, 4, 16);
    } else if (player.facing === 'down') {
      ctx.fillRect(-20, 17 + flicker * 2, 38, 3); ctx.fillRect(-25, 4, 4, 18); ctx.fillRect(18, 7, 4, 16);
    } else if (player.facing === 'left') {
      ctx.fillRect(-35 - flicker * 2, -24, 3, 38); ctx.fillRect(-29, -31, 17, 4); ctx.fillRect(-30, 15, 16, 4);
    } else {
      ctx.fillRect(32 + flicker * 2, -24, 3, 38); ctx.fillRect(15, -31, 17, 4); ctx.fillRect(15, 15, 16, 4);
    }
    ctx.fillStyle = '#fff';
    if (player.facing === 'up') ctx.fillRect(-5, -54, 8, 3);
    else if (player.facing === 'down') ctx.fillRect(-5, 20, 8, 3);
    else ctx.fillRect(player.facing === 'left' ? -39 : 36, -5, 3, 8);
    ctx.restore();
  }

  function drawPlayer(player, x, y, appearance = save.appearance, talking = false) {
    const pixel = 2;
    const walk = player.moving ? Math.floor(game.frame * 8) % 2 : 0;
    const front = [
      '....HHHH....', '...hHHHHh...', '..hhHHHHhh..', '..rffffffr..',
      '..rfeefefr..', '...ffmff....', '....ffff....', '..bbcccccc..',
      '..bbCCCCcc..', '...gggggg...', '...pppppp...', '..PpppppP...',
    ];
    const back = [
      '....HHHH....', '...hHHHHh...', '..hhHHHHhh..', '...rrrrrr...',
      '..rrrrrrrr..', '..bbBBBBbb..', '..bbBBBBbb..', '..bbBBBBbb..',
      '..bbCCCCbb..', '..bbCCCCbb..', '...gggg.....', '...pppp.....',
    ];
    const profile = [
      '...HHHH.....', '..hHHHHh....', '..hhHHHH....', '..rffff.....',
      '..rfeef.....', '...ffm......', '..bbccccc...', '..bbCCCC....',
      '...ggcc.....', '...ppp......', '...ppp......', '...ppp......',
    ];
    const facing = player.facing || 'down';
    const rows = facing === 'up' ? back : facing === 'left' || facing === 'right' ? profile : front;
    const colors = {
      H: appearance.hatDark, h: appearance.hat, f: appearance.skin, e: '#28332e', r: appearance.hair,
      b: appearance.backpackDark, B: appearance.backpack, c: appearance.shirt, C: appearance.shirtDark,
      g: '#edc86a', p: appearance.pants, P: appearance.pantsDark, m: '#743d36',
    };
    const bob = player.moving && facing !== 'up' ? Math.floor(game.frame * 8) % 2 : 0;
    ctx.save();
    ctx.translate(x, y + bob);
    if (facing === 'right') ctx.scale(-1, 1);
    // Dyp skygge, separate armer og tydelige støvler gjør figuren lesbar mot bakken.
    ctx.fillStyle = '#172e2b75'; ctx.fillRect(-15, -1, 30, 5); ctx.fillRect(-10, 3, 20, 2);
    const armSwing = player.moving ? Math.floor(game.frame * 8) % 2 : 0;
    ctx.fillStyle = appearance.skin; ctx.fillRect(-14, -21 + armSwing, 3, 9); ctx.fillRect(11, -21 - armSwing, 3, 9);
    ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-14, -22 + armSwing, 3, 3); ctx.fillRect(11, -22 - armSwing, 3, 3);
    const left = -12;
    const top = -34;
    rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, column) => {
        if (cell === '.') return;
        ctx.fillStyle = colors[cell];
        ctx.fillRect(left + column * pixel, top + rowIndex * pixel, pixel, pixel);
      });
    });
    if (appearance.outfit === 'coat') {
      ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-2, -18, 4, 14);
      ctx.fillStyle = '#f0d59b'; ctx.fillRect(-5, -19, 3, 5); ctx.fillRect(2, -19, 3, 5);
    } else if (appearance.outfit === 'cape') {
      ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-11, -21, 4, 17); ctx.fillRect(7, -21, 4, 17);
      ctx.fillStyle = '#d9c47b'; ctx.fillRect(-2, -19, 4, 3);
    } else if (appearance.outfit === 'apron') {
      ctx.fillStyle = '#f2dfb5'; ctx.fillRect(-4, -17, 8, 13);
      ctx.fillStyle = '#ad7748'; ctx.fillRect(-4, -7, 8, 2);
    } else if (appearance.outfit === 'sailor') {
      ctx.fillStyle = '#f2e9d2'; ctx.fillRect(-7, -20, 14, 4); ctx.fillRect(-4, -16, 8, 4);
      ctx.fillStyle = '#bd624a'; ctx.fillRect(-2, -13, 4, 4);
    } else if (appearance.outfit === 'vest' || appearance.outfit === 'royal') {
      ctx.fillStyle = appearance.outfit === 'royal' ? '#e6c15a' : '#d6b77d';
      ctx.fillRect(-2, -18, 4, 13); ctx.fillRect(-7, -18, 3, 3); ctx.fillRect(4, -18, 3, 3);
    } else if (appearance.outfit === 'tunic') {
      ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-10, -8, 20, 3); ctx.fillStyle = '#e8c870'; ctx.fillRect(-2, -8, 4, 3);
      ctx.fillStyle = '#f0e6b8'; ctx.fillRect(-5, -20, 10, 2);
    } else if (appearance.outfit === 'redcoat') {
      ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-2, -19, 4, 15);
      ctx.fillStyle = '#f0c545'; ctx.fillRect(2, -17, 2, 2); ctx.fillRect(2, -12, 2, 2); ctx.fillRect(2, -7, 2, 2);
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(-6, -21, 12, 2);
    } else if (appearance.outfit === 'armor') {
      ctx.fillStyle = '#f2d56b'; ctx.fillRect(-9, -21, 18, 3); ctx.fillRect(-8, -17, 16, 10);
      ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-1, -17, 2, 10); ctx.fillRect(-8, -12, 16, 2);
      ctx.fillStyle = '#fff1a3'; ctx.fillRect(-6, -16, 4, 3);
      ctx.fillStyle = '#f2d56b'; ctx.fillRect(-14, -23, 5, 4); ctx.fillRect(9, -23, 5, 4);
    } else if (appearance.outfit === 'piratecoat') {
      ctx.fillStyle = appearance.shirtDark; ctx.fillRect(-2, -19, 4, 15); ctx.fillRect(-12, -9, 24, 3);
      ctx.fillStyle = '#f2ead8'; ctx.fillRect(-5, -21, 4, 6); ctx.fillRect(1, -21, 4, 6);
      ctx.fillStyle = '#f0c545'; ctx.fillRect(-8, -17, 2, 2); ctx.fillRect(6, -17, 2, 2); ctx.fillRect(-8, -12, 2, 2); ctx.fillRect(6, -12, 2, 2);
    } else if (appearance.outfit === 'trail') {
      ctx.fillStyle = '#e7c46f'; ctx.fillRect(-1, -17, 2, 12); ctx.fillRect(3, -14, 2, 2); ctx.fillRect(3, -9, 2, 2);
    }
    if (appearance.hatStyle === 'redcap') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-12, -34, 25, 4); ctx.fillRect(-9, -39, 19, 6);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-8, -39, 17, 6); ctx.fillRect(8, -35, 9, 3);
      ctx.fillStyle = '#f2ead8'; ctx.fillRect(-2, -37, 4, 3);
    } else if (appearance.hatStyle === 'cowboy') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-19, -33, 38, 4); ctx.fillRect(-12, -39, 24, 7);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-10, -40, 20, 7); ctx.fillRect(-17, -32, 34, 2);
      ctx.fillStyle = '#4a2e1c'; ctx.fillRect(-10, -35, 20, 2);
    } else if (appearance.hatStyle === 'viking') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-12, -33, 24, 4); ctx.fillRect(-10, -39, 20, 7);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-9, -39, 18, 6); ctx.fillRect(-2, -34, 4, 6);
      ctx.fillStyle = '#f4ecd0'; ctx.fillRect(-17, -44, 4, 11); ctx.fillRect(13, -44, 4, 11); ctx.fillRect(-14, -46, 3, 4); ctx.fillRect(11, -46, 3, 4);
    } else if (appearance.hatStyle === 'chef') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-13, -34, 26, 4);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-9, -43, 18, 9); ctx.fillRect(-6, -47, 12, 5); ctx.fillRect(-11, -39, 22, 5);
      ctx.fillStyle = '#fff4db'; ctx.fillRect(-7, -44, 14, 2);
    } else if (appearance.hatStyle === 'sailor') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-15, -34, 30, 4); ctx.fillRect(-10, -39, 20, 6);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-8, -38, 16, 3);
      ctx.fillStyle = '#f3e5c6'; ctx.fillRect(-3, -36, 6, 2);
    } else if (appearance.hatStyle === 'cap') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-12, -34, 25, 4); ctx.fillRect(-9, -39, 19, 6);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-7, -38, 14, 4); ctx.fillRect(7, -35, 8, 2);
    } else if (appearance.hatStyle === 'bonnet') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-13, -34, 27, 4); ctx.fillRect(-11, -40, 22, 7);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-9, -39, 18, 5); ctx.fillRect(-13, -35, 26, 2);
      ctx.fillStyle = '#efdfbd'; ctx.fillRect(-11, -32, 4, 3); ctx.fillRect(8, -32, 4, 3);
    } else if (appearance.hatStyle === 'pirate') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-16, -33, 32, 4); ctx.fillRect(-10, -37, 20, 4);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-9, -36, 18, 3); ctx.fillRect(-12, -31, 24, 2);
      ctx.fillStyle = '#f4e2b3'; ctx.fillRect(-2, -35, 4, 3);
    } else if (appearance.hatStyle === 'wizard') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-12, -34, 24, 4); ctx.fillRect(-9, -38, 18, 4); ctx.fillRect(-6, -42, 12, 4); ctx.fillRect(-3, -46, 6, 4);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-8, -38, 16, 2); ctx.fillRect(-4, -44, 8, 2);
      ctx.fillStyle = '#ffe07a'; ctx.fillRect(1, -39, 3, 3); ctx.fillRect(-4, -43, 2, 2);
    } else if (appearance.hatStyle === 'crown') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-13, -34, 26, 5);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-12, -39, 24, 6); ctx.fillRect(-12, -44, 4, 6); ctx.fillRect(-2, -46, 4, 8); ctx.fillRect(8, -44, 4, 6);
      ctx.fillStyle = '#e85e54'; ctx.fillRect(-8, -37, 3, 3); ctx.fillStyle = '#72bfd0'; ctx.fillRect(5, -37, 3, 3);
    } else if (appearance.hatStyle === 'star') {
      ctx.fillStyle = appearance.hatDark; ctx.fillRect(-14, -33, 28, 4); ctx.fillRect(-9, -39, 18, 7); ctx.fillRect(-5, -43, 10, 5);
      ctx.fillStyle = appearance.hat; ctx.fillRect(-7, -38, 14, 3); ctx.fillRect(-3, -42, 6, 2);
      ctx.fillStyle = '#ffe78a'; ctx.fillRect(-1, -39, 3, 3);
    }
    if (talking && Math.sin(game.frame * 16) > 0) {
      ctx.fillStyle = '#672f34'; ctx.fillRect(-1, -22, 3, 2);
    }
    // Beina bytter pikselmønster for en liten, tydelig gå-animasjon.
    if (walk === 0) {
      ctx.fillStyle = appearance.pantsDark; ctx.fillRect(-8, -10, 6, 6); ctx.fillRect(2, -10, 6, 6);
      ctx.fillStyle = appearance.boots; ctx.fillRect(-9, -4, 7, 3); ctx.fillRect(2, -4, 7, 3);
      ctx.fillStyle = appearance.bootsDark; ctx.fillRect(-9, -1, 7, 1); ctx.fillRect(2, -1, 7, 1);
    } else {
      ctx.fillStyle = appearance.pantsDark; ctx.fillRect(-9, -11, 6, 6); ctx.fillRect(3, -9, 6, 6);
      ctx.fillStyle = appearance.boots; ctx.fillRect(-12, -5, 7, 3); ctx.fillRect(4, -3, 7, 3);
      ctx.fillStyle = appearance.bootsDark; ctx.fillRect(-12, -2, 7, 1); ctx.fillRect(4, 0, 7, 1);
    }
    ctx.restore();
  }

  function drawWorld(camX, camY) {
    renderGround(camX, camY, game.realm);
    if (game.world.exitPortal) drawExitPortal(game.world.exitPortal, camX, camY);
    const entities = [];
    for (const prop of game.props) entities.push({ y: prop.y, draw: () => drawProp(prop, camX, camY) });
    for (const chest of game.chests) if (!inTreetop(chest)) entities.push({ y: chest.y, draw: () => drawChest(chest, camX, camY) });
    for (const animal of game.animals) entities.push({ y: animal.y, draw: () => drawAnimal(animal, camX, camY) });
    for (const npc of game.worldNpcs) entities.push({ y: npcPosition(npc).y, draw: () => drawLobbyNpc(npc, camX, camY) });
    entities.push({ y: game.player.y, draw: () => {
      const near = game.chests.filter((chest) => !chest.opened).sort((a, b) => distance(game.player, a) - distance(game.player, b))[0];
      drawRpgCompass(game.player.x - camX, game.player.y - camY, near);
      drawPlayer(game.player, game.player.x - camX, game.player.y - camY);
      drawShovel(game.player.x - camX, game.player.y - camY);
      drawMeleeSwing(game.player, game.player.x - camX, game.player.y - camY);
    } });
    entities.sort((a, b) => a.y - b.y).forEach((entity) => entity.draw());
    for (const chest of game.chests) if (inTreetop(chest)) drawChest(chest, camX, camY);
    drawWorldTraps(camX, camY);
    drawDigProgress(camX, camY);
    for (const shot of game.projectiles) {
      const sx = Math.round(shot.x - camX); const sy = Math.round(shot.y - camY - (shot.arc || 0));
      ctx.fillStyle = '#00000033'; ctx.fillRect(sx - 2, Math.round(shot.y - camY) + 4, 5, 2);
      ctx.fillStyle = '#4b4b4b'; ctx.fillRect(sx - 2, sy - 2, 5, 5); ctx.fillStyle = '#b7b7b7'; ctx.fillRect(sx - 1, sy - 2, 2, 2);
    }
    drawEffects(camX, camY);
    if (game.realm === 'snow') drawSnow();
    if (game.realm === 'desert') drawHeatShimmer();
    if (game.realm === 'autumn') drawAutumnLeaves();
    const target = game.chests.map((chest) => ({ chest, prompt: chestPrompt(chest) }))
      .filter((item) => item.prompt && distance(item.chest, game.player) <= item.prompt.range)
      .sort((a, b) => distance(a.chest, game.player) - distance(b.chest, game.player))[0];
    if (target && !game.dig) {
      const x = target.chest.x - camX;
      const y = target.chest.y - camY - (target.chest.state === 'hidden' && target.chest.kind === 'tree' ? 32 : 35);
      ctx.font = 'bold 9px "DM Sans", sans-serif'; ctx.textAlign = 'center';
      const width = Math.ceil(ctx.measureText(target.prompt.label).width) + 18;
      ctx.fillStyle = '#173b34e8'; ctx.beginPath(); ctx.roundRect(Math.round(x - width / 2), y - 12, width, 19, 6); ctx.fill();
      ctx.fillStyle = '#fff5dc'; ctx.fillText(target.prompt.label, x, y + 1);
    }
  }

  function inTreetop(chest) {
    return chest.kind === 'tree' && (chest.state === 'hidden' || chest.state === 'dropping');
  }

  function drawWorldTraps(camX, camY) {
    for (const trap of game.traps) {
      const range = distance(game.player, trap);
      if (!trap.triggered && range > 125) continue;
      const x = trap.x - camX;
      const y = trap.y - camY;
      ctx.fillStyle = trap.triggered ? '#6d3a354f' : '#5844378a';
      ctx.fillRect(x - 12, y - 6, 24, 12);
      ctx.fillStyle = trap.triggered ? '#a85043' : '#634638';
      ctx.fillRect(x - 9, y - 3, 18, 6);
      if (trap.triggered) {
        ctx.fillStyle = '#df7962'; ctx.fillRect(x - 7, y - 1, 14, 2);
      } else {
        ctx.fillStyle = '#db6652'; ctx.fillRect(x - 2, y - 9, 4, 9); ctx.fillRect(x - 7, y - 6, 14, 3);
        ctx.fillStyle = '#fff2d2'; ctx.font = 'bold 7px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - 12);
      }
    }
  }

  function drawSnow() {
    ctx.fillStyle = '#edf7fa19'; ctx.fillRect(0, 0, viewWidth, viewHeight);
    for (let i = 0; i < 52; i++) {
      const x = (pseudo(i, Math.floor(game.frame * 4)) * (viewWidth + 30) + game.frame * (18 + i % 19)) % viewWidth;
      const y = (pseudo(i + 21, Math.floor(game.frame * 3)) * viewHeight + game.frame * (25 + i % 27)) % viewHeight;
      ctx.fillStyle = i % 4 === 0 ? '#ffffffbd' : '#ffffff76';
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2 : 1, 0, Math.PI * 2); ctx.fill();
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
    gradient.addColorStop(0, '#eaf8ff35'); gradient.addColorStop(1, '#eaf8ff08');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  function drawHeatShimmer() {
    ctx.fillStyle = '#fff0c908'; ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  function drawAutumnLeaves() {
    for (let i = 0; i < 24; i++) {
      const x = (pseudo(i, 41) * viewWidth + Math.sin(game.frame + i) * 15) % viewWidth;
      const y = (pseudo(i, 43) * viewHeight + game.frame * (8 + i % 7)) % viewHeight;
      ctx.save(); ctx.translate(x, y); ctx.rotate(game.frame * (i % 2 ? 0.7 : -0.5));
      ctx.fillStyle = i % 2 ? '#eab15caa' : '#c86544b0';
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }

  function drawLobbyNpc(npc, camX = 0, camY = 0) {
    const position = npcPosition(npc);
    const talking = game.talkingTo?.id === npc.id;
    const x = position.x - camX;
    const y = position.y - camY;
    if (game.mode === 'run' && (x < -80 || y < -80 || x > viewWidth + 80 || y > viewHeight + 80)) return;
    if (npc.object) {
      const nearbyObject = game.proximityNpcId === npc.id;
      ctx.save(); ctx.translate(x, y + Math.sin(game.frame * 3) * 2);
      ctx.fillStyle = nearbyObject ? '#ffe17c' : '#f3d58a'; ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = '#4a3a22'; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14);
      ctx.fillStyle = '#4a3a22'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, 4);
      ctx.restore();
      return;
    }
    drawPlayer({ facing: position.facing || 'down', moving: Boolean(position.moving), x: position.x, y: position.y }, x, y, npc.appearance || DEFAULT_APPEARANCE, talking);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#f8f1dc'; ctx.font = 'bold 8px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(npc.name.toUpperCase(), 0, 25);
    if (talking) {
      ctx.fillStyle = '#fff8e8'; ctx.fillRect(-17, -52, 34, 19);
      ctx.strokeStyle = '#405447'; ctx.lineWidth = 2; ctx.strokeRect(-18, -53, 36, 21);
      ctx.fillStyle = '#bb7952'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('•••', 0, -39);
    } else {
      ctx.fillStyle = '#fff8e8'; ctx.fillRect(12, -42, 14, 14);
      ctx.strokeStyle = '#405447'; ctx.lineWidth = 2; ctx.strokeRect(12, -42, 14, 14);
      const nearby = game.proximityNpcId === npc.id;
      ctx.fillStyle = nearby ? '#c5513e' : '#ad8651'; ctx.font = 'bold 9px sans-serif'; ctx.fillText(nearby ? '!' : 'E', 19, -32);
    }
    ctx.restore();
  }

  function drawGate(gate) {
    const realm = REALMS[gate.realm];
    const open = unlocked(gate.realm);
    const colors = { forest: '#98d887', autumn: '#eda956', desert: '#f2cf6d', snow: '#a8e3eb' };
    const color = open ? colors[gate.realm] : '#aeb9ae';
    ctx.save(); ctx.translate(gate.x, gate.y);
    ctx.fillStyle = '#17382e40'; ctx.beginPath(); ctx.ellipse(0, 9, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d7c699'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, -5, 18, 25, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `${color}3b`; ctx.beginPath(); ctx.ellipse(0, -5, 13, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -5 + Math.sin(game.frame * 2) * 1.5, 13, 20, 0, 0, Math.PI * 2); ctx.stroke();
    const nearby = distance(game.player, gate) < 54;
    const sign = nearby ? open ? 'GÅ INN' : `NIVÅ ${realm.unlock}` : open ? gate.label : `NIVÅ ${realm.unlock}`;
    ctx.fillStyle = nearby ? '#f5dda0' : '#fff7df'; ctx.font = 'bold 8px "DM Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.beginPath(); ctx.roundRect(-43, 27, 86, 19, 7); ctx.fill();
    ctx.fillStyle = '#35483b'; ctx.fillText(sign, 0, 40);
    ctx.restore();
  }

  function drawLobby(camX, camY) {
    ctx.fillStyle = '#4a9297'; ctx.fillRect(0, 0, viewWidth, viewHeight);
    for (let i = 0; i < 85; i++) {
      const x = pseudo(i, 2) * viewWidth;
      const y = (pseudo(i, 3) * viewHeight + game.frame * (4 + i % 5)) % viewHeight;
      ctx.strokeStyle = i % 3 ? '#c5e0cf39' : '#e7e5c739'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, 5 + pseudo(i, 8) * 10, 1.5, Math.sin(game.frame + i) * .03, 0, Math.PI * 2); ctx.stroke();
    }
    const scale = Math.min(viewWidth / 960, viewHeight / 560);
    const offsetX = (viewWidth - 960 * scale) / 2;
    const offsetY = (viewHeight - 560 * scale) / 2;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    // En rolig, grønn øy med fire broer ut til hvert sitt eventyr.
    ctx.fillStyle = '#1b4e4b55'; ctx.beginPath(); ctx.ellipse(480, 294, 340, 225, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c4ab70'; ctx.beginPath(); ctx.ellipse(480, 281, 328, 218, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#759766'; ctx.beginPath(); ctx.ellipse(480, 275, 309, 201, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#83a574'; ctx.beginPath(); ctx.ellipse(480, 267, 282, 178, 0, 0, Math.PI * 2); ctx.fill();
    // Veier fra havna til nord, sør, øst og vest.
    ctx.strokeStyle = '#cbb889'; ctx.lineCap = 'round'; ctx.lineWidth = 36;
    [[480, 25, 480, 147], [795, 282, 960, 282], [0, 282, 165, 282], [480, 410, 480, 560]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.strokeStyle = '#e0d0a8'; ctx.lineWidth = 23;
    [[480, 25, 480, 147], [795, 282, 960, 282], [0, 282, 165, 282], [480, 410, 480, 560]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    // Små bryggeplanker som gynger over vannet.
    ctx.strokeStyle = '#987750'; ctx.lineWidth = 2;
    for (let y = 4; y < 115; y += 13) { ctx.beginPath(); ctx.moveTo(465, y); ctx.lineTo(495, y); ctx.stroke(); }
    for (let y = 445; y < 559; y += 13) { ctx.beginPath(); ctx.moveTo(465, y); ctx.lineTo(495, y); ctx.stroke(); }
    for (let x = 4; x < 125; x += 13) { ctx.beginPath(); ctx.moveTo(x, 267); ctx.lineTo(x, 297); ctx.stroke(); }
    for (let x = 835; x < 958; x += 13) { ctx.beginPath(); ctx.moveTo(x, 267); ctx.lineTo(x, 297); ctx.stroke(); }
    // Blomster, steiner og noen rolige palmetrær.
    for (let i = 0; i < 32; i++) {
      const x = 215 + pseudo(i, 13) * 525;
      const y = 154 + pseudo(i, 17) * 250;
      if (Math.abs(x - 480) < 65 && y < 230) continue;
      ctx.fillStyle = i % 3 ? '#d7c879' : '#f0d1a0'; ctx.beginPath(); ctx.arc(x, y, 2 + pseudo(i, 19) * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    [[748, 200, .8], [748, 380, .7], [205, 380, .7]].forEach(([x, y, size]) => drawTree({ x, y, size, shade: 1 }, x, y, false, 'forest'));
    [[342, 247, .62], [572, 370, .7], [370, 383, .58], [570, 200, .55]].forEach(([x, y, size]) => drawProp({ type: 'rock', x, y, size }, x, y));

    // Samlingshus.
    ctx.fillStyle = '#735c45'; ctx.beginPath(); ctx.roundRect(385, 175, 157, 88, 8); ctx.fill();
    ctx.fillStyle = '#b58e5f'; ctx.beginPath(); ctx.moveTo(374, 195); ctx.lineTo(462, 136); ctx.lineTo(554, 195); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dfc38a'; ctx.fillRect(398, 194, 130, 65);
    ctx.fillStyle = '#698c77'; ctx.fillRect(409, 207, 30, 27); ctx.fillRect(486, 207, 30, 27);
    ctx.fillStyle = '#785640'; ctx.fillRect(450, 220, 30, 39);
    ctx.fillStyle = '#fff3d4'; ctx.font = 'bold 9px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HAVNEHUSET', 463, 190);
    ctx.fillStyle = '#fff7e9'; ctx.fillRect(435, 263, 62, 16); ctx.fillStyle = '#584938'; ctx.font = 'bold 7px "DM Sans", sans-serif'; ctx.fillText('GÅ INN', 466, 274);

    // Klesbutikken: fargerikt skilt med hatt og skjorte, og vindusutstilling.
    ctx.fillStyle = '#6b4a8a'; ctx.fillRect(238, 196, 94, 58);
    ctx.fillStyle = '#e0a3c1'; ctx.beginPath(); ctx.moveTo(228, 202); ctx.lineTo(285, 160); ctx.lineTo(342, 202); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7d8ea'; ctx.fillRect(244, 202, 82, 50);
    ctx.fillStyle = '#7ad0d8'; ctx.fillRect(248, 214, 24, 22); ctx.fillRect(298, 214, 24, 22);
    ctx.fillStyle = '#ffffff55'; ctx.fillRect(251, 216, 5, 14); ctx.fillRect(301, 216, 5, 14);
    // Utstillingsdukker i vinduene
    ctx.fillStyle = '#c44a42'; ctx.fillRect(254, 226, 12, 10); ctx.fillStyle = '#a8794a'; ctx.fillRect(252, 218, 16, 3); ctx.fillRect(255, 214, 10, 5);
    ctx.fillStyle = '#4f87b4'; ctx.fillRect(304, 226, 12, 10); ctx.fillStyle = '#f0c545'; ctx.fillRect(304, 217, 12, 6); ctx.fillRect(304, 213, 3, 5); ctx.fillRect(309, 212, 3, 6); ctx.fillRect(313, 213, 3, 5);
    ctx.fillStyle = '#8a4a8f'; ctx.fillRect(272, 232, 26, 20); ctx.fillStyle = '#c887c9'; ctx.fillRect(275, 235, 20, 17); ctx.fillStyle = '#f0d27a'; ctx.fillRect(290, 244, 3, 3);
    // Skilt
    ctx.fillStyle = '#3d2c4d'; ctx.fillRect(244, 183, 82, 17); ctx.fillStyle = '#ffe28a'; ctx.fillRect(246, 185, 78, 13);
    ctx.fillStyle = '#d95a64'; ctx.fillRect(249, 189, 10, 6); ctx.fillRect(247, 187, 14, 3);
    ctx.fillStyle = '#4f87b4'; ctx.fillRect(311, 187, 10, 8); ctx.fillRect(308, 187, 4, 4); ctx.fillRect(320, 187, 4, 4);
    ctx.fillStyle = '#5a2f6b'; ctx.font = 'bold 7px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('KLESBUTIKK', 285, 195);
    ctx.fillStyle = '#fff7e9'; ctx.fillRect(255, 256, 60, 15); ctx.fillStyle = '#584938'; ctx.font = 'bold 7px "DM Sans", sans-serif'; ctx.fillText('GÅ INN', 285, 267);

    // Den lille butikken du går inn i for å handle.
    ctx.fillStyle = '#79563e'; ctx.beginPath(); ctx.roundRect(592, 222, 105, 80, 8); ctx.fill();
    ctx.fillStyle = '#a95e47'; ctx.beginPath(); ctx.moveTo(580, 238); ctx.lineTo(644, 196); ctx.lineTo(708, 238); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dfc188'; ctx.fillRect(600, 239, 89, 58);
    ctx.fillStyle = '#537361'; ctx.fillRect(607, 250, 21, 20); ctx.fillRect(661, 250, 21, 20);
    ctx.fillStyle = '#75503a'; ctx.fillRect(633, 263, 17, 34);
    ctx.fillStyle = '#fff2d3'; ctx.beginPath(); ctx.roundRect(594, 215, 101, 17, 6); ctx.fill();
    ctx.fillStyle = '#6d4c38'; ctx.font = 'bold 8px "DM Sans", sans-serif'; ctx.fillText('UTSTYRSBUA', 644, 227);
    ctx.fillStyle = '#fff7e9'; ctx.font = 'bold 8px "DM Sans", sans-serif'; ctx.beginPath(); ctx.roundRect(615, 302, 59, 18, 7); ctx.fill();
    ctx.fillStyle = '#584938'; ctx.fillText('GÅ INN', 645, 314);

    // Brygge, benker, lamper og en liten seilbåt gjør øya levende.
    ctx.fillStyle = '#9b7650'; ctx.fillRect(431, 370, 98, 11);
    ctx.fillStyle = '#d3b785'; ctx.fillRect(438, 373, 84, 4);
    ctx.fillStyle = '#654d38'; ctx.fillRect(300, 292, 37, 5); ctx.fillRect(305, 297, 4, 10); ctx.fillRect(328, 297, 4, 10);
    ctx.strokeStyle = '#564e39'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(752, 265); ctx.lineTo(752, 229); ctx.stroke();
    ctx.fillStyle = '#f6d587'; ctx.beginPath(); ctx.arc(752, 226, 7 + Math.sin(game.frame * 2) * .7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eee3bf'; ctx.beginPath(); ctx.moveTo(130, 432); ctx.lineTo(173, 432); ctx.lineTo(165, 448); ctx.lineTo(140, 448); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#705e43'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(152, 431); ctx.lineTo(152, 408); ctx.stroke();
    ctx.fillStyle = '#f1e0ad'; ctx.beginPath(); ctx.moveTo(151, 410); ctx.lineTo(151, 429); ctx.lineTo(135, 429); ctx.closePath(); ctx.fill();

    GATES.forEach(drawGate);
    activeNpcs().forEach((npc) => drawLobbyNpc(npc));
    drawRpgCompass(game.player.x - camX, game.player.y - camY);
    drawPlayer(game.player, game.player.x - camX, game.player.y - camY);
    ctx.fillStyle = '#f8f1dc'; ctx.font = 'bold 9px "DM Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HAVNEØYA', 480, 432);
    ctx.restore();
  }

  function drawInterior() {
    const scale = Math.min(viewWidth / 960, viewHeight / 560);
    const offsetX = (viewWidth - 960 * scale) / 2;
    const offsetY = (viewHeight - 560 * scale) / 2;
    ctx.fillStyle = game.interior === 'house' ? '#426f73' : game.interior === 'style' ? '#7a5a78' : '#5c7775';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
    // Warm timber room, stone edging and hand-laid floor boards.
    ctx.fillStyle = '#322c2a'; ctx.fillRect(44, 24, 872, 520);
    ctx.fillStyle = game.interior === 'house' ? '#d3b27d' : '#c9ad78'; ctx.fillRect(54, 34, 852, 510);
    ctx.fillStyle = game.interior === 'house' ? '#81533d' : '#70503b'; ctx.fillRect(54, 34, 852, 112);
    ctx.fillStyle = '#a36e4d'; ctx.fillRect(54, 137, 852, 10);
    ctx.fillStyle = '#9b704b';
    for (let y = 155; y < 542; y += 24) {
      ctx.fillRect(54, y, 852, 2);
      const seam = y % 48 === 11 ? 280 : 650;
      ctx.fillStyle = '#805c40'; ctx.fillRect(seam, y - 22, 2, 24);
      ctx.fillStyle = '#9b704b';
    }
    for (let i = 0; i < 54; i++) {
      const x = 62 + pseudo(i, 57) * 830;
      const y = 155 + pseudo(i, 59) * 374;
      ctx.fillStyle = i % 2 ? '#e3c99355' : '#694c382b'; ctx.fillRect(x, y, 10 + pseudo(i, 61) * 20, 1);
    }
    // High windows and beams.
    ctx.fillStyle = '#523c31'; ctx.fillRect(125, 63, 112, 70); ctx.fillRect(744, 63, 112, 70);
    ctx.fillStyle = game.interior === 'house' ? '#8bc5c0' : '#abcac3';
    ctx.fillRect(132, 70, 98, 56); ctx.fillRect(751, 70, 98, 56);
    ctx.fillStyle = '#f0d89a'; ctx.fillRect(178, 70, 6, 56); ctx.fillRect(797, 70, 6, 56);
    ctx.fillRect(132, 94, 98, 5); ctx.fillRect(751, 94, 98, 5);
    ctx.fillStyle = '#5e4433'; ctx.fillRect(270, 34, 10, 112); ctx.fillRect(680, 34, 10, 112);

    if (game.interior === 'house') {
      // Reading rug, book shelves and a sturdy merchant's desk.
      ctx.fillStyle = '#77494c'; ctx.fillRect(328, 359, 292, 122);
      ctx.fillStyle = '#d1a86b'; ctx.fillRect(338, 369, 272, 102);
      ctx.fillStyle = '#a9634f'; ctx.fillRect(349, 380, 250, 80); ctx.fillRect(461, 369, 26, 102);
      ctx.fillStyle = '#e4c87d'; ctx.fillRect(359, 391, 230, 58); ctx.fillRect(470, 380, 8, 80);
      // Archive shelves.
      ctx.fillStyle = '#50382d'; ctx.fillRect(112, 189, 112, 150); ctx.fillRect(119, 196, 98, 136);
      for (let row = 0; row < 4; row++) {
        ctx.fillStyle = '#8b6240'; ctx.fillRect(119, 224 + row * 27, 98, 4);
        for (let col = 0; col < 6; col++) {
          const colors = ['#477b70', '#b45f47', '#cfad59', '#617fa2', '#7d5f8b', '#a47a4b'];
          const bookX = 124 + col * 15;
          ctx.fillStyle = colors[(row + col) % colors.length]; ctx.fillRect(bookX, 202 + row * 27, 10, 21);
          ctx.fillStyle = '#f1d996'; ctx.fillRect(bookX + 3, 205 + row * 27, 2, 2);
        }
      }
      ctx.fillStyle = '#684632'; ctx.fillRect(376, 258, 208, 25); ctx.fillRect(388, 283, 8, 27); ctx.fillRect(564, 283, 8, 27);
      ctx.fillStyle = '#c29259'; ctx.fillRect(371, 254, 218, 8); ctx.fillStyle = '#ead6a5'; ctx.fillRect(381, 257, 198, 2);
      ctx.fillStyle = '#f2e6ca'; ctx.fillRect(443, 246, 37, 11); ctx.fillStyle = '#958264'; ctx.fillRect(461, 247, 2, 9);
      // Appraiser's counter and little open ledger.
      ctx.fillStyle = '#553a2b'; ctx.fillRect(579, 281, 205, 73);
      ctx.fillStyle = '#b67c4a'; ctx.fillRect(572, 273, 219, 19);
      ctx.fillStyle = '#d7b47a'; ctx.fillRect(584, 293, 195, 6);
      ctx.fillStyle = '#806048'; ctx.fillRect(596, 299, 171, 46);
      ctx.fillStyle = '#f1e5bd'; ctx.fillRect(614, 264, 42, 12); ctx.fillRect(660, 264, 42, 12);
      ctx.strokeStyle = '#9a7846'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(656, 265); ctx.lineTo(656, 275); ctx.stroke();
      ctx.fillStyle = '#bcaa83'; ctx.fillRect(719, 254, 27, 20);
      ctx.fillStyle = '#f3d476'; ctx.fillRect(728, 258, 8, 7);
      ctx.fillStyle = '#fff4d6'; ctx.font = 'bold 9px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('SKATTEVURDERING', 680, 370);
      // Plant and wall lamp.
      ctx.fillStyle = '#a66f49'; ctx.fillRect(797, 401, 30, 26); ctx.fillStyle = '#477851';
      ctx.fillRect(805, 363, 6, 40); ctx.fillRect(790, 371, 16, 6); ctx.fillRect(810, 380, 20, 6); ctx.fillRect(799, 354, 18, 8);
      ctx.fillStyle = '#f6d680'; ctx.fillRect(455, 162, 6, 18); ctx.fillRect(451, 158, 14, 5);
      ctx.fillStyle = '#ffdb77'; ctx.fillRect(456, 153, 4, 7);
      // Stor oppslagstavle på veggen: kistetyper, soner og ryktet om Pirate Token.
      ctx.fillStyle = '#3d2c22'; ctx.fillRect(296, 38, 368, 106);
      ctx.fillStyle = '#b9935f'; ctx.fillRect(301, 43, 358, 96);
      ctx.fillStyle = '#e9d6a6'; ctx.fillRect(307, 49, 346, 84);
      // Gullikon
      ctx.fillStyle = '#7a5a1b'; ctx.fillRect(312, 53, 22, 22); ctx.fillStyle = '#f2c94a'; ctx.fillRect(314, 55, 18, 18);
      ctx.fillStyle = '#fff1a3'; ctx.fillRect(317, 58, 6, 4); ctx.fillStyle = '#b8892a'; ctx.fillRect(320, 62, 8, 8);
      ctx.fillStyle = '#3f4a3c'; ctx.font = 'bold 7px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.fillText('OPPSLAGSTAVLA', 340, 64);
      ctx.fillStyle = '#7b3d33'; ctx.font = '4px "Press Start 2P", monospace'; ctx.fillText('ETTERLYST: SKATTEJEGERE!', 340, 73);
      const zoneRows = [['SKOG', 'forest', '#718b58'], ['HØST', 'autumn', '#bb7444'], ['SAHARA', 'desert', '#c89843'], ['VINTER', 'snow', '#6d9eae']];
      const pct = (value) => `${(value * 100).toLocaleString('no-NO', { maximumFractionDigits: 1 })}`;
      ctx.fillStyle = '#5a5a4a'; ctx.font = '3.5px "Press Start 2P", monospace'; ctx.textAlign = 'right';
      ctx.fillText('RARE%', 540, 84); ctx.fillText('EPIC%', 590, 84); ctx.fillText('LEG%', 640, 84);
      zoneRows.forEach(([label, key, color], index) => {
        const y = 91 + index * 8;
        ctx.fillStyle = color; ctx.fillRect(314, y - 4, 4, 5);
        ctx.fillStyle = '#34402f'; ctx.textAlign = 'left'; ctx.fillText(label, 322, y);
        ctx.textAlign = 'right';
        ctx.fillText(pct(CHEST_ODDS[key].rare), 540, y); ctx.fillText(pct(CHEST_ODDS[key].epic), 590, y); ctx.fillText(pct(CHEST_ODDS[key].legendary), 640, y);
      });
      ctx.fillStyle = '#7b3d33'; ctx.textAlign = 'left'; ctx.font = '3.5px "Press Start 2P", monospace';
      ctx.fillText('RYKTE: PIRATE TOKEN i EPIC (0,1%) og LEGENDARY (0,5%)', 314, 127);
      ctx.fillStyle = '#34402f'; ctx.fillText('COMMON finnes overalt. Lever tokenet til kapteinen!', 314, 135);
      // Skipshjul, peis, tønner og tauverk.
      ctx.save(); ctx.translate(715, 88);
      ctx.strokeStyle = '#6e4a2e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#a77846'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + game.frame * .08; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 27, Math.sin(a) * 27); ctx.stroke(); }
      ctx.fillStyle = '#d0a85a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#3b3430'; ctx.fillRect(58, 66, 62, 80); ctx.fillStyle = '#1e1816'; ctx.fillRect(66, 80, 46, 66);
      const flame = Math.sin(game.frame * 9) * 2;
      ctx.fillStyle = '#e0742c'; ctx.fillRect(76, 112 - flame, 26, 34 + flame); ctx.fillStyle = '#f5c04a'; ctx.fillRect(82, 122 - flame, 14, 24 + flame); ctx.fillStyle = '#fff1a0'; ctx.fillRect(86, 134, 6, 12);
      ctx.fillStyle = '#5a463a'; ctx.fillRect(56, 60, 66, 8);
      [[110, 462], [146, 478], [790, 450]].forEach(([bx, by]) => {
        ctx.fillStyle = '#4b3324'; ctx.fillRect(bx - 17, by - 18, 34, 38); ctx.fillStyle = '#8a5c36'; ctx.fillRect(bx - 14, by - 16, 28, 34);
        ctx.fillStyle = '#3a2a20'; ctx.fillRect(bx - 15, by - 8, 30, 3); ctx.fillRect(bx - 15, by + 6, 30, 3); ctx.fillStyle = '#b98a58'; ctx.fillRect(bx - 10, by - 15, 3, 30);
      });
      ctx.strokeStyle = '#c7a96c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(190, 482, 15, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(190, 478, 11, 5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(60, 150); ctx.bezierCurveTo(100, 168, 180, 168, 220, 150); ctx.stroke();
    } else if (game.interior === 'style') {
      // Koselig klesbutikk: rutete teppe, stativer, dukker, stort speil og disk.
      for (let row = 0; row < 8; row++) for (let col = 0; col < 14; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#c7566b' : '#f2d9a8'; ctx.fillRect(250 + col * 32, 360 + row * 20, 32, 20);
      }
      ctx.strokeStyle = '#7d2d3c'; ctx.lineWidth = 3; ctx.strokeRect(250, 360, 448, 160);
      // Stort speil
      ctx.fillStyle = '#6a4a2c'; ctx.fillRect(412, 46, 136, 98); ctx.fillStyle = '#e0bf6a'; ctx.fillRect(416, 50, 128, 90);
      ctx.fillStyle = '#bfe4ea'; ctx.fillRect(422, 56, 116, 78); ctx.fillStyle = '#e9fbff'; ctx.fillRect(430, 62, 12, 58); ctx.fillRect(446, 62, 5, 40);
      ctx.fillStyle = '#34495a'; ctx.font = '4px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('SPEIL', 480, 154);
      // Klesstativer
      const rackColors = ['#d95a64', '#4f87b4', '#5f8f54', '#e0b94e', '#8e5ab7', '#d98e4a'];
      [[170, 220], [790, 190]].forEach(([rx, ry]) => {
        ctx.fillStyle = '#6a4a2c'; ctx.fillRect(rx - 75, ry - 24, 150, 5); ctx.fillRect(rx - 72, ry - 24, 4, 52); ctx.fillRect(rx + 68, ry - 24, 4, 52);
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = rackColors[(i + rx) % rackColors.length]; ctx.fillRect(rx - 66 + i * 19, ry - 19, 14, 34);
          ctx.fillStyle = '#00000025'; ctx.fillRect(rx - 66 + i * 19, ry + 10, 14, 5);
        }
      });
      // Utstillingsdukker med hatter
      [[140, 340, '#d95a64', 'cowboy'], [330, 360, '#4f87b4', 'viking'], [820, 400, '#e0b94e', 'crown']].forEach(([mx, my, color, hat]) => {
        ctx.fillStyle = '#3d2f26'; ctx.fillRect(mx - 14, my + 26, 28, 5); ctx.fillRect(mx - 2, my + 5, 4, 24);
        ctx.fillStyle = color; ctx.fillRect(mx - 13, my - 16, 26, 26); ctx.fillStyle = '#d9b48a'; ctx.fillRect(mx - 6, my - 28, 12, 12);
        ctx.fillStyle = hat === 'crown' ? '#f0c545' : hat === 'viking' ? '#aab2b8' : '#a8794a';
        if (hat === 'cowboy') { ctx.fillRect(mx - 14, my - 31, 28, 4); ctx.fillRect(mx - 8, my - 38, 16, 8); }
        else if (hat === 'viking') { ctx.fillRect(mx - 9, my - 36, 18, 9); ctx.fillStyle = '#f2ead0'; ctx.fillRect(mx - 14, my - 38, 4, 8); ctx.fillRect(mx + 10, my - 38, 4, 8); }
        else { ctx.fillRect(mx - 9, my - 36, 18, 8); ctx.fillRect(mx - 9, my - 41, 4, 6); ctx.fillRect(mx - 2, my - 43, 4, 8); ctx.fillRect(mx + 5, my - 41, 4, 6); }
      });
      // Disk
      ctx.fillStyle = '#5d3b46'; ctx.fillRect(585, 288, 190, 56); ctx.fillStyle = '#d9a86b'; ctx.fillRect(578, 280, 204, 14);
      ctx.fillStyle = '#e8d29a'; ctx.fillRect(610, 270, 24, 12); ctx.fillStyle = '#c44a42'; ctx.fillRect(700, 266, 26, 14); ctx.fillRect(704, 260, 18, 8);
      ctx.fillStyle = '#fff4d6'; ctx.font = '6px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('KLESBUTIKKEN', 680, 378);
      ctx.fillStyle = '#fff8df'; ctx.font = '4px "Press Start 2P", monospace'; ctx.fillText('GÅ TIL SPEILET ELLER DISKEN', 480, 205);
    } else {
      // Compact shop: narrow aisles, wall shelves and a snug counter.
      const shelves = [104, 216, 744, 856];
      shelves.forEach((x, index) => {
        ctx.fillStyle = '#50382b'; ctx.fillRect(x, 178, 72, 274);
        ctx.fillStyle = index % 2 ? '#b7844d' : '#c09155'; ctx.fillRect(x + 5, 184, 62, 261);
        for (let row = 0; row < 5; row++) {
          ctx.fillStyle = '#67462f'; ctx.fillRect(x + 3, 226 + row * 42, 66, 5);
          const icons = ['⛏', '🏹', '☕', '🧴', '🧢'];
          ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(icons[(row + index) % icons.length], x + 35, 218 + row * 42);
          ctx.fillStyle = '#e5d19c'; ctx.fillRect(x + 12, 193 + row * 42, 18, 3);
        }
      });
      ctx.fillStyle = '#755039'; ctx.fillRect(583, 278, 202, 72);
      ctx.fillStyle = '#d0a66d'; ctx.fillRect(576, 269, 216, 18);
      ctx.fillStyle = '#68432e'; ctx.fillRect(601, 294, 166, 45);
      ctx.fillStyle = '#f4e5bf'; ctx.font = 'bold 9px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('UTSTYRSBUA', 683, 374);
      ctx.fillStyle = '#d9c091'; ctx.fillRect(390, 196, 178, 96);
      ctx.fillStyle = '#ac6847'; ctx.fillRect(383, 188, 192, 18);
      ctx.fillStyle = '#f4ddaa'; ctx.font = '8px "Press Start 2P", monospace'; ctx.fillText('HATT · HÅR · KLÆR', 479, 237);
      ctx.fillStyle = '#7a563b'; ctx.fillRect(425, 250, 110, 26);
      ctx.fillStyle = '#c2a06b'; ctx.fillRect(432, 254, 96, 4);
    }

    // A bright front door and a sign always point back to the island.
    ctx.fillStyle = '#49362b'; ctx.fillRect(438, 485, 84, 75);
    ctx.fillStyle = game.interior === 'house' ? '#9c6041' : '#698665'; ctx.fillRect(444, 491, 72, 69);
    ctx.fillStyle = '#e6c16e'; ctx.fillRect(501, 523, 5, 5);
    if (game.interior === 'house') {
      ctx.fillStyle = '#e0b95a'; ctx.fillRect(422, 500, 116, 40);
      ctx.fillStyle = '#a8323a'; ctx.fillRect(426, 504, 108, 32);
      ctx.fillStyle = '#c4434a'; ctx.fillRect(432, 509, 96, 22);
      ctx.fillStyle = '#e0b95a'; ctx.fillRect(470, 514, 20, 12);
      ctx.fillStyle = '#a8323a'; ctx.fillRect(474, 517, 12, 6);
    }
    ctx.fillStyle = '#fff8df'; ctx.fillRect(434, 467, 92, 20);
    ctx.fillStyle = '#465443'; ctx.font = 'bold 7px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('GÅ UT', 480, 480);

    activeNpcs().forEach((npc) => drawLobbyNpc(npc));
    drawRpgCompass(game.player.x, game.player.y);
    drawPlayer(game.player, game.player.x, game.player.y);
    ctx.fillStyle = '#fff5d6'; ctx.font = '6px "Press Start 2P", monospace'; ctx.textAlign = 'center';
    ctx.fillText(game.interior === 'house' ? 'HAVNEHUSET' : game.interior === 'style' ? 'KLESBUTIKKEN' : 'UTSTYRSBUA', 480, 72);
    ctx.restore();
  }

  function resizeCanvas() {
    const width = Math.max(320, Math.round(window.innerWidth));
    const height = Math.max(240, Math.round(window.innerHeight));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    viewWidth = canvas.width / 2;
    viewHeight = canvas.height / 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function render() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    const cam = camera();
    if (game.mode === 'run' && game.world) drawWorld(cam.x, cam.y);
    else if (game.mode === 'interior') drawInterior();
    else drawLobby(cam.x, cam.y);
  }

  let audioContext;
  function playChime() {
    if (!game.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      [660, 880].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.075, now + index * 0.09 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.18);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(now + index * 0.09); oscillator.stop(now + index * 0.09 + 0.19);
      });
    } catch (_) { /* Lyd er bare en ekstra detalj. */ }
  }

  function playSound(kind) {
    if (!game.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const spec = {
        thud: { type: 'triangle', from: 150, to: 55, length: .2, volume: .16 },
        dig: { type: 'square', from: 95, to: 60, length: .09, volume: .05 },
        twang: { type: 'sawtooth', from: 520, to: 190, length: .16, volume: .05 },
      }[kind];
      if (!spec) return;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = spec.type;
      oscillator.frequency.setValueAtTime(spec.from, now);
      oscillator.frequency.exponentialRampToValueAtTime(spec.to, now + spec.length);
      gain.gain.setValueAtTime(spec.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.length);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now); oscillator.stop(now + spec.length + .02);
    } catch (_) { /* Lyd er bare en ekstra detalj. */ }
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
    if (key === 'Escape') {
      if (!ui.talk.classList.contains('hidden')) closeNpcDialogue();
      else if (!ui.shop.classList.contains('hidden')) closeShop();
      else if (!ui.bagDialog.classList.contains('hidden')) closeBag();
      else if (!ui.bookDialog.classList.contains('hidden')) closeBook();
      else if (!ui.styleDialog.classList.contains('hidden')) ui.styleDialog.classList.add('hidden');
      return;
    }
    if (key === 'b' && !event.repeat) {
      if (!ui.bagDialog.classList.contains('hidden')) closeBag();
      else if (ui.talk.classList.contains('hidden') && ui.shop.classList.contains('hidden') && ui.styleDialog.classList.contains('hidden')) openBag();
      return;
    }
    if (!ui.talk.classList.contains('hidden') && (key === 'e' || key === ' ')) {
      finishTyping(); return;
    }
    if (!ui.talk.classList.contains('hidden') && /^[1-5]$/.test(key)) {
      $('#dialogue-options').children[Number(key) - 1]?.click();
      return;
    }
    const modalOpen = !ui.talk.classList.contains('hidden') || !ui.shop.classList.contains('hidden')
      || !ui.bagDialog.classList.contains('hidden') || !ui.bookDialog.classList.contains('hidden')
      || !ui.styleDialog.classList.contains('hidden');
    if (modalOpen) return;
    game.keys.add(key);
    if (event.repeat) return;
    if (key === 'e') interactChest();
    if (key === ' ') {
      if (game.mode === 'run') {
        const nearby = activeNpcs().map((npc) => ({ npc, position: npcPosition(npc) }))
          .sort((a, b) => distance(a.position, game.player) - distance(b.position, game.player))[0];
        if (nearby && distance(nearby.position, game.player) < 62) openNpcDialogue(nearby.npc);
        else meleeAttack();
      } else if (game.mode === 'lobby' || game.mode === 'interior') interactChest();
    }
    if (key === 'f') shootSlingshot();
    if (key === 'q') useSupply();
  });
  document.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    game.keys.delete(key);
  });
  window.addEventListener('blur', () => game.keys.clear());

  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasHover);
  canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); if (game.mode === 'run') shootSlingshot(); });
  document.querySelectorAll('[data-style-tab]').forEach((button) => button.addEventListener('click', () => { game.styleTab = button.dataset.styleTab; game.styleSelected = null; renderWardrobe(); }));
  $('#dialogue-close').addEventListener('click', closeNpcDialogue);
  $('#shop-close').addEventListener('click', closeShop);
  ui.shop.addEventListener('click', (event) => { if (event.target === ui.shop) closeShop(); });
  $('#bag-button').addEventListener('click', () => ui.bagDialog.classList.contains('hidden') ? openBag() : closeBag());
  $('#book-button').addEventListener('click', () => ui.bookDialog.classList.contains('hidden') ? openBook() : closeBook());
  $('#style-button').addEventListener('click', openWardrobe);
  $('#style-close').addEventListener('click', () => ui.styleDialog.classList.add('hidden'));
  $('#bag-close').addEventListener('click', closeBag);
  $('#book-close').addEventListener('click', closeBook);
  $('#sell-all').addEventListener('click', sellAllArtifacts);
  ui.bagGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sell-artifact]');
    if (button) sellArtifact(button.dataset.sellArtifact);
  });
  document.querySelectorAll('.book-filters button').forEach((button) => button.addEventListener('click', () => {
    game.bookFilter = button.dataset.filter;
    document.querySelectorAll('.book-filters button').forEach((filter) => filter.classList.toggle('active', filter === button));
    renderBook();
  }));
  [ui.bagDialog, ui.bookDialog, ui.styleDialog].forEach((overlay) => overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.classList.add('hidden'); }));
  document.querySelectorAll('.shop-tabs button').forEach((button) => button.addEventListener('click', () => {
    game.shopTab = button.dataset.shopTab;
    document.querySelectorAll('.shop-tabs button').forEach((tab) => tab.classList.toggle('active', tab === button));
    renderShopProducts();
  }));
  document.querySelectorAll('.touch-key').forEach((button) => {
    const key = button.dataset.key;
    const down = (event) => { event.preventDefault(); game.keys.add(key); };
    const up = (event) => { event.preventDefault(); game.keys.delete(key); };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
  });
  document.querySelectorAll('.touch-actions button').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.action === 'interact') interactChest();
    if (button.dataset.action === 'attack') meleeAttack();
    if (button.dataset.action === 'shoot') shootSlingshot();
    if (button.dataset.action === 'cocoa') useSupply();
  }));
  window.addEventListener('resize', resizeCanvas);
  $('#sound-toggle').addEventListener('click', (event) => {
    game.sound = !game.sound;
    event.currentTarget.innerHTML = `${game.sound ? '♫' : '♪'} <span>LYD ${game.sound ? 'PÅ' : 'AV'}</span>`;
    event.currentTarget.setAttribute('aria-label', game.sound ? 'Slå av lyder' : 'Slå på lyder');
  });
  resizeCanvas();
  updateUI();
  requestAnimationFrame(tick);
})();
