(function () {
  "use strict";

  const game = globalThis.FootbolicaLogic;
  const canvas = document.getElementById("field");
  const canvas3d = document.getElementById("field3d");
  const ctx = canvas.getContext("2d");
  let visual3d = null;
  if (globalThis.Footbolica3D) {
    try {
      visual3d = new globalThis.Footbolica3D(canvas3d);
      canvas.classList.add("hidden");
      canvas3d.classList.remove("hidden");
    } catch (error) {
      console.warn("3D graphics are unavailable; using the 2D renderer", error);
    }
  }
  canvas3d.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    visual3d = null;
    canvas3d.classList.add("hidden");
    canvas.classList.remove("hidden");
    resizeCanvas();
  });
  const $ = (id) => document.getElementById(id);
  const ui = {
    game: $("game"),
    wrap: $("canvasWrap"), score: $("score"), best: $("best"), goals: $("goals"),
    shotTag: $("shotTag"), sound: $("soundButton"), restart: $("restartButton"),
    spin: $("spinRange"), spinValue: $("spinValue"), powerValue: $("powerValue"),
    powerFill: $("powerFill"), shoot: $("shootButton"), next: $("nextButton"),
    toast: $("resultToast"), menu: $("menuScreen"), tutorial: $("tutorialScreen"),
    over: $("overScreen"), confirm: $("confirmScreen"),
  };
  const players = [
    { skin: "#ffb67a", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", boots: "#9147f5", hair: "#292536", leftFooted: true, number: "21",
      shirtName: "Сидорьньё", goalChant: "ЭТО СИИИИДООООРИНЬЁЁЁЁЁ!!!!" },
    { skin: "#e9be8d", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", hair: "#623a23", ponytail: true, maxSpinGoal: true, number: "17",
      shirtName: "Амальдиньё", goalChant: "ЭТО АААААМАААААЛЬДИНЬЁЁЁЁЁ!!!!" },
    { skin: "#b47e5c", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", hair: "#1d1d28", clownHat: true, number: "18",
      shirtName: "Григариньё", goalChant: "ЭТО ГРИИИИИИГОООООРИНЬЁЁЁЁЁЁ!!!!" },
    { skin: "#d6a078", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", hair: "#30241f", skewers: true, number: "22",
      shirtName: "Каренчик", goalChant: "ЭТО КААААРЕНЧИК!!!!" },
    { skin: "#c78b6a", shirt: "#d53545", stripes: ["#d53545", "#2454ad"], shorts: "#171b27", socks: "#171b27", boots: "#3acaf5", hair: "#252232", maxPowerGoal: true, number: "67",
      shirtName: "Озонмен", goalChant: "ЭТО ОЗООООНМЕН!!!!" },
    { skin: "#e2ad83", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", hair: "#422f26", castLeg: true, number: "13",
      shirtName: "Рачиньё", goalChant: "ЭТО РААААЧИНЬЁ!!!!" },
    { skin: "#d5a178", shirt: "#f8f9f4", sleeveColor: "#225da6", shorts: "#225da6", socks: "#f8f9f4", hair: "#292536", beerMug: true, number: "",
      shirtName: "СиньСинара", goalChant: "ЭТО СИНЬСИНААААРА!!!!" },
    { skin: "#c99370", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", hair: "#2e261e", longLegs: true, number: "72",
      shirtName: "Некич", goalChant: "ЭТО НЕЕЕЕКИЧ!!!!" },
    { skin: "#d9a177", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", boots: "#20242e", hair: "#32251e", missEvery: 3, number: "20",
      shirtName: "Косогорчик", goalChant: "ЭТО КОСОГООООРЧИК!!!!" },
    { skin: "#d6a078", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", boots: "#8e949b", hair: "#302522", baton: true, handcuffs: true, number: "33",
      shirtName: "Мишаня", goalChant: "ЭТО МИШААААНЯ!!!!" },
    { skin: "#f0c6a4", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", boots: "#ff5ca8", hair: "#eee5d1", sandersLogo: true, number: "",
      shirtName: "Аркундий Сандерс", goalChant: "ЭТО АРКУУУНДИЙ СААААНДЕРС!!!!" },
    { skin: "#d7a17a", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", boots: "#20242e", hair: "#302824", moneyKit: true, number: "",
      shirtName: "Колян", goalChant: "ЭТО КООООЛЯН!!!!" },
    { skin: "#d9a681", shirt: "#f8f9f4", shorts: "#168c4d", socks: "#f8f9f4", boots: "#59c5f1", hair: "#302824", number: "9",
      shirtName: "Пашка", goalChant: "ЭТО ПААААШКА!!!!",
      missChants: { wall: "Вы воняете!!!! Идите отсюда!", save: "Да чё за...." } },
  ];
  const keeperColors = ["#ff4e91", "#1e428c"];
  const goalSlogans = [
    "ГОООООЛ, НЕТ, СТРОГО ФУТБОЛИКА!",
    "ГООООЛ, АШАЛЕТЬ",
    "НУ ЗА ТАКОЙ ГОЛ ТЕБЯ В СИМВОЛИЧЕСКУЮ СБОРНУЮ ТФЛ ВОЗЬМУТ",
    "ТАКОЙ ГОЛ, А ТРЕНЕР ОТВЕРНУЛСЯ...",
    "ГОООЛ, ЕЩЕ РАЗ И АМАЛЬ ТЕБЕ ОТДАСТ ШТРАФНЫЕ В МАТЧАХ.",
    "АШАЛЕТЬ, ЕСЛИ СПРОСЯТ ГОВОРИ ТАК И ХОТЕЛ УДАРИТЬ",
    "ЗА ТАКОЙ ГОЛ КАРЕН ТЕБЯ НА ШАШЛЫКИ ПОЗОВЕТ",
    "ЗА ТАКОЙ ГОЛ СТАСЯН ТЕБЯ В ЕРМОЛАЕВЕ ЖДЕТ",
    "АБАЛДЕТЬ, ВОТ ЕТО ГОЛЕШНИК",
    "УДАР КАК У АРКАШИ НА ТРЕНИРОВКАХ, ГОООЛассо",
    "ОГО УДАРИЛ КАК БУДТО ГЕЛЯ СМОТРИТ НА ТЕБЯ",
    "НИКОЛЯ МЕССИ ПУШКА СТРАШНАЯ",
    "С ТАКИМИ УДАРАМИ ТЕБЯ В ОЗОН ЗАБЕРУТ",
    "КРУТОЙ ГОЛ, ПОСВЯТИ ЕГО ПУПСУ",
    "ЗА ТАКИЕ ГОЛЫ ПОТОМ ДИСКВАЛ ПОЛУЧИТЬ МОЖНО",
    "ОГО ТЫ В ЛУНАР ГАТО?",
    "ЗА ТАКИЕ ГОЛЫ МОЖНО И В ЗЕЛЕНОЙ ФОРМЕ СЫГРАТЬ",
    "БЬЕШЬ, КАК СИДР ПО МЕНЮ С КОКТЕЙЛЯМИ",
    "СУПЕР УДАР, ТЕПЕРЬ НОГОЙ ДАВАЙ МИШАНЯ",
    "ВОТ ЭТО ПУШКА, ТЫ СТЕНЫ В АРСИБЕ СЛОМАЛ?",
    "ЕЩЕ 1 ТАКОЙ ГОЛ, И ТЕБЯ ЗАБЕРУТ НА ИГРУ С БАХАРЕВА ОТВЕЧАЮ",
    "ВОТ ЭТО ГОЛ, РАЧ ТЕБЕ МАССАЖ СДЕЛАЕТ",
    "ВОТ ЭТО ГОЛ СУБО БРАТИК",
    "ГОООЛ, ТЕПЕРЬ НА ВОРОТАХ СЕРЕГА БУДЕТ С ЛИНЗАМИ, ПОПРОБУЙ ЗАБИТЬ",
    "ЕСЛИ ЗАБИВАЕШЬ СЛЕДУЮЩИЙ ГОЛ, НА ТРЕНИРОВКЕ ИГРОВАЯ",
  ];
  const missTaunts = [
    "МАЗИЛА!", "КРИВОНОГИЙ!", "ГЛАЗА ОТКРОЙ!", "КУДА ТЫ БИЛ?!", "НОГИ ЗАПЛЕЛИСЬ!",
    "НУ ТЫ МАЗИЛА",
    "ЗА МЯЧОМ ЛЕЗЬ САМ НАВЕРХ",
    "БЬЕШЬ КАК ЖЕКА СТОЯНОВ В ПРАЙМЕ",
    "ГАЛЯ ТЫ ЕЩЕ В МАЯК ПЕРЕЙДИ ПОСЛЕ ТАКИХ УДАРОВ",
    "НУ БЫВАЕТ",
    "БЕЛИЧА НА ТЕБЯ НАТРАВИМ ЗА ТАКИЕ УДАРЫ",
    "ГРИГА ПО ЛБУ СЕБЕ УДАРИЛ ИЗ-ЗА ТВОЕГО УДАРА",
    "АРКАША НА ИГРАХ ЛУЧШЕ БЬЕТ ЧЕМ ТЫ",
    "СЕНЯ ОПОЗДАЛ НА ВАРЫ, НО ТЫ ВСЕ РАВНО НЕ ЗАБИЛ",
    "БЬЕШЬ КАК АНЖЕЛА",
    "ЕЩЕ 1 УДАР МИМО И ТОЛЯ УДВАИВАЕТ СТАВКУ ЗА ТРЕНИРОВКИ",
    "КОСОГОР ПРОСТО ЗАБЕЙ А",
    "МОИСЕЙ ПРИЕХАЛ НА ИГРУ ЧТОЛИ",
    "КИРЯ МАЛЫШКИН АМБАССАДОР ШТАНГ",
    "СЛАВА БЕЗ АХИЛЛА БЬЕТ СИЛЬНЕЕ ТЕБЯ БРО",
    "ЭХ А РАНЬШЕ УСТЮГ С ПУШКОЙ БЫЛ",
    "РОДИОН ТЫРЛИН ПОЧТИ ГОЛ ПОЧТИ БЫЛ НА ИГРЕ",
    "ВАНЯ ЯКОВЛЕВ МОГ СТАНЦЕВАТЬ ЛЕЗГИНКУ, НО ТЫ НЕ ЗАБИЛ",
    "РАЧ ХВАТИТ СИМУЛИРОВАТЬ, БЕЙ НА СИЛУ",
    "АМАЛЬ ОБЫГРАЛ ВСЕХ, ПУСТЫЕ ВОРОТА ИИИИИ ПРИВОЗ В СВОИ",
    "НУ ТЫ КРИВОНОГИЙ, КРИВОЖОПИЙ СИДР",
    "ЕЩЕ 1 ТАКОЙ УДАР, И МИША ЗАБИРАЕТ ТЕБЯ В СВОЙ СНТ",
    "ЗА ТАКИЕ УДАРЫ В РУСОЙЛ БЕРУТ?",
    "ИЗЗА ТАКИХ КАК ТЫ, ВОРОБЬИ УЛЕТАЮТ ИЗ ТЮМЕНИ",
    "СУДЬЯ ВЗЯЛ ВАР, КРАСНАЯ ТЕБЕ ЗА ЭТО",
  ];
  const missReasons = { wall: "СТЕНКА", save: "ВРАТАРЬ ОТБИЛ", post: "ШТАНГА", wide: "МИМО", air: "МИМО МЯЧА" };
  const musicMelody = [
    72, null, 76, 79, 76, 72, 74, 76,
    69, null, 72, 76, 72, 69, 71, 72,
    65, null, 69, 72, 69, 65, 67, 69,
    67, null, 71, 74, 71, 67, 69, 71,
    72, 76, 79, 76, 84, null, 79, 76,
    72, 69, 76, 72, 69, null, 67, 69,
    65, 69, 72, 77, 76, 72, 69, 67,
    67, 71, 74, 79, 76, 74, 72, null,
  ];
  const musicBass = [48, 45, 41, 43, 48, 45, 41, 43];
  const musicStepDuration = 0.19;
  const leagueLogo = new Image();
  leagueLogo.src = "assets/tfl.png";
  const sandersLogo = new Image();
  sandersLogo.src = globalThis.FootbolicaSandersImage;
  const dollarImage = new Image();
  let moneyPattern = null;
  dollarImage.onload = () => {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 80;
    tile.getContext("2d").drawImage(dollarImage, 225, 340, 350, 350, 0, 0, 80, 80);
    moneyPattern = ctx.createPattern(tile, "repeat");
  };
  dollarImage.src = globalThis.FootbolicaDollarImage;
  const carImage = new Image();
  carImage.src = globalThis.FootbolicaCarImage;
  const storageKey = "footbolica-best-game-v1";
  const saved = readSaved();
  let selectedPlayer = 0;
  let keeperColor = keeperColors[0];
  let state = "menu";
  let beforeConfirm = "aiming";
  let shot = { kind: "free-kick", distance: 23, offsetMeters: 0 };
  let scene = game.sceneFor(shot);
  let aim = game.startingAim(scene);
  let score = game.START_SCORE;
  let goals = 0;
  let attempts = 0;
  let peak = game.START_SCORE;
  let best = Math.max(game.START_SCORE, saved.best || 0);
  let spin = 0;
  let power = 0.55;
  let chargingSince = 0;
  let flight = null;
  let flightStartedAt = 0;
  let aimDrag = null;
  let overAt = 0;
  let toastUntil = 0;
  let audioContext = null;
  let musicGain = null;
  let musicActive = false;
  let musicStep = 0;
  let musicNextStep = 0;
  let muted = !!saved.muted;
  let tutorialSeen = !!saved.tutorialSeen;
  let particles = [];

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
    } catch {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ best, muted, tutorialSeen }));
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
  }

  function resizeCanvas() {
    const width = ui.wrap.clientWidth;
    const height = ui.wrap.clientHeight;
    const scale = Math.min(width / game.WIDTH, height / game.HEIGHT);
    canvas.style.width = `${Math.floor(game.WIDTH * scale)}px`;
    canvas.style.height = `${Math.floor(game.HEIGHT * scale)}px`;
    if (visual3d) {
      canvas3d.style.width = canvas.style.width;
      canvas3d.style.height = canvas.style.height;
      visual3d.resize(Math.floor(game.WIDTH * scale), Math.floor(game.HEIGHT * scale));
    }
  }

  function updateHud() {
    ui.score.textContent = score;
    ui.best.textContent = best;
    ui.goals.textContent = goals;
    ui.shotTag.textContent = shot.kind === "penalty" ? "ПЕНАЛЬТИ · 11 М" : `ШТРАФНОЙ · ${Math.round(shot.distance)} М`;
    ui.sound.textContent = muted ? "♪̸" : "♫";
    ui.sound.setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
  }

  function updateControls() {
    const ready = state === "aiming";
    const showNext = state === "result" && !overAt;
    ui.spin.disabled = !ready;
    ui.shoot.classList.toggle("hidden", showNext);
    ui.next.classList.toggle("hidden", !showNext);
    ui.shoot.disabled = !ready && state !== "charging";
    if (state === "flying") ui.shoot.textContent = "МЯЧ В ПОЛЁТЕ...";
    else ui.shoot.innerHTML = "УДЕРЖИ И ОТПУСТИ <span>➜</span>";
    ui.powerFill.style.width = `${Math.round(power * 100)}%`;
    ui.powerValue.textContent = `${Math.round(power * 100)}%`;
    ui.spinValue.textContent = spin === 0 ? "ПРЯМО" : spin < 0 ? `${Math.abs(Math.round(spin * 100))}% ВЛЕВО` : `${Math.round(spin * 100)}% ВПРАВО`;
  }

  function prepareShot() {
    ui.toast.classList.remove("show");
    toastUntil = 0;
    shot = game.randomShot();
    scene = game.sceneFor(shot);
    keeperColor = keeperColors[Math.floor(Math.random() * keeperColors.length)];
    aim = game.startingAim(scene);
    spin = 0;
    power = 0.55;
    flight = null;
    aimDrag = null;
    particles = [];
    chargingSince = 0;
    overAt = 0;
    ui.spin.value = "0";
    state = "aiming";
    updateHud();
    updateControls();
  }

  function startRun() {
    score = game.START_SCORE;
    goals = 0;
    attempts = 0;
    peak = score;
    ui.menu.classList.add("hidden");
    ui.over.classList.add("hidden");
    prepareShot();
    if (!tutorialSeen) {
      state = "tutorial";
      ui.tutorial.classList.remove("hidden");
      updateControls();
    }
    startMusic();
  }

  function showMenu() {
    stopMusic();
    state = "menu";
    score = game.START_SCORE;
    goals = 0;
    peak = score;
    flight = null;
    aimDrag = null;
    overAt = 0;
    ui.over.classList.add("hidden");
    ui.confirm.classList.add("hidden");
    ui.menu.classList.remove("hidden");
    ui.toast.classList.remove("show");
    updateHud();
    updateControls();
  }

  function toast(text, miss = false) {
    ui.toast.textContent = text;
    ui.toast.classList.toggle("miss", miss);
    ui.toast.classList.add("show");
    toastUntil = performance.now() + Math.min(6500, (miss ? 2500 : 3200) + text.length * 18);
  }

  function newParticles() {
    particles = Array.from({ length: 45 }, () => ({
      x: scene.goal.centerX + (Math.random() - 0.5) * 320,
      y: scene.goal.top + Math.random() * 100,
      vx: (Math.random() - 0.5) * 170,
      vy: -Math.random() * 130,
      color: ["#ffe33d", "#ff4e91", "#54e7d1", "#fff"][Math.floor(Math.random() * 4)],
      born: performance.now(),
    }));
  }

  function finishFlight(now) {
    if (state !== "flying") return;
    const result = flight.result.kind;
    const outcome = game.applyResult(score, result);
    score = outcome.score;
    if (result === "goal") {
      goals += 1;
      peak = Math.max(peak, score);
      if (score > best) {
        best = score;
        save();
      }
      newParticles();
      playSound("goal");
      const slogan = goalSlogans[Math.floor(Math.random() * goalSlogans.length)];
      toast(`${players[selectedPlayer].goalChant}\n${slogan}\nГОЛ +1`);
    } else {
      playSound(result);
      const taunt = players[selectedPlayer].missChants?.[result]
        || missTaunts[Math.floor(Math.random() * missTaunts.length)];
      toast(`${taunt}\n${missReasons[result]} −1`, true);
    }
    updateHud();
    state = "result";
    if (outcome.over) overAt = toastUntil + 250;
    updateControls();
  }

  function showGameOver() {
    stopMusic();
    state = "over";
    overAt = 0;
    $("finalGoals").textContent = goals;
    $("finalPeak").textContent = peak;
    $("finalBest").textContent = best;
    $("overMessage").textContent = goals === 0
      ? "Разминка закончилась раньше, чем планировалось."
      : goals >= 10 ? "Трибуны требуют автограф!" : "Трибуны ждут реванша!";
    ui.toast.classList.remove("show");
    ui.over.classList.remove("hidden");
    updateControls();
  }

  function startCharge(event) {
    if (state !== "aiming") return;
    event.preventDefault();
    ui.shoot.setPointerCapture(event.pointerId);
    state = "charging";
    power = 0;
    chargingSince = performance.now();
    updateControls();
    playSound("charge");
  }

  function releaseCharge(event) {
    if (state !== "charging") return;
    event.preventDefault();
    power = Math.min(1, (performance.now() - chargingSince) / 1450);
    flightStartedAt = performance.now();
    attempts += 1;
    const player = players[selectedPlayer];
    const flightOptions = { shot, aim, power, spin, wallTime: flightStartedAt / 1000 };
    flight = player.missEvery && attempts % player.missEvery === 0
      ? game.buildMissedBallFlight(flightOptions)
      : game.buildFlight({ ...flightOptions, guaranteedGoal: !!player.maxPowerGoal && power === 1,
        guaranteedCurl: !!player.maxSpinGoal && Math.abs(spin) === 1 });
    aim = game.startingAim(scene);
    state = "flying";
    updateControls();
    if (!flight.missedBall) playSound("kick");
  }

  function onCanvasPointer(event) {
    if (state !== "aiming" && state !== "charging") return;
    if (visual3d) {
      aim = visual3d.aimFromPointer(event, scene);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const rotated = window.matchMedia("(max-width: 800px) and (orientation: portrait)").matches;
    const x = rotated ? (event.clientY - rect.top) / rect.height * game.WIDTH
      : (event.clientX - rect.left) / rect.width * game.WIDTH;
    const y = rotated ? (rect.right - event.clientX) / rect.width * game.HEIGHT
      : (event.clientY - rect.top) / rect.height * game.HEIGHT;
    aim = game.clampAim(scene, x, y);
  }

  function pointerOverControls(event) {
    return !!document.elementFromPoint(event.clientX, event.clientY)?.closest(".controls");
  }

  function beginAimDrag(event) {
    if (state !== "aiming" && state !== "charging") return;
    if (aimDrag || event.target.closest(".controls, .screen, button, input")) return;
    const touch = event.pointerType !== "mouse";
    aimDrag = {
      pointerId: event.pointerId, touch, startX: event.clientX, startY: event.clientY,
      startAim: { ...aim }, startedOnField: !!event.target.closest(".canvas-wrap"), moved: false,
    };
    ui.game.setPointerCapture(event.pointerId);
    if (touch) {
      event.preventDefault();
      return;
    }
    onCanvasPointer(event);
  }

  function moveAimDrag(event) {
    if (!aimDrag || event.pointerId !== aimDrag.pointerId) return;
    if (state !== "aiming" && state !== "charging") return;
    if (pointerOverControls(event)) {
      aimDrag.startX = event.clientX;
      aimDrag.startY = event.clientY;
      aimDrag.startAim = { ...aim };
      return;
    }
    if (!aimDrag.touch) {
      onCanvasPointer(event);
      return;
    }
    const deltaX = event.clientX - aimDrag.startX;
    const deltaY = event.clientY - aimDrag.startY;
    if (!aimDrag.moved && Math.hypot(deltaX, deltaY) < 4) return;
    aimDrag.moved = true;
    const field = visual3d ? canvas3d : canvas;
    const rect = field.getBoundingClientRect();
    const rotated = window.matchMedia("(max-width: 800px) and (orientation: portrait)").matches;
    aim = game.aimFromDrag(scene, aimDrag.startAim, deltaX, deltaY, rect.width, rect.height, rotated);
  }

  function endAimDrag(event) {
    if (!aimDrag || event.pointerId !== aimDrag.pointerId) return;
    if (event.type === "pointerup" && aimDrag.touch && !aimDrag.moved
      && aimDrag.startedOnField && !pointerOverControls(event)) onCanvasPointer(event);
    aimDrag = null;
    if (ui.game.hasPointerCapture(event.pointerId)) ui.game.releasePointerCapture(event.pointerId);
  }

  function ensureAudioContext() {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function beep(frequency, duration, type, delay = 0, volume = 0.08) {
    if (muted) return;
    try {
      const audio = ensureAudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    } catch {
      // Audio is optional when the browser blocks it.
    }
  }

  function playSound(kind) {
    if (kind === "kick") { beep(115, 0.15, "triangle", 0, 0.14); beep(65, 0.12, "sine", 0, 0.12); return; }
    if (kind === "goal") { beep(390, 0.17, "square"); beep(520, 0.17, "square", 0.17); beep(780, 0.35, "triangle", 0.34); return; }
    if (kind === "charge") { beep(220, 0.07, "sine", 0, 0.03); return; }
    beep(kind === "save" ? 145 : 95, 0.3, "sawtooth", 0, 0.07);
  }

  function setMusicVolume() {
    if (!musicGain || !audioContext) return;
    musicGain.gain.setTargetAtTime(musicActive && !muted ? 1 : 0, audioContext.currentTime, 0.02);
  }

  function startMusic() {
    musicActive = true;
    musicStep = 0;
    if (muted) return;
    try {
      const audio = ensureAudioContext();
      if (!musicGain) {
        musicGain = audio.createGain();
        musicGain.gain.value = 0;
        musicGain.connect(audio.destination);
      }
      musicNextStep = audio.currentTime + 0.04;
      setMusicVolume();
    } catch {
      // Music is optional when the browser blocks audio.
    }
  }

  function stopMusic() {
    musicActive = false;
    setMusicVolume();
  }

  function scheduleMusicNote(midiNote, start, duration, type, volume) {
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midiNote - 69) / 12), start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    envelope.gain.setValueAtTime(volume, start + duration - 0.03);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function scheduleMusic() {
    if (!musicActive || muted || !audioContext || audioContext.state !== "running") return;
    if (musicNextStep < audioContext.currentTime) musicNextStep = audioContext.currentTime + 0.02;
    while (musicNextStep < audioContext.currentTime + 0.12) {
      const step = musicStep % musicMelody.length;
      const note = musicMelody[step];
      if (note !== null) scheduleMusicNote(note, musicNextStep, musicStepDuration * 0.8, "square", 0.025);
      if (step % 2 === 0) {
        const bass = musicBass[Math.floor(step / 8)];
        const offset = [0, 7, 12, 7][(step % 8) / 2];
        scheduleMusicNote(bass + offset, musicNextStep, musicStepDuration * 1.7, "triangle", 0.035);
      }
      musicStep++;
      musicNextStep += musicStepDuration;
    }
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function roundRect(x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, "#12649f");
    sky.addColorStop(0.55, "#64c4df");
    sky.addColorStop(1, "#c3eddb");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, game.WIDTH, game.HEIGHT);
    const glow = ctx.createRadialGradient(760, 85, 10, 760, 85, 240);
    glow.addColorStop(0, "rgba(255,248,177,.42)");
    glow.addColorStop(1, "rgba(255,248,177,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(490, 0, 540, 320);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    for (const [x, y, s] of [[145, 95, 1], [810, 65, 0.7], [1030, 130, 1.1]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 55 * s, 19 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 25 * s, y - 11 * s, 35 * s, 24 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 24 * s, y - 9 * s, 35 * s, 24 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#182343";
    ctx.beginPath();
    ctx.moveTo(0, 239); ctx.lineTo(game.WIDTH, 239);
    ctx.lineTo(game.WIDTH, 273); ctx.lineTo(0, 257); ctx.fill();
    const stands = ctx.createLinearGradient(0, 260, 0, 365);
    stands.addColorStop(0, "#544078");
    stands.addColorStop(1, "#1d2344");
    ctx.fillStyle = stands;
    ctx.fillRect(0, 258, game.WIDTH, 108);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(0, 285, game.WIDTH, 4);
    ctx.fillRect(0, 324, game.WIDTH, 4);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 86; col++) {
        ctx.fillStyle = ["#ffe33d", "#f8f6ec", "#ff4e91", "#54e7d1"][((row * 19 + col * 7) % 4)];
        ctx.fillRect(col * 15 + (row % 2) * 6, 279 + row * 17, 7, 7);
      }
    }
    if (leagueLogo.complete && leagueLogo.naturalWidth) {
      for (const x of [18, game.WIDTH - 202]) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 3, 261, 190, 86);
        ctx.drawImage(leagueLogo, x, 264, 184, 80);
      }
    }
    ctx.fillStyle = "#102f38";
    ctx.fillRect(0, 354, game.WIDTH, 12);
    const grass = ctx.createLinearGradient(0, 345, 0, game.HEIGHT);
    grass.addColorStop(0, "#2eaa6c");
    grass.addColorStop(0.6, "#178a55");
    grass.addColorStop(1, "#0c6746");
    ctx.fillStyle = grass;
    ctx.beginPath();
    ctx.moveTo(0, 345); ctx.lineTo(game.WIDTH, 345); ctx.lineTo(game.WIDTH, game.HEIGHT);
    ctx.lineTo(0, game.HEIGHT); ctx.fill();
    for (let i = -8; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "rgba(181,243,150,.1)" : "rgba(3,68,57,.1)";
      ctx.beginPath();
      ctx.moveTo(scene.goal.centerX + i * 46, 345);
      ctx.lineTo(scene.goal.centerX + (i + 1) * 46, 345);
      ctx.lineTo(scene.goal.centerX + (i + 1) * 185, game.HEIGHT);
      ctx.lineTo(scene.goal.centerX + i * 185, game.HEIGHT);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(250,255,217,.47)";
    ctx.lineWidth = 3;
    line(0, 478, 1200, 478);
    line(0, 634, 1200, 634);
    line(scene.goal.centerX - 450, 680, scene.goal.left + 20, 371);
    line(scene.goal.centerX + 450, 680, scene.goal.right - 20, 371);
    ctx.beginPath();
    ctx.ellipse(scene.goal.centerX, 510, 112, 36, 0, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(6,58,41,.3)";
    ctx.beginPath(); ctx.ellipse(scene.goal.centerX, 405, 270, 24, 0, 0, Math.PI * 2); ctx.fill();
    roundRect(451, 364, 298, 31, 5, "#111a31");
    roundRect(455, 359, 290, 30, 5, "#34314d");
    ctx.fillStyle = "#ffe33d";
    ctx.font = "bold 19px Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ТРИБУНЫ ВЕРЯТ. ПОКА ЧТО.", 600, 382);
  }

  function drawMishanyaPrison() {
    if (selectedPlayer !== 9) return;
    ctx.save();
    ctx.fillStyle = "rgba(6, 23, 25, .35)";
    ctx.beginPath(); ctx.ellipse(174, 505, 151, 15, 0, 0, Math.PI * 2); ctx.fill();
    const wall = ctx.createLinearGradient(0, 330, 0, 483);
    wall.addColorStop(0, "#aab1ae");
    wall.addColorStop(1, "#65716f");
    ctx.fillStyle = wall;
    ctx.fillRect(48, 331, 272, 150);
    ctx.fillStyle = "#596665";
    ctx.beginPath();
    ctx.moveTo(30, 502); ctx.lineTo(302, 502);
    ctx.lineTo(320, 481); ctx.lineTo(48, 481); ctx.fill();

    // The bench is behind the car; its seat meets the wheels.
    ctx.fillStyle = "#263238";
    ctx.fillRect(78, 457, 6, 30);
    ctx.fillRect(258, 457, 6, 30);
    ctx.fillStyle = "#805e4b";
    ctx.fillRect(76, 413, 190, 36);
    ctx.fillStyle = "#a17b61";
    ctx.fillRect(76, 411, 190, 5);
    ctx.fillStyle = "#674a3d";
    ctx.fillRect(76, 456, 190, 10);
    ctx.fillStyle = "#a17b61";
    ctx.fillRect(76, 454, 190, 4);
    if (carImage.complete && carImage.naturalWidth) {
      const outline = globalThis.FootbolicaCarOutline;
      ctx.save();
      ctx.translate(87, 337);
      ctx.scale(176 / outline.width, 130 / outline.height);
      ctx.beginPath();
      outline.points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(carImage, 0, 0, outline.width, outline.height);
      ctx.restore();
    }

    ctx.strokeStyle = "#34434a";
    ctx.lineWidth = 5;
    for (let x = 48; x <= 320; x += 27.2) line(x, 330, x - 18, 354);
    for (let y = 336; y < 354; y += 9) line(48 - (y - 330) * 0.75, y, 320 - (y - 330) * 0.75, y);
    for (let y = 363; y < 502; y += 28) {
      line(30 + (502 - y) * 18 / 148, y - 21, 30, y);
      line(302 + (502 - y) * 18 / 148, y - 21, 302, y);
    }
    ctx.strokeStyle = "#1d2b32";
    ctx.lineWidth = 6;
    for (let x = 30; x <= 302; x += 27.2) line(x, 354, x, 502);
    for (const y of [409, 456]) line(30, y, 302, y);
    ctx.strokeStyle = "#172229";
    ctx.lineWidth = 10;
    line(30, 502, 30, 354); line(30, 354, 302, 354);
    line(302, 354, 302, 502); line(30, 502, 302, 502);
    line(30, 354, 48, 331); line(302, 354, 320, 331);
    line(48, 331, 320, 331); line(320, 331, 320, 481);
    ctx.lineWidth = 8;
    line(166, 356, 166, 500);
    ctx.lineWidth = 5;
    line(168, 357, 293, 357); line(168, 499, 293, 499);
    ctx.fillStyle = "#25343b";
    ctx.fillRect(155, 414, 23, 24);
    ctx.fillStyle = "#9ba9a9";
    ctx.fillRect(164, 423, 5, 5);
    ctx.restore();
  }

  function drawGoal() {
    const { goal } = scene;
    const depth = 30;
    const width = goal.right - goal.left;
    const height = goal.bottom - goal.top;
    ctx.fillStyle = "rgba(10,24,37,.38)";
    ctx.beginPath(); ctx.ellipse(goal.centerX + 15, goal.bottom + 20, width * 0.57, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#26304b";
    ctx.fillRect(goal.left + depth, goal.top - depth, width - depth * 2, height + 8);
    ctx.fillStyle = "#4d5b72";
    ctx.beginPath();
    ctx.moveTo(goal.left, goal.top); ctx.lineTo(goal.left + depth, goal.top - depth);
    ctx.lineTo(goal.right - depth, goal.top - depth); ctx.lineTo(goal.right, goal.top); ctx.fill();
    ctx.fillStyle = "#17243e";
    ctx.beginPath();
    ctx.moveTo(goal.right, goal.top); ctx.lineTo(goal.right - depth, goal.top - depth);
    ctx.lineTo(goal.right - depth, goal.bottom - 10); ctx.lineTo(goal.right, goal.bottom); ctx.fill();
    ctx.fillStyle = "rgba(7,20,37,.68)";
    ctx.fillRect(goal.left + 10, goal.top + 10, width - 20, height - 4);
    ctx.strokeStyle = "rgba(232,247,253,.4)";
    ctx.lineWidth = 2;
    for (let x = goal.left + 20; x < goal.right; x += 25) {
      line(x, goal.top + 10, goal.centerX + (x - goal.centerX) * 0.85, goal.bottom + 6);
    }
    for (let y = goal.top + 20; y < goal.bottom + 10; y += 22) line(goal.left + 10, y, goal.right - 10, y);
    ctx.strokeStyle = "#17152c";
    ctx.lineWidth = 21;
    ctx.beginPath(); ctx.moveTo(goal.left, goal.bottom); ctx.lineTo(goal.left, goal.top);
    ctx.lineTo(goal.right, goal.top); ctx.lineTo(goal.right, goal.bottom); ctx.stroke();
    const post = ctx.createLinearGradient(goal.left, 0, goal.left + 13, 0);
    post.addColorStop(0, "#b6c9d8"); post.addColorStop(0.48, "#fff"); post.addColorStop(1, "#d5e7ed");
    ctx.strokeStyle = post;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 2;
    line(goal.left + 11, goal.bottom, goal.right - 11, goal.bottom);
  }

  function drawPerson(x, feetY, scale, palette, options = {}) {
    ctx.save();
    ctx.translate(x, feetY);
    ctx.scale(scale, scale);
    if (options.lean) ctx.rotate(options.lean);
    ctx.fillStyle = "rgba(7,26,33,.22)";
    ctx.beginPath();
    ctx.moveTo(-20, -8); ctx.lineTo(7, -8); ctx.lineTo(69, 14); ctx.lineTo(19, 10); ctx.fill();
    ctx.fillStyle = "rgba(7,26,33,.34)";
    ctx.beginPath(); ctx.ellipse(15, 5, 43, 10, 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = "round";
    if (palette.longLegs) { ctx.save(); ctx.scale(1, 1.45); }
    const kickSide = palette.leftFooted ? -1 : 1;
    const legs = [-1, 1].map((side) => {
      const swing = side === kickSide ? options.kickSwing || 0 : 0;
      return { side, hipX: side < 0 ? -14 : 13,
        footX: (side < 0 ? -16 : 17) + swing * 23,
        footY: -2 - swing * 17, swing };
    });
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 21;
    for (const leg of legs) line(leg.hipX, -43, leg.footX, leg.footY - 3);
    ctx.strokeStyle = palette.moneyKit && moneyPattern ? moneyPattern : palette.shorts || "#282c40";
    ctx.lineWidth = 16;
    for (const leg of legs) line(leg.hipX, -42, leg.hipX + leg.swing * 5, -31 - leg.swing * 3);
    ctx.strokeStyle = palette.skin; ctx.lineWidth = 13;
    for (const leg of legs) line(leg.hipX + leg.swing * 5, -30 - leg.swing * 3,
      leg.footX, -20 - leg.swing * 11);
    ctx.strokeStyle = palette.socks || "#ecf2ea"; ctx.lineWidth = 13;
    for (const leg of legs) line(leg.footX, -20 - leg.swing * 11, leg.footX, leg.footY - 5);
    if (palette.castLeg) {
      const castFoot = legs[1];
      ctx.strokeStyle = "#dce1e5"; ctx.lineWidth = 17;
      line(castFoot.hipX + castFoot.swing * 5, -29 - castFoot.swing * 3,
        castFoot.footX, castFoot.footY - 4);
      ctx.strokeStyle = "#a5afb8"; ctx.lineWidth = 2;
      for (const y of [-25, -17, -9]) line(castFoot.footX - 7, y - castFoot.swing * 12,
        castFoot.footX + 7, y + 3 - castFoot.swing * 12);
    }
    ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 3;
    for (const leg of legs) line(leg.footX - 5, -18 - leg.swing * 11,
      leg.footX - 5, leg.footY - 6);
    ctx.fillStyle = palette.boots || "#20242e";
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 3;
    for (const leg of legs) {
      ctx.fillStyle = palette.castLeg && leg.side === 1 ? "#dce1e5" : palette.boots || "#20242e";
      ctx.beginPath(); ctx.ellipse(leg.footX + 4, leg.footY, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (palette.longLegs) { ctx.restore(); ctx.translate(0, -19); }
    const jersey = ctx.createLinearGradient(-29, -86, 35, -35);
    jersey.addColorStop(0, "#fff");
    jersey.addColorStop(0.16, palette.shirt);
    jersey.addColorStop(1, palette.shirt);
    ctx.fillStyle = jersey;
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(-29, -87, 58, 51, 10); ctx.fill(); ctx.stroke();
    if (palette.stripes) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(-27, -85, 54, 47, 8); ctx.clip();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = palette.stripes[i % 2];
        ctx.fillRect(-27 + i * 9, -85, 9, 47);
      }
      ctx.restore();
    }
    if (palette.moneyKit && moneyPattern) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(-27, -85, 54, 47, 8); ctx.clip();
      ctx.fillStyle = moneyPattern;
      ctx.fillRect(-27, -85, 54, 47);
      ctx.restore();
    }
    const headHold = options.headHold || 0;
    const armPoints = [-1, 1].map((side) => ({
      shoulderX: side * 27,
      elbowX: side * (45 + headHold * 2),
      elbowY: options.keeper ? -105 : -48 - headHold * 50,
      handX: side * (45 - headHold * 23),
      handY: options.keeper ? -105 : -48 - headHold * 80,
    }));
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 21;
    for (const arm of armPoints) {
      line(arm.shoulderX, -75, arm.elbowX, arm.elbowY);
      line(arm.elbowX, arm.elbowY, arm.handX, arm.handY);
    }
    if (palette.skewers) {
      ctx.strokeStyle = "#ad9672"; ctx.lineWidth = 3;
      for (const offset of [-5, 5]) {
        line(45 + offset, -48, 61 + offset, -99);
        ctx.strokeStyle = "#8c3d1f"; ctx.lineWidth = 9;
        line(53 + offset, -72, 59 + offset, -89);
        ctx.strokeStyle = "#ad9672"; ctx.lineWidth = 3;
      }
    }
    ctx.strokeStyle = palette.skin; ctx.lineWidth = 15;
    for (const arm of armPoints) {
      line(arm.shoulderX, -75, arm.elbowX, arm.elbowY);
      line(arm.elbowX, arm.elbowY, arm.handX, arm.handY);
    }
    if (palette.sleeveColor || palette.moneyKit) {
      ctx.strokeStyle = "#17152c"; ctx.lineWidth = 22;
      line(-27, -75, -35, -63); line(27, -75, 35, -63);
      ctx.strokeStyle = palette.moneyKit ? moneyPattern || palette.shirt : palette.sleeveColor;
      ctx.lineWidth = 17;
      line(-27, -75, -35, -63); line(27, -75, 35, -63);
    }
    if (palette.baton) {
      ctx.strokeStyle = "#17152c"; ctx.lineWidth = 9;
      line(-45, -49, -65, -100);
      ctx.strokeStyle = "#68727f"; ctx.lineWidth = 4;
      line(-48, -57, -65, -100);
    }
    if (palette.handcuffs) {
      ctx.strokeStyle = "#8593a2"; ctx.lineWidth = 4;
      line(45, -49, 61, -57);
      for (const centerX of [61, 78]) {
        ctx.beginPath(); ctx.ellipse(centerX, -63, 8, 11, 0.3, 0, Math.PI * 2); ctx.stroke();
      }
      line(68, -62, 71, -64);
    }
    const face = ctx.createRadialGradient(-10, -122, 4, 0, -109, 34);
    face.addColorStop(0, "#fff2d2");
    face.addColorStop(0.35, palette.skin);
    face.addColorStop(1, "#7d4d42");
    ctx.fillStyle = face;
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, -111, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.hair;
    ctx.beginPath(); ctx.arc(0, -122, 25, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.24)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-7, -123, 13, Math.PI * 1.13, Math.PI * 1.48); ctx.stroke();
    if (palette.ponytail) {
      ctx.strokeStyle = palette.hair; ctx.lineWidth = 13;
      line(12, -128, 17, -96);
      ctx.fillStyle = palette.hair;
      ctx.beginPath(); ctx.ellipse(18, -94, 9, 15, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff4e91";
      ctx.beginPath(); ctx.ellipse(13, -130, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (palette.clownHat) {
      ctx.fillStyle = "#ff4e91";
      ctx.strokeStyle = "#17152c"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-21, -133); ctx.lineTo(0, -180); ctx.lineTo(21, -133);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#54e7d1";
      ctx.fillRect(-24, -138, 48, 8);
      ctx.strokeRect(-24, -138, 48, 8);
      ctx.fillStyle = "#ffe33d";
      ctx.beginPath(); ctx.arc(0, -181, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (headHold > 0) {
      ctx.fillStyle = palette.skin;
      ctx.strokeStyle = "#17152c";
      ctx.lineWidth = 3;
      for (const arm of armPoints) {
        ctx.beginPath();
        ctx.ellipse(arm.handX, arm.handY, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.fillStyle = "#17152c";
    if (!options.back) {
      ctx.fillRect(-10, -112, 4, 5); ctx.fillRect(8, -112, 4, 5);
      ctx.strokeStyle = "#17152c"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(1, -99, 8, 0.1, Math.PI - 0.1); ctx.stroke();
    } else {
      ctx.font = "bold 9px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#17152c";
      ctx.fillText(palette.shirtName.toUpperCase(), 0, -72, 53);
      if (palette.beerMug) {
        ctx.font = "26px Arial, sans-serif";
        ctx.fillText("🍺", 0, -48);
      } else if (palette.sandersLogo) {
        if (sandersLogo.complete && sandersLogo.naturalWidth) {
          ctx.save();
          ctx.beginPath(); ctx.arc(0, -55, 15, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(sandersLogo, -15, -70, 30, 30);
          ctx.restore();
        } else {
          ctx.font = "bold 13px Arial, sans-serif";
          ctx.fillText("KFC", 0, -51);
        }
      } else if (palette.number) {
        ctx.font = "bold 20px Impact, sans-serif";
        ctx.fillText(palette.number, 0, -51);
      }
      ctx.fillStyle = "#168c4d";
      ctx.font = "bold 8px Arial, sans-serif";
      ctx.fillText("футбилка", 0, -39, 54);
    }
    ctx.restore();
  }

  function keeperPosition(now) {
    if (!flight) return scene.goal.centerX;
    const elapsed = Math.min(flight.duration * flight.result.endT,
      Math.max(0, (now - flightStartedAt) / 1000));
    const distance = flight.keeper.speed * Math.max(0, elapsed - flight.keeper.reactionDelay);
    const target = flight.keeper.endX - scene.goal.centerX;
    return scene.goal.centerX + Math.min(distance, Math.max(-distance, target));
  }

  function drawKeeper(now) {
    const x = keeperPosition(now);
    const diving = flight && state !== "aiming" && state !== "menu";
    const lean = diving ? Math.max(-0.35, Math.min(0.35, (x - scene.goal.centerX) / 160)) : 0;
    drawPerson(x, scene.goal.bottom + 4, 1.03, {
      skin: "#d5a477", shirt: keeperColor, shorts: keeperColor,
      socks: keeperColor, hair: "#221b30", number: "1",
    }, { keeper: true, lean });
  }

  function drawWall(now) {
    if (!scene.wall) return;
    let jump = 0;
    let wallSeconds = now / 1000;
    if (flight) {
      const t = Math.min(flight.result.endT, Math.max(0, (now - flightStartedAt) / 1000 / flight.duration));
      if (state === "flying") wallSeconds = flight.wallTime + t * flight.duration;
      if (state === "flying" && !flight.missedBall && t > 0.32 && t < 0.67) {
        jump = Math.max(0, Math.sin((t - 0.32) / 0.35 * Math.PI)) * 18;
      }
    }
    const centerX = game.wallCenterAt(scene, wallSeconds);
    for (let i = 0; i < 4; i++) {
      drawPerson(centerX + (i - 1.5) * 32, scene.wall.bottom - jump, 0.92, {
        skin: i % 2 ? "#edbc8d" : "#c48662", shirt: "#ffe33d",
        shorts: "#ffe33d", socks: "#ffe33d", hair: "#32222b", number: "",
      });
    }
  }

  function drawKicker(now) {
    const progress = flight && state === "flying"
      ? Math.min(flight.result.endT, Math.max(0, (now - flightStartedAt) / 1000 / flight.duration)) : 0;
    const kickSwing = progress < 0.22 ? Math.sin(progress / 0.22 * Math.PI)
      * (flight?.missedBall ? 0.25 : 1) : 0;
    const headHold = selectedPlayer === 8 && flight?.missedBall
      ? Math.max(0, Math.min(1, (now - flightStartedAt - 130) / 230)) : 0;
    drawPerson(scene.ball.x - 73, scene.ball.y + 27, 1.22, players[selectedPlayer],
      { back: true, lean: state === "flying" ? 0.13 : 0, kickSwing, headHold });
  }

  function drawBallShadow(x, y, scale) {
    ctx.fillStyle = "rgba(5,31,30,.13)";
    ctx.beginPath(); ctx.ellipse(x + 8, y + 10, 26 * scale, 9 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(5,31,30,.25)";
    ctx.beginPath(); ctx.ellipse(x + 5, y + 8, 17 * scale, 5 * scale, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawBall(point, scale = 1, rotation = 0) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);
    ctx.rotate(rotation);
    const ballLight = ctx.createRadialGradient(-7, -8, 2, 2, 2, 21);
    ballLight.addColorStop(0, "#fff");
    ballLight.addColorStop(0.65, "#f8f7f1");
    ballLight.addColorStop(1, "#8698a5");
    ctx.fillStyle = ballLight; ctx.strokeStyle = "#17152c"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#17152c";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const x = Math.cos(a) * 7; const y = Math.sin(a) * 7;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(20,24,36,.65)"; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      line(Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * 15, Math.sin(a) * 15);
    }
    ctx.restore();
  }

  function drawTrail(t) {
    if (state !== "flying" || flight.missedBall) return;
    ctx.save();
    for (let i = 6; i >= 1; i--) {
      const behind = t - i * 0.014;
      if (behind <= 0) continue;
      const point = game.pathPoint(flight, behind, true);
      ctx.fillStyle = `rgba(255,248,207,${0.22 * (1 - i / 7)})`;
      ctx.beginPath(); ctx.arc(point.x, point.y, 3 + (7 - i) * 0.65, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawArc() {
    const preview = { scene, aim, power, spin, scatter: { x: 0, y: 0 } };
    if (selectedPlayer === 1 && Math.abs(spin) === 1) {
      preview.curvePath = game.curlPreviewPath(scene, aim, power, spin);
    }
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const p = game.pathPoint(preview, i / 36);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 10; ctx.setLineDash([13, 12]); ctx.stroke();
    ctx.strokeStyle = "#ffe33d"; ctx.lineWidth = 5; ctx.stroke(); ctx.setLineDash([]);
    const end = game.pathPoint(preview, 1);
    ctx.strokeStyle = "#17152c"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(end.x, end.y, 16, 0, Math.PI * 2); ctx.stroke();
    line(end.x - 25, end.y, end.x + 25, end.y);
    line(end.x, end.y - 25, end.x, end.y + 25);
  }

  function drawParticles(now) {
    particles = particles.filter((particle) => now - particle.born < 1500);
    for (const particle of particles) {
      const age = (now - particle.born) / 1000;
      ctx.save(); ctx.translate(particle.x + particle.vx * age, particle.y + particle.vy * age + 130 * age * age);
      ctx.rotate(age * 5); ctx.fillStyle = particle.color;
      ctx.fillRect(-5, -4, 10, 8); ctx.restore();
    }
  }

  function draw(now) {
    if (visual3d) {
      visual3d.draw({ now, scene, shot, aim, flight, flightStartedAt, state,
        power, spin, selectedPlayer, keeperColor, keeperX: keeperPosition(now) });
      return;
    }
    ctx.clearRect(0, 0, game.WIDTH, game.HEIGHT);
    drawBackground();
    drawMishanyaPrison();
    drawGoal();
    drawKeeper(now);
    drawWall(now);
    const t = flight ? Math.min(flight.result.endT, Math.max(0, (now - flightStartedAt) / 1000 / flight.duration)) : 0;
    const point = flight ? game.pathPoint(flight, t, true) : scene.ball;
    const groundY = flight?.missedBall ? scene.ball.y
      : scene.ball.y + (scene.goal.bottom - scene.ball.y) * t;
    drawBallShadow(point.x, groundY, flight?.missedBall ? 1 : 1 - t * 0.45);
    drawKicker(now);
    if (state === "aiming" || state === "charging" || state === "tutorial") drawArc();
    if (flight) drawTrail(t);
    drawBall(point, flight?.missedBall ? 1 : 1 - t * 0.4,
      flight && !flight.missedBall ? t * 8 * (1 + Math.abs(spin)) : 0);
    drawParticles(now);
  }

  function frame(now) {
    if (state === "charging") {
      const nextPower = Math.min(1, (now - chargingSince) / 1450);
      if (nextPower !== power) { power = nextPower; updateControls(); }
    }
    if (state === "flying" && (now - flightStartedAt) / 1000 / flight.duration >= flight.result.endT) finishFlight(now);
    if (overAt && now >= overAt && state === "result") showGameOver();
    if (toastUntil && now >= toastUntil) { ui.toast.classList.remove("show"); toastUntil = 0; }
    scheduleMusic();
    draw(now);
    requestAnimationFrame(frame);
  }

  document.querySelectorAll("[data-player]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlayer = Number(button.dataset.player);
      document.querySelectorAll("[data-player]").forEach((card) => {
        const active = card === button;
        card.classList.toggle("selected", active);
        card.setAttribute("aria-pressed", String(active));
      });
    });
  });
  $("startButton").addEventListener("click", startRun);
  $("tutorialButton").addEventListener("click", () => {
    tutorialSeen = true; save(); ui.tutorial.classList.add("hidden"); state = "aiming"; updateControls();
  });
  $("againButton").addEventListener("click", showMenu);
  ui.next.addEventListener("click", prepareShot);
  ui.spin.addEventListener("input", () => { spin = Number(ui.spin.value) / 100; updateControls(); });
  ui.sound.addEventListener("click", () => {
    muted = !muted;
    save();
    updateHud();
    if (!muted) {
      if (musicActive) startMusic();
      playSound("charge");
    } else {
      setMusicVolume();
    }
  });
  ui.restart.addEventListener("click", () => {
    if (state === "menu" || state === "tutorial" || state === "over" || state === "flying" || state === "charging") return;
    beforeConfirm = state;
    state = "confirm";
    ui.confirm.classList.remove("hidden");
    updateControls();
  });
  $("cancelReset").addEventListener("click", () => {
    state = beforeConfirm; ui.confirm.classList.add("hidden"); updateControls();
  });
  $("confirmReset").addEventListener("click", showMenu);
  ui.game.addEventListener("pointerdown", beginAimDrag);
  ui.game.addEventListener("pointermove", moveAimDrag);
  ui.game.addEventListener("pointerup", endAimDrag);
  ui.game.addEventListener("pointercancel", endAimDrag);
  ui.game.addEventListener("lostpointercapture", (event) => {
    if (aimDrag?.pointerId === event.pointerId) aimDrag = null;
  });
  ui.shoot.addEventListener("pointerdown", startCharge);
  ui.shoot.addEventListener("pointerup", releaseCharge);
  ui.shoot.addEventListener("pointercancel", () => { if (state === "charging") { state = "aiming"; power = 0.55; updateControls(); } });
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  updateHud();
  updateControls();
  requestAnimationFrame(frame);
})();
