/* ==========================================================================
 * game/particles.js — RING BUFFER PARCACIK SISTEMI
 * ==========================================================================
 *
 * Kaynak: docs/oyun-tasarim.md §10.5 (frame butcesi: parcacik <=192, perf
 * governor 192->72). Sabit kapasiteli ring buffer — update dongusunde
 * allocation YOK (SoA, indeks yaziminin uzerine yazar).
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { createParticles } from "./particles.js";
 *
 *   const fx = createParticles(192);
 *   fx.setCap(72)                 -> perf.js governor kisilinca
 *   fx.emit(x, y, vx, vy, life, slot, size) -> void (dolu ise en eskinin uzerine yazar)
 *   fx.burst(x, y, n, slot)       -> n adet rastgele yonlu parcacik (revert/landing)
 *   fx.update(dt)                 -> pozisyon + omur, yer cekimi hafif
 *   fx.draw(ctx, camX, camY, palette) -> void
 *   fx.reset()
 * ========================================================================== */

export function createParticles(capacity) {
  const CAP = capacity || 192;
  let cap = CAP;

  const x = new Float32Array(CAP), y = new Float32Array(CAP);
  const vx = new Float32Array(CAP), vy = new Float32Array(CAP);
  const life = new Float32Array(CAP), maxLife = new Float32Array(CAP);
  const slot = new Uint8Array(CAP), size = new Uint8Array(CAP);
  const alive = new Uint8Array(CAP);

  let cursor = 0;   /* dairesel yazma ucu — dolu ise en eskinin uzerine yazilir */

  function setCap(n) { cap = Math.max(1, Math.min(CAP, n | 0)); }

  function emit(px, py, pvx, pvy, plife, pslot, psize) {
    const i = cursor;
    cursor = (cursor + 1) % cap;
    x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
    life[i] = plife; maxLife[i] = plife;
    slot[i] = pslot; size[i] = psize || 1;
    alive[i] = 1;
  }

  function burst(px, py, n, pslot) {
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 0.6 + Math.random() * 1.2;
      emit(px, py, Math.cos(ang) * spd, Math.sin(ang) * spd - 0.6, 18 + (Math.random() * 10) | 0, pslot, 1);
    }
  }

  function update() {
    for (let i = 0; i < cap; i++) {
      if (!alive[i]) continue;
      life[i]--;
      if (life[i] <= 0) { alive[i] = 0; continue; }
      x[i] += vx[i];
      y[i] += vy[i];
      vy[i] += 0.04;   /* hafif yercekimi, sabit takdir */
    }
  }

  function draw(ctx, camX, camY, palette) {
    for (let i = 0; i < cap; i++) {
      if (!alive[i]) continue;
      const t = life[i] / maxLife[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, t));
      ctx.fillStyle = palette.css[slot[i]];
      const s = size[i];
      ctx.fillRect(Math.round(x[i] - camX - s * 0.5), Math.round(y[i] - camY - s * 0.5), s, s);
    }
    ctx.globalAlpha = 1;
  }

  function reset() { alive.fill(0); cursor = 0; }

  return { emit, burst, update, draw, reset, setCap };
}

export default createParticles;
