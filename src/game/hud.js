/* ==========================================================================
 * game/hud.js — IKNA BARI + SABIT FIIL YUVASI + COMMIT GRAFIGI + PIP SIRASI
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §3 (rate), §7.1-§7.3 (fiil yuvasi, pip).
 * Borç rozeti `if (debt > 0)` dalıyla çizilir (§6.4) — v0'da debt hep 0,
 * yol asla çalışmaz ama kod v1 geçişini no-op yapar.
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createHud } from "./hud.js";
 *
 *   const hud = createHud(font, i18n);
 *   hud.draw(ctx, {
 *     rate,            // int, rate.js birimi (9519 = %95,19)
 *     verbActive,       // VERB.NONE|REWRITE|SHOOT (verbs.js)
 *     verbKey,          // ATEŞ ET tusu, aktif girdi kaynagina gore ("J" / "B")
 *     groundKey,        // ZEMİN YAP tusu ("Q" / "C")
 *     groundUnlocked, shootUnlocked,
 *     verbMeter, verbMeterMax,   // ZEMİN YAP metresi
 *     fireCooldown, fireCooldownMax,  // ATEŞ ET beklemesi
 *     fireHeat, fireHeatMax,    // ATEŞ ET isi metresi
 *     jammed,                  // ATEŞ ET tavana vurup TUTUKLUK yapti mi
 *     verbFlash, groundFlash,   // >0 ise "sonucsuz basis" cercevesi
 *     rateBump,         // null | {frames, amount} — orandaki son degisim
 *     commits, commitsTotal,     // n/24
 *     pips,             // 12 bit bitmask, save.PIP_BIT sirasi
 *     pipFlash,         // null | {index, frames, name} — yeni acilan pip vurgusu
 *     runMs,            // null | ms — SÜRE MODU kronometresi (yalniz kosu varken)
 *     debt              // 0-3, v0'da hep 0
 *   });
 * ========================================================================== */

import { VIEW_W } from "./scale.js";
import { formatTime } from "./speedrun.js";

const SLOT_INK = 0, SLOT_BG = 1, SLOT_SURFACE = 2, SLOT_SURFACE_SOFT = 3,
      SLOT_INK_SOFT = 4, SLOT_ACCENT = 5, SLOT_SECONDARY = 6, SLOT_LED = 7,
      SLOT_SHADOW = 10, SLOT_HAZARD = 14, SLOT_LIGHT = 11;

const PIP_ORDER = ["rewrite", "shell", "split", "seal", "hook", "prefilter",
                   "trail", "anchor", "second", "fork", "remote", "topk"];

