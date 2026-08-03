/* ==========================================================================
 * game/ghost.js — REGRESYON: kayit + tekrar oynatma (deterministik hayalet)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-tasarim.md (§3.3 "REGRESYON, bir onceki dunyanin fizik
 * sabitleriyle kosan deterministik bir hayalet"), docs/oyun-v0-kapsam.md
 * §5.3 F1 ("REGRESYON hayalet yarışı, W0 sabitleri, 2,60 px/f") ve §2.4
 * ("240 karelik konum bandı" — Faz 5'in MERGE'i icin ayrilan, burada
 * SIFIR ek maliyetle kuruluyor ama TUKETILMIYOR).
 *
 * TASARIM KARARI (rapor icin acikca isaretli): hayalet MUTLAK piksel degil
 * SPAWN'A GORE YER DEGISTIRME (displacement) kaydeder. Boylece W0'da
 * kaydedilen kosu, W1'in FARKLI geometrisinde F1 girisinden baslayarak
 * yeniden oynatilabilir — "ayni HIZ DESENI, yeni zemin". Y konumu kayittan
 * DEGIL, cagiranin (boot.js) o anki haritada zemin araştırmasından gelir
 * (farkli dunyalarin farkli yukseklik profillerine dogal oturur).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createGhost } from "./ghost.js";
 *
 *   const ghost = createGhost();
 *   ghost.startRecording(originX)      -> yeni kayit, x=originX referans alinir
 *   ghost.record(x, facing)            -> HER fixed update'te (kayit acikken)
 *   ghost.stopRecording()
 *   ghost.recordedFrames               -> kac kare kaydedildi
 *
 *   ghost.startPlayback()              -> okuma imlecini basa sarar
 *   ghost.tick()                       -> imleci 1 kare ilerletir
 *   ghost.displacementAt(frame)        -> orijin'e gore x farki (px) | null (bittiyse)
 *   ghost.isPlaybackDone
 *   ghost.facingNow                    -> son okunan kare'nin yonu
 *
 *   ghost.pushBand(x, y, poseId)       -> HER fixed update'te (Faz 5 MERGE icin,
 *                                         240 kare dairesel — bu fazda tuketilmiyor)
 *   ghost.getBand()                    -> Float32Array kopyasi degil, {x,y,pose} view'lari
 *   ghost.reset()
 * ========================================================================== */

const MAX_RECORD_FRAMES = 5400;   /* 90 s @ 60fps — W0'in 61 s tasarim hedefinin cok ustunde */
const BAND_SIZE = 240;

export function createGhost() {
  const relX = new Float32Array(MAX_RECORD_FRAMES);
  const facing = new Int8Array(MAX_RECORD_FRAMES);
  let recordLen = 0;
  let recording = false;
  let originX = 0;

  let playIndex = 0;
  let playing = false;

  const bandX = new Float32Array(BAND_SIZE);
  const bandY = new Float32Array(BAND_SIZE);
  const bandPose = new Uint8Array(BAND_SIZE);
  let bandHead = 0;
  let bandFilled = 0;

  function startRecording(startX) {
    recording = true;
    recordLen = 0;
    originX = startX;
  }

  function record(x, f) {
    if (!recording || recordLen >= MAX_RECORD_FRAMES) return;
    relX[recordLen] = x - originX;
    facing[recordLen] = f || 1;
    recordLen++;
  }

  function stopRecording() { recording = false; }

  function startPlayback() { playIndex = 0; playing = recordLen > 0; }

  function tick() {
    if (!playing) return;
    playIndex++;
    if (playIndex >= recordLen) playing = false;
  }

  function displacementAt(frame) {
    const i = frame === undefined ? playIndex : frame;
    if (i < 0 || i >= recordLen) return null;
    return relX[i];
  }

  function pushBand(x, y, poseId) {
    bandX[bandHead] = x; bandY[bandHead] = y; bandPose[bandHead] = poseId || 0;
    bandHead = (bandHead + 1) % BAND_SIZE;
    if (bandFilled < BAND_SIZE) bandFilled++;
  }

  function getBand() {
    const out = [];
    for (let k = 0; k < bandFilled; k++) {
      const i = (bandHead - bandFilled + k + BAND_SIZE) % BAND_SIZE;
      out.push({ x: bandX[i], y: bandY[i], pose: bandPose[i] });
    }
    return out;
  }

  function reset() {
    recordLen = 0; recording = false; originX = 0;
    playIndex = 0; playing = false;
    bandHead = 0; bandFilled = 0;
  }

  return {
    startRecording, record, stopRecording,
    startPlayback, tick, displacementAt,
    pushBand, getBand, reset,
    get recordedFrames() { return recordLen; },
    get isRecording() { return recording; },
    get isPlaying() { return playing; },
    get isPlaybackDone() { return !playing && playIndex > 0; },
    get facingNow() { return (playIndex < recordLen) ? facing[playIndex] : 1; }
  };
}

export default createGhost;
