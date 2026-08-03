/* ==========================================================================
 * game/a11y.js — PERIYODIK ANONS + DENGELI MOD KABLOLAMASI (Faz 6)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §7.6, docs/oyun-metinleri.md §15.14 (A1/A2).
 * launcher.js zaten `#a11y-announcer`'i inert'lemez, canvas'i aria-hidden
 * yapar, odak tuzagi + 3 gerçek DOM butonu kurar, `reduceMotion()` okur —
 * hepsi DEGISMEZ (Faz 0). Bu modulun eklemesi SADECE:
 *   (1) A1'in "≤2 saniyede bir" periyodik durum anonsu (hic kurulu degildi),
 *   (2) A2'nin TITLE'da BIR KEZ gosterilen azaltilmis-hareket notu,
 *   (3) `save.settings.balanced`in gercek bir sayisal etkiye baglanmasi.
 *
 * SADELESTIRME (rapor icin acikca isaretli): Dengeli Mod'un "yalan karo
 * golge-kaymasi 2->3px" maddesi UYGULANMADI — render.js'in dondurulmus
 * karo-cizim yolunu (§11 frozen contract) tek bir 1px fark icin degistirmek
 * riske deger bulunmadi; speedTier tavani (2.20->1.60) v0'da zaten HIC
 * BAGLANMAZ (kitabin kendi notu, en yuksek tier 1.55 > 1.60 degil). Tek
 * somut sayisal etki: YOKSAY'in telegraf suresi (36->54, kisa varyanti
 * 30->45, orantili).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createA11yAnnouncer, BALANCED_TELEGRAPH } from "./a11y.js";
 *
 *   const a11y = createA11yAnnouncer(bridge, i18n);
 *   a11y.tick({ world, rate, checkpoint })  -> her sabit update'te cagir;
 *     kendi ic sayaci ≤2s'de bir bridge.announce() cagirir (A1)
 *   a11y.reset()
 *
 *   BALANCED_TELEGRAPH(baseFrames, balanced) -> dengeli modda 36->54 orantisiyla
 *     olceklenmis kare sayisi (balanced=false ise baseFrames aynen doner)
 * ========================================================================== */

const ANNOUNCE_INTERVAL_FRAMES = 118;   /* < 2 s @ 60fps (§7.6 "≤2 saniyede bir") */
const BALANCED_SCALE = 54 / 36;         /* §7.6: telegraf 36 -> 54 kare */

export function createA11yAnnouncer(bridge, i18n) {
  let timer = ANNOUNCE_INTERVAL_FRAMES;   /* ilk anons hemen olsun */
  let toggle = false;

  function tick(state) {
    timer++;
    if (timer < ANNOUNCE_INTERVAL_FRAMES) return;
    timer = 0;
    if (!bridge || typeof bridge.announce !== "function") return;
    const text = String(i18n.t("a11y.a1"))
      .replace("{w}", state.world)
      .replace("{r}", ((state.rate || 0) / 100).toFixed(0))
      .replace("{c}", state.checkpoint);
    /* Ayni metin ust uste yazilirsa bazi ekran okuyucular yeni bir
     * mutasyon algilamaz (tekrar OKUNMAZ). Gorunmez bir isaretci
     * (sifir-genislikli bosluk) her cagrida DEGISTIRILEREK gercek bir
     * DOM mutasyonu garanti edilir — metnin kendisi degismez. */
    toggle = !toggle;
    bridge.announce(text + (toggle ? "​" : ""));
  }

  function reset() { timer = ANNOUNCE_INTERVAL_FRAMES; toggle = false; }

  return { tick, reset };
}

export function balancedTelegraph(baseFrames, balanced) {
  return balanced ? Math.round(baseFrames * BALANCED_SCALE) : baseFrames;
}

export default { createA11yAnnouncer, balancedTelegraph };