export function createHud(font, i18n) {

  function drawRateBar(ctx, rate, floor, bump) {
    const x = 6, y = 4, w = 120, h = 7;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    /* Arka plani etiket+ok siraSini da kapsayacak SEKILDE genislet — acik
     * temada bu satirlar sayfanin kendi (acik) zeminine dogrudan oturuyordu
     * ve SLOT_LIGHT metin/ok orada neredeyse okunmaz kaliyordu. */
    ctx.fillRect(x - 1, y - 1, w + 2, h + 15);
    /* Yuzde: rate 100'de-bir tamsayi -> 0..100 araligina olcekle (baslangic 9519 -> %95). */
    const pct = rate / 100;
    const filled = Math.round((Math.min(pct, 100) / 100) * w);
    ctx.fillStyle = "#3a3f5c";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pct > 50 ? "#ff3e7a" : (pct > 10 ? "#e8b786" : "#38e27c");
    ctx.fillRect(x, y, filled, h);

    /* Hedef centigi: bu dunyanin taban esigi (RATE_V0.floor.*) — "ne kadar
     * kaldi" ham yuzdeden daha acik okunur. Metafor DEGISMEDI (yine dolu =
     * kotu), sadece hedef gorunur kilindi. */
    if (floor !== undefined && floor !== null) {
      const floorPct = Math.max(0, Math.min(100, floor / 100));
      const fx = x + Math.round((floorPct / 100) * w);
      ctx.fillStyle = "#fdf3e9";
      ctx.fillRect(fx, y - 2, 1, h + 4);
    }

    /* "Asagisi iyi" ipucu: etiketten once kucuk asagi-ok — renk tek basina
     * yon anlami tasimasin (K6). */
    ctx.fillStyle = "#fdf3e9";
    ctx.beginPath();
    ctx.moveTo(x, y + h + 4);
    ctx.lineTo(x + 5, y + h + 4);
    ctx.lineTo(x + 2.5, y + h + 8);
    ctx.closePath();
    ctx.fill();

    const label = i18n.lex("rate") + " " + (pct % 1 === 0 ? pct : pct.toFixed(0)) + "%";
    if (font) font.draw(ctx, label, x + 8, y + h + 3, SLOT_LIGHT, 1);

    /* bulunan gercek eksik: oyunun TEK kaynagi olan bu cubuk sessizce
     * hareket ediyordu — bir emre uyunca yukseliyor, bir seride girince
     * dusuyor ama ekranda SEBEP de MIKTAR da gorunmuyordu. Artik degisim
     * anında yaninda isaretli miktar belirir: kirmizi + (kotu), yesil -
     * (iyi). Kisa omurlu, HUD'u kalici olarak kalabaliklastirmaz. */
    if (bump && bump.frames > 0 && bump.amount !== 0) {
      const up = bump.amount > 0;
      const shown = Math.max(1, Math.round(Math.abs(bump.amount) / 100));
      const txt = (up ? "+" : "-") + shown + "%";
      const bx = x + w + 6;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(bx - 2, y - 1, font ? font.measure(txt, 1) + 4 : 30, 11);
      if (font) font.draw(ctx, txt, bx, y, up ? SLOT_HAZARD : SLOT_LED, 1);
      /* Cubugun kendisi de ayni renkte cerceve alir — goz nereye bakacagini bilsin. */
      ctx.strokeStyle = up ? "#ff3e7a" : "#38e27c";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    }
  }

  /* bulunan gercek eksik: yuva yetenegin ADINI yaziyordu ama HANGI TUSLA
   * kullanildigini hicbir yerde soylemiyordu (raporlandi). Ad + tus birlikte
   * sigsin diye yuva 74 -> 108 px genisletildi (sag kenar payi ayni kaldi;
   * ortadaki yetenek sirasi 311 px'de bitiyor, cakisma yok). */
  /* IKI AYRI YETENEK = IKI AYRI SATIR. Tek satirli yuva, tek butonlu tasarimin
   * kalintisiydi: iki yetenek bir tusu paylasirken hangisinin aktif oldugunu
   * gostermeye calisiyordu. Tuslar ayrildi (Q / J), yuva da ayrildi — oyuncu
   * hangi yetenegin hangi tusta oldugunu ve hazir olup olmadigini bir bakista
   * gorur. */
  function abilityRow(ctx, x, y, w, h, o) {
    ctx.fillStyle = "#212a52";
    ctx.fillRect(x, y, w, h);

    /* TUTUKLUK: K6 (renk tek basina anlam tasimaz) — burada UC isaret:
     * (1) renk (HAZARD), (2) golge-ofset kopya etiket, (3) kesikli cerceve
     * (asagida). "Sonucsuz basis" flasinin DUZ cercevesiyle karismasin diye
     * TUTUKLUK cercevesi kasitli olarak kesikli cizilir. */
    const jammed = !!o.jammed;
    const label = jammed ? o.jammedName
      : o.unlocked ? (o.key ? o.name + " (" + o.key + ")" : o.name) : "—";
    if (font) {
      if (jammed) font.drawCentered(ctx, label, x + w / 2 + 1, y + 2, SLOT_SHADOW, 1);
      font.drawCentered(ctx, label, x + w / 2, y + 1, jammed ? SLOT_HAZARD : (o.unlocked ? SLOT_LIGHT : SLOT_INK_SOFT), 1);
    }

    if (o.unlocked && o.segments > 0) {          /* ZEMİN YAP metresi */
      const segW = (w - 8) / o.segments;
      for (let i = 0; i < o.segments; i++) {
        ctx.fillStyle = i < o.filled ? "#58c4ff" : "#3a3f5c";
        ctx.fillRect(x + 4 + i * segW, y + h - 4, segW - 2, 3);
      }
    } else if (o.unlocked && o.heatMax > 0) {
      /* ATEŞ ET: bu cubuk artik "hazir mi" degil ISI SEVIYESI gosterir —
       * atislar arasi bekleme (12 kare) goze okunamayacak kadar kisa ama
       * ISI'nin birikip TUTUKLUGA goturmesi gercek bir karar noktasidir. */
      const pct = Math.min(1, o.heat / o.heatMax);
      ctx.fillStyle = "#3a3f5c";
      ctx.fillRect(x + 4, y + h - 4, w - 8, 3);
      ctx.fillStyle = jammed ? "#ff3e7a" : (pct > 0.7 ? "#e8b786" : "#58c4ff");
      ctx.fillRect(x + 4, y + h - 4, Math.round((w - 8) * pct), 3);
    } else if (o.unlocked && o.cooldownMax > 0) {
      /* ATEŞ ET: cubuk DOLARAK hazir oldugunu soyler. Bosalan bir cubuk
       * "kaynagim bitiyor" gibi okunuyordu; burada dogru okuma "tekrar
       * atabilir miyim" — dolu = evet. */
      const ready = 1 - o.cooldown / o.cooldownMax;
      ctx.fillStyle = "#3a3f5c";
      ctx.fillRect(x + 4, y + h - 4, w - 8, 3);
      ctx.fillStyle = o.cooldown > 0 ? "#e8b786" : "#38e27c";
      ctx.fillRect(x + 4, y + h - 4, Math.round((w - 8) * ready), 3);
    }

    if (jammed) {
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "#ff3e7a";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.restore();
    } else if (o.flash > 0) {                    /* sonucsuz basis */
      ctx.strokeStyle = "#ff3e7a";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }

  /* Iki yetenek = iki satir; her satirda ADI, TUSU ve hazir olup olmadigi.
   * ATEŞ ET ustte durur: dovusun ana fiili odur, goz once oraya dussun. */
  function drawVerbSlot(ctx, s) {
    const w = 116, rowH = 15, x = VIEW_W - w - 6, y = 4;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - 1, y - 1, w + 2, rowH * 2 + 4);

    abilityRow(ctx, x, y, w, rowH, {
      name: i18n.lex("verb.shoot"), jammedName: i18n.lex("jammed"),
      key: s.verbKey, unlocked: s.shootUnlocked,
      cooldown: s.fireCooldown, cooldownMax: s.fireCooldownMax, flash: s.verbFlash,
      heat: s.fireHeat, heatMax: s.fireHeatMax, jammed: s.jammed
    });
    abilityRow(ctx, x, y + rowH + 2, w, rowH, {
      name: i18n.lex("verb.rewrite"), key: s.groundKey, unlocked: s.groundUnlocked,
      segments: s.verbMeterMax, filled: s.verbMeter, flash: s.groundFlash
    });
  }

  function drawCommitGraph(ctx, commits, total) {
    const x = 6, y = 30, r = 3, gap = 5;
    for (let i = 0; i < total; i++) {
      ctx.fillStyle = i < commits ? "#58c4ff" : "#3a3f5c";
      ctx.beginPath();
      ctx.arc(x + i * gap + r, y + r, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* bulunan gercek okunabilirlik hatasi: 12 kareli bu sira ETIKETSIZDI ve
   * ekranin TAM USTUNDE, ardisik bir seride duruyordu — oyuncular bunu
   * "geçilen bölümler" cubugu sanip, W1 ortasinda 7. karenin (301 İZİ, bit 6)
   * yesile donmesini "rastgele bir bölüm yandi" diye okuyordu. Iki ek:
   *   1) altina "PİP n/12" etiketi — sira artik bir ILERLEME cubugu degil,
   *      adi konmus bir YETENEK izgarasi olarak okunur;
   *   2) yeni acilan pip 2 saniye boyunca cerceveyle ISARETLENIR ve etiket
   *      yerine o pip'in ADI yazilir — hangi karenin neden yandigi belli olur.
   * Bit sirasi (save.js PIP_BIT) DEGISMEDI: kayit semasi dondurulmus. */
  function drawPipRow(ctx, pipsMask, flash) {
    const w = 10, gap = 2, total = 12;
    const totalW = total * w + (total - 1) * gap;
    const x0 = Math.round((VIEW_W - totalW) / 2), y = 4;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x0 - 5, y - 3, totalW + 10, w + 17);

    let count = 0;
    for (let i = 0; i < total; i++) {
      const x = x0 + i * (w + gap);
      const unlocked = !!(pipsMask & (1 << i));
      if (unlocked) {
        count++;
        ctx.fillStyle = "#38e27c";
        ctx.fillRect(x, y, w, w);
      } else {
        ctx.strokeStyle = "#5f574f";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
      }
    }

    const flashing = !!(flash && flash.frames > 0 && flash.index >= 0);
    if (flashing) {
      const fx = x0 + flash.index * (w + gap);
      ctx.strokeStyle = "#fdf3e9";
      ctx.lineWidth = 1;
      ctx.strokeRect(fx - 2.5, y - 2.5, w + 5, w + 5);
    }
    if (!font) return;
    const label = flashing && flash.name ? flash.name
      : i18n.lex("pips") + " " + count + "/" + total;
    font.drawCentered(ctx, label, VIEW_W / 2, y + w + 2, flashing ? SLOT_LED : SLOT_INK_SOFT, 1);
  }

  /* SÜRE MODU kronometresi. Pip sirasinin HEMEN ALTINDA, ortada ve 2x boyutta:
   * bu moddaki oyuncunun en cok baktigi sayi budur, HUD'un kenarina sikismasi
   * anlamsiz olurdu. Yalnizca kosu aktifken cizilir — normal oyunda HUD
   * degismez. */
  function drawRunTimer(ctx, ms) {
    if (ms === null || ms === undefined) return;
    const label = formatTime(ms);
    const w = font ? font.measure(label, 2) : 0;
    const x = Math.round((VIEW_W - w) / 2), y = 30;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x - 5, y - 3, w + 10, 22);
    if (font) font.draw(ctx, label, x, y, SLOT_ACCENT, 2);
  }

  function drawDebtBadge(ctx, debt) {
    if (debt <= 0) return;
    const x = VIEW_W - 16, y = 28;
    ctx.fillStyle = "#ff3e7a";
    ctx.fillRect(x, y, 8, 8);
    if (font) font.draw(ctx, String(debt), x + 10, y - 1, SLOT_LIGHT, 1);
  }

  function draw(ctx, state) {
    drawRateBar(ctx, state.rate, state.floor, state.rateBump);
    drawVerbSlot(ctx, state);
    drawCommitGraph(ctx, state.commits, state.commitsTotal);
    drawPipRow(ctx, state.pips, state.pipFlash);
    drawRunTimer(ctx, state.runMs);
    drawDebtBadge(ctx, state.debt || 0);
  }

  return { draw, PIP_ORDER };
}

export default createHud;
