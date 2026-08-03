/* game/boot.js — oyun chunk'inin GIRISI.
 *
 * FAZ 6 DURUMU: W0 -> W1 -> KOKLAYICI -> W6 -> YOKSAY -> MERGE -> EP ->
 * GERCEK BITIS akisinin TAMAMI. Faz 0-5'in tum sistemleri + Faz 6
 * (worlds/ep.js, MAP/END/RESET ekranlari, `finished` bayraginin MERGE'den
 * EP bitis cizgisine tasinmasi).
 *
 * AKIS: TITLE -> SC-00 -> W0 -> W1 girisi -> pip'ler -> SC-01 (C1) ->
 * REGRESYON kovalamasi -> G1 prova odasi -> KOKLAYICI (2 faz) -> W6 girisi
 * (SC-06) -> A6 (4 zipla + 2 fiil + 2 SICAK KANAL) -> YOKSAY (2 faz, uc
 * saldiri kalibi) -> X1 SON SINAV (buz+sahte zemin, cift DUGUM, KIVILCIM
 * YAGMURU seridi, sicak serit, avci+Q koprüsü) -> AYNA (3 faz, bes saldiri
 * kalibi, iki yani kapali arena) -> R1 -> MERGE teklifi -> MERGE (6 s,
 * banttan zemin, oran deterministik 48) -> EP girisi -> A7 (momentum
 * rampasi) -> C7 (kurtarilan sakinler) -> BITIS CIZGISI -> epilog kapanisi
 * (5 s) -> `finished=true`, `assertFinish` yesil -> END ekrani.
 *
 * SON SINAV (X1) EKLENTISI: kitapta YOKSAY'dan sonra dogrudan R1'in duz
 * kosusu ve MERGE geliyordu — oyunun en zor ani ORTASINDA kaliyor, sonu bir
 * yurutme bandi oluyordu. X1 o bosluga oturur ve YENI mekanik ogretmez,
 * ogretilmis olan her seyi ust uste bindirir; ardindaki AYNA ise oyuncunun
 * KENDI iki fiilini (ates + zemin) ona karsi kullanan tek patrondur.
 *
 * ============================================================================
 * ARAYUZ SOZLESMESI — bu imza DEGISMEDI (Faz 0'dan miras).
 * ============================================================================
 *   import { boot } from "./boot.js";
 *   const handle = boot(displayCanvas, opts);
 *   opts: scale, dpr, lang, dark, reduceMotion, audio, getPalette(), onFps(fps),
 *         onExit(), onState(st), bridge (window.HeroBridge), debugStartWorld.
 *   handle: start/pause/resume/isPaused/resize/setLang/setTheme/
 *           setReduceMotion/setAudio/destroy/debug() — Faz 0'dan aynen.
 *
 * SADELESTIRMELER (rapor icin acikca isaretli):
 *  - REGRESYON hayaletinin Y konumu kayittan degil, oyuncunun o anki Y'sine
 *    yumusak izlenerek gelir (farkli dunya geometrisine dogal oturur; ghost.js
 *    dokumanina bkz).
 *  - Commit tasi (checkpoint) taneliligi kitabin ~16s/24 tas hedefinden
 *    kaba: segment SINIRLARINDA (10 sinir) tutulur, ic-segment ayrintida degil.
 *  - KOKLAYICI'nin kon uzunlugu/salinim hizi tasarim takdiridir; 42f/40f/60f/
 *    90f/2-bos-okuma SOZLESMESI birebir.
 *  - SC-06'nin "3 dunya katman katman geri acilir" gorseli SAF METIN
 *    (A6'nin giris etiketi); kitabin frame-frame katman-geri-acilma
 *    koreografisi kesildi (KOKLAYICI'nin koni salinim egrisiyle ayni
 *    gerekce — kitap frame sayisi vermez).
 *  - SICAK KANAL tile bayragi degil, x-araligi + kare sayacidir (tilemap.js
 *    DONDURULMUS, yeni bayrak eklenmez — pushWall hazard'iyla ayni desen).
 *  - YOKSAY'in dönüşümlü fiil talebi TEK BUTON'un TAP (REWRITE) / HOLD
 *    (SHELL) davranisindan okunur; entity havuzuna yapay telegraf enjekte
 *    etmez (bkz. bosses.js basindaki not).
 *  - EP'nin "kurtarilan sakinler yol kenarinda yürür" gorseli sabit, yavas
 *    kayan nokta dizisidir (residentDecor) — tam NPC/animasyon degil,
 *    kitap sayisal bir NPC adedi vermiyor (bkz. worlds/ep.js basindaki not).
 *  - MAP ekranindaki "3 tarih çubuğu" W1/W6/EP'e ulasilip ulasilmadigini
 *    gosteren 3 dolgu çubuğu olarak yorumlandi (kitap baska tanim vermiyor).
 *  - MAP/RESET klavye ile (PAUSE'dan M, TITLE'dan R) acilir — §7.6'nin "3
 *    gerçek buton" a11y sözleşmesini bozacak yeni DOM butonu EKLENMEDI.
 */

import { VIEW_W, VIEW_H, TILE, CHUNK_H } from "./scale.js";
import { SAFETY_ROWS } from "./levelbuilder.js";
import { F_STANDABLE } from "./tilemap.js";
import { createLoop } from "./loop.js";
import { createInput } from "./input.js";
import { makeConfig, createBody, step, EV_JUMP, EV_LAND } from "./physics.js";
import { createCamera } from "./camera.js";
import { createPalette, createRenderer, SLOT } from "./render.js";
import { createFont } from "./font.js";
import { createSalih } from "./sprites.js";
import { createCreatureSprites } from "./creaturesprites.js";
import { createDebugHud } from "./debug.js";

import { createPool, FLAG_ACTIVE } from "./entities.js";
import * as Enemies from "./enemies.js";
import { createVerbSystem, VERB } from "./verbs.js";
import { createParticles } from "./particles.js";
import { obey, drain, pickOB, RATE_V0, assertRateCurveV0 } from "./data/rate.js";
import * as SaveMod from "./save.js";
import { createI18n, assertGameText } from "./i18n.js";
import TR from "./text/tr.js";
import EN from "./text/en.js";
import { createHud } from "./hud.js";
import {
  drawTitle, drawPause, drawMap, drawStageConfirm, drawEnd, drawReset,
  drawBoard, drawNameEntry,
  drawControls, stageRowRect, confirmRects, hitRect, STAGE_COUNT
} from "./screens.js";
import { createSpeedrun } from "./speedrun.js";
import { createLeaderboard, sanitizeName, NAME_MAX } from "./leaderboard.js";
import { createSceneManager, SCENE } from "./scenes.js";
import { createTelemetry } from "./telemetry.js";
import { createFakeTiles } from "./faketiles.js";
import { createArenaWalls } from "./arenawalls.js";

import { buildWorld0 } from "./worlds/w0.js";
import { buildWorld1 } from "./worlds/w1.js";
import { buildWorld6 } from "./worlds/w6.js";
import { buildWorldEP } from "./worlds/ep.js";
import { createGhost } from "./ghost.js";
import { createAudio } from "./audio.js";
import { createSniffer, createOverride, createMirror } from "./bosses.js";
import { createCutsceneDirector, SC_IDS } from "./cutscene.js";
import { createTouchSettings } from "./touch.js";
import { createPerfGovernor } from "./perf.js";
import { createA11yAnnouncer } from "./a11y.js";

const ENEMY_TYPE_BY_NAME = {
  instruction: Enemies.TYPE.INSTRUCTION,
  pipe_mouth: Enemies.TYPE.PIPE_MOUTH,
  node: Enemies.TYPE.NODE,
  bell: Enemies.TYPE.BELL
};

if (import.meta.env.DEV) {
  assertRateCurveV0(RATE_V0);
  assertGameText(TR, EN);
}

/* EP kapanisi (§6.1 "ufka dogru surekli kayma -> zoom-out") icin yumusatma. */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* bulunan gercek hata: levelbuilder.js'in build()'te doldurdugu "guvenlik
 * agi" tabani (SAFETY_ROWS satir, her dunyada H=CHUNK_H sabit) hicbir zaman
 * guvenli/yuruneblir zemin olmasi AMACLANMAMISTI — eski esik (map.pxH+64)
 * bu tabana hic ULASAMIYORDU (fizik carpismasi govdeyi daha once
 * durduruyordu), yani bir cukura düsen oyuncu bu "gizli zemin"de sonsuza
 * kadar guvenle yuruyebiliyordu. Esik artik bu tabanin TAM YUZEYINDE: dusen
 * govde ona DEGDIGI an REVERT tetiklenir (bkz. respawnIfFallen). */
const HAZARD_FLOOR_Y = (CHUNK_H - SAFETY_ROWS) * TILE;

/* Commit tasinda govde zeminin bu kadar USTUNDE dirilir — dunya dosyalarinin
 * `spawnY = curFloorY * TILE - 20` sozlesmesiyle AYNI ofset. Modul duzeyinde
 * durur cunku boot()'un HEM devam dali (en ust) HEM de commitAtBeacon'i (cok
 * asagida) okur; boot icinde tanimlansaydi devam dali onu kendi bildiriminden
 * ONCE okuyup TDZ hatasi verirdi. */
const COMMIT_BODY_UP = 20;

/* Isinlanma dizisi (bulunan gercek eksik: eski REVERT aninda/"tak diye"
 * teleport oluyordu, gecis yoktu). ONCE eski konumda 16 kare solar, TAM
 * ORTADA checkpoint'e tasinir + ikinci bir parcacik patlamasiyla "belirir",
 * SONRA 16 kare boyunca tekrar tam gorunur olana kadar belirir. Toplam
 * ~0,53 s — kontrolu uzun sure elinden almaz ama artik goze carpiyor. */
const REVERT_OUT_FRAMES = 16;
const REVERT_IN_FRAMES = 16;
const REVERT_TOTAL_FRAMES = REVERT_OUT_FRAMES + REVERT_IN_FRAMES;

/* Commit tasi (checkpoint) isaretlerini cizmek icin: bir tile kolonunda
 * yukaridan asagi ilk yurunebilir satiri bulur. Boot basinda dunya basina
 * bir kez cagrilir (statik dunya, per-frame degil). */
function groundYAtTile(map, tx) {
  let t = tx;
  if (t < 0) t = 0; else if (t >= map.w) t = map.w - 1;
  for (let ty = 0; ty < map.h; ty++) {
    if (map.flags[ty * map.w + t] & F_STANDABLE) return ty * TILE;
  }
  return map.pxH;
}

/* Bayrak konumlari: segmentBoundaries()'in AYNI x esiklerinden turetilir —
 * checkpointX'i ilerleten mantikla ayni veri, gorsel hicbir zaman
 * senkron-disi kalamaz (bkz. plan Faz 2). */
/* Zemini OLMAYAN bir commit noktasi (bosluga denk gelen turetilmis segment
 * siniri gibi) ise yaramaz degil, TEHLIKELIDIR: oraya dogan oyuncu duser ve
 * ayni yere tekrar dogar. Boyle noktalar burada elenir — hem cizilmez hem de
 * checkpointX'i ilerletmez, cunku iki is de AYNI listeden beslenir. */
function computeBeacons(xs, map) {
  const out = [];
  for (const x of xs) {
    const y = groundYAtTile(map, Math.floor(x / TILE));
    if (y >= HAZARD_FLOOR_Y - TILE) continue;
    out.push({ x, y });
  }
  return out;
}

function segmentBoundaries(worldData) {
  let x = 0;
  return worldData.segments.map((s) => {
    const b = { id: s.id, startX: x * TILE };
    x += s.tileCount;
    return b;
  });
}

