/* ==========================================================================
 * game/cutscene.js — SC-00 / SC-01 GERCEK TETIKLEYICILER
 * ==========================================================================
 *
 * Kaynak: docs/oyun-metinleri.md §15.1 Karar 3 (CUTSCENE: kamera durur,
 * 0,4 s basili tutarak atlanir), docs/oyun-v0-kapsam.md §6.2/§6.3 (SC-01
 * v0'da UC balon: Y/S/S). scenes.js diyalog RENDER'ini zaten yapiyor
 * (balonu cizer, basili-tut-atla'yi isler) ve boot.js zaten
 * `sceneManager.isDialogueActive()` iken fizigi donduruyor (Faz 2) — bu
 * modulun eklediği: HANGI dunya konumunda tetiklenecegi ve "bir KEZ oynar"
 * defteri (save.seen, §8.4 semasiyla ayni alan).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createCutsceneDirector } from "./cutscene.js";
 *
 *   const director = createCutsceneDirector(sceneManager, i18n, save);
 *   director.maybeTrigger(id, worldX, triggerX)  -> true ise ve save.seen[id]
 *     yoksa diyalogu baslatir, save.seen[id]=1 yazar (write save cagirani
 *     boot.js'e ait — bu modul yalniz bellek-ici save objesini isaretler)
 *   director.hasPlayed(id) -> bool
 * ========================================================================== */

export const SC_IDS = Object.freeze({ SC00: "sc00", SC01: "sc01", SC06: "sc06" });

export function createCutsceneDirector(sceneManager, i18n, save) {
  function hasPlayed(id) { return !!(save.seen && save.seen[id]); }

  function play(id, onDone) {
    const beats = i18n.data.scenes[id];
    if (!beats) return false;
    sceneManager.playDialogue(beats, onDone);
    if (!save.seen) save.seen = {};
    save.seen[id] = 1;
    return true;
  }

  /* worldX oyuncunun su anki x'i, triggerX tetik esigi. Esik gecildiyse VE
   * daha once oynamadiysa VE su an baska bir diyalog aktif degilse baslatir. */
  function maybeTrigger(id, worldX, triggerX, onDone) {
    if (hasPlayed(id)) return false;
    if (worldX < triggerX) return false;
    if (sceneManager.isDialogueActive()) return false;
    return play(id, onDone);
  }

  return { play, maybeTrigger, hasPlayed };
}

export default createCutsceneDirector;
