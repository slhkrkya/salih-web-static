/* ==========================================================================
 * game/worlds/w0.js — W0 "localhost:4200" (tepe hiz 9,75 tile/s)
 * ==========================================================================
 *
 * Kaynak: docs/oyun-v0-kapsam.md §5.2. 3 segment, toplam 232 path-tile, 61 s
 * traversal (Defter A). P0d (Derleme Cikisi) v0'da KESILDI (§5.2 not).
 *
 * ANLATI FUZYONU: SC-00'in "İn aşağı. Zemin sağlam." repliği (§6.1) burada
 * MEKANIGE baglanir — spawn hemen ardindan bir TALIMAT (cmd:"DOWN") oyuncuyu
 * asagi atlamaya yonlendirir; bu ilk itaat RATE_V0.start (9519) degerinin
 * SENARYOLU kaynagidir (kitap: "senaryolu kayip bir kez").
 *
 * ==========================================================================
 * ARAYUZ SOZLESMESI
 * ==========================================================================
 *   import { buildWorld0 } from "./worlds/w0.js";
 *   const { map, labels, spawnX, spawnY, enemySpawns, hazards, segments } = buildWorld0();
 *     hazards.pushWall : { startX, speedTilePerSec } | null — P0c Hot-Reload
 *                        Dalgasi (cezasiz, sadece iter — boot.js body.x'i
 *                        wall'in onune ASLA gecirmez, dokunulmaz)
 *     segments         : [{ id, tileCount, topSpeedTilePerSec }] telemetry.js icin
 *     exitY            : cikis noktasindaki zemin y'si (Faz 6+: boot.js'in
 *                        cizdigi cikis kapisi gorseli icin, bkz. drawExitGate)
 * ========================================================================== */

import { TILE } from "../scale.js";
import { createLevelBuilder } from "../levelbuilder.js";

export const TOP_SPEED_TILE_PER_SEC = 9.75;   /* PHYS.w0 (§8.1) turetilmis */

export function buildWorld0() {
  const lb = createLevelBuilder({ startFloorY: 8 });
  const enemySpawns = [];
  const segments = [];

  /* ---------------------------------------------------------- giris dususu */
  const sIntro = lb.pushFlat(4);
  const spawnX = (sIntro.x0 + 1) * TILE;
  const spawnY = lb.curFloorY * TILE - 20;
  enemySpawns.push({ type: "instruction", x: (sIntro.x1 - 1) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "DOWN", face: 1 } });
  lb.pushFlat(2, { gap: true });
  lb.curFloorY += 3;
  lb.pushFlat(2);

  /* ================================================= P0a — Terminal Satiri */
  const p0aStart = lb.cursor;
  lb.label(lb.cursor, "Sağa doğru koş", "Run to the right");
  lb.pushFlat(10);
  lb.pushFlat(4, { gap: true });
  lb.pushFlat(8);
  lb.pushFlat(4, { gap: true });
  lb.pushFlat(8);
  lb.pushFlat(4, { gap: true });
  lb.pushFlat(8);
  lb.pushFlat(4, { gap: true });
  lb.label(lb.cursor, "Zıplamak için BOŞLUK — basılı tutarsan yükselirsin", "Press SPACE to jump — hold it to go higher");
  lb.pushFlat(30);
  segments.push({ id: "p0a", tileCount: lb.cursor - p0aStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= P0b — İlk Telegraf */
  const p0bStart = lb.cursor;
  lb.label(lb.cursor, "Bu tabelalar emir verir. Uymak zorunda değilsin", "These signs give orders. You do not have to obey");
  const sIns1 = lb.pushFlat(14);
  enemySpawns.push({ type: "instruction", x: (sIns1.x0 + 10) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "STOP", face: 1 } });
  lb.pushFlat(4, { gap: true });
  lb.label(lb.cursor, "Düşersen ceza yok, son kayıttan devam edersin", "Falling costs nothing, you restart at the last save");
  lb.pushFlat(16);
  const sIns2 = lb.pushFlat(14);
  enemySpawns.push({ type: "instruction", x: (sIns2.x0 + 10) * TILE, y: lb.curFloorY * TILE - 4, opts: { cmd: "STOP", face: -1 } });
  lb.label(lb.cursor, "Emre uyarsan üstteki çubuk yükselir. Yükselmesin", "Obey and the top bar rises. Keep it low");
  lb.pushFlat(14);
  segments.push({ id: "p0b", tileCount: lb.cursor - p0bStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* ================================================= P0c — Hot-Reload Dalgasi */
  const p0cStart = lb.cursor;
  const pushWallStartX = lb.cursor * TILE;
  lb.label(lb.cursor, "Arkandan bir duvar geliyor. Durma, koş", "A wall is coming up behind you. Keep running", "hazard");
  lb.pushFlat(20);
  lb.pushFlat(4, { gap: true });
  lb.pushFlat(16);
  lb.pushFlat(4, { gap: true });
  lb.pushFlat(16);
  lb.pushFlat(4, { gap: true });
  lb.pushFlat(26);
  segments.push({ id: "p0c", tileCount: lb.cursor - p0cStart, topSpeedTilePerSec: TOP_SPEED_TILE_PER_SEC });

  /* bulunan gercek hata: exitX harita genisliginin (build() sonrasi cursor)
   * TAM SINIRINA oturuyordu (EP'nin finishX'inde daha once bulunanla ayni
   * hata sinifi) — kamera max clamp'te iken kapi TAM ekran kenarinda
   * merkezleniyor, direklerinin yarisi ve "ÇIKIŞ" etiketi canvas disina
   * tasip kirpiliyordu. exitX'i ONCE yakala, SONRA tampon ekle. */
  const exitX = lb.cursor * TILE;
  const exitY = lb.curFloorY * TILE;
  lb.pushFlat(10);

  const { map, labels } = lb.build();

  return {
    map, labels, spawnX, spawnY, enemySpawns,
    hazards: {
      /* Cezasiz: temas hasar/revert URETMEZ, yalniz body.x'i wall'in onune iter.
       * boot.js her karede: if (body.x < wallX) body.x = wallX (wall sabit
       * hizla ilerler, oyuncu geride kalirsa iter — asla oldurmez). */
      pushWall: { startX: pushWallStartX, speedTilePerSec: TOP_SPEED_TILE_PER_SEC * 0.55 }
    },
    segments,
    exitX,
    exitY
  };
}

export default buildWorld0;