export function boot(canvas, opts) {
  const o = opts || {};

  let dark = !!o.dark;
  let reduceMotion = !!o.reduceMotion;
  let audioEnabled = o.audio !== false;
  let destroyed = false;

  function readPalette() {
    const p = (typeof o.getPalette === "function") ? o.getPalette() : null;
    return createPalette(p, dark);
  }

  const renderer = createRenderer(canvas);
  renderer.setScale(o.scale || 1);
  let palette = readPalette();
  renderer.setPalette(palette);

  const font = createFont(palette);
  const salih = createSalih(palette);
  const creatureSprites = createCreatureSprites(palette);
  const debugHud = createDebugHud(font);
  const i18n = createI18n(o.bridge);
  if (o.lang) i18n.setLang(o.lang);
  const hud = createHud(font, i18n);
  const sceneManager = createSceneManager();
  const telemetry = createTelemetry();
  const perf = createPerfGovernor(telemetry);
  const particles = createParticles(192);
  const ghost = createGhost();
  const fakeTiles = createFakeTiles();
  /* AYNA'nin haritaya yazdigi gecici duvarlar. fakeTiles ile AYNI sozlesme
   * (setMap/update/draw/reset) — dunya nesneleri tekrar kullanildigi icin
   * "haritada kalici iz birakma" disiplini tek bir yerde yasar. */
  const arenaWalls = createArenaWalls();
  const audio = createAudio();
  audio.setEnabled(audioEnabled);
  const speedrun = createSpeedrun();
  const board = createLeaderboard();

  const { save, corrupted } = SaveMod.load();
  if (corrupted && o.bridge && typeof o.bridge.announce === "function") {
    o.bridge.announce(i18n.t("menu.m11"));
  }

  /* §7.6: Dengeli Mod, prefers-reduced-motion eslesirse VARSAYILAN ACIK.
   * Kullanicinin daha once kendi elleriyle kapattigini ayirt edecek ayri
   * bir bayrak yok (v0 semasi bunu tasimiyor); bu yuzden sadece HENUZ
   * dokunulmamis (taze) bir kayitta uygulanir — hasSaveData()'nin kendi
   * "taze mi" sezgisiyle AYNI mantik (fonksiyon hoisted, asagida tanimli). */
  if (reduceMotion && save.settings && !save.settings.balanced && !hasSaveData()) {
    save.settings.balanced = 1;
  }

  const cutscene = createCutsceneDirector(sceneManager, i18n, save);
  const a11yAnnouncer = createA11yAnnouncer(o.bridge, i18n);

  /* --------------------------------------------------------------- dunyalar */
  const w0 = buildWorld0();
  const w1 = buildWorld1();
  const w6 = buildWorld6();
  const ep = buildWorldEP();
  const w1Bounds = segmentBoundaries(w1);
  const w1C1StartX = (w1Bounds.find((b) => b.id === "c1") || { startX: 0 }).startX;
  const w1B1EndX = (() => { const i = w1Bounds.findIndex((b) => b.id === "b1"); return i >= 0 && w1Bounds[i + 1] ? w1Bounds[i + 1].startX : 0; })();
  const w1D1EndX = (() => { const i = w1Bounds.findIndex((b) => b.id === "d1"); return i >= 0 && w1Bounds[i + 1] ? w1Bounds[i + 1].startX : 0; })();
  const w6Bounds = segmentBoundaries(w6);
  const w6MidA6X = w6.bossTriggerX * 0.5;
  const epBounds = segmentBoundaries(ep);
  const w1Beacons = computeBeacons(w1Bounds.map((b) => b.startX), w1.map);

  /* ==========================================================================
   * ETIKET SATIR DUZENI — cakisan parkur tabelalari (ekran goruntusuyle
   * raporlandi)
   * ==========================================================================
   * Etiketler dunya x'inde SABIT bir noktaya ve segmentin zemin satirina gore
   * SABIT bir y'ye ciziliyordu; iki etiket birbirine metin genisliginden daha
   * yakin oldugunda harfleri IC ICE giriyordu ("Buz bitince boşluk var" ile
   * "Q ile zemin döşe" ayni bantta okunamaz hale gelmisti). Metni kisaltmak
   * tek tek bir yama olurdu — cakisma, etiket EKLENEN her yerde tekrar
   * dogabilir. Cozum yapisal: her etikete bir SATIR numarasi verilir ve
   * cakisan etiket bir satir YUKARI cizilir.
   *
   * Duzen kare basina DEGIL, dunya basina BIR KEZ hesaplanir (etiket listesi
   * statik; yalniz dil degisince yenilenir — genislik metne bagli). O yuzden
   * burada nesne ayirmak serbest, update dongusunde degil.
   * ========================================================================== */
  const LABEL_ROW_H = 11;
  const LABEL_MAX_ROWS = 3;
  const LABEL_GUTTER = 10;      /* iki etiket arasi asgari bosluk (px) */

  function layoutLabels(wd) {
    /* x'e gore SIRALI gezilmeli: bazi dunya dosyalari etiketi imlecin
     * gerisindeki bir tile'a koyuyor (ör. lb.label(sHot1.x0, ...)), yani dizi
     * sirasi her zaman artan x degil. */
    const sorted = wd.labels.slice().sort((a, b) => a.x - b.x);
    /* Farkli zemin yuksekliklerindeki (C1'in yukselen rotasi gibi) etiketler
     * birbirini hic gormez — sag kenar takibi y BANDI basina tutulur. */
    const rowRight = new Map();
    for (const lb of sorted) {
      const txt = i18n.lang === "en" ? lb.en : lb.tr;
      const w = (lb.kind ? 8 : 0) + font.measure(txt, 1);
      let row = 0;
      while (row < LABEL_MAX_ROWS) {
        const right = rowRight.get(lb.y + ":" + row);
        if (right === undefined || lb.x >= right + LABEL_GUTTER) break;
        row++;
      }
      if (row >= LABEL_MAX_ROWS) row = 0;   /* uc satir da dolu: en alttan devam */
      lb.row = row;
      rowRight.set(lb.y + ":" + row, lb.x + w);
    }
  }
  function layoutAllLabels() {
    layoutLabels(w0); layoutLabels(w1); layoutLabels(w6); layoutLabels(ep);
  }
  layoutAllLabels();

  /* ==========================================================================
   * BULUNAN GERCEK HATA (raporlanan "2. bölümün çıkış kapısından geçemiyorum"
   * sikayetinin KOK NEDENI): iki boss da `body.y - 20`'de, yani OYUNCUNUN
   * TETIGI GECTIGI ANDAKI Y'sinde doguyordu. bossTriggerX (W1 G1) tam da
   * DUGUM + ZIL prova odasinin cikisindadir — oyuncu oradan neredeyse HER
   * ZAMAN havadayken (kaçarken/ziplarken) gecer. Havada gecildiginde
   * KOKLAYICI zeminden 50-70 px YUKARIDA doguyor; stomp testi ise
   *     dy = oyuncuMerkeziY - bossY  ∈ [-40, 0)   ve   vy > 0
   * istiyor. Dogrulanmis maksimum ziplama yuksekligi 55,56 px oldugu icin bu
   * bant FIZIKSEL OLARAK ERISILEMEZ hale geliyor: boss vurulamiyor,
   * `boss.isDefeated` hicbir zaman true olmuyor, tryWorldTransition()'in
   * `boss && boss.isDefeated` kapisi acilmiyor ve CIKIS KAPISI SONSUZA DEK
   * KILITLI kaliyor. Cozum: boss'un Y'si oyuncunun anlik konumundan degil,
   * kendi X'inin ZEMININDEN turetilir (statik, boot basinda bir kez). */
  /* ARENA GEOMETRISI (dovus revizyonu): dovus artik MENZILLI. Patronun dibinde
   * durup ritim tutturmak yerine mesafe acmak, siper almak ve nisan almak
   * gerekiyor — bu yuzden iki patron da tetigin epey ILERISINDE dogar ve
   * arkalarinda oyuncunun manevra yapabilecegi bir bant kalir. Eski konumlar
   * (+70 / +20 px) menzilli bir dovus icin ezici derecede darda. */
  const W1_BOSS_DX = 190;
  const W6_BOSS_DX = 200;
  const W6_ARENA_DX = 310;   /* gorunmez tutma alani — YOKSAY atlanamaz */
  const w1BossX = w1.bossTriggerX + W1_BOSS_DX;
  const w6BossX = w6.bossTriggerX + W6_BOSS_DX;
  const w1BossGroundY = groundYAtTile(w1.map, Math.floor(w1BossX / TILE));
  const w6BossGroundY = groundYAtTile(w6.map, Math.floor(w6BossX / TILE));
  const w1BossY = w1BossGroundY - 20;
  const w6BossY = w6BossGroundY - 20;
  /* YOKSAY'in gokten yagmuru bu bandin uzerine duser; sutun isaretleri de
   * ayni x araligindan turetilir (bkz. bosses.js planRain). */
  const w6Arena = { x0: w6.bossTriggerX + 24, x1: w6.bossTriggerX + W6_ARENA_DX, groundY: w6BossGroundY };
  const w6ArenaHoldX = w6.bossTriggerX + W6_ARENA_DX;

  /* ==========================================================================
   * SON SINAV ARENASI (X1 / AYNA) — IKI YANI DA KAPALI
   * ==========================================================================
   * YOKSAY'in arenasi yalniz SAG kenardan tutuluyor. Bu, KOKLAYICI'da olculmus
   * gercek denge hatasinin ayni sinifini acik birakir: oyuncu geri cekilip
   * patronun erisemedigi bir mesafeden bedava ates edebilir (mermi menzili
   * 368 px). Son dovuste kapi ARKANDA da kapanir — arena 420 px, yani mermi
   * menziliyle ayni mertebede: "guvenli kose" diye bir yer yok.
   *
   * Patron arenanin sag yarisinda dogar; solda oyuncunun manevra yapacagi
   * 280 px kalir (kosu kalibinin anlamli olmasi icin gereken asgari mesafe,
   * bkz. bosses.js MR_DASH_MIN_TRAVEL). */
  const X1_BOSS_DX = 300;
  const X1_ARENA_L_DX = 20;
  const X1_ARENA_R_DX = 440;
  const x1BossX = w6.x1BossTriggerX + X1_BOSS_DX;
  const x1BossGroundY = groundYAtTile(w6.map, Math.floor(x1BossX / TILE));
  const x1BossY = x1BossGroundY - 16;   /* bosses.js MR_BODY_UP ile ayni: govde zemine oturur */
  const x1ArenaX0 = w6.x1BossTriggerX + X1_ARENA_L_DX;
  const x1ArenaX1 = w6.x1BossTriggerX + X1_ARENA_R_DX;
  const x1Arena = { x0: x1ArenaX0, x1: x1ArenaX1, groundY: x1BossGroundY, walls: arenaWalls };

  /* ==========================================================================
   * W6 COMMIT NOKTALARI = segment sinirlari + w6.js'in ACIK taslari
   * ==========================================================================
   * ARENA BANDINDAKILER AYIKLANIR (bulunan gercek hata): segmentBoundaries()
   * sinirlari x=0'dan kumulatif sayar, oysa segmentler spawn duzluginin (6
   * tile) ARDINDAN basliyor — yani turetilmis her sinir 96 px kayiktir. R1'in
   * kayik siniri tam da AYNA arenasinin ICINE dusuyordu: dovus sirasinda saga
   * ilerleyen oyuncu farkinda olmadan kayit noktasini arenaya tasiyor ve
   * olunce dovusun ORTASINDA diriliyordu. Kayit noktasi bir dovusun icinde
   * OLAMAZ; band icine dusen sinirlar burada tek yerde elenir ve w6.js
   * arenadan hemen sonra ACIK bir tas koyar. */
  function insideArena(x) {
    if (x >= w6.bossTriggerX - TILE && x <= w6ArenaHoldX + TILE) return true;
    if (x >= x1ArenaX0 - TILE && x <= x1ArenaX1 + TILE) return true;
    return false;
  }
  const w6Commits = w6Bounds.map((b) => b.startX)
    .concat(w6.commitStones || [])
    .filter((x) => !insideArena(x))
    .sort((a, b) => a - b);
  const w6Beacons = computeBeacons(w6Commits, w6.map);

  const cfgW0 = makeConfig(1.00, 0.00, false);
  const cfgW1 = makeConfig(1.15, 0.30, false);
  const cfgW6 = makeConfig(1.35, 0.55, false);
  const cfgEP = makeConfig(1.55, 0.75, false);

  let currentWorld = 0;
  function worldData() { return currentWorld === 0 ? w0 : currentWorld === 1 ? w1 : currentWorld === 6 ? w6 : ep; }
  function worldCfg() { return currentWorld === 0 ? cfgW0 : currentWorld === 1 ? cfgW1 : currentWorld === 6 ? cfgW6 : cfgEP; }

  const pool = createPool();
  function spawnWorldEnemies(wd) {
    pool.reset();
    for (const spec of wd.enemySpawns) {
      const t = ENEMY_TYPE_BY_NAME[spec.type];
      if (t !== undefined) Enemies.spawn(pool, t, spec.x, spec.y, spec.opts);
    }
  }
  spawnWorldEnemies(w0);

  const body = createBody(w0.spawnX, w0.spawnY);
  const cam = createCamera(w0.map.pxW, w0.map.pxH);
  cam.snapTo(w0.spawnX, w0.spawnY);
  cam.setShake(!reduceMotion);

  const verbs = createVerbSystem();
  /* v0: REWRITE/SHELL pip ile ACILIR (W1 A1/E1) — Faz2'nin generic test
   * odasindaki "hep acik" varsayimi burada KALDIRILDI; W0'da oyuncunun
   * gercekten hicbir aracı yok (D-2/K1'in anlatisal temeli budur). */
  const verbBitOf = { rewrite: SaveMod.PIP_BIT.REWRITE, shell: SaveMod.PIP_BIT.SHELL };
  if (save.verbs & (1 << SaveMod.PIP_BIT.REWRITE)) verbs.unlock(VERB.REWRITE);
  if (save.verbs & (1 << SaveMod.PIP_BIT.SHELL)) verbs.unlock(VERB.SHOOT);

  let rate = save.ratio || RATE_V0.start;
  let checkpointX = w0.spawnX, checkpointY = w0.spawnY;
  let boss = null;
  let overrideBoss = null;
  let overrideDefeatedHandled = false;
  /* SON SINAV (X1) patronu AYNA. Arena kapisi "silahlanarak" kapanir:
   * `mirrorLeftArmed` ancak oyuncu gercekten arenanin ICINE girdikten sonra
   * true olur — aksi halde patron dogar dogmaz oyuncu birkac piksel ileri
   * itilirdi (tetik cizgisi arena kenarinin biraz gerisinde). */
  let mirrorBoss = null;
  let mirrorDefeatedHandled = false;
  let mirrorLeftArmed = false;
  let bossPhase2Committed = false;
  let gameFinished = false;
  let ghostRenderX = null, ghostRenderY = null;
  let pushWallX = null;
  let pushWallGrace = 0;
  /* YALAN TABELA konusur: catlayan karonun ustunde GAME_TEXT `lies` satiri
   * belirir. Bu bes satir yazilmis, assertGameText tarafindan dogrulanmis ve
   * prose butcesine sayilmisti ama HICBIR MODUL OKUMUYORDU — karo "yalan
   * soyleyen zemin"di, oysa hicbir sey soylemiyordu. Ayni anda tek satir
   * durur (omru dolmadan yenisi yazilmaz), yani hizli kosan oyuncuyu
   * ust uste balonla bogmaz. */
  const LIE_FRAMES = 100;
  let lieText = "", lieFrames = 0, lieX = 0, lieY = 0, lieIndex = 0;
  let ghostGrace = 0;   /* REGRESYON playback YENI basladiginda birkac kare yakalama testi atlanir (bkz. updateGhost) */
  /* Hayaletin yer degistirmesinin OLCULDUGU dunya-x'i. Eskiden bu SABIT
   * w1.ghostChaseStartX'ti — kok neden buydu, bkz. startGhostChase(). */
  let ghostOriginX = 0;
  let ghostRestartPending = false;
  /* Serit cekisi bayraklari. Bildirimleri BURADA (kullanildiklari yerin cok
   * ustunde) duruyor cunku hem boot'un "kayittan devam" dali hem de SÜRE
   * MODU'ndan cikis ayni resumeFromSave()'i cagiriyor — bildirim asagida
   * kalsaydi boot dalindaki cagri TDZ hatasi verirdi. */
  let drainedB1 = false, drainedD1 = false, drainedPostBoss = false;
  let drainedW6Mid = false, drainedW6End = false, drainedW6PostBoss = false;
  /* AYNA yenilince gelen ek serit cekisi. RATE_V0.drains.w6 = 3 bir ASGARI
   * yeterlilik kontroludur (assertRateCurveV0), tavan degil — dorduncu bir
   * cekis egriyi bozmaz, yalniz SON SINAV boyunca biriken itaati odullendirir. */
  let drainedW6Mirror = false;
  let hotChannelX1 = null, hotChannelTimer = 0;
  /* KIVILCIM YAĞMURU seridi (X1). SICAK KANAL ile ayni desen: tile bayragi
   * degil, x-araligi + kare sayaci. */
  let rainZone = null, rainTimer = 0, rainWave = 0;
  let mergeAvailable = false, mergeStarted = false, mergeDone = false;
  let mergeTimer = 0, mergeStartRate = 0;
  let epFinishHandled = false, epClosing = false, epClosingTimer = 0, epF4Shown = false;
  let revertTimer = 0;   /* 0 = normal oyun; >0 = isinlanma dizisi suruyor (bkz. triggerRevert) */

  /* ------------------------------------------------------------- SÜRE MODU */
  /* Kosu boyunca `save` GECICI bir kopyadir; gercegi burada durur ve kosu
   * bitince/birakilinca aynen geri gelir. Oyuncunun normal ilerlemesi bir
   * kosu yuzunden ASLA degismez — modun tek sarti "herkes bastan baslar"
   * oldugu icin, bunun bedelini kayda odetmek kabul edilemezdi. */
  let saveSnapshot = null;
  let suppressPersist = false;
  let runResultMs = 0, runBalanced = false, runRank = 0, runRecord = false;
  let boardHighlight = null;
  /* Isim girisi GERCEK bir DOM <input>'u kullanir (mobilde sistem klavyesi
   * acilsin, Turkce karakterler kaybolmasin diye) — canvas'a yazi cizmek
   * bizim isimiz, tus toplamak tarayicininki. */
  let nameEl = null, nameValue = "", nameSending = false, nameStatus = "";

  /* bulunan gercek eksik: save.world/save.checkpoint HEP yaziliyordu (bkz.
   * persistProgress) ama boot() BUNLARI HICBIR ZAMAN okumuyordu — TITLE'daki
   * "Kaldigin tasa don" (M3) sozu bos bir sozdu, her oturum W0'dan basliyordu.
   * Simdi gercek devam var: son commit tasindan (checkpointX/Y) devam eder.
   * Bilinen sinir: bir boss yenildikten SONRAKI commit'te kaydedildiyse, o
   * boss'un "yenildi" durumu ayrica saklanmiyor — resume'de o boss'la
   * (kaybedilemez bir dovus oldugu icin zararsizca) tekrar karsilasilir. */
  if (o.debugStartWorld === 1) {
    currentWorld = 1;
    /* Debug girisi pip'lerin GERISINDEN baslattigi icin fiiller acilir —
     * aksi halde ATEŞ ET kilitli kalir ve KOKLAYICI (canini yalniz mermi
     * goturur) hicbir zaman yenilemez. Ayni emniyet kemeri 6/7'de de var. */
    verbs.unlock(VERB.REWRITE);
    verbs.unlock(VERB.SHOOT);
    spawnWorldEnemies(w1);
    body.x = w1.bossTriggerX - 300; body.y = w1.spawnY;
    cam.setBounds(w1.map.pxW, w1.map.pxH);
    cam.snapTo(body.x, body.y);
    checkpointX = w1.spawnX; checkpointY = w1.spawnY;
  } else if (o.debugStartWorld === 6) {
    currentWorld = 6;
    verbs.unlock(VERB.REWRITE);
    verbs.unlock(VERB.SHOOT);
    rate = RATE_V0.floor.w1;
    spawnWorldEnemies(w6);
    body.x = w6.spawnX; body.y = w6.spawnY;
    cam.setBounds(w6.map.pxW, w6.map.pxH);
    cam.snapTo(w6.spawnX, w6.spawnY);
    checkpointX = w6.spawnX; checkpointY = w6.spawnY;
  } else if (o.debugStartWorld === 7) {
    currentWorld = 7;
    verbs.unlock(VERB.REWRITE);
    verbs.unlock(VERB.SHOOT);
    rate = RATE_V0.merge;
    spawnWorldEnemies(ep);
    body.x = ep.spawnX; body.y = ep.spawnY;
    cam.setBounds(ep.map.pxW, ep.map.pxH);
    cam.snapTo(ep.spawnX, ep.spawnY);
    checkpointX = ep.spawnX; checkpointY = ep.spawnY;
  } else {
    resumeFromSave();
  }

  const GHOST_FALLBACK_SPEED = 2.60;   /* §5.3: "REGRESYON hayalet yarışı, W0 sabitleri, 2,60 px/f" */
  /* bulunan gercek eksik: REGRESYON sadece BU oturumda gercekten kaydedilmis
   * bir W0 kosusunu tekrar oynatabilir (ghost.record(), yalnizca
   * currentWorld===0 iken cagrilir). Debug/devam ile W0 hic oynanmadan
   * dogrudan W1+'a girildiginde recordedFrames sifir kalir ve
   * startPlayback() hicbir zaman "playing" olmaz — hayalet SESSIZCE hic
   * gelmez (F1'e ne zaman ulasilirsa ulasilsin). Belgelenmis referans hizda
   * deterministik bir "kanit" kayit uretip devam eden oyuncuya da ayni
   * deneyimi (F1'in tehdidini) saglariz. */
  function seedGhostFallback() {
    if (ghost.recordedFrames !== 0) return;
    const dist = w0.exitX - w0.spawnX;
    const frames = Math.ceil(dist / GHOST_FALLBACK_SPEED);
    ghost.startRecording(w0.spawnX);
    for (let i = 0; i <= frames; i++) ghost.record(w0.spawnX + i * GHOST_FALLBACK_SPEED, 1);
    ghost.stopRecording();
  }
  if (currentWorld > 0) seedGhostFallback();

  function initCheckpoint() { checkpointX = worldData().spawnX; checkpointY = worldData().spawnY; }

  /* --------------------------------------------------- BÖLÜM SEÇ ilerlemesi */
  /* Kitabin §9 END tablosundaki "Bölüm seç" v0'da hic uygulanmamisti. Erisim
   * kurali: YALNIZ gercekten ULASILMIS bolumler. Kayit semasina yeni alan
   * EKLENMEZ (§8.4 dondurulmus) — en ileri bolum `save.world`, `save.finished`
   * ve bu oturumun currentWorld'unden turetilir. */
  const WORLD_ORDER = [0, 1, 6, 7];
  function worldOrdinal(w) { return w === 0 ? 0 : w === 1 ? 1 : w === 6 ? 2 : 3; }
  /* Tek kaynak: recomputeMaxWorld() (hoisted). SÜRE MODU birakilinca da AYNI
   * fonksiyon cagrilir — kosu sirasinda ilerleyen sayac gercek kayda sizmasin. */
  let maxWorldReached = 0;
  recomputeMaxWorld();
  function noteWorldReached() {
    const o2 = worldOrdinal(currentWorld);
    if (o2 > maxWorldReached) maxWorldReached = o2;
  }

  function triggerRevert() {
    if (revertTimer > 0) return;   /* zaten reverting - ikinci tetigi yok say */
    audio.play("revert");
    telemetry.recordRevert(body.x, body.y, worldData().map.pxW, worldData().map.pxH);
    particles.burst(body.x + body.w / 2, body.y + body.h / 2, Math.min(10, perf.particleBudget), SLOT.HAZARD);
    body.vx = 0; body.vy = 0;
    revertTimer = REVERT_TOTAL_FRAMES;
    /* bulunan gercek eksik: REGRESYON hayaleti REVERT'ten hic ETKILENMIYORDU —
     * oyuncu checkpointX'e (F1'de ghostChaseStartX ile AYNI x) geri isinlanirken
     * hayaletin playIndex'i kendi halinde ilerlemeye devam ediyordu; bu da
     * respawn'in neredeyse ANINDA yeniden yakalanmasina yol aciyordu (bulunan
     * bir rapor: F1 commit tasinda sonsuz REVERT donguSu). Hayalet de oyuncuyla
     * AYNI ANDA "sifirlanir" — kovalamaca her respawn'da yeniden baslar. */
    /* Hayaleti BURADA yeniden baslatMA: bu anda govde hala OLDUGU yerde,
     * checkpoint'e isinlanma 16 kare sonra oluyor (bkz. updateRevert). Yeni
     * kovalamacanin orijini respawn KONUMUNDAN turetilmeli, yoksa hayalet
     * oyuncunun nerede dirildiginden bagimsiz bir yerde doguyor. */
    ghostRestartPending = ghost.isPlaying;
    /* AVCILAR da sifirlanir. Bu, pushWall ve REGRESYON icin daha once bulunan
     * "respawn'da aninda yeniden yakalanma" hatasinin AYNI sinifi: avci
     * duvarlardan gectigi icin oyuncuyu commit tasina kadar takip eder ve
     * isinlanma biter bitmez tekrar vurur — cikamayacagin bir dongu. Ucan
     * dusman mermileri de temizlenir; respawn karesinde ekranda olan bir
     * kivilcimin sebebini oyuncu goremez. */
    Enemies.clearHunters(pool);
    for (let id = 0; id < pool.flags.length; id++) {
      if ((pool.flags[id] & FLAG_ACTIVE) &&
          (pool.type[id] === Enemies.TYPE.SHARD || pool.type[id] === Enemies.TYPE.TOKEN ||
           pool.type[id] === Enemies.TYPE.BOLT)) pool.free(id);
    }
    /* AYNA'nin ordugu duvarlar da silinir. Ayni sinif: isinlanma checkpoint'e
     * yapiliyor ve o hucreye bu sirada bir duvar orulmus olabilir — govde
     * kati bir karonun ICINDE dirilirse fizik onu cozemez. Duvar yerlestirme
     * kurali oyuncunun O ANKI kolonunu zaten atliyor ama respawn govdeyi
     * BASKA bir yere tasidigi icin o koruma burada gecerli degil. */
    arenaWalls.reset();
    /* Yasayan bir patron dovusu BASTAN baslar (bkz. resetActiveBossFights).
     * arenaWalls.reset() zaten yukarida cagrildi; patron kendi duvarlarini
     * ayrica temizlemeye calissa da idempotent. */
    resetActiveBossFights();
    /* bulunan gercek eksik (asil rapor edilen sonsuz-olum dongusu): pushWallX
     * SADECE duvarin KENDI yakalamasinda geri cekiliyordu — oyuncu duvarla
     * ALAKASIZ bir sebeple (bir cukur, vb.) olurse duvar oldugu yerde (checkpoint'in
     * COK ilerisinde) donmeye devam ediyordu; respawn checkpoint'e donunce oyuncu
     * duvarin ZATEN gerisinde buluyordu ve pushWallGrace SIFIRDAYKEN ANINDA
     * tekrar yakalaniyordu. Artik HANGI sebeple olursa olsun her REVERT duvari
     * da checkpoint'in gerisine ceker. */
    if (pushWallX !== null) {
      pushWallX = checkpointX - 150;
      pushWallGrace = 45;
    }
  }

  function updateRevert() {
    revertTimer--;
    if (revertTimer === REVERT_IN_FRAMES) {
      body.x = checkpointX; body.y = checkpointY;
      body.vx = 0; body.vy = 0;
      cam.snapTo(checkpointX, checkpointY);
      particles.burst(checkpointX + body.w / 2, checkpointY + body.h / 2, Math.min(10, perf.particleBudget), SLOT.ACCENT);
      if (ghostRestartPending) { ghostRestartPending = false; startGhostChase(); }
    }
  }

  /* salih.draw() cagrisini saran render-zamanli alfa: OUT fazinda (32..17)
   * eski konumda 1->0 solar, tam ortada (16) teleport olur, IN fazinda
   * (15..0) yeni konumda 0->1 belirir. reverting degilken hep 1. */
  function revertFadeAlpha() {
    if (revertTimer <= 0) return 1;
    if (revertTimer > REVERT_IN_FRAMES) return Math.max(0, (revertTimer - REVERT_IN_FRAMES) / REVERT_OUT_FRAMES);
    return Math.min(1, 1 - revertTimer / REVERT_IN_FRAMES);
  }

  function respawnIfFallen() {
    if (body.y + body.h >= HAZARD_FLOOR_Y) triggerRevert();
  }

  /* Toplama testi (checkPips) ve CIZIM (drawPip) ayni biti okumak ZORUNDA:
   * ayrilirlarsa alinmis bir kutu ekranda durmaya devam eder. */
  function pipBitOf(p) {
    return verbBitOf[p.id] !== undefined ? verbBitOf[p.id] : SaveMod.PIP_BIT.TRAIL;
  }
  function pipTaken(p) { return !!(save.pips & (1 << pipBitOf(p))); }

  function checkPips() {
    if (currentWorld !== 1) return;
    for (const p of w1.pipSpawns) {
      const bit = pipBitOf(p);
      if (save.pips & (1 << bit)) continue;
      const dx = (body.x + body.w * 0.5) - p.x, dy = (body.y + body.h * 0.5) - p.y;
      if (dx * dx + dy * dy > 22 * 22) continue;
      save.pips |= (1 << bit);
      if (p.id === "rewrite") { verbs.unlock(VERB.REWRITE); save.verbs |= (1 << SaveMod.PIP_BIT.REWRITE); audio.play("verb-rewrite"); }
      else if (p.id === "shell") { verbs.unlock(VERB.SHOOT); save.verbs |= (1 << SaveMod.PIP_BIT.SHELL); audio.play("shoot"); }
      else audio.play("commit");
      const idx = hud.PIP_ORDER.indexOf(p.id);
      const entry = i18n.data.pips[idx];
      /* HUD'daki 12'lik sira "gecilen bolumler" gibi okunuyordu (raporlanan
       * sikayet): W1 ortasinda 7. kare (301 İZİ, bit 6) sifir aciklamayla
       * yesile donuyordu. Artik hangi karenin YANDIGI 2 saniye cerceveyle
       * isaretlenir ve etiket satirina o pip'in ADI yazilir. */
      pipFlashIndex = bit;
      pipFlashFrames = PIP_FLASH_FRAMES;
      pipFlashName = entry ? entry.name : "";
      if (entry && entry.seal) sceneManager.playDialogue([{ who: "S", line: entry.seal }]);
    }
  }
  /* ORAN DEGISIM GERI BILDIRIMI — oyunun tek kaynagi olan İTAAT cubugu
   * sessizce hareket ediyordu. Her degisim TEK kapidan gecer (applyObey /
   * applyDrain), HUD de yaninda isaretli miktari gosterir. */
  const RATE_BUMP_FRAMES = 100;
  let rateBumpFrames = 0, rateBumpAmount = 0;
  const rateBumpState = { frames: 0, amount: 0 };
  function noteRateChange(before) {
    const delta = rate - before;
    if (delta === 0) return;
    if (rateBumpFrames <= 0 || (delta > 0) !== (rateBumpAmount > 0)) rateBumpAmount = 0;
    rateBumpAmount += delta;
    rateBumpFrames = RATE_BUMP_FRAMES;
  }
  function rateBump() {
    rateBumpState.frames = rateBumpFrames;
    rateBumpState.amount = rateBumpAmount;
    return rateBumpState;
  }
  function applyObey(floor) {
    const before = rate;
    rate = obey(rate, floor, pickOB());
    noteRateChange(before);
    audio.play("obey");
    /* Tavandayken obey() NO-OP'tur (rate.js §12-1) — o zaman parcacik da
     * atmayalim, yoksa "bir sey oldu ama cubuk kipirdamadi" olur. */
    if (rate !== before) particles.burst(body.x + body.w / 2, body.y, Math.min(6, perf.particleBudget), SLOT.HAZARD);
  }
  function applyDrain(floor, per) {
    const before = rate;
    rate = drain(rate, floor, per);
    noteRateChange(before);
    audio.play("drain");
    if (rate !== before) particles.burst(body.x + body.w / 2, body.y, Math.min(10, perf.particleBudget), SLOT.LED);
  }

  const PIP_FLASH_FRAMES = 180;
  const VERB_FLASH_FRAMES = 12;
  let verbFlashFrames = 0, groundFlashFrames = 0;
  let pipFlashIndex = -1, pipFlashFrames = 0, pipFlashName = "";
  /* W0 (ogretici dunya) girisinde tus efsanesi ~12 s GERCEK oynanis boyunca
   * ekranin altinda durur — diyalog aciksa ne cizilir ne de sayaci isler. */
  const INTRO_HINT_FRAMES = 60 * 12;
  let introHintFrames = INTRO_HINT_FRAMES;
  const pipFlashState = { index: -1, frames: 0, name: "" };
  function pipFlash() {
    pipFlashState.index = pipFlashIndex;
    pipFlashState.frames = pipFlashFrames;
    pipFlashState.name = pipFlashName;
    return pipFlashState;
  }

  /* ==========================================================================
   * COMMIT TASI — Y'SI GOVDEDEN DEGIL ZEMINDEN GELIR
   * ==========================================================================
   * BULUNAN GERCEK KILITLENME (bot olcumu, W6 tile 157'de 873 pespese olum):
   * kayit noktasinin Y'si `body.y` ile, yani oyuncunun tasin X'ini GECTIGI
   * ANDAKI yuksekligiyle yaziliyordu. Bir cukura duserken saga surüklenip
   * tasin x'ini gecen oyuncu, kayit noktasini CUKURUN DIBINE yazdiriyor:
   *
   *     tas = (2512, 226)   HAZARD_FLOOR_Y = 240   govde boyu = 14
   *     226 + 14 = 240  ->  respawnIfFallen() HER KAREDE tetikleniyor
   *
   * Sonuc: dogar dogmaz olen, cikisi OLMAYAN bir dongu. Sessizdi — oyun
   * acilirken hicbir belirti vermiyor, ancak o cukura o sekilde dusen oyuncuda
   * ortaya cikiyordu. Y artik tasin KENDI kolonundaki zeminden turetilir
   * (computeBeacons ile AYNI kaynak), yani nereden gecildigi hicbir sey
   * degistirmez. Dunya dosyalarinin spawnY sozlesmesiyle ayni ofset: zemin-20. */
  function commitAtBeacon(bcn) {
    checkpointX = bcn.x;
    checkpointY = bcn.y - COMMIT_BODY_UP;
    audio.play("commit");
    particles.burst(body.x + body.w / 2, body.y + body.h / 2, Math.min(8, perf.particleBudget), SLOT.LED);
  }

  function updateCheckpointsAndDrains() {
    if (currentWorld !== 1) return;
    for (const bcn of w1Beacons) {
      if (body.x >= bcn.x && checkpointX < bcn.x) commitAtBeacon(bcn);
    }
    if (body.x >= w1B1EndX && rate > RATE_V0.floor.w1 && !drainedB1) { applyDrain(RATE_V0.floor.w1, RATE_V0.per.w1); drainedB1 = true; }
    if (body.x >= w1D1EndX && !drainedD1) { applyDrain(RATE_V0.floor.w1, RATE_V0.per.w1); drainedD1 = true; }
  }
  /* W6: d1 (A6 ortasi) + d2 (A6 sonu, YOKSAY tetiklenmeden hemen once) — d3
   * (R1 sonu, MERGE'e girmeden, postBoss:true) updateOverrideBoss'un YOKSAY
   * yenildikten sonraki hareketiyle dogal olarak saglanir (§12-2 kurali:
   * son serit boss'tan SONRA cikis rampasinda). */
  function updateW6Drains() {
    if (currentWorld !== 6) return;
    for (const bcn of w6Beacons) {
      if (body.x >= bcn.x && checkpointX < bcn.x) commitAtBeacon(bcn);
    }
    if (!drainedW6Mid && body.x >= w6MidA6X) { applyDrain(RATE_V0.floor.w6, RATE_V0.per.w6); drainedW6Mid = true; }
    if (!drainedW6End && body.x >= w6.bossTriggerX) { applyDrain(RATE_V0.floor.w6, RATE_V0.per.w6); drainedW6End = true; }
    if (!drainedW6PostBoss && body.x >= w6.mergeTriggerX) { applyDrain(RATE_V0.floor.w6, RATE_V0.per.w6); drainedW6PostBoss = true; }
  }
  /* SICAK KANAL: bir hazards.hotChannels bolgesine girilince 40 kare icinde
   * x1'i gecmezsen REVERT (tile bayragi degil, x-araligi + sayac — bkz.
   * boot.js basi SADELESTIRME notu). */
  function updateHotChannel() {
    const zones = worldData().hazards && worldData().hazards.hotChannels;
    if (!zones) return;
    if (hotChannelX1 === null) {
      for (const z of zones) {
        if (body.x >= z.x0 && body.x < z.x1) { hotChannelX1 = z.x1; hotChannelTimer = 40; break; }
      }
      return;
    }
    if (body.x >= hotChannelX1) { hotChannelX1 = null; return; }
    hotChannelTimer--;
    if (hotChannelTimer <= 0) { triggerRevert(); hotChannelX1 = null; }
  }

  /* ==========================================================================
   * KIVILCIM YAĞMURU ŞERIDI (X1) — patron saldirisi, parkurun ICINDE
   * ==========================================================================
   * Bir patron kalibini (YOKSAY'in gokten mermisi) parkura tasir: SON SINAV'in
   * ortasinda, dovus alani olmayan bir koridorda. Amaci hem yeni bir tehlike
   * eklemek hem de AYNA'nin GÖKTEN AĞ kalibini ONCEDEN ogretmek — patron
   * arenasinda ilk kez gorulen bir sey olmasin.
   *
   * ADALET: her dalgada sutunlarin YARISI duser ve donusumlu degisir, yani
   * gecilecek bir yol HER ZAMAN vardir; dusen mermi havada VURULABILIR;
   * telegraf yere isaret koyar. Oyuncu bolgeden cikinca sayac sifirlanir —
   * arkadan sessizce mermi yagmaz. */
  const RAIN_PERIOD = 96;
  const RAIN_TELEGRAPH = 34;
  const RAIN_HEIGHT = 200, RAIN_VY = 1.2, RAIN_GRAV = 0.10;

  function rainColumnFalls(i, wave) { return ((i + wave) & 1) === 0; }

  function updateShellRain() {
    const zones = worldData().hazards && worldData().hazards.shellRain;
    if (!zones) { rainZone = null; return; }
    const cx = body.x + body.w * 0.5;
    let z = null;
    for (const zz of zones) {
      if (cx >= zz.x0 - TILE * 2 && cx < zz.x1 + TILE * 2) { z = zz; break; }
    }
    if (z !== rainZone) { rainZone = z; rainTimer = 0; rainWave = 0; }
    if (!z) return;
    rainTimer++;
    /* Ses ISARETLE birlikte gelir, mermiyle degil: uyari uyari olsun. */
    if (rainTimer === RAIN_PERIOD - RAIN_TELEGRAPH) audio.play("telegraph");
    if (rainTimer < RAIN_PERIOD) return;
    rainTimer = 0;
    for (let i = 0; i < z.cols.length; i++) {
      if (!rainColumnFalls(i, rainWave)) continue;
      Enemies.spawnShard(pool, z.cols[i], z.groundY - RAIN_HEIGHT, 0, RAIN_VY, RAIN_GRAV);
    }
    rainWave++;
  }

  function updatePushWall() {
    const cfgWall = worldData().hazards && worldData().hazards.pushWall;
    if (!cfgWall) return;
    if (cfgWall.endX != null && body.x >= cfgWall.endX) {
      /* SPRINT SONU segmenti (F1) burada biter — duvar G1'in cezasiz prova
       * odasina ve boss dovusune asla sizmamali (bkz. w1.js notu). */
      pushWallX = null;
      return;
    }
    if (pushWallX === null && body.x >= cfgWall.startX) {
      pushWallX = cfgWall.startX;
      /* bulunan gercek eksik: ilk aktivasyonda SIFIR uyari penceresi vardi —
       * bir dunyanin commit esigi (checkpointX) tam da cfgWall.startX'e denk
       * geldiginde (W1 F1'de oldugu gibi) oyuncu commit tasina basar basmaz,
       * ayni karede, hic sans verilmeden REVERT ediyordu. */
      if (currentWorld !== 0) pushWallGrace = 45;
    }
    if (pushWallX === null) return;
    if (currentWorld === 0) {
      pushWallX += cfgWall.speedTilePerSec * TILE / 60;
      if (body.x < pushWallX) { body.x = pushWallX; if (body.vx < 0) body.vx = 0; }
      return;
    }
    /* W1 F1 (hazardous): duvar oyuncunun TEPE hizinin BELIRGIN altinda
     * ilerler ki durgun-hizlanma sirasinda tekrar tekrar yakalanma dongusu
     * OLUSMASIN (node testinde 7255 revert'lik bir kilitlenme olarak
     * yakalandi — duvar 0.85x hizla ve 60px tamponla oyuncuyu hicbir zaman
     * hizlanma sansi birakmadan yakaliyordu). Yakalayinca GENIS bir tampon +
     * kisa bir "nefes" penceresi verilir. */
    if (pushWallGrace > 0) { pushWallGrace--; return; }
    pushWallX += worldCfg().maxSpeed * 0.55;
    /* Geri cekme/nefes penceresi artik triggerRevert()'in kendisinde, HANGI
     * sebeple olursa olsun (bkz. o fonksiyondaki not) — burada tekrarlanmaz. */
    if (body.x < pushWallX + 6) triggerRevert();
  }

  /* ==========================================================================
   * REGRESYON kovalamacasinin BASLANGICI (raporlanan gercek hata)
   * ==========================================================================
   * Hayaletin ekrandaki yeri `ghostChaseStartX + displacement` ile, yani
   * F1'in SABIT giris x'inden olculuyordu. Bu, ilk girişte dogru gorunuyor
   * (oyuncu tam o cizgiyi gecerken hayalet yaninda doguyor) ama GERI AL'dan
   * sonra bozuluyordu: hayalet yine o sabit cizgiden, kayittaki hiziyla
   * (2,60 px/f) baslarken oyuncu SIFIR hizla dirilir. 30 karelik dokunulmazlik
   * penceresi boyunca hayalet ~78 px, oyuncu ancak ~45 px yol alir — yani
   * pencere bitince hayalet oyuncunun ONUNDE olur. Hayalet bir TEHLIKE oldugu
   * icin bu, ilerlemek icin icinden gecmen gereken bir duvara donusur; arkadan
   * da SPRINT SONU duvari geldigi icin oyuncu iki tehlike arasinda sikisir.
   *
   * Cozum iki parcali:
   *   1) Kovalamacanin orijini SABIT degil, baslangic anindaki OYUNCU
   *      konumudur — hayalet her zaman belirgin sekilde ARKADAN baslar.
   *   2) Yakalama testi yalnizca hayalet oyuncunun GERISINDE/HIZASINDAYKEN
   *      sayilir (bkz. updateGhost). Boylece one gecmis bir hayalet hicbir
   *      kosulda gecilmez bir engel haline gelemez — kovalamaca kovalamaca
   *      kalir, bariyer olmaz.
   * ========================================================================== */
  /* Iki sayi BIRBIRINE BAGLI (ilk denemede yanlis esletilmisti): hayalet
   * 2,60 px/f ile yaklasir, yani LEAD/2,60 karede duran bir oyuncuya yetisir.
   * Dokunulmazlik penceresi bundan UZUN olursa hayalet oyuncunun ICINDEN
   * GECIP ONE cikar ve kovalamaca hic islemez (110 px + 45 kare ile tam bunu
   * olctuk: 42 karede yetisiyor, 45 kare dokunulmazlik onu yutuyordu).
   * 130 px -> 50 kare; 24 karelik pencere yalnizca isinlanmanin oturmasini
   * kapsar, kovalamacanin kendisine dokunmaz. */
  const GHOST_LEAD_PX = 130;
  const GHOST_GRACE_FRAMES = 24;

  /* KOVALAMACANIN BITIS CIZGISI. F1'in SPRINT SONU duvari G1 girisinde kalici
   * olarak sonlandiriliyor (bkz. w1.js pushWallEndX) — cezasiz prova odasina
   * ve KOKLAYICI dovusune sizmasin diye. Hayalet icin ayni sinir YOKTU; eskiden
   * bu zararsizdi cunku kayit bir kez bitince kovalamaca da bitiyordu, ama
   * kovalamaca artik HER GERI AL'da yeniden basladigi icin sinirsiz hale geldi:
   * dovus sirasinda yerinde duran oyuncuyu ~50 karede bir yakalayip sonsuz
   * GERI AL dongusune sokuyordu (olculdu: patron 200 saniyede inmedi). Hayalet
   * artik duvarla AYNI cizgide durur — tek sinir, tek gerekce. */
  const ghostChaseEndX = (w1.hazards && w1.hazards.pushWall && w1.hazards.pushWall.endX) || Infinity;
  function ghostChaseOver() { return currentWorld !== 1 || body.x >= ghostChaseEndX; }

  function startGhostChase() {
    if (ghostChaseOver()) { ghostRenderX = null; return; }
    ghost.startPlayback();
    ghostOriginX = body.x - GHOST_LEAD_PX;
    ghostRenderX = ghostOriginX;
    ghostRenderY = body.y;
    ghostGrace = GHOST_GRACE_FRAMES;
  }

  function updateGhost() {
    /* 240 karelik konum bandi (§2.4): Faz 5'in MERGE zemini + YOKSAY siluti
     * bunu tuketir. Her dunyada, her sabit update'te itilir — MERGE'e
     * girildiginde artik itilmemesi (mergeStarted sirasinda cagrilmiyor,
     * bkz. main loop) son birkac saniyeyi dondurulmus bir "yanki" gibi
     * birakir, tam da temanin istedigi gibi. */
    ghost.pushBand(body.x, body.y, body.grounded ? 0 : 1);
    if (currentWorld === 0) {
      if (!ghost.isRecording && ghost.recordedFrames === 0) ghost.startRecording(w0.spawnX);
      ghost.record(body.x, body.facing);
      ghostRenderX = null;
      return;
    }
    if (ghost.isRecording) ghost.stopRecording();
    /* REGRESYON YALNIZ W1 F1'in isidir (§5.3). Esik W1'in x'i oldugu icin
     * W6/EP'de de asiliyordu: hayalet W1 koordinatlarinda "oynamaya" basliyor,
     * ghostRenderX rastgele bir yerde oyuncunun uzerine denk gelirse sebepsiz
     * REVERT tetikliyordu. BÖLÜM SEÇ ile dunyalar arasi atlayinca bu daha da
     * olasi hale gelirdi — esik artik dunyaya baglandi. */
    if (ghostChaseOver()) { ghostRenderX = null; return; }
    if (!ghost.isPlaying && !ghost.isPlaybackDone && body.x >= w1.ghostChaseStartX) {
      startGhostChase();
    }
    if (ghost.isPlaying) {
      ghost.tick();
      const disp = ghost.displacementAt();
      if (disp !== null) {
        ghostRenderX = ghostOriginX + disp;
        ghostRenderY += (body.y - ghostRenderY) * 0.08;
        /* bulunan gercek eksik: playback YENI basladiginda ghostRenderY
         * body.y'ye ESITLENIR ve displacementAt(0)~0'dir — yani hayalet SIFIR
         * uyariyla oyuncunun TAM UZERINDE "dogar". Ilk 30 karede yakalama
         * testi atlanir (pushWall'daki analog duzeltmeyle ayni ilke). */
        if (ghostGrace > 0) {
          ghostGrace--;
        } else {
          const dx = ghostRenderX - (body.x + body.w * 0.5), dy = ghostRenderY - (body.y + body.h * 0.5);
          /* dx > 4: hayalet ONDEYSE yakalama SAYILMAZ. Oyuncu one gecmis bir
           * hayaletin icinden gecebilir — "eski halin" bir engel degil, bir
           * kovalayicidir. Aksi halde bir kez one gectiginde playback bitene
           * kadar ilerlemek imkansiz olurdu. */
          if (dx <= 4 && Math.abs(dx) < 10 && Math.abs(dy) < 14) triggerRevert();
        }
      } else {
        ghostRenderX = null;
      }
    } else if (ghost.isPlaybackDone) {
      ghostRenderX = null;
    }
  }

  function tryWorldTransition() {
    if (currentWorld === 0 && body.x >= w0.exitX - 8) {
      speedrun.split("w0");
      currentWorld = 1;
      noteWorldReached();
      spawnWorldEnemies(w1);
      body.x = w1.spawnX; body.y = w1.spawnY; body.vx = 0; body.vy = 0;
      cam.setBounds(w1.map.pxW, w1.map.pxH);
      cam.snapTo(w1.spawnX, w1.spawnY);
      initCheckpoint();
      pushWallX = null;
      return;
    }
    if (currentWorld === 1 && boss && boss.isDefeated && body.x >= w1.exitX - 8) {
      speedrun.split("w1");
      currentWorld = 6;
      noteWorldReached();
      spawnWorldEnemies(w6);
      body.x = w6.spawnX; body.y = w6.spawnY; body.vx = 0; body.vy = 0;
      cam.setBounds(w6.map.pxW, w6.map.pxH);
      cam.snapTo(w6.spawnX, w6.spawnY);
      initCheckpoint();
      exitLockHinted = false;
      cutscene.maybeTrigger(SC_IDS.SC06, 0, -1);
    }
  }

  /* bulunan gercek eksik (raporlanan sikayetin IKINCI yarisi): W1'in cikis
   * kapisi boss yenilmeden SOLUK cizilir ama oyuncuya "neden gecmiyorum"un
   * cevabi HICBIR YERDE soylenmiyordu — KOKLAYICI'yi (arena tutma alani
   * olmadigi icin) yanindan kosarak gecmek mumkun, sonra kapiya varan oyuncu
   * sessiz bir duvarla karsilasiyordu. Kapiya yaklasinca sebep bir kez
   * soylenir; oyuncu bolgeden uzaklasinca tekrar silahlanir. */
  /* Boss dogus balonu: karakter replikasi + IKI mekanik ipucu. Balonlar
   * zaten "Atlamak icin basili tut." tasidigi icin akisi tikamaz, ama artik
   * hicbir oyuncu "ekrandaki bu sey ne ve ne yapmam gerekiyor" sorusuyla
   * bas basa kalmaz. i18n bosses.*.hints prose butcesine SAYILMAZ. */
  function bossIntro(entry) {
    /* Boss basina TEK sefer cagrilir (update dongusunde degil) — sahne
     * yoneticisi diziyi REFERANSLA tuttugu icin paylasilan tampon degil,
     * taze dizi verilir. */
    const beats = [{ who: "N", line: entry.line }];
    for (const h of entry.hints) beats.push({ who: "N", line: h });
    return beats;
  }

  /* Boss'un ekran-ici canli okumasi icin sabit etiket paketleri (kare basina
   * nesne uretilmez; i18n dili degisince icerik dogal olarak yenilenir). */
  /* Talimatlarda GERCEK tus adi gecer — "BASILI TUT" tek basina hangi tusa
   * basilacagini soylemiyordu (raporlandi). Dokunmatikteyken ekrandaki A/B
   * kutularinin adlari kullanilir (bkz. drawTouchHints). */
  function actionKeyName() { return input.touchActive ? "B" : i18n.lex("keyAction"); }
  function groundKeyName() { return input.touchActive ? "C" : i18n.lex("keyGround"); }

  const snifferLabels = { name: "", shoot: "", blocked: "" };
  function snifferLabelPack() {
    snifferLabels.name = i18n.data.bossNames.sniffer;
    snifferLabels.shoot = i18n.lex("shootAt") + " (" + actionKeyName() + ")";
    snifferLabels.blocked = i18n.lex("shielded");
    return snifferLabels;
  }
  const overrideLabels = { name: "", shoot: "", blocked: "", patterns: ["", "", ""] };
  function overrideLabelPack() {
    overrideLabels.name = i18n.data.bossNames.override;
    overrideLabels.shoot = i18n.lex("shootAt") + " (" + actionKeyName() + ")";
    overrideLabels.blocked = i18n.lex("shielded");
    overrideLabels.patterns[0] = i18n.lex("atk.rain");
    overrideLabels.patterns[1] = i18n.lex("atk.volley");
    overrideLabels.patterns[2] = i18n.lex("atk.summon");
    return overrideLabels;
  }
  /* AYNA'nin bes kalibi (bkz. bosses.js MR_PATTERN sirasi:
   * NİŞAN / DUVAR / KOŞU / AĞ / ÇAĞRI). */
  const mirrorLabels = { name: "", shoot: "", blocked: "", patterns: ["", "", "", "", ""] };
  function mirrorLabelPack() {
    mirrorLabels.name = i18n.data.bossNames.mirror;
    mirrorLabels.shoot = i18n.lex("shootAt") + " (" + actionKeyName() + ")";
    mirrorLabels.blocked = i18n.lex("shielded");
    mirrorLabels.patterns[0] = i18n.lex("atk.aimed");
    mirrorLabels.patterns[1] = i18n.lex("atk.wall");
    mirrorLabels.patterns[2] = i18n.lex("atk.dash");
    mirrorLabels.patterns[3] = i18n.lex("atk.net");
    mirrorLabels.patterns[4] = i18n.lex("atk.summon");
    return mirrorLabels;
  }

  /* ==========================================================================
   * MERMI -> PATRON. Havuzdaki carpismalar enemies.boltHitTest'te cozulur ama
   * patronlar havuzda DEGIL (bosses.js kapanislari) — mermilerin patron
   * govdesiyle kesisimi burada, TEK yerde test edilir. Kalkanliyken damage()
   * "block" doner: mermi yine soner, ama ses/gorsel "sekti" der.
   * ========================================================================== */
  function bossBoltHits(target) {
    if (!target || target.isDefeated) return;
    for (let id = 0; id < pool.flags.length; id++) {
      if (!(pool.flags[id] & FLAG_ACTIVE) || pool.type[id] !== Enemies.TYPE.BOLT) continue;
      if (!target.hitTest(pool.x[id], pool.y[id])) continue;
      const res = target.damage(1);
      pool.free(id);
      if (res === "block") {
        audio.play("block");
        particles.burst(pool.x[id], pool.y[id], Math.min(4, perf.particleBudget), SLOT.SECONDARY);
      } else {
        audio.play("hit");
        particles.burst(pool.x[id], pool.y[id], Math.min(5, perf.particleBudget), SLOT.HAZARD);
      }
      if (res === "phase") { audio.play("commit"); bossPhase2Committed = true; }
      if (res === "defeat") {
        audio.play("merge");
        particles.burst(body.x, body.y, Math.min(16, perf.particleBudget), SLOT.LED);
      }
      if (target.isDefeated) return;
    }
  }

  /* Havuz ici mermi carpismalari (dusman susturma, avci, havada dusurulen
   * atislar). Tek callback, ses + parcacik. */
  function onBoltEvent(kind, hx, hy) {
    if (kind === "stun") {
      audio.play("hit");
      particles.burst(hx, hy, Math.min(5, perf.particleBudget), SLOT.SECONDARY);
    } else if (kind === "hunter-hit") {
      audio.play("hit");
      particles.burst(hx, hy, Math.min(4, perf.particleBudget), SLOT.HAZARD);
    } else if (kind === "hunter-down") {
      audio.play("hunter");
      particles.burst(hx, hy, Math.min(10, perf.particleBudget), SLOT.LED);
    } else if (kind === "shot-down") {
      audio.play("block");
      particles.burst(hx, hy, Math.min(4, perf.particleBudget), SLOT.LIGHT);
    }
  }

  let exitLockHinted = false;
  function updateExitLockHint() {
    if (currentWorld !== 1 || (boss && boss.isDefeated)) return;
    if (body.x < w1.exitX - 140) { exitLockHinted = false; return; }
    if (exitLockHinted || sceneManager.isDialogueActive()) return;
    exitLockHinted = true;
    audio.play("window");
    sceneManager.playDialogue([{ who: "N", line: i18n.lex("gateLocked") }]);
  }

  /* ==========================================================================
   * PATRON DOVUSU KAYBEDILINCE BASTAN BASLAR (oyun testiyle geldi)
   * ==========================================================================
   * Onceki surumde patron dogar dogmaz commit tasi ARENA GIRISINE tasiniyordu
   * (`bossCheckpoint`). Gerekce "hatanin bedeli dovus olsun, geri yuruyus
   * degil"di; pratikte cikan sey baska oldu: oyuncu OLDUGU YERDE diriliyor,
   * patronun cani ise kaldigi yerden devam ediyordu. Yani olum bir ceza degil,
   * neredeyse bedava bir mermi ikmali oluyordu — dovus "kaybedilemez"in otesine
   * gecip "riski olmayan"a dusuyordu.
   *
   * Yeni kural (istenen davranis): GERI AL dovusu SIFIRLAR.
   *   - Kayit noktasi arenaya HIC tasinmaz; oyuncu arenanin ONCESINDEKI son
   *     commit tasinda dirilir ve arenaya yeniden girer.
   *   - Yasayan patron `reset()` ile tam cana ve ilk fazina doner; avcilari,
   *     mermileri ve (AYNA icin) ordugu duvarlar temizlenir.
   * Patron YENILMISSE dokunulmaz (reset() no-op'tur) — gecilmis bir dovus
   * geri gelmez.
   * ========================================================================== */
  function resetActiveBossFights() {
    if (boss && !boss.isDefeated) boss.reset();
    if (overrideBoss && !overrideBoss.isDefeated) overrideBoss.reset();
    if (mirrorBoss && !mirrorBoss.isDefeated) {
      mirrorBoss.reset();
      /* Arena kapisi da yeniden "silahsizlanir": oyuncu artik disarida, sol
       * kapi acikken tutulursa her karede iceri itilirdi. */
      mirrorLeftArmed = false;
    }
    bossPhase2Committed = false;
  }

  function updateBoss(dt) {
    if (currentWorld !== 1) return;
    if (!boss && body.x >= w1.bossTriggerX) {
      /* KILITLENME EMNIYETI (dovus revizyonuyla dogan gercek risk): patronun
       * cani YALNIZ mermiyle iner. ATEŞ ET pip'i E1'in ana yolunda duruyor ama
       * uzerinden ziplayan bir oyuncu onu almadan buraya gelebilir — o
       * durumda patron yenilemez, cikis kapisi sonsuza dek kilitli kalir ve
       * oyun BITIRILEMEZ. Arenaya girerken yetenek yoksa burada verilir
       * (kayit bitine de islenir, HUD'da normal pip gibi yanar). */
      if (!verbs.isUnlocked(VERB.SHOOT)) {
        verbs.unlock(VERB.SHOOT);
        save.verbs |= (1 << SaveMod.PIP_BIT.SHELL);
        save.pips |= (1 << SaveMod.PIP_BIT.SHELL);
        pipFlashIndex = SaveMod.PIP_BIT.SHELL;
        pipFlashFrames = PIP_FLASH_FRAMES;
        const entry = i18n.data.pips[hud.PIP_ORDER.indexOf("shell")];
        pipFlashName = entry ? entry.name : "";
        audio.play("shoot");
      }
      boss = createSniffer(w1BossX, w1BossY, pool, !!(save.settings && save.settings.balanced));
      sceneManager.playDialogue(bossIntro(i18n.data.bosses.sniffer));
    }
    if (!boss) return;
    boss.update(dt, body, (kind) => {
      if (kind === "lock") audio.play("telegraph");
      else if (kind === "spawn") audio.play("obey");
    });
    bossBoltHits(boss);
    if (boss.isDefeated && !drainedPostBoss) {
      applyDrain(RATE_V0.floor.w1, RATE_V0.per.w1);
      drainedPostBoss = true;
    }
  }

  function updateOverrideBoss(dt) {
    if (currentWorld !== 6) return;
    if (!overrideBoss && body.x >= w6.bossTriggerX) {
      overrideBoss = createOverride(w6BossX, w6BossY, pool,
        !!(save.settings && save.settings.balanced), w6Arena);
      sceneManager.playDialogue(bossIntro(i18n.data.bosses.override));
    }
    if (!overrideBoss) return;
    if (overrideBoss.isDefeated) {
      if (!overrideDefeatedHandled) {
        overrideDefeatedHandled = true;
        sceneManager.playDialogue([{ who: "N", line: i18n.data.final[0] }]);
      }
      return;
    }
    /* Tamamlanan HER saldiri orani yukseltir — eski "kacan her emir orani
     * yukseltir" kuralinin menzilli dovusteki karsiligi: hizli bitiren az
     * ceza oder, oyalanan pahaliya oder. Dovus yine KAYBEDILEMEZ. */
    overrideBoss.update(dt, body, (kind) => {
      if (kind === "attack") applyObey(RATE_V0.floor.w6);
    });
    bossBoltHits(overrideBoss);
    /* Arenanin disina kacip dovusu atlamayi engelleyen gorunmez tutma alani —
     * KOKLAYICI'nin G1 odasiyla ayni ruhta, ama burada oyuncu boss'u GECEMEZ. */
    if (body.x > w6ArenaHoldX) { body.x = w6ArenaHoldX; if (body.vx > 0) body.vx = 0; }
  }

  /* ==========================================================================
   * SON SINAV — AYNA (oyunun son ve en zor dovusU)
   * ==========================================================================
   * YOKSAY'in ayni cerceveSi (dogus + commit tasi + dogus balonu + mermi
   * carpismasi + tamamlanan saldiri basina oran) uzerine UC fark:
   *   1. Arena iki yandan da kapanir (bkz. x1Arena notu).
   *   2. Patronun GOVDESI, yalniz KOŞU kalibinda tehlikelidir — temas GERI
   *      AL'dir (D-2 korunur, olum yok).
   *   3. Yenilince ek bir serit cekisi gelir: SON SINAV boyunca biriken
   *      itaatin bedeli burada odenir.
   * ========================================================================== */
  function updateMirror(dt) {
    if (currentWorld !== 6) return;
    /* ISINLANMA SIRASINDA HICBIR SEY YAPMA (bulunan gercek hata, bot olcumu:
     * olunce govde 6372'de — arenanin SOL KAPISINDA — kaliyordu, kayit tasi
     * ise 6176'da). Zincir soyle: hazardHitTest/contactTest `triggerRevert()`
     * cagirir, o da `mirrorLeftArmed`'i indirir; ama AYNI KAREDE bu fonksiyon
     * akmaya devam eder ve govde hala arenanin ICINDE oldugu icin kapiyi
     * TEKRAR kurar. Isinlanma bitince "arenanin disina cikmis" govde her
     * karede kapiya geri cekilir — yani oyuncu dovusun icine geri surüklenir.
     * Ana dongu zaten isinlanma sirasinda buraya hic ugramaz; bu satir SADECE
     * revert'in tetiklendigi O KAREYI kapatir. */
    if (revertTimer > 0) return;
    /* UST SINIR (bulunan gercek risk): commit tasi arenanin ILERISINDE
     * kaydedilmis bir oturuma devam edilirse (AYNA yenildikten sonra R1'in
     * segment tasina basip cikilirsa) patron oyuncunun ARKASINDA doguyor,
     * sag kapi da aninda oyuncuyu arenaya GERI CEKIYOR — cikilmis bir dovus
     * zorla tekrar ettiriliyordu. Tetik artik bir ARALIK: arenayi gecmis
     * olan bir govde patronu uyandirmaz. */
    if (!mirrorBoss && body.x >= w6.x1BossTriggerX && body.x < x1ArenaX1) {
      /* KOKLAYICI'daki ayni kilitlenme emniyeti: cani YALNIZ mermiyle inen bir
       * patronun onunde ATEŞ ET kilitliyse oyun BITIRILEMEZ. */
      if (!verbs.isUnlocked(VERB.SHOOT)) {
        verbs.unlock(VERB.SHOOT);
        save.verbs |= (1 << SaveMod.PIP_BIT.SHELL);
        save.pips |= (1 << SaveMod.PIP_BIT.SHELL);
        pipFlashIndex = SaveMod.PIP_BIT.SHELL;
        pipFlashFrames = PIP_FLASH_FRAMES;
        audio.play("shoot");
      }
      arenaWalls.setMap(w6.map);
      mirrorBoss = createMirror(x1BossX, x1BossY, pool,
        !!(save.settings && save.settings.balanced), x1Arena);
      sceneManager.playDialogue(bossIntro(i18n.data.bosses.mirror));
    }
    if (!mirrorBoss) return;
    if (mirrorBoss.isDefeated) {
      if (!mirrorDefeatedHandled) {
        mirrorDefeatedHandled = true;
        arenaWalls.reset();
        if (!drainedW6Mirror) { applyDrain(RATE_V0.floor.w6, RATE_V0.per.w6); drainedW6Mirror = true; }
        sceneManager.playDialogue([{ who: "N", line: i18n.data.final[1] }]);
      }
      return;
    }
    mirrorBoss.update(dt, body, (kind) => {
      if (kind === "attack") applyObey(RATE_V0.floor.w6);
      else if (kind === "dash") audio.play("dash");
      else if (kind === "wall") audio.play("wall");
      else if (kind === "spawn") audio.play("obey");
    });
    bossBoltHits(mirrorBoss);
    /* KOŞU temasi revert'i BU FONKSIYONUN ICINDEN tetikler — fonksiyon
     * basindaki `revertTimer > 0` korumasi bu yolu goremez. Tetikledigin
     * karede DERHAL cik, yoksa asagidaki kapi mantigi calisir ve az once
     * indirilen `mirrorLeftArmed`'i tekrar kurar (olculdu: govde 6372'de
     * takiliyordu, kayit tasi 6176'da). */
    if (mirrorBoss.contactTest(body)) { triggerRevert(); return; }

    if (!mirrorLeftArmed && body.x >= x1ArenaX0) mirrorLeftArmed = true;
    if (mirrorLeftArmed && body.x < x1ArenaX0) { body.x = x1ArenaX0; if (body.vx < 0) body.vx = 0; }
    if (body.x > x1ArenaX1) { body.x = x1ArenaX1; if (body.vx > 0) body.vx = 0; }
  }

  function tryMergePrompt() {
    if (currentWorld !== 6 || mergeStarted || mergeDone) return;
    /* Iki patron da yenilmeden MERGE teklif EDILMEZ. Pratikte AYNA'nin arena
     * kapisi bunu zaten garanti eder; kosul yine de acikca yazilir ki
     * ilerideki bir kisayol (BÖLÜM SEÇ, debug girisi) sessizce bitis
     * uretemesin. */
    if (!mergeAvailable && overrideBoss && overrideBoss.isDefeated &&
        (!mirrorBoss || mirrorBoss.isDefeated) && body.x >= w6.mergeTriggerX - 4) {
      mergeAvailable = true;
      sceneManager.playDialogue([{ who: "N", line: i18n.data.final[2] }]);
    }
  }

  let mergeF3Shown = false;
  function updateMerge() {
    if (currentWorld !== 6 || mergeDone) return;
    if (!mergeStarted) {
      if (mergeAvailable && !sceneManager.isDialogueActive() && input.ctrl.verbPressed) {
        mergeStarted = true;
        mergeTimer = 0;
        mergeStartRate = rate;
        mergeF3Shown = false;
        audio.play("merge");
        audio.stopDrone();
      }
      return;
    }
    mergeTimer++;
    const t = Math.min(1, mergeTimer / 60);
    rate = Math.round(mergeStartRate + (RATE_V0.merge - mergeStartRate) * t);
    if (mergeTimer >= 200 && !mergeF3Shown && !sceneManager.isDialogueActive()) {
      mergeF3Shown = true;
      sceneManager.playDialogue([{ who: "N", line: i18n.data.final[3] }]);
    }
    if (mergeTimer >= 360) {
      rate = RATE_V0.merge;
      mergeDone = true;
      mergeStarted = false;   /* ana dongudeki "mergeStarted -> dondur" kapisi acilsin */
      /* MERGE oyunu BITIRMEZ — YOKSAY commit grafiginde ebeveyn dugum olur ve
       * W6 -> EP'ye gecilir (§2.4/§6.1). Gercek `finished` EP'nin bitis
       * cizgisinde yazilir (bkz. updateEPFinish/updateEPClosing). */
      speedrun.split("w6");
      currentWorld = 7;
      noteWorldReached();   /* EP artik BÖLÜM SEÇ'te acik */
      spawnWorldEnemies(ep);
      body.x = ep.spawnX; body.y = ep.spawnY; body.vx = 0; body.vy = 0;
      cam.setBounds(ep.map.pxW, ep.map.pxH);
      cam.snapTo(ep.spawnX, ep.spawnY);
      checkpointX = ep.spawnX; checkpointY = ep.spawnY;
    }
  }

  function updateEPFinish() {
    if (currentWorld !== 7 || epFinishHandled) return;
    if (body.x >= ep.finishX) {
      epFinishHandled = true;
      epClosing = true;
      epClosingTimer = 0;
      /* KRONOMETRE BITIS CIZGISINDE DURUR, epilog kapanisinda degil. Klasik
       * kural: sure hedefe DOKUNULDUGU anda biter; sonrasindaki 6 saniyelik
       * sinematik ve isim ekrani kimsenin suresine yazilmaz. */
      if (speedrun.active && !speedrun.finished) {
        speedrun.split("ep");
        runResultMs = speedrun.finish();
        runBalanced = !!(save.settings && save.settings.balanced);
      }
    }
  }

  const EP_CLOSING_FRAMES = 360;   /* §6.1: "ufka dogru surekli kayma -> zoom-out", 6 s */
  const EP_CLOSING_DRIFT_PX = 1.4; /* fizik degil, sahnenin kendi otomatik ilerleyisi */

  function updateEPClosing(dt) {
    epClosingTimer++;
    /* Oyuncu artik kontrol etmiyor (dialogueActive/epClosing dalinda step()
     * hic cagrilmiyor) — sahne kendi kendine "ufka dogru" ilerler; kamera
     * bunu normal follow() mantigiyla takip eder, render() ise ayrica
     * zoom-out uygular (bkz. render() icindeki epClosing dali). */
    body.x += EP_CLOSING_DRIFT_PX;
    cam.follow(body, dt);

    if (epClosingTimer >= 200 && !epF4Shown && !sceneManager.isDialogueActive()) {
      epF4Shown = true;
      sceneManager.playDialogue([{ who: "N", line: i18n.data.final[4] }]);
    }
    if (epClosingTimer >= EP_CLOSING_FRAMES) {
      save.finished = true;
      save.ratio = rate;
      SaveMod.assertFinish(save);
      /* SÜRE MODU'nda `save` GECICI bir kopyadir (bkz. beginSpeedrun) — onu
       * diske yazmak oyuncunun GERCEK ilerlemesini silerdi. Gercek kayit
       * isim ekraninin ardindan, restoreSaveAfterRun() ile geri gelir. */
      if (!speedrun.active) SaveMod.write(save);
      gameFinished = true;
      if (speedrun.active) openNameEntry();
      else sceneManager.replace(SCENE.END);
    }
  }

  function hasSaveData() { return save.checkpoint > 0 || (save.ratio && save.ratio !== RATE_V0.start); }

  /* ==========================================================================
   * CALISMA ZAMANINI BASA ALMA — kayittan BAGIMSIZ
   * ==========================================================================
   * "BAŞTAN" (RESET) ile SÜRE MODU'nun ihtiyaci AYNI: dunyayi, patronlari,
   * sayaclari, hayaleti, karolari W0'in ilk karesine dondurmek. Ayrildiklari
   * tek nokta KAYIT: RESET onu SILER, SÜRE MODU ise ona HIC DOKUNMAZ (gecici
   * bir kopyayla kosar). Ortak kisim burada tek bir yerde durur ki iki yol
   * zaman icinde birbirinden sessizce ayrilmasin — bir alan eklendiginde iki
   * ayri listeye eklemeyi unutmak, tam da bu dosyada defalarca hata uretti. */
  function resetRuntimeToStart() {
    rate = RATE_V0.start;
    currentWorld = 0;
    verbs.reset();
    boss = null; overrideBoss = null; overrideDefeatedHandled = false; bossPhase2Committed = false;
    mirrorBoss = null; mirrorDefeatedHandled = false; mirrorLeftArmed = false;
    drainedB1 = false; drainedD1 = false; drainedPostBoss = false;
    drainedW6Mid = false; drainedW6End = false; drainedW6PostBoss = false; drainedW6Mirror = false;
    pushWallX = null; pushWallGrace = 0;
    hotChannelX1 = null; hotChannelTimer = 0;
    rainZone = null; rainTimer = 0; rainWave = 0;
    mergeAvailable = false; mergeStarted = false; mergeDone = false;
    mergeTimer = 0; mergeStartRate = 0; mergeF3Shown = false;
    epFinishHandled = false; epClosing = false; epClosingTimer = 0; epF4Shown = false;
    revertTimer = 0;
    gameFinished = false;
    ghostRenderX = null; ghostRenderY = null;
    ghostOriginX = 0; ghostRestartPending = false; ghostGrace = 0;
    exitLockHinted = false;
    pipFlashIndex = -1; pipFlashFrames = 0; pipFlashName = "";
    rateBumpFrames = 0; rateBumpAmount = 0; verbFlashFrames = 0; groundFlashFrames = 0;
    introHintFrames = INTRO_HINT_FRAMES;
    maxWorldReached = 0;
    sceneManager.clearDialogue();
    /* Susturma varsayilan olarak KALKAR; SÜRE MODU'na giren yol bunu hemen
     * ardindan tekrar kurar (bkz. beginSpeedrun). Boylece hangi yoldan
     * gelinirse gelinsin normal oyun ipucusuz kalamaz. */
    sceneManager.setMuted(false);
    fakeTiles.reset();
    arenaWalls.reset();
    ghost.reset();
    spawnWorldEnemies(w0);
    body.x = w0.spawnX; body.y = w0.spawnY; body.vx = 0; body.vy = 0;
    cam.setBounds(w0.map.pxW, w0.map.pxH);
    cam.snapTo(w0.spawnX, w0.spawnY);
    checkpointX = w0.spawnX; checkpointY = w0.spawnY;
    audio.startDrone();   /* MERGE'de durmus olabilir (bkz. updateMerge) */
    perf.reset();
    a11yAnnouncer.reset();
  }

  function performFullReset() {
    SaveMod.reset();
    Object.assign(save, SaveMod.defaultSave());
    resetRuntimeToStart();
    /* Dokunmatik tercihi YALNIZ gercek "BAŞTAN"da sifirlanir — bir kosuya
     * girerken oyuncunun kontrol tercihini elinden almak anlamsiz olurdu. */
    touchSettings.set("auto");
    input.setTouchOverride("auto");
  }

  /* ==========================================================================
   * SÜRE MODU — bastan sona tek kosu, kronometreli
   * ==========================================================================
   * Istenen davranis aynen: bu moda giren HERKES bastan baslar (bolumleri
   * bitirmis olmak bir sey degistirmez, adil olsun) ve kronometre klasik
   * sekilde isler — olumde durmaz.
   *
   * UC KURAL, uc ayri yerde uygulanir:
   *   1. TEMIZ BASLANGIC : `save` gecici bir varsayilan kayitla degistirilir,
   *      calisma zamani W0'in ilk karesine alinir. Pip'ler, fiiller, oran —
   *      hepsi sifirdan. Ayarlar (KOLAY MOD, dokunmatik, ses) KORUNUR: onlar
   *      ilerleme degil, erisilebilirlik tercihi.
   *   2. KAYDA DOKUNMAMA : persistProgress ve bitis yazimi kosu boyunca
   *      susturulur; gercek kayit `saveSnapshot`'ta bekler.
   *   3. KISAYOL YOK     : BÖLÜM SEÇ kosu sirasinda acilmaz (bkz. onMap).
   * ========================================================================== */
  function applySaveVerbs() {
    if (save.verbs & (1 << SaveMod.PIP_BIT.REWRITE)) verbs.unlock(VERB.REWRITE);
    if (save.verbs & (1 << SaveMod.PIP_BIT.SHELL)) verbs.unlock(VERB.SHOOT);
  }

  function recomputeMaxWorld() {
    maxWorldReached = worldOrdinal(currentWorld);
    if (save.finished) maxWorldReached = WORLD_ORDER.length - 1;
    else if (save.world > 0) maxWorldReached = Math.max(maxWorldReached, worldOrdinal(save.world));
  }

  /* ==========================================================================
   * KAYITTAN DEVAM — tek yer
   * ==========================================================================
   * Iki cagiran var: boot'un acilis dali ve SÜRE MODU'ndan cikis. Ikisi de
   * AYNI seyi ister (dunya, konum, kamera, commit tasi ve serit cekisi
   * bayraklari kayitla tutarli olsun); ayri ayri yazilsalardi biri
   * guncellenip digeri unutulurdu. Kosudan cikan oyuncu bu sayede kendi
   * kaldigi yere doner — sayfayi yenilemesi gerekmez. */
  function resumeFromSave() {
    if (!(save.world > 0 && save.checkpoint > 0)) return false;
    currentWorld = save.world;
    const wd = worldData();
    spawnWorldEnemies(wd);
    /* BOZUK KAYIT ONARIMI: commit tasinin Y'si eskiden `body.y`den geliyordu
     * ve bir cukura duserken tasin x'i gecilirse cukurun dibine yaziliyordu
     * (bkz. commitAtBeacon). Boyle bir kayit diske de islenmis olabilir;
     * olumcul yukseklikteki bir kayit noktasi sessizce dunyanin dogus
     * noktasina cekilir, yoksa oyuncu dogar dogmaz olmeye devam ederdi. */
    const savedY = save.checkpointY || wd.spawnY;
    const poisoned = savedY + COMMIT_BODY_UP >= HAZARD_FLOOR_Y;
    body.x = poisoned ? wd.spawnX : (save.checkpointX || wd.spawnX);
    body.y = poisoned ? wd.spawnY : savedY;
    body.vx = 0; body.vy = 0;
    cam.setBounds(wd.map.pxW, wd.map.pxH);
    cam.snapTo(body.x, body.y);
    checkpointX = body.x; checkpointY = body.y;
    /* Devam-yakalama: commit tasi zaten bir esigin GERISINDEYSE o esik tekrar
     * draine olmasin. */
    if (currentWorld === 1) {
      drainedB1 = checkpointX >= w1B1EndX;
      drainedD1 = checkpointX >= w1D1EndX;
      drainedPostBoss = checkpointX >= w1.exitX;
    } else if (currentWorld === 6) {
      drainedW6Mid = checkpointX >= w6MidA6X;
      drainedW6End = checkpointX >= w6.bossTriggerX;
      drainedW6PostBoss = checkpointX >= w6.mergeTriggerX;
    }
    return true;
  }

  /* Kosu bitti ya da birakildi: yigin TEK katmana indirilip TITLE serilir
   * (aksi halde SKOR TABLOSU'ndan ZIPLA'ya basan oyuncu hicbir yere donemez —
   * kosu baslarken yigin zaten [PLAY]'e indirgeniyor) ve calisma zamani
   * GERCEK kayitla tutarli hale gelir. */
  function endRunSession() {
    sceneManager.setMuted(false);   /* normal oyunda ipuclari geri gelir */
    let guard = 8;
    while (guard-- > 0) {
      const before = sceneManager.current;
      sceneManager.back();
      if (sceneManager.current === before) break;
    }
    sceneManager.replace(SCENE.TITLE);
    suppressPersist = true;
    resetRuntimeToStart();
    applySaveVerbs();
    rate = save.ratio || RATE_V0.start;
    resumeFromSave();
    suppressPersist = false;
    recomputeMaxWorld();
  }

  function beginSpeedrun() {
    if (!saveSnapshot) {
      try { saveSnapshot = JSON.parse(JSON.stringify(save)); } catch (e) { saveSnapshot = null; }
    }
    const settings = save.settings;
    Object.assign(save, SaveMod.defaultSave());
    save.settings = settings;
    resetRuntimeToStart();
    runResultMs = 0; runRank = 0; runRecord = false; runBalanced = false;
    boardHighlight = null; nameValue = ""; nameSending = false; nameStatus = "";
    speedrun.start();

    /* BOARD ekrani yigina BINMIS olabilir (TITLE > BOARD ya da PAUSE > BOARD);
     * commitStage ile ayni desen: once poplanabildigi kadar popla, kalani
     * PLAY ile DEGISTIR. */
    let guard = 8;
    while (sceneManager.current !== SCENE.PLAY && guard-- > 0) {
      const before = sceneManager.current;
      sceneManager.back();
      if (sceneManager.current === before) break;
    }
    if (sceneManager.current !== SCENE.PLAY) sceneManager.replace(SCENE.PLAY);
    /* IPUCU YOK. Kosu boyunca hicbir balon acilmaz: ne giris sinemasi, ne
     * patron tanitimlari, ne pip aciklamalari, ne kapi uyarilari. Iki
     * gerekce: (1) bu modu oynayan oyun zaten bitirmis, ipuclari ona bir sey
     * ogretmiyor; (2) balon acikken fizik TAMAMEN donuyor — "oyun durmusken
     * kronometre isliyor" adaletsiz gorunuyordu. Susturma sahne yoneticisinde
     * TEK bir anahtarla yapilir, boylece cutscene.js'ten gelen tetikler de
     * kendiliginden kapanir (bkz. scenes.js setMuted). */
    sceneManager.setMuted(true);
    loop.resume();
  }

  function restoreSaveAfterRun() {
    if (!saveSnapshot) return;
    Object.assign(save, saveSnapshot);
    saveSnapshot = null;
    SaveMod.write(save);
  }

  /* Kosuyu YARIDA birakma (DURAKLAT'tan L). Gercek kayit geri gelir, calisma
   * zamani temiz bir W0'a doner ve baslik ekranina cikilir. `suppressPersist`
   * sart: enterWorld/persistProgress bu arada devreye girip gercek kaydin
   * uzerine "W0, checkpoint yok" yazamamali. */
  function abortSpeedrun() {
    if (!speedrun.active) return;
    speedrun.abort();
    runResultMs = 0; runRank = 0; runRecord = false;
    closeNameEntry();
    restoreSaveAfterRun();
    endRunSession();
    loop.pause();
    loop.renderOnce();
  }

  /* ------------------------------------------------------- isim girisi (DOM) */
  function onNameKeyDown(e) {
    /* HER tusu burada TUKET: ESC'i launcher dinliyor (overlay'i kapatir) ve
     * BOŞLUK sayfayi kaydirir. Odak bu kutudayken hicbiri disari sizmamali. */
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      finishNameEntry(nameEl ? nameEl.value : "", true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finishNameEntry("", false);
    }
  }
  function onNameInput() {
    nameValue = sanitizeName(nameEl ? nameEl.value : "");
  }

  function openNameEntry() {
    sceneManager.replace(SCENE.NAME);
    nameValue = ""; nameSending = false; nameStatus = "";
    runRecord = (() => { const b = board.bestMs(); return b === 0 || runResultMs < b; })();
    if (typeof document === "undefined" || nameEl) return;
    const el = document.createElement("input");
    el.type = "text";
    el.maxLength = NAME_MAX;
    el.autocomplete = "off";
    el.setAttribute("aria-label", i18n.lex("enterName"));
    /* Gorunmez ama ODAKLANABILIR ve EKRANDA: `display:none` ya da ekran disi
     * bir kutu mobilde sistem klavyesini acmaz. Saydam birakip canvas'in
     * uzerine koyuyoruz; cizimi biz yapiyoruz. 16px font iOS'un otomatik
     * yakinlastirmasini onler. */
    el.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
      "width:200px;height:24px;opacity:0;border:0;background:transparent;color:transparent;" +
      "font-size:16px;z-index:2;caret-color:transparent;";
    const host = canvas.parentNode || document.body;
    host.appendChild(el);
    el.addEventListener("keydown", onNameKeyDown);
    el.addEventListener("input", onNameInput);
    nameEl = el;
    input.setTextMode(true);
    try { el.focus(); } catch (e) {}
  }

  function closeNameEntry() {
    input.setTextMode(false);
    if (!nameEl) return;
    nameEl.removeEventListener("keydown", onNameKeyDown);
    nameEl.removeEventListener("input", onNameInput);
    if (nameEl.parentNode) nameEl.parentNode.removeChild(nameEl);
    nameEl = null;
  }

  /* `publish=false` (ESC ile atlama): sure YEREL listeye yine yazilir ama
   * ortak listeye GONDERILMEZ. Adini vermek istemeyen oyuncunun kaydi
   * kaybolmaz, sadece yayimlanmaz. */
  function finishNameEntry(rawName, publish) {
    if (nameSending) return;
    const name = sanitizeName(rawName);
    const entry = { name: name || "?", ms: runResultMs, balanced: runBalanced, at: Date.now() };
    board.localAdd(entry);
    boardHighlight = entry;

    closeNameEntry();
    speedrun.abort();
    restoreSaveAfterRun();
    /* Kaydin `bestMs` alani semada ZATEN vardi ve hic kullanilmiyordu —
     * yeni alan eklemeden en iyi sure buraya oturur (§8.4 dondurulmus sema). */
    if (!save.bestMs || runResultMs < save.bestMs) save.bestMs = runResultMs;
    SaveMod.write(save);
    endRunSession();

    openBoardScreen();
    if (!publish || !name) { nameStatus = ""; return; }
    nameSending = true;
    nameStatus = i18n.lex("sending");
    board.submit({ name: entry.name, ms: entry.ms, balanced: entry.balanced, splits: speedrun.splits })
      .then((res) => {
        nameSending = false;
        runRank = res && res.ok ? (res.rank || 0) : 0;
        nameStatus = res && res.ok ? i18n.lex("sent") : i18n.lex("sendFailed");
        if (res && res.ok) board.load();
      });
  }

  /* ------------------------------------------------------ SKOR TABLOSU ekrani */
  function openBoardScreen() {
    if (sceneManager.current !== SCENE.BOARD) sceneManager.goto(SCENE.BOARD);
    /* Ekran CANLI: yanip sonen satir ve ortak listenin asenkron yuklenmesi
     * icin dongu kosmali (HARITA ekraniyla ayni gerekce). */
    loop.resume();
    board.load();
  }

  function closeBoardScreen() {
    sceneManager.back();
    if (sceneManager.current === SCENE.PAUSE) { loop.pause(); loop.renderOnce(); }
  }

  function updateBoardScreen() {
    const c = input.ctrl;
    tapPending = false;
    if (c.verbPressed) beginSpeedrun();
    else if (c.jumpPressed) closeBoardScreen();
  }

  /* ======================================================================
   * BÖLÜM SEÇ — bir bolumun BASINA isinlanma (HARITA ekranindan, satir
   * secimi + onay kutusu ile). performFullReset()'in dunya-ici durumu
   * temizleyen kismiyla AYNI listeyi tuketir; farki: kayit SILINMEZ,
   * pip/fiil ilerlemesi ve oran KORUNUR.
   * ====================================================================== */
  function enterWorld(w) {
    currentWorld = w;
    const wd = worldData();
    boss = null; overrideBoss = null; overrideDefeatedHandled = false; bossPhase2Committed = false;
    mirrorBoss = null; mirrorDefeatedHandled = false; mirrorLeftArmed = false;
    drainedB1 = false; drainedD1 = false; drainedPostBoss = false;
    drainedW6Mid = false; drainedW6End = false; drainedW6PostBoss = false; drainedW6Mirror = false;
    pushWallX = null; pushWallGrace = 0;
    hotChannelX1 = null; hotChannelTimer = 0;
    rainZone = null; rainTimer = 0; rainWave = 0;
    mergeAvailable = false; mergeStarted = false; mergeDone = false;
    mergeTimer = 0; mergeStartRate = 0; mergeF3Shown = false;
    epFinishHandled = false; epClosing = false; epClosingTimer = 0; epF4Shown = false;
    revertTimer = 0; lieFrames = 0;
    gameFinished = false;
    ghostRenderX = null; ghostRenderY = null;
    ghostOriginX = 0; ghostRestartPending = false; ghostGrace = 0;
    exitLockHinted = false;
    pipFlashIndex = -1; pipFlashFrames = 0; pipFlashName = "";
    rateBumpFrames = 0; rateBumpAmount = 0; verbFlashFrames = 0; groundFlashFrames = 0;
    sceneManager.clearDialogue();   /* eski bolumun yarim balonu tasinmasin */
    fakeTiles.reset();   /* cokmus karolar kalici delik birakmasin */
    arenaWalls.reset();  /* orulu duvarlar da haritada kalmasin */
    verbs.reset();
    ghost.reset();
    if (w > 0) seedGhostFallback();

    /* W6/EP kendi basina fiilsiz OYNANAMAZ (SICAK KANAL'in YENİDEN YAZ
     * bosluğu, YOKSAY'in tap/hold dizisi). Bu bolumler zaten yalniz
     * ULASILMISSA secilebiliyor, yani pip'ler toplanmis demektir; yine de
     * debugStartWorld dalindaki ayni emniyet kemeri burada da vurulur. */
    if (w === 6 || w === 7) { verbs.unlock(VERB.REWRITE); verbs.unlock(VERB.SHOOT); }
    /* EP'ye MERGE'siz girilirse bitis cizgisinde SaveMod.assertFinish()
     * (`finished && ratio !== 48`) FIRLATIRDI — MERGE oraninin kendisi
     * burada uygulanir (debugStartWorld === 7 ile ayni). */
    if (w === 7) rate = RATE_V0.merge;

    spawnWorldEnemies(wd);
    body.x = wd.spawnX; body.y = wd.spawnY; body.vx = 0; body.vy = 0;
    cam.setBounds(wd.map.pxW, wd.map.pxH);
    cam.snapTo(body.x, body.y);
    checkpointX = wd.spawnX; checkpointY = wd.spawnY;
    noteWorldReached();
    audio.startDrone();
    a11yAnnouncer.reset();
    persistProgress();
  }

  /* ------------------------------------------------------- HARITA ekrani UI */
  let mapIndex = 0;         /* secili satir 0..3 */
  let mapConfirm = -1;      /* -1 = onay kutusu kapali, >=0 = hedef satir */
  let mapPrevMoveX = 0;     /* yon tusu KENAR algisi (moveX seviye sinyalidir) */

  function stageUnlocked(i) { return i <= maxWorldReached; }
  function stageName(i) {
    const n = i18n.data.worldNames;
    return i === 0 ? n.w0 : i === 1 ? n.w1 : i === 2 ? n.w6 : n.ep;
  }
  /* Kare basina yeniden kurulmaz (§10.5 "update/render dongusunde nesne
   * literali yok") — dort satir bir kez ayrilir, alanlari her cizimde
   * uzerine yazilir. */
  const stageList = [];
  for (let i = 0; i < STAGE_COUNT; i++) stageList.push({ name: "", unlocked: false, current: false });
  function stages() {
    const cur = worldOrdinal(currentWorld);
    for (let i = 0; i < STAGE_COUNT; i++) {
      stageList[i].name = stageName(i);
      stageList[i].unlocked = stageUnlocked(i);
      stageList[i].current = i === cur;
    }
    return stageList;
  }

  function openMapScreen() {
    mapIndex = worldOrdinal(currentWorld);
    mapConfirm = -1;
    mapPrevMoveX = input.ctrl.moveX;   /* basili duran yon tusu ANINDA kaydirmasin */
    sceneManager.goto(SCENE.MAP);
    /* HARITA artik CANLI bir ekran (secim, blink, tiklama) — dongu PAUSE'da
     * durdurulmustu, burada yeniden calistirilir; kapanisda tekrar durur. */
    loop.resume();
  }
  function closeMapScreen() {
    mapConfirm = -1;
    sceneManager.back();
    /* HARITA'ya END ekranindan da girilebilir (§9: "END -> Bölüm seç"); orada
     * dongu ZATEN kosuyor ve durdurulursa bitis ekrani donar. Yalniz PAUSE'a
     * donuldugunde tekrar durdurulur. */
    if (sceneManager.current === SCENE.PAUSE) { loop.pause(); loop.renderOnce(); }
  }

  function selectStage(i) {
    if (i < 0 || i >= STAGE_COUNT) return;
    mapIndex = i;
    if (!stageUnlocked(i)) { audio.play("obey"); return; }   /* kilitli: sesli ret */
    mapConfirm = i;
  }

  function commitStage() {
    const target = mapConfirm;
    mapConfirm = -1;
    if (target < 0) return;
    enterWorld(WORLD_ORDER[target]);
    /* Yigin iki farkli sekilde gelmis olabilir: PLAY>PAUSE>MAP (normal yol)
     * veya END>MAP (bitis ekranindan Bölüm seç — orada yigin DIBI END'dir ve
     * back() no-op'tur). Once poplanabildigi kadar poplanir, sonra kalan
     * ne ise PLAY ile DEGISTIRILIR. */
    let guard = 8;
    while (sceneManager.current !== SCENE.PLAY && guard-- > 0) {
      const before = sceneManager.current;
      sceneManager.back();
      if (sceneManager.current === before) break;
    }
    if (sceneManager.current !== SCENE.PLAY) sceneManager.replace(SCENE.PLAY);
    loop.resume();
  }

  function updateMapScreen() {
    const c = input.ctrl;
    const mx = c.moveX;
    const tapped = tapPending;
    tapPending = false;
    const prevMx = mapPrevMoveX;
    mapPrevMoveX = mx;   /* hangi dalda cikilirsa cikilsin kenar durumu tazedir */

    /* --- onay kutusu acikken: RESET ekraniyla AYNI gramer (FIIL onaylar,
     *     ZIPLA iptal eder) + iki gercek tiklama hedefi. */
    if (mapConfirm >= 0) {
      if (tapped) {
        const R = confirmRects();
        if (hitRect(R.approve, tapX, tapY)) commitStage();
        else if (hitRect(R.cancel, tapX, tapY)) mapConfirm = -1;
        return;
      }
      if (c.verbPressed) commitStage();
      else if (c.jumpPressed) mapConfirm = -1;
      return;
    }

    /* --- satir tiklamasi: secer VE onay kutusunu acar (tek dokunus). */
    if (tapped) {
      for (let i = 0; i < STAGE_COUNT; i++) {
        const r = stageRowRect(i);
        /* Dokunmatikte 13 px'lik satir cok ince — hit-test dikey olarak
         * satir araligina, yatay olarak da secim okunun payina kadar
         * genisletilir (cizim geometrisi DEGISMEZ). */
        if (tapX >= r.x - 14 && tapX < r.x + r.w + 14 && tapY >= r.y - 1 && tapY < r.y + r.h + 1) {
          selectStage(i);
          break;
        }
      }
      return;
    }

    if (mx !== 0 && prevMx === 0) {
      const next = mapIndex + mx;
      if (next >= 0 && next < STAGE_COUNT) mapIndex = next;
    }
    if (c.verbPressed) selectStage(mapIndex);
    else if (c.jumpPressed) closeMapScreen();
  }

  /* Menu ekranlarinin tiklama kanali (input.js onPointerTap). Oynanis
   * sirasinda HIC devreye girmez — dokunmatik bolgeler aynen calisir. */
  let tapX = 0, tapY = 0, tapPending = false;
  function onScreenPointer(bx, by) {
    const s = sceneManager.current;
    if (s === SCENE.NAME) {
      /* Dokunmatikte sistem klavyesi ancak KULLANICI JESTIYLE acilir; kosu
       * kendiliginden bittigi icin acilistaki focus() yetmeyebilir. Ekrana
       * dokunmak kutuyu yeniden odaklar. */
      if (nameEl) { try { nameEl.focus(); } catch (e) {} }
      return true;
    }
    /* SKOR TABLOSU dokunmayi TUKETMEZ: boylece dokunmatik A/B bolgeleri
     * normal calisir (B baslatir, A cikar) — bu ekranin kendi tiklanabilir
     * satiri yok. */
    if (s !== SCENE.MAP && s !== SCENE.TITLE) return false;
    tapX = bx; tapY = by; tapPending = true;
    return true;
  }

  /* ------------------------------------------------------------------ input */
  const touchSettings = createTouchSettings(save.settings && save.settings.touch);

  const input = createInput({
    keyTarget: window,
    touchTarget: canvas,
    onPause: () => {
      if (sceneManager.current === SCENE.PLAY) pauseGame();
      else if (sceneManager.current === SCENE.PAUSE || sceneManager.current === SCENE.MAP) resumeGame();
    },
    onDebug: () => debugHud.toggle(),
    onDialogueTest: () => {
      if (sceneManager.current === SCENE.PLAY && !sceneManager.isDialogueActive()) {
        sceneManager.playDialogue(i18n.data.scenes.sc01);
      }
    },
    onMap: () => {
      /* SÜRE MODU'nda BÖLÜM SEÇ YOK: kosunun ortasinda bolum atlamak sureyi
       * anlamsiz kilardi. Modun tek sarti "herkes bastan baslar". */
      if (speedrun.active) return;
      const s = sceneManager.current;
      /* §9: HARITA/BÖLÜM SEÇ hem DURAKLAT'tan hem de END ekranindan acilir. */
      if (s === SCENE.PAUSE || s === SCENE.END) openMapScreen();
      else if (s === SCENE.MAP) closeMapScreen();
    },
    onBoard: () => {
      const s = sceneManager.current;
      if (s === SCENE.NAME) return;                    /* isim yazarken kaybolmasin */
      if (s === SCENE.BOARD) { closeBoardScreen(); return; }
      /* Kosarken L yalniz DURAKLAT'ta is gorur ve KOSUYU BIRAKIR — oynanis
       * sirasinda kazara basilip kosunun bitmesi kabul edilemez. */
      if (speedrun.active) { if (s === SCENE.PAUSE) abortSpeedrun(); return; }
      if (s === SCENE.TITLE || s === SCENE.PAUSE || s === SCENE.END) openBoardScreen();
    },
    onPointerTap: onScreenPointer,
    onReset: () => {
      if (sceneManager.current === SCENE.TITLE && hasSaveData()) sceneManager.goto(SCENE.RESET);
    },
    onTouchCycle: () => {
      if (sceneManager.current !== SCENE.PAUSE) return;
      const m = touchSettings.cycle();
      input.setTouchOverride(m);
      if (!save.settings) save.settings = SaveMod.defaultSave().settings;
      save.settings.touch = m;
      loop.renderOnce();
    }
  });
  input.setTouchOverride(touchSettings.mode);

  /* ------------------------------------------------------------------- loop */
  const loop = createLoop({
    update(dt) {
      if (sceneManager.current === SCENE.TITLE) {
        const started = input.ctrl.jumpPressed || input.ctrl.verbPressed || tapPending;
        tapPending = false;
        if (started) {
          sceneManager.replace(SCENE.PLAY);
          cutscene.maybeTrigger(SC_IDS.SC00, 0, -1);
        }
        input.consumeEdges();
        return;
      }

      /* HARITA (BÖLÜM SEÇ) kendi girdi dalini surer — PLAY durumuna hic
       * dokunmaz, oyun bu sirada donmus kalir. */
      if (sceneManager.current === SCENE.MAP) {
        updateMapScreen();
        input.consumeEdges();
        return;
      }

      /* SKOR TABLOSU: kendi girdi dali (AKSİYON kosuyu baslatir, ZIPLA cikar). */
      if (sceneManager.current === SCENE.BOARD) {
        updateBoardScreen();
        input.consumeEdges();
        return;
      }

      /* ISIM GIRISI: tuslar oyuna DEGIL, odaklanmis DOM <input>'una gider
       * (input.setTextMode). Burada yapilacak bir sey yok — ekran yalnizca
       * cizilir; dongu ise imlecin yanip sonmesi ve gonderim durumunun
       * ekrana yansimasi icin donmeye devam eder. */
      if (sceneManager.current === SCENE.NAME) {
        input.consumeEdges();
        return;
      }

      if (sceneManager.current === SCENE.RESET) {
        if (input.ctrl.verbPressed) { performFullReset(); sceneManager.back(); }
        else if (input.ctrl.jumpPressed) { sceneManager.back(); }
        input.consumeEdges();
        return;
      }

      sceneManager.update(dt, input.ctrl);

      /* ==================================================================
       * KRONOMETRE — nerede sayar, nerede saymaz
       * ==================================================================
       * Kural tek cumle: oyun kontrolu SENIN HATANDAN OTURU elinden aldiysa
       * sayar, ANLATI icin aldiysa saymaz.
       *
       *   SAYAR    : normal oynanis, patron dovusleri ve GERI AL isinlanmasi.
       *              Olmek sureye mal olur — istenen davranis aynen bu.
       *   SAYMAZ   : balon (SÜRE MODU'nda zaten susturuldu ama bu satir
       *              emniyet kemeri), MERGE'in 6 saniyelik sahnesi ve epilog
       *              kapanisi. Ucunde de oyuncu hicbir sey yapamaz ve sure
       *              herkes icin AYNI — saymak siralamayi degistirmez, yalniz
       *              "oyun durdu ama saat isliyor" hissi birakirdi.
       *
       * Bu satira ulasmak zaten "oynanis isliyor" demek: TITLE / HARITA /
       * SKOR TABLOSU / ISIM / RESET dallari yukarida return etti, DURAKLAT
       * ise dongunun kendisini durdurdu.
       * ================================================================== */
      if (!sceneManager.isDialogueActive() && !mergeStarted && !epClosing) speedrun.tick();
      if (sceneManager.isDialogueActive()) {
        particles.update(dt);
        input.consumeEdges();
        return;
      }

      if (gameFinished) { input.consumeEdges(); return; }

      if (epClosing) {
        updateEPClosing(dt);
        particles.update(dt);
        input.consumeEdges();
        return;
      }

      if (mergeStarted) {
        updateMerge();
        particles.update(dt);
        input.consumeEdges();
        return;
      }

      if (revertTimer > 0) {
        updateRevert();
        particles.update(dt);
        input.consumeEdges();
        return;
      }

      const wd = worldData(), cfg = worldCfg();

      step(body, input.ctrl, cfg, wd.map);

      /* YALAN TABELA fizik adimindan SONRA islenir: `body.groundFlags` ancak
       * step()'in zemin cozumunden sonra tazedir. */
      fakeTiles.setMap(wd.map);
      fakeTiles.setBalanced(!!(save.settings && save.settings.balanced));
      fakeTiles.update(body);
      /* AYNA'nin duvarlari da haritayi yazan bir sistem: setMap/update ayni
       * yerde, ayni sirada — dunya degisince eski harita ONCE onarilir. */
      arenaWalls.setMap(wd.map);
      arenaWalls.update();
      if (fakeTiles.crackedThisFrame) {
        const c = fakeTiles.crackedThisFrame;
        audio.play("crack");
        particles.burst(c.x, c.y, Math.min(4, perf.particleBudget), SLOT.HAZARD);
        if (lieFrames <= 0) {
          const lies = i18n.data.lies;
          lieText = lies[lieIndex % lies.length];
          lieIndex++;
          lieFrames = LIE_FRAMES;
          lieX = c.x; lieY = c.y;
        }
      }
      if (fakeTiles.collapsedThisFrame) {
        const c = fakeTiles.collapsedThisFrame;
        audio.play("collapse");
        particles.burst(c.x, c.y + TILE * 0.5, Math.min(10, perf.particleBudget), SLOT.HAZARD);
      }

      /* AYRI TUSLAR: ZEMİN YAP = Q, ATEŞ ET = J/Shift. Ikisi birbirini
       * beklemez ve PATRON DOVUSUNDE DE calisir — eski kodda dovus boyunca
       * verbs.update() tamamen atlaniyordu (dovus baska bir gramerde
       * yasandigi icin). Artik dovusun kendisi bu iki fiille yapiliyor:
       * ates etmek zarar verir, konan karo gelen mermiye siper olur. */
      verbs.setTrail(!!(save.pips & (1 << SaveMod.PIP_BIT.TRAIL)));
      verbs.update(dt, body, input.ctrl, wd.map, pool);
      /* Sonucsuz basis: ilgili yuva kisa bir kirmizi cerceve atar. */
      if (verbs.wastedGround) groundFlashFrames = VERB_FLASH_FRAMES;
      if (verbs.wastedVerb) verbFlashFrames = VERB_FLASH_FRAMES;
      if (verbs.placedThisFrame) audio.play("verb-rewrite");
      if (verbs.firedThisFrame) audio.play("shoot");

      Enemies.update(pool, dt, body, wd.map, () => {
        const floor = currentWorld === 1 ? RATE_V0.floor.w1 : currentWorld === 6 ? RATE_V0.floor.w6 : rate;
        applyObey(floor);
      }, null, (hx, hy) => {
        /* Mermi kati bir seye carpti: AYNA'nin ordugu bir duvarsa KIRILIR.
         * Dunyanin normal zemininde breakAt() false doner ve hicbir sey olmaz. */
        if (arenaWalls.breakAt(hx, hy)) {
          audio.play("collapse");
          particles.burst(hx, hy, Math.min(6, perf.particleBudget), SLOT.SECONDARY);
        }
      });

      /* Mermi carpismalari, dusmanlar HAREKET ETTIKTEN sonra cozulur: aksi
       * halde ayni karede yer degistiren bir hedefin ESKI konumuna gore karar
       * verilir ve hizli seylerde (AVCI, KIVILCIM) gorunur bir kayma olusur. */
      Enemies.boltHitTest(pool, onBoltEvent);

      const hazardId = Enemies.hazardHitTest(pool, body);
      if (hazardId !== -1) triggerRevert();

      checkPips();
      updateCheckpointsAndDrains();
      updateW6Drains();
      updatePushWall();
      updateHotChannel();
      updateShellRain();
      updateGhost();
      tryWorldTransition();
      updateBoss(dt);
      updateOverrideBoss(dt);
      updateMirror(dt);
      tryMergePrompt();
      updateMerge();
      updateEPFinish();
      updateExitLockHint();

      if (pipFlashFrames > 0) pipFlashFrames--;
      if (rateBumpFrames > 0) rateBumpFrames--;
      if (verbFlashFrames > 0) verbFlashFrames--;
      if (groundFlashFrames > 0) groundFlashFrames--;
      if (introHintFrames > 0 && currentWorld === 0) introHintFrames--;
      if (lieFrames > 0) lieFrames--;

      if (currentWorld === 1 && !cutscene.hasPlayed(SC_IDS.SC01) && body.x >= w1C1StartX) {
        cutscene.maybeTrigger(SC_IDS.SC01, body.x, w1C1StartX);
      }

      if (body.events & EV_JUMP) audio.play("jump");
      if (body.events & EV_LAND) audio.play("land");
      input.consumeEdges();
      debugHud.sample(body, cfg, loop);
      cam.follow(body, dt);
      respawnIfFallen();
      particles.update(dt);
      telemetry.sampleFrame(loop.frameMs);
      perf.update();
      /* Ekran okuyucuya "W1" degil bolumun OKUNUR adi gider; monitor caption
       * (index.astro) kisa etiketi kendi kullanmaya devam eder. */
      a11yAnnouncer.tick({ world: worldFullName(), rate, checkpoint: commitProgress().commits });
      audio.setDroneRate(rate);
    },
    render() {
      renderer.clear(SLOT.BG);

      if (sceneManager.current === SCENE.TITLE || sceneManager.current === SCENE.RESET) {
        drawTitle(renderer.ctx, font, i18n, { hasSave: hasSaveData(), reduceMotion });
        if (sceneManager.current === SCENE.RESET) drawReset(renderer.ctx, font, i18n);
        renderer.present();
        return;
      }

      if (sceneManager.current === SCENE.MAP) {
        drawMap(renderer.ctx, font, i18n, {
          pips: save.pips || 0,
          stages: stages(),
          stageIndex: mapIndex
        });
        if (mapConfirm >= 0) {
          drawStageConfirm(renderer.ctx, font, i18n, { name: stageName(mapConfirm) });
        }
        renderer.present();
        return;
      }

      if (sceneManager.current === SCENE.BOARD) {
        drawBoard(renderer.ctx, font, i18n, {
          global: board.globalList,
          local: board.localList(),
          status: board.status,
          highlight: boardHighlight
        });
        if (nameStatus) {
          font.drawCentered(renderer.ctx, nameStatus, VIEW_W / 2, VIEW_H - 34, SLOT.LED, 1);
        }
        renderer.present();
        return;
      }

      if (sceneManager.current === SCENE.NAME) {
        drawNameEntry(renderer.ctx, font, i18n, {
          ms: runResultMs, name: nameValue, record: runRecord, sending: nameSending
        });
        renderer.present();
        return;
      }

      if (sceneManager.current === SCENE.END) {
        drawEnd(renderer.ctx, font, i18n, { rate, runMs: runResultMs || 0, runRank });
        renderer.present();
        return;
      }

      const wd = worldData();

      /* EP epilog kapanisi (§6.1): "ufka dogru surekli kayma -> zoom-out".
       * zoom<1 iken sadece kucultmek YETMEZ (bos kenar birakir) — gorunen
       * dunya-penceresini de (VIEW/zoom) genisletip AYNI odak noktasina
       * gore yeniden ortalamak gerekir, boylece cekilirken GERCEKTEN daha
       * genis bir alan aciga cikar. HUD/diyalog bu donusumun DISINDA kalir. */
      let rcx = cam.x, rcy = cam.y, zoom = 1;
      if (epClosing) {
        const t = Math.min(1, epClosingTimer / EP_CLOSING_FRAMES);
        zoom = 1 - 0.45 * easeOutCubic(t);
        const focalX = cam.x + VIEW_W / 2, focalY = cam.y + VIEW_H / 2;
        rcx = focalX - (VIEW_W / zoom) / 2;
        rcy = focalY - (VIEW_H / zoom) / 2;
      }

      renderer.ctx.save();
      if (zoom !== 1) renderer.ctx.scale(zoom, zoom);

      renderer.drawMap(wd.map, rcx, rcy);
      drawHotChannelBand(renderer.ctx, rcx, rcy);
      drawShellRainBand(renderer.ctx, rcx, rcy);

      /* Aktif arenada dunya tabelasi CIZILMEZ: patronun ustundeki canli okuma
       * (ad + ilerleme + "su an ne yap" + zamanlama cubugu) ile parkur
       * tabelasi ayni yatay bantta cakisiyordu (ekran goruntusuyle raporlandi).
       * Dovus sirasinda oyuncunun ihtiyaci olan bilgi zaten patronun uzerinde. */
      const arenaX = (currentWorld === 1 && boss && !boss.isDefeated) ? w1BossX
        : (currentWorld === 6 && mirrorBoss && !mirrorBoss.isDefeated) ? x1BossX
        : (currentWorld === 6 && overrideBoss && !overrideBoss.isDefeated) ? w6BossX
        : null;

      for (let i = 0; i < wd.labels.length; i++) {
        const lb = wd.labels[i];
        const sx = lb.x - rcx;
        if (sx < -200 || sx > VIEW_W + 200) continue;
        if (arenaX !== null && Math.abs(lb.x - arenaX) < 280) continue;
        const sy = lb.y - rcy - (lb.row || 0) * LABEL_ROW_H;
        const txt = i18n.lang === "en" ? lb.en : lb.tr;
        let tx = sx;
        if (lb.kind === "hazard") {
          font.draw(renderer.ctx, "!", tx, sy, SLOT.HAZARD, 1);
          tx += 8;
        } else if (lb.kind === "ground" || lb.kind === "shoot") {
          /* HUD'daki fiil yuvasiyla AYNI iki renk — etiket ve yuva bakisla
           * eslesir (bkz. hud.js drawVerbSlot). */
          renderer.ctx.fillStyle = lb.kind === "ground" ? "#58c4ff" : "#ff6c9c";
          renderer.ctx.fillRect(Math.round(tx), Math.round(sy) + 2, 4, 4);
          tx += 8;
        }
        font.draw(renderer.ctx, txt, tx, sy, lb.kind === "hazard" ? SLOT.LIGHT : SLOT.INK_SOFT, 1);
      }

      if (currentWorld === 0) {
        drawExitGate(renderer.ctx, w0.exitX, w0.exitY, rcx, rcy, false);
      } else if (currentWorld === 1) {
        drawExitGate(renderer.ctx, w1.exitX, w1.exitY, rcx, rcy, !(boss && boss.isDefeated));
      } else if (currentWorld === 7) {
        drawFinishLine(renderer.ctx, ep.finishX, ep.finishY, rcx, rcy);
      }

      if (pushWallX !== null) {
        const cfgWall = wd.hazards && wd.hazards.pushWall;
        drawPushWall(renderer.ctx, pushWallX, rcx, rcy, !!(cfgWall && cfgWall.hazardous));
      }

      if (currentWorld === 1) {
        for (const p of w1.pipSpawns) drawPip(renderer.ctx, p, rcx, rcy);
        for (const bcn of w1Beacons) drawCheckpoint(renderer.ctx, bcn.x, bcn.y, rcx, rcy, checkpointX >= bcn.x);
      } else if (currentWorld === 6) {
        for (const bcn of w6Beacons) drawCheckpoint(renderer.ctx, bcn.x, bcn.y, rcx, rcy, checkpointX >= bcn.x);
      }

      if (ghostRenderX !== null) {
        const gx = Math.round(ghostRenderX - rcx), gy = Math.round(ghostRenderY - rcy);
        renderer.ctx.save();
        renderer.ctx.globalAlpha = 0.55;
        renderer.ctx.fillStyle = palette.css[SLOT.SHADOW];
        renderer.ctx.fillRect(gx - 5, gy - 14, 10, 16);
        renderer.ctx.restore();
      }

      if (currentWorld === 7) {
        /* Kurtarilan sakinler: sabit, yavas kayan nokta dizisi (§6.1/§6.7-d
         * gorsel karsiligi — bkz. worlds/ep.js basindaki SADELESTIRME notu). */
        const bob = Math.sin(Date.now() / 400) * 2;
        renderer.ctx.save();
        renderer.ctx.fillStyle = palette.css[SLOT.SECONDARY];
        for (const r of ep.residentDecor) {
          const rx = Math.round(r.x - rcx), ry = Math.round(r.y - rcy + bob);
          if (rx < -20 || rx > VIEW_W + 20) continue;
          renderer.ctx.fillRect(rx - 3, ry - 8, 6, 8);
        }
        renderer.ctx.restore();
      }

      Enemies.draw(renderer.ctx, pool, rcx, rcy, palette, font, creatureSprites);
      if (boss) {
        boss.draw(renderer.ctx, rcx, rcy, palette, font, creatureSprites, snifferLabelPack());
        drawOffscreenBossMarker(renderer.ctx, w1BossX, rcx, i18n.data.bossNames.sniffer, boss.isDefeated);
      }
      if (overrideBoss) {
        overrideBoss.draw(renderer.ctx, rcx, rcy, palette, font, creatureSprites, ghost.getBand(), overrideLabelPack());
        drawOffscreenBossMarker(renderer.ctx, w6BossX, rcx, i18n.data.bossNames.override, overrideBoss.isDefeated);
      }
      if (mirrorBoss) {
        drawArenaGates(renderer.ctx, rcx, rcy, mirrorBoss.isDefeated);
        mirrorBoss.draw(renderer.ctx, rcx, rcy, palette, font, creatureSprites, mirrorLabelPack());
        drawOffscreenBossMarker(renderer.ctx, mirrorBoss.x, rcx, i18n.data.bossNames.mirror, mirrorBoss.isDefeated);
      }
      if (mergeStarted) {
        /* MERGE zemini: normal tilemap yerine 240 karelik banttan cizilir —
         * kayitli yolun GECMEDIGI yerde platform yok (§2.4). Oyuncu duruyor;
         * bant son ornege GORE ofsetlenir, "ayaklarinin altindaki zemin
         * kendi son birkac saniyen" hissini verir. */
        const band = ghost.getBand();
        if (band.length > 1) {
          const last = band[band.length - 1];
          renderer.ctx.save();
          renderer.ctx.fillStyle = palette.css[SLOT.ACCENT];
          for (let i = 0; i < band.length; i += 3) {
            const s = band[i];
            const dx = Math.round(body.x - rcx + (s.x - last.x));
            const dy = Math.round(body.y - rcy + body.h + (s.y - last.y));
            renderer.ctx.fillRect(dx - 2, dy, 4, 4);
          }
          renderer.ctx.restore();
        }
      }
      fakeTiles.draw(renderer.ctx, rcx, rcy, palette);
      arenaWalls.draw(renderer.ctx, rcx, rcy, palette);
      drawGroundTarget(renderer.ctx, rcx, rcy);
      if (lieFrames > 0 && lieText) {
        renderer.ctx.save();
        renderer.ctx.globalAlpha = Math.min(1, lieFrames / 24);
        const ly = Math.round(lieY - rcy) - 16 - Math.round((LIE_FRAMES - lieFrames) * 0.12);
        font.drawCentered(renderer.ctx, lieText, Math.round(lieX - rcx), ly, SLOT.HAZARD, 1);
        renderer.ctx.restore();
      }
      particles.draw(renderer.ctx, rcx, rcy, palette);
      renderer.ctx.save();
      renderer.ctx.globalAlpha = revertFadeAlpha();
      salih.draw(renderer.ctx, body, rcx, rcy);
      renderer.ctx.restore();
      drawHotChannelCountdown(renderer.ctx, rcx, rcy);

      renderer.ctx.restore();

      drawTouchHints(renderer.ctx);

      const cp = commitProgress();
      hud.draw(renderer.ctx, {
        rate,
        floor: currentWorld === 1 ? RATE_V0.floor.w1 : currentWorld === 6 ? RATE_V0.floor.w6 : null,
        rateBump: rateBump(),
        verbActive: verbs.active,
        verbKey: actionKeyName(),
        groundKey: groundKeyName(),
        groundUnlocked: verbs.isUnlocked(VERB.REWRITE),
        shootUnlocked: verbs.isUnlocked(VERB.SHOOT),
        verbMeter: verbs.meter,
        verbMeterMax: verbs.meterMax,
        fireCooldown: verbs.fireCooldown,
        fireCooldownMax: verbs.fireCooldownMax,
        verbFlash: verbFlashFrames,
        groundFlash: groundFlashFrames,
        commits: cp.commits,
        commitsTotal: cp.commitsTotal,
        pips: save.pips || 0,
        pipFlash: pipFlash(),
        runMs: speedrun.active ? speedrun.ms : null,
        debt: save.debt || 0
      });

      /* Tus efsanesi: yalniz W0'in ilk 12 saniyesinde ve diyalog balonu YOKKEN
       * (ayni ekran yarisini paylasirlar). §7.6'nin DOM buton sozlesmesine
       * dokunmaz — ic tampona cizilen bir ipucudur. */
      if (introHintFrames > 0 && currentWorld === 0 && !sceneManager.isDialogueActive()) {
        const lines = 3, hx = 8, hy = VIEW_H - (lines * 11) - 10;
        renderer.ctx.save();
        renderer.ctx.globalAlpha = 0.72;
        renderer.ctx.fillStyle = "#0b0f1f";
        renderer.ctx.fillRect(hx - 4, hy - 4, 312, lines * 11 + 8);
        renderer.ctx.restore();
        drawControls(renderer.ctx, font, i18n, hx, hy, lines, false, null);
      }

      sceneManager.draw(renderer.ctx, font, i18n, palette);
      debugHud.draw(renderer.ctx);

      if (sceneManager.current === SCENE.PAUSE) {
        drawPause(renderer.ctx, font, i18n, {
          rate, world: worldFullName(),
          balanced: !!(save.settings && save.settings.balanced),
          touchMode: touchSettings.mode,
          runMs: speedrun.active ? speedrun.ms : null
        });
      }

      renderer.present();
    },
    onFps(fps) { if (typeof o.onFps === "function") o.onFps(fps); },
    onAutoPause() { pauseGame(); }
  });

  function pauseGame() {
    if (sceneManager.current !== SCENE.PLAY) return;
    sceneManager.goto(SCENE.PAUSE);
    loop.pause();
    loop.renderOnce();
  }
  function resumeGame() {
    /* HARITA (BÖLÜM SEÇ) PAUSE'un USTUNDE durur ve dongu orada CALISIR;
     * launcher'in DEVAM butonu / P tusu once onu kapatmali ki "devam" tek
     * basista gercekten oyuna donsun. */
    if (sceneManager.current === SCENE.MAP) { mapConfirm = -1; sceneManager.back(); }
    else if (sceneManager.current === SCENE.BOARD) sceneManager.back();
    if (sceneManager.current !== SCENE.PAUSE) return;
    sceneManager.back();
    loop.resume();
  }

  /* Cikis kapisi (Faz 6+ oynanis geri bildirimi): W0/W1'in gecisleri hep
   * gorunmez bir x-esigiydi (oyuncu "cikis yeri" gormeden isiniyordu).
   * MERGE/EP zaten kendi tetikleyicilerini (F2 istemi, "BİTİŞ ÇİZGİSİ"
   * etiketi) tasidigi icin buraya dahil edilmedi — sadece W0 ve W1'e,
   * iki dikey direk + tepede bir kiris + "ÇIKIŞ" etiketi. W1'de boss
   * yenilene kadar SOLUK (kilitli), yenilince PARLAK (gecilebilir). */
  function drawExitGate(ctx, x, groundY, camX, camY, locked) {
    const gx = Math.round(x - camX);
    if (gx < -40 || gx > VIEW_W + 40) return;
    const gy = Math.round(groundY - camY);
    const H = 44, GAP = 22, PW = 4;
    const glow = locked ? 0.35 : 0.55 + Math.sin(Date.now() / 300) * 0.2;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = palette.css[locked ? SLOT.INK_SOFT : SLOT.ACCENT];
    ctx.fillRect(gx - GAP / 2 - PW, gy - H, PW, H);
    ctx.fillRect(gx + GAP / 2, gy - H, PW, H);
    ctx.fillRect(gx - GAP / 2 - PW, gy - H, GAP + PW * 2, 3);
    ctx.restore();
    font.drawCentered(ctx, i18n.lex("exit"), gx, gy - H - 12, locked ? SLOT.INK_SOFT : SLOT.ACCENT, 1);
    /* Kilit SEBEBI kapinin uzerinde de yazar — soluk direkler tek basina
     * "burada bir sey eksik"i anlatmiyordu (bkz. updateExitLockHint). */
    if (locked) font.drawCentered(ctx, i18n.lex("locked"), gx, gy - H - 24, SLOT.HAZARD, 1);
  }

  /* ==========================================================================
   * BITIS CIZGISI (EP) — bulunan gercek eksik
   * ==========================================================================
   * "En sonda bitis cizgisi gorunmuyor ama oyun bitiyor" (oyun testi). Dogruydu:
   * `ep.finishX` GORUNMEZ bir x esigiydi. W0/W1'in cikis kapisi ciziliyor,
   * MERGE kendi istemini gosteriyor, EP'nin bitisi ise hicbir sey gostermiyordu
   * — oyuncu bombos bir duzlukte kosarken oyun kendiliginden kapaniyor, "ne
   * oldu da bitti" sorusunun ekranda cevabi kalmiyordu.
   *
   * Cizgi bilincli olarak YARIS damasi: direk + damali bant + yere inen nabizli
   * cizgi. Bolumun adi "SLUG OTOYOLU" ve bu bir zafer turu — kapi degil, BITIS
   * CIZGISI olmali. Epilog kapanisi basladiktan sonra da cizilmeye devam eder
   * (kamera ondan uzaklasirken geride kalir), boylece "gectim" ani gorunur. */
  function drawFinishLine(ctx, x, groundY, camX, camY) {
    const gx = Math.round(x - camX);
    if (gx < -70 || gx > VIEW_W + 70) return;
    const gy = Math.round(groundY - camY);
    const POLE_H = 104, BAND_H = 64, CELL = 8;
    ctx.save();
    /* Damali bant: iki kolon, satir satir sasirtmali — uzaktan bir bakista
     * "bitis" olarak okunan tek desen budur. */
    ctx.globalAlpha = 0.92;
    for (let r = 0; r * CELL < BAND_H; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = palette.css[((r + c) & 1) ? SLOT.LIGHT : SLOT.BLACK];
        ctx.fillRect(gx - CELL + c * CELL, gy - BAND_H + r * CELL, CELL, CELL);
      }
    }
    /* Direk + tepede kucuk bayrak */
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette.css[SLOT.INK];
    ctx.fillRect(gx - 1, gy - POLE_H, 2, POLE_H - BAND_H + 2);
    ctx.globalAlpha = reduceMotion ? 0.85 : 0.7 + Math.sin(Date.now() / 300) * 0.25;
    ctx.fillStyle = palette.css[SLOT.ACCENT];
    ctx.fillRect(gx + 1, gy - POLE_H, 14, 9);
    ctx.restore();
    font.drawCentered(ctx, i18n.lex("merge"), gx, gy - POLE_H - 12, SLOT.ACCENT, 1);
  }

  /* ZEMİN YAP hedef hucresi — raporlanan "hic karo atilmiyor"in asil sebebi
   * bu isaretin YOKLUGUYDU: yetenek dogru calisiyor ama YALNIZ bir boslugun
   * TAM kenarindayken is goruyor (bir karo geride bile hedef hucre dolu, yani
   * hicbir sey olmuyor). Ekranda hicbir ipucu olmadigi icin oyuncu bunu
   * "bozuk" olarak okuyor. Artik yetenek acikken hedef hucre HER ZAMAN
   * cerceveyle isaretlenir: mavi = buraya karo koyabilirsin, sonuk = burada
   * zaten zemin var. Karonun nereye gidecegi verbs.targetCell()'den gelir,
   * yani cizim ile yerlestirme ayni kaynaktir. */
  function drawGroundTarget(ctx, camX, camY) {
    if (!verbs.isUnlocked(VERB.REWRITE)) return;
    const t = verbs.targetCell(body, worldData().map);
    if (!t.ok) return;
    const gx = Math.round(t.tx * TILE - camX), gy = Math.round(t.ty * TILE - camY);
    if (gx < -TILE || gx > VIEW_W) return;
    const free = !t.blocked && verbs.meter >= 1;
    ctx.save();
    ctx.globalAlpha = free ? (reduceMotion ? 0.7 : 0.45 + Math.sin(Date.now() / 220) * 0.22) : 0.18;
    ctx.strokeStyle = palette.css[free ? SLOT.SECONDARY : SLOT.INK_SOFT];
    ctx.lineWidth = 1;
    ctx.strokeRect(gx + 0.5, gy + 0.5, TILE - 1, TILE - 1);
    if (free) {   /* dolu hedefte kose isaretleri: "buraya oturur" */
      ctx.fillStyle = palette.css[SLOT.SECONDARY];
      ctx.fillRect(gx + 1, gy + 1, 3, 3);
      ctx.fillRect(gx + TILE - 4, gy + 1, 3, 3);
      ctx.fillRect(gx + 1, gy + TILE - 4, 3, 3);
      ctx.fillRect(gx + TILE - 4, gy + TILE - 4, 3, 3);
    }
    ctx.restore();
  }

  /* Ekran disi PATRON pusulasi. Raporlanan "koklayıcı ney" sorusunun ikinci
   * yarisi: W1'de boss'un yaninDAN gecip cikisa varmak mumkun (arena tutma
   * alani yok) ve o noktada ekranda KOKLAYICI'ya dair hicbir iz kalmiyor.
   * Boss ekran disindayken ilgili kenarda bir ucgen + adi durur; oyuncu
   * "geri dön" cumlesinin nereye isaret ettigini goruyor. Yenilince kaybolur. */
  function drawOffscreenBossMarker(ctx, worldX, camX, name, defeated) {
    if (defeated) return;
    const gx = worldX - camX;
    if (gx >= -20 && gx <= VIEW_W + 20) return;
    const left = gx < 0;
    const ax = left ? 14 : VIEW_W - 14;
    const ay = Math.round(VIEW_H * 0.42);
    ctx.save();
    ctx.globalAlpha = reduceMotion ? 0.8 : 0.6 + Math.sin(Date.now() / 320) * 0.2;
    ctx.fillStyle = palette.css[SLOT.HAZARD];
    ctx.beginPath();
    ctx.moveTo(left ? ax - 7 : ax + 7, ay);
    ctx.lineTo(left ? ax + 4 : ax - 4, ay - 7);
    ctx.lineTo(left ? ax + 4 : ax - 4, ay + 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const w = font.measure(name, 1);
    font.draw(ctx, name, left ? ax + 10 : ax - 10 - w, ay - 5, SLOT.HAZARD, 1);
  }

  /* SPRINT SONU kovalayan duvar (bulunan gercek eksik: pushWallX hicbir zaman
   * cizilmiyordu — tamamen gorunmez bir tehlikeydi). On kenar govdenin
   * ilerleme yonunu (+x) gosterir; govde SOLA dogru (zaten gecilmis alana)
   * uzanir. reduceMotion'da nabiz/kayan cizgiler DURAGAN kalir (K6 cerceve +
   * golge kaymasi sinyalleri yine de duruyor). */
  function drawPushWall(ctx, x, camX, camY, hazardous) {
    const gx = Math.round(x - camX);
    const bodyW = 64;
    if (gx < -bodyW - 20 || gx > VIEW_W + 20) return;
    const glow = reduceMotion ? 0.6 : 0.55 + Math.sin(Date.now() / (hazardous ? 150 : 260)) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = palette.css[SLOT.HAZARD];
    ctx.fillRect(gx - bodyW, 0, bodyW, VIEW_H);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = palette.css[SLOT.SHADOW];
    const streakOffset = reduceMotion ? 0 : Math.floor(Date.now() / 90) % 18;
    for (let ly = 6 - streakOffset; ly < VIEW_H; ly += 18) ctx.fillRect(gx - bodyW, ly, bodyW - 8, 3);
    ctx.globalAlpha = glow;
    ctx.fillStyle = palette.css[SLOT.LIGHT];
    for (let ly = 0; ly < VIEW_H; ly += 8) ctx.fillRect(gx - 2, ly, 2, 5);
    ctx.restore();
  }

  /* SICAK KANAL: zeminin kendisi hala normal tile — buraya sadece OVERLAY
   * cizilir (bulunan gercek eksik: bolge daha once yalniz sabit bir metin
   * etiketiydi, girince aciliyor hissi hic yoktu). */
  function drawHotChannelBand(ctx, camX, camY) {
    const zones = worldData().hazards && worldData().hazards.hotChannels;
    if (!zones) return;
    ctx.save();
    ctx.fillStyle = palette.css[SLOT.HAZARD];
    for (const z of zones) {
      const gx0 = z.x0 - camX, gx1 = z.x1 - camX;
      if (gx1 < 0 || gx0 > VIEW_W) continue;
      const active = hotChannelX1 !== null && body.x >= z.x0 && body.x < z.x1;
      ctx.globalAlpha = active ? 0.22 : 0.12;
      const x0 = Math.max(0, gx0), x1 = Math.min(VIEW_W, gx1);
      ctx.fillRect(Math.round(x0), VIEW_H - 96, Math.round(x1 - x0), 96);
    }
    ctx.restore();
  }

  /* KIVILCIM YAĞMURU seridi: bolge bandi + DUSECEK sutunlarin yer isareti.
   * Isaretler dalgadan RAIN_TELEGRAPH kare once belirir ve dolar — hangi
   * sutunun bos kalacagi ezberlenecek degil OKUNACAK bir sey olsun (YOKSAY'in
   * gokten mermi telegrafiyla ayni dil, bilincli olarak ayni). */
  function drawShellRainBand(ctx, camX, camY) {
    const zones = worldData().hazards && worldData().hazards.shellRain;
    if (!zones) return;
    ctx.save();
    for (const z of zones) {
      const gx0 = z.x0 - camX, gx1 = z.x1 - camX;
      if (gx1 < 0 || gx0 > VIEW_W) continue;
      const gy = Math.round(z.groundY - camY);
      const active = rainZone === z;
      ctx.globalAlpha = active ? 0.13 : 0.07;
      ctx.fillStyle = palette.css[SLOT.HAZARD];
      const x0 = Math.max(0, gx0), x1 = Math.min(VIEW_W, gx1);
      ctx.fillRect(Math.round(x0), gy - RAIN_HEIGHT, Math.round(x1 - x0), RAIN_HEIGHT);
      if (!active) continue;
      const soon = RAIN_PERIOD - rainTimer;
      if (soon > RAIN_TELEGRAPH) continue;
      const t = 1 - soon / RAIN_TELEGRAPH;
      for (let i = 0; i < z.cols.length; i++) {
        if (!rainColumnFalls(i, rainWave)) continue;
        const rx = Math.round(z.cols[i] - camX);
        ctx.globalAlpha = 0.18 + t * 0.34;
        ctx.fillRect(rx - 3, gy - RAIN_HEIGHT, 6, RAIN_HEIGHT);
        ctx.globalAlpha = 0.5 + t * 0.4;
        ctx.fillRect(rx - 7, gy - 3, 14, 3);
      }
    }
    ctx.restore();
  }

  /* SON SINAV arenasinin IKI kapisi. Gorunmez bir duvara toslamak "oyun
   * bozuk" gibi okunur (W6'nin sag tutma alaninda zaten bir kez ogrenildi);
   * burada kapi GORUNUR: sag taraf patron dogar dogmaz, sol taraf ise ancak
   * gercekten iceri girildikten sonra (bkz. mirrorLeftArmed) tam parlaklikta
   * cizilir. */
  function drawArenaGates(ctx, camX, camY, defeated) {
    if (defeated) return;
    const gy = Math.round(x1BossGroundY - camY);
    const H = 128;
    const pulse = reduceMotion ? 0.5 : 0.42 + Math.sin(Date.now() / 340) * 0.14;
    ctx.save();
    ctx.fillStyle = palette.css[SLOT.HAZARD];
    for (let side = 0; side < 2; side++) {
      const wx = side === 0 ? x1ArenaX0 : x1ArenaX1;
      const gx = Math.round(wx - camX);
      if (gx < -14 || gx > VIEW_W + 14) continue;
      ctx.globalAlpha = (side === 0 && !mirrorLeftArmed) ? 0.16 : pulse;
      ctx.fillRect(gx - 2, gy - H, 4, H);
      for (let ly = gy - H; ly < gy; ly += 10) ctx.fillRect(gx - 5, ly, 10, 2);
    }
    ctx.restore();
  }

  function drawHotChannelCountdown(ctx, camX, camY) {
    if (hotChannelX1 === null) return;
    const w = 18;
    const gx = Math.round(body.x + body.w / 2 - camX);
    const gy = Math.round(body.y - camY) - 16;
    const pct = Math.max(0, Math.min(1, hotChannelTimer / 40));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(gx - w / 2 - 1, gy - 1, w + 2, 5);
    ctx.fillStyle = palette.css[pct <= 0.34 ? SLOT.HAZARD : SLOT.LED];
    ctx.fillRect(gx - w / 2, gy, Math.round(w * pct), 3);
    ctx.restore();
  }

  /* Commit tasi bayragi: computeBeacons()'un ayni x/y'sinde, checkpointX'e
   * gore YANIYOR/SONMUS cizilir — checkpointX'i ilerleten mantiktan (bkz.
   * updateCheckpointsAndDrains/updateW6Drains) hicbir zaman kopamaz. */
  function drawCheckpoint(ctx, bx, by, camX, camY, lit) {
    const gx = Math.round(bx - camX), gy = Math.round(by - camY);
    if (gx < -20 || gx > VIEW_W + 20) return;
    ctx.save();
    ctx.globalAlpha = lit && !reduceMotion ? 0.55 + Math.sin(Date.now() / 260) * 0.2 : (lit ? 0.75 : 0.5);
    ctx.fillStyle = palette.css[lit ? SLOT.LED : SLOT.INK_SOFT];
    ctx.fillRect(gx - 1, gy - 18, 2, 18);
    ctx.fillRect(gx, gy - 18, 8, 6);
    ctx.restore();
  }

  /* ==========================================================================
   * YETENEK KUTUSU — bulunan gercek eksik
   * ==========================================================================
   * "İleride bir yetenek kutusu var" tabelasindan sonra ekranda hicbir sey
   * gorunmuyordu (oyun testi). Dogruydu: `pipSpawns` TEK bir yerde, checkPips()
   * temas testinde kullaniliyordu — hicbir yerde CIZILMIYORDU. Yani tabela var
   * olmayan bir nesneyi isaret ediyor, pip'ler de bombos havada sessizce
   * toplaniyordu; oyuncunun "bir sey aldim" diye anlamasinin tek yolu HUD'da
   * yanan kareyi fark etmekti.
   *
   * Kutu YALNIZCA alinmamisken cizilir — kaybolmasi zaten "aldin" geri
   * bildirimidir; ustune HUD karesi yanar ve pip'in adi yazilir.
   *
   * Renk pip'in ne verdigine gore: ATEŞ ET pembe (HUD fiil yuvasi ve "shoot"
   * tabelasiyla ayni), zeminle ilgili olanlar mavi. */
  const PIP_HALF = 7;           /* kutu yari kenari — 14x14 px, bir tile'dan kucuk */
  function drawPip(ctx, p, camX, camY) {
    if (pipTaken(p)) return;
    const gx = Math.round(p.x - camX);
    if (gx < -20 || gx > VIEW_W + 20) return;
    /* Salinim kucuk (±2 px): toplama yaricapi 22 px, yani gorunen kutu ile
     * gercek temas alani hicbir zaman birbirinden kopmaz. */
    const bob = reduceMotion ? 0 : Math.round(Math.sin(Date.now() / 420) * 2);
    const gy = Math.round(p.y - camY) + bob;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette.css[p.id === "shell" ? SLOT.ACCENT : SLOT.SECONDARY];
    ctx.fillRect(gx - PIP_HALF, gy - PIP_HALF, PIP_HALF * 2, 2);
    ctx.fillRect(gx - PIP_HALF, gy + PIP_HALF - 2, PIP_HALF * 2, 2);
    ctx.fillRect(gx - PIP_HALF, gy - PIP_HALF, 2, PIP_HALF * 2);
    ctx.fillRect(gx + PIP_HALF - 2, gy - PIP_HALF, 2, PIP_HALF * 2);
    /* Nabizli cekirdek: duragan bir cerceve arkadaki tile deseninde
     * kayboluyor, hareket eden bir nokta gozu ceker. */
    ctx.globalAlpha = reduceMotion ? 0.85 : 0.55 + Math.sin(Date.now() / 200) * 0.3;
    ctx.fillStyle = palette.css[SLOT.LIGHT];
    ctx.fillRect(gx - 2, gy - 2, 4, 4);
    ctx.restore();
  }

  function drawTouchHints(ctx) {
    if (!input.touchActive) return;
    const r = input.buttonRects();
    const drawBtn = (rect, label) => {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = palette.css[SLOT.SURFACE];
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = palette.css[SLOT.INK];
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
      ctx.restore();
      font.drawCentered(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 5, SLOT.INK, 1);
    };
    drawBtn(r.jump, "A");
    drawBtn(r.verb, "B");
    drawBtn(r.ground, "C");
  }

  loop.renderOnce();

  function commitProgress() {
    const commitBounds = currentWorld === 6 ? w6Bounds : currentWorld === 7 ? epBounds : w1Bounds;
    /* Patron ilerlemesi commit grafiginde iki tas olarak sayilir: FAZ 2'ye
     * gecis ve YENILGI. (Eskiden YOKSAY'in `commitsFired` sayaci okunuyordu —
     * o sayac vurus-dizisiyle birlikte kalkti; ayni bilgi artik CAN
     * kilometre taslarindan turetilir, tek kaynak patronun kendisi.) */
    const ovCommits = currentWorld === 6 && overrideBoss
      ? (overrideBoss.isDefeated ? 2 : (overrideBoss.phase >= 2 ? 1 : 0)) : 0;
    /* AYNA UC fazli oldugu icin UC kilometre tasi sayar (faz 2, faz 3,
     * yenilgi) — commit grafigi son dovusun uzunlugunu de gostersin. */
    const mrCommits = currentWorld === 6 && mirrorBoss
      ? (mirrorBoss.isDefeated ? 3 : (mirrorBoss.phase >= 3 ? 2 : (mirrorBoss.phase >= 2 ? 1 : 0))) : 0;
    const commitExtra = currentWorld === 6 ? ovCommits + mrCommits
      : currentWorld === 1 ? ((boss && boss.isDefeated) ? 2 : (bossPhase2Committed ? 1 : 0)) : 0;
    const commitExtraTotal = currentWorld === 6 ? 5 : currentWorld === 1 ? 2 : 0;
    return {
      commits: commitBounds.filter((b) => checkpointX >= b.startX).length + commitExtra,
      commitsTotal: commitBounds.length + commitExtraTotal
    };
  }

  /* index.astro'nun monitör 3×5 (15 hucre) kafesi bit 14'u "bitti" hucresi
   * sayar (§15.19); `mstate.finished` ayrica ekran rengini de degistirir,
   * ama kafesin KENDI 15. hucresi save.pips'ten hic gelmez (o yalniz
   * 0/1/6 pip bitlerini tasir) — burada birlestirilir. */
  function monitorMask() { return (save.pips || 0) | (gameFinished ? (1 << 14) : 0); }

  function worldLabel() { return currentWorld === 0 ? "W0" : currentWorld === 1 ? "W1" : currentWorld === 6 ? "W6" : "EP"; }
  function worldPart() { return currentWorld === 0 ? 0 : currentWorld === 1 ? 1 : currentWorld === 6 ? 2 : 3; }
  function worldFullName() {
    return currentWorld === 0 ? i18n.data.worldNames.w0
      : currentWorld === 1 ? i18n.data.worldNames.w1
      : currentWorld === 6 ? i18n.data.worldNames.w6
      : i18n.data.worldNames.ep;
  }

  function persistProgress() {
    /* SÜRE MODU: `save` gecici bir kopya, diske YAZILMAZ. `suppressPersist`
     * ise kosuyu birakirken calisma zamani sifirlanirken kaydin uzerine
     * "W0, ilerleme yok" yazilmasini engeller (bkz. abortSpeedrun). */
    if (speedrun.active || suppressPersist) return;
    save.ratio = rate;
    save.world = currentWorld;
    /* bulunan gercek eksik: checkpointX/Y hicbir zaman kaydedilmiyordu, bu
     * yuzden save.world yazilsa da boot() hicbir yerde OKUMUYORDU — "devam"
     * hep W0'dan basliyordu (bkz. yukarida resume dali). */
    if (currentWorld > 0) {
      save.checkpoint = 1;
      save.checkpointX = checkpointX;
      save.checkpointY = checkpointY;
    }
    save.finished = save.finished || gameFinished;
    SaveMod.write(save);
  }

  if (typeof o.onState === "function") {
    o.onState({ mask: monitorMask(), world: currentWorld, part: worldPart(), total: 4, finished: gameFinished, debt: 0, label: worldLabel() });
  }

  const handle = {
    start() { loop.start(); audio.startDrone(); },
    pause() { pauseGame(); },
    resume() { resumeGame(); },
    /* HARITA acikken dongu KOSAR (canli secim/tiklama) ama oynanis durur —
     * launcher acisindan bu hala "duraklatilmis"tir (buton etiketi, resize
     * yolu ve DURAKLATILDI yazisi bu bayragi okur). */
    /* HARITA / SKOR TABLOSU / ISIM ekranlarinda dongu KOSAR (canli secim,
     * asenkron liste, yanip sonen imlec) ama oynanis durur — launcher
     * acisindan bu hala "duraklatilmis"tir. */
    isPaused() {
      const s = sceneManager.current;
      return loop.isPaused() || s === SCENE.MAP || s === SCENE.BOARD || s === SCENE.NAME;
    },
    resize(nextScale) {
      renderer.setScale(nextScale);
      if (!loop.isRunning()) loop.renderOnce();
    },
    setLang(next) {
      i18n.setLang(next);
      /* Etiket genisligi metne bagli: dil degisince satir duzeni de yenilenir,
       * yoksa TR icin hesaplanmis satirlar EN metinlerinde tekrar cakisirdi. */
      layoutAllLabels();
      if (!loop.isRunning()) loop.renderOnce();
    },
    setTheme(isDark) {
      dark = !!isDark;
      palette = readPalette();
      renderer.setPalette(palette);
      font.setPalette(palette);
      salih.setPalette(palette);
      creatureSprites.setPalette(palette);
      if (!loop.isRunning()) loop.renderOnce();
    },
    setReduceMotion(v) {
      reduceMotion = !!v;
      cam.setShake(!reduceMotion);
    },
    setAudio(v) { audioEnabled = !!v; audio.setEnabled(audioEnabled); if (audioEnabled) audio.startDrone(); else audio.stopDrone(); },
    getState() { return { mask: monitorMask(), world: currentWorld, part: worldPart(), total: 4, finished: gameFinished, debt: 0, label: worldLabel() }; },
    destroy() {
      destroyed = true;
      /* Yarim kalmis bir kosu kaydi BOZMAZ: persistProgress zaten susturulmus
       * durumda ve gercek kayit diskte oldugu gibi duruyor. Yine de gecici
       * kopyayi geri alip DOM kutusunu temizle. */
      closeNameEntry();
      if (speedrun.active) { speedrun.abort(); restoreSaveAfterRun(); }
      persistProgress();
      telemetry.persist();
      audio.destroy();
      loop.destroy();
      input.destroy();
      font.destroy();
      salih.destroy();
      creatureSprites.destroy();
      renderer.destroy();
    },
    debug() {
      return {
        scale: renderer.scale, lang: i18n.lang, dark, reduceMotion, audio: audioEnabled,
        paused: loop.isPaused(), destroyed, rate, scene: sceneManager.current,
        world: currentWorld, entityCount: pool.count, bossPhase: boss ? boss.phase : null,
        bodyX: body.x, bodyY: body.y, dialogueActive: sceneManager.isDialogueActive(),
        overridePattern: overrideBoss ? overrideBoss.pattern : null,
        overrideHp: overrideBoss ? overrideBoss.hp : null,
        snifferHp: boss ? boss.hp : null,
        mirrorHp: mirrorBoss ? mirrorBoss.hp : null,
        mirrorPhase: mirrorBoss ? mirrorBoss.phase : null,
        mirrorPattern: mirrorBoss ? mirrorBoss.pattern : null,
        mirrorDashing: mirrorBoss ? mirrorBoss.dashing : false,
        arenaWallCount: arenaWalls.count,
        rainActive: rainZone !== null,
        hotChannelX1, hotChannelTimer,
        runActive: speedrun.active, runFinished: speedrun.finished,
        runFrames: speedrun.frames, runMs: speedrun.ms, runResultMs, runRank,
        runSplits: speedrun.splits, boardStatus: board.status,
        saveShadowed: saveSnapshot !== null,
        mergeAvailable, mergeStarted, mergeDone, epClosing, epFinishHandled,
        gameFinished, perfTier: perf.tier, telemetry: telemetry.summary(),
        revertTimer, checkpointX, checkpointY,
        pushWallX, pushWallGrace, ghostPlaying: ghost.isPlaying, ghostGrace,
        ghostX: ghostRenderX, pips: save.pips
      };
    }
  };

  return handle;
}

export default boot;
