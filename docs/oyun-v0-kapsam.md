# YOKSAY / OVERRIDE — v0 KAPSAM KESİMİ

*Tasarım kitabı (`docs/oyun-tasarim.md` v2.0) ve metin dosyası (`docs/oyun-metinleri.md`) geçerli tek doğruluk kaynağıdır. Bu belge onların **v0 alt kümesini** tanımlar. Bu belge ile kitap çelişirse: ölçek/fizik/sprite/kare bütçesi konularında **kitap** kazanır; kapsam, süre, ikna aritmetiği ve iş günü konularında **bu belge** kazanır. Kitapta düzeltilmesi gereken maddeler §12'de ayrı listelenmiştir.*

Kaynak doğrulaması: `src/game/scale.js` (12 satır, dondurulmuş), `src/game/launcher.js` (~580 satır, Faz 0 tamam), `src/game/boot.js` satır 9-51 (arayüz sözleşmesi, değişmez), `docs/oyun-tasarim.md` §3-§13, `docs/oyun-metinleri.md` §15.1-§15.19.

---

## 0. v0 DONDURULMUŞ KARARLAR

| Karar | Değer | Kaynak |
|---|---|---|
| **Hedef süre** | Medyan **7:47** duvar saati · Defter A **6:33** saf içerik | §5 bu belge |
| **İçerik** | W0 prolog + W1 tam + KOKLAYICI + W6-lite + YOKSAY Faz 1 + MERGE + EP | verilen kesim |
| **Aşama sayısı** | **4** (W0, W1, W6-lite, EP). W2-W5 kesildi | verilen kesim |
| **Fiil sayısı** | **3** — YENİDEN YAZ, KABUK, MERGE. PARÇALA/MÜHÜR/KANCA/ÖN-FİLTRE v0 dışı | verilen kesim |
| **Düşman türü** | **4** — TALİMAT, BORU AĞZI, DÜĞÜM, ZİL (§4) | verilen kesim |
| **Boss** | **2** — KOKLAYICI (45 s, 2 faz), YOKSAY (35 s, 1 faz) + MERGE | verilen kesim |
| **Özgün gimmick** | **1** — G1: tek yön token borusu + kaygan GUID karosu | türetildi |
| **Özgün chunk** | **18** (kapasite 54 instance, gereken 40, %26 pay) | §5.6 |
| **Toplam zorunlu tile** | **1.583** path-tile | §5 |
| **Prose satırı** | **55** × 2 dil = 110 string (kitapta 84) | §6.5 |
| **Pip** | **3** açılabilir (YENİDEN YAZ, KABUK, 301 İZİ) + 9 kilitli silüet | §7.3 |
| **Devir borcu** | **Yok.** N2/N4/N5 kapıları kesildi; `debt` alanı şemada kalır, daima 0 | §6.4 |
| **Hız merdiveni** | 1,00 → 1,15 → 1,35 → 1,55 (kitabın W0/W1/W2/W3 satırları **aynen**) | §5.1 |
| **Mario/Sonic** | **%75 / %25** (kitabın %60/%40'ı v0'da tutulmaz — açıkça kabul edilir) | §5.1 |
| **İKNA yolu** | 9519 → 5200 → 300 → **48** (3 aşama) | §3 |
| **Kabuk** | **TAM** — TITLE/PAUSE/MAP/END/RESET/ROTATE, kayıt, TR/EN, prosedürel ses, commit taşı/revert | verilen kesim |
| **Ölçek, fizik, sprite şeması, kare bütçesi** | Kitaptan **aynen**. Tek satır değişmez | verilen kesim |
| **Kod + veri** | **8.057 kod + 1.285 veri = 9.342 satır**, **897'si diskte** | §10 |
| **Kalan iş günü** | **48** (Faz 0'ın 5 günü harcandı) | §10.3 |

**Bu belgenin yazmadığı şey:** kod. Hiçbir dosyaya dokunulmadı; `boot.js`, `launcher.js`, `index.astro`, `scale.js` okundu, değiştirilmedi.

---

## 1. Kesim mantığı — neyin ucuz neyin pahalı olduğu

Kitabın kendi bulgusu (§13): *"Özgün dünya kuralı pahalıdır (kod), içerik hacmi ucuzdur (ASCII veri)."* v0 bu cümleyi sonuna kadar uygular ve bir ikinci bulgu ekler:

> **Kabuk tabandır.** 45 dakikayı 8 dakikaya indirmek ~3.400 satır **içerik** kodunu siler, ama ~5.000 satırlık **kabuk** (input, physics, render, font, screens, save, audio, a11y, touch) neredeyse hiç sıkışmaz. v0'ın maliyeti içerikten değil kabuktan gelir ve bu kabuk v1'e olduğu gibi devredilir.

Üç kesim kuralı, sırayla uygulandı:

| # | Kural | Sonuç |
|---|---|---|
| **KK1** | Bir setpiece **yeni sistem** (fiil, gimmick, hareketli platform türü, düşman durum makinesi) istiyorsa v0 dışı | W2-W5'in 11 setpiece'i düştü |
| **KK2** | Bir setpiece **yalnız geometri + var olan tile sınıfları** ile kuruluyorsa v0'a taşınır | 5 setpiece W1'e, 1 setpiece W6'ya taşındı (§2) |
| **KK3** | Kabuk ekranı, kayıt alanı veya erişilebilirlik yolu **asla** kesilmez; yalnız içeriği azalır | 6 ekran, kayıt şeması v1-uyumlu, portre kapısı tam |

---

## 2. Kesilen dünyaların setpiece'leri — somut taşıma listesi

Kitap §5.2 kesilen **beş** dünyanın setpiece'lerini W1-W6'ya taşımıştı. v0 W2-W5'i de kestiği için o taşımalar ikinci kez triyaja girer.

### 2.1 TAŞINANLAR (6 kalem)

| # | Kaynak | Setpiece | v0'daki yeri | Ne gerektiriyor | Neden ucuz |
|---|---|---|---|---|---|
| T1 | W2 A2 | **Toplu SMS yağmuru** — tek büyük telegraflı yağmur, tepe 4,5 glif/10 s, 9 kabuk zamanlaması | **W1 E1** | ZİL (4 türden biri) + KABUK (v0 fiili) | KABUK'un in-situ öğretme sahnesi zaten bu yağmurdur; ayrı öğretme odası açılmaz (§4.8 D5 kuralı) |
| T2 | W2 D2 | **20.000 gri sakin donmuş hol** — sayaç tırmanır | **W1 E1 ikinci yarısı** (dekor + sayaç), ödeme **EP C7**'de | `C` tile sınıfı + 1 PROC sprite + 1 sayaç | Temas yok, kurtarılabilir nesne. PARÇALA'lı "6 kolon bölme" **taşınmadı** |
| T3 | W2 E2 | **Hangfire dikey kulesi** — 12 kat dikey tırmanış | **W1 D1 ikinci yarısı**, 6 kata kısaltıldı | Saf geometri + `vertical-climb` kamera modu | v0'ın tek COLUMN ailesi örneği; onsuz W1 dikey ifadeden yoksun kalır |
| T4 | W3 C3 | **Tozlu raf hassasiyet koridoru** — 14 tek-tile platform, Mario hassasiyet tavanı | **W1 B1 ikinci yarısı**, 8 platforma kısaltıldı | Saf GAP geometrisi | Sıfır yeni kod. Buz karosunun üstüne konunca yeni bir gramer doğar: kaygan + tek tile |
| T5 | W3 G3 | **Sahte tabela koridoru** — `~` yalan karo, üç sinyal (pembe + kesikli çerçeve + sola kayan gölge) | **W1 C1** | 1 tile sınıfı + 5 `lies` string'i (zaten yazılı, §15.17) | v0'ın **tek** "renk yalan söyler" dersi. K6 (renk tek başına anlam taşımaz) başka hiçbir yerde kanıtlanamaz. Yoğunluk tavanı **%8** (kitap W3 %12, W1 %3) |
| T6 | W5 F5 | **Sıcak GPU kanalı** — 40 kare içinde çıkılmazsa C sınıfı revert | **W6 A6**, 2 kanal · **OPSİYONEL, ilk kesilecek** | Tile flag + sayaç (~20 satır) | W6-lite'ın glif olmayan tek baskı mekaniği. Faz 1 sarkarsa ilk bu kesilir |

### 2.2 ZATEN W1'DE OLANLAR (taşıma değil, kitap gereği)

| Kalem | Kitap yeri | v0 notu |
|---|---|---|
| **REGRESYON kovalaması** | W1'de zaten var (W1-W6 kalıcı) | W0 sabitleriyle (2,60 px/f) rayda koşar. W4 F4'ün "en hızlı kovalaması" **taşınmaz**; W1'in mevcut hayalet yarışı yeterli |
| **HOT-RELOAD DALGASI** | W0 (cezasız, sadece iter) | Aynı rig, **W1 F1'de C sınıfı temas bayrağıyla** yeniden kullanılır + SPRINT SONU'nun "aynı noktada 5. revert'ten sonra 2 s durur" kuralı. Ayrı SPRINT SONU varlığı **yaratılmaz** |
| **240 karelik konum bandı** | W6 Faz 3 arena zemini | Faz 3 kesildi, **band kaldı** (§2.4) |

### 2.3 ERTELENENLER (v1'e, gerekçeli)

| Setpiece | Kaynak | Engelleyen sistem |
|---|---|---|
| Akan merdiven (`QUEUE_STAIR`), İki Kuyruk Paralel, YIĞIN bossu, YIĞIN PARÇASI | W2 | **PARÇALA** |
| Gantt penceresi platformları, GANTT ÇUBUĞU, pnömatik tüpler (`TUBE_CAR`), 3 araç odası, SAHTE MİSAFİR, ŞİŞME, TÜP POSTASI, `^` mühür karosu, `SEAL_BRIDGE` | W3 | **BAĞLAM MÜHRÜ** + G3 + yeni platform türü |
| Benzerlik atlaması, chunk takımyıldızı, top-k zinciri, KOMŞU, `allow? [y/N]` duvarları, BEKÇİ, İMZA bossu, ÇATAL/UZAKTAN RED/TOP-K pipleri, GECİKMELİ EKO | W4 | **KANCA** + G4 + 3 pip |
| Etiket ve gölge, 6'da 1 yanlış etiket, İkinci Görüş, rüzgâr tüneli, ETİKET, KORO bossu, ÇAPA pipi | W5 | **ÖN-FİLTRE** + G5 |
| Devir borcu kapıları N2/N4/N5, omuz rozeti, SC-02, SC-07 | W2/W4/W5 | **Üç kapının hiçbiri v0'da yok** → `delegationDebt` yapısal olarak 0 |
| Arşiv çekmecesi sahnesi (SC-03 kamerası), zehir olayı (SC-04), kimlik toplanması (SC-05) | W3/W4 | Sahnenin geçtiği dünya yok. **Replikleri taşındı** (§6.2) |
| 5 sertifika mührü, geri dönüş kapıları (W3/W4/W5) | W3-W5 | Dünyalar yok. v0'da **tek** dönüş yolu: 301 İZİ'nin kalıcı slug karoları (W1 E1) |
| Sessizlik anlatısı (W5'te REGRESYON'un yokluğu) | W5 | Yokluk ancak 4 dünya varlıktan sonra okunur. 8 dakikada yer yok |

### 2.4 W6 FAZ 3 — kesildi, fikri kurtarıldı

Faz 3'ün mekaniği (§7.6) borç repertuvarına bağlıdır: *"`delegationDebt` her bir puanı için o kapıda devrettiğin fiil bu fazda kapalıdır."* v0'da borç yapısal olarak 0 → Faz 3'ün üç şeridinin **tamamı kısayollu**, yani fazın varlık nedeni yok. **Faz 3 boss fazı olarak kesildi.**

Kitabın en iyi fikri — *"Faz 3'ün arena zemini, oyuncunun Faz 1-2'de gerçekten koştuğu yoldur"* — kesilmedi, **MERGE'e taşındı**:

> **v0 kararı:** MERGE'in 6 saniyesinde oyuncunun üstünde durduğu platform, `ghost.js`'in 240 karelik konum bandından (`Float32Array x,y` + `Uint8Array poseId`, ring buffer) çizilir. Kayıtlı yolun geçmediği yerde platform yok. Aynı kod, 48 saniyelik traversal yerine 6 saniyelik senaryolu ana uygulanır. Ek maliyet: **0 satır** (band YOKSAY'ın silüeti için zaten gerekli).

Tematik olarak doğru yere düştü: MERGE tuşuna **kendi geçmişinin üstünde dururken** basıyorsun.

---

## 3. İKNA ORANI ARİTMETİĞİ — v0 türetmesi

Kitap §8.2'de 6 dünya için taban `F_w` verir. v0'da **3 aşama** var: W0 çıkışı (senaryolu), W1, W6. Aşağıdaki türetme kitabın üç kuralını (senaryolu taban, clamp'li emergent fazla, geri alma şeridi) ve invaryantı **aynen** korur; yalnız tabanları ve şerit çekişlerini yeniden boyutlandırır.

### 3.1 Temsil ve kurallar (değişmedi)

`rate` tamsayıdır, birimi yüzde puanının 100'de biri. `9519` = %95,19. Float drift yok. HUD tam sayı yüzde + bar; ondalık yalnız üç anlatı anında yazılır (`M2`, `F3`, `f1seal`).

| Kural | v0'da | Kitap |
|---|---|---|
| Senaryolu taban `F_w` | korunur | §8.2-1 |
| Emergent fazla `OB ∈ [60, 120]` | korunur | §8.2-2 |
| Tavan `F_w + 1200` | korunur | §8.2-2 |
| Geri alma şeridi `rate = max(F_w, rate − drain)` | korunur | §8.2-3 |
| Invaryant `drains_w × per_w ≥ (F_{w−1} − F_w) + 1200` | korunur, dev-mode assert | §8.2 |
| Tavanın görünür sonucu: `rate ≥ F_w + 800` iken telegraf 36 → 30 kare + bir şerit erken açılır | korunur | §8.2 |
| MERGE'te deterministik **48** | korunur, `assertFinish` değişmez | §8.2 |
| Zehir olayı (W3 çıkışı +500) | **kesildi** — W3 yok, eğri monoton | §8.2 |

### 3.2 v0 oran tablosu

| Aşama | Taban `F_w` | Tavan `F_w+12` | Eşik `F_w+800` | HUD | Ana yol glifi | Maks kazanç | Şerit `k` | Şerit başı çekiş | Invaryant gereği | Sağlanan | ✓ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **W0 çıkış** | 9519 | — | — | **95** | 3 | senaryolu | — | — | — | — | — |
| **W1** | **5200** | 6400 | 6000 | **52** | 26 | +3120 | **3** | **−1850** | 5519 | 5550 | ✅ |
| **W6 MERGE girişi** | **300** | 1500 | 1100 | **3** | 18 | +2160 | **3** | **−2050** | 6100 | 6150 | ✅ |
| **MERGE** | **48** | — | — | **0,48** | — | deterministik çöküş | — | — | — | — | ✅ |

Invaryant hesabı, açıkça:
* W1: `3 × 1850 = 5550 ≥ (9519 − 5200) + 1200 = 5519` — pay **31**
* W6: `3 × 2050 = 6150 ≥ (5200 − 300) + 1200 = 6100` — pay **50**

Kitabın 1040/900/750/675/600/800'lük çekişleri v0'da 1850 ve 2050'ye çıkar. Bu bir hata değil, **bölünen sayının aynı, bölen aşama sayısının 6'dan 2'ye düşmesinin** doğrudan sonucu: 9471 puanlık iniş iki aşamaya sığmak zorundadır. 8 dakikalık bir oyunda para biriminin **görünür hızla** hareket etmesi ayrıca istenen şeydir.

### 3.3 Şerit konumları — obedience'ın ne zaman ısırdığı

Tavan yalnız `rate < F_w + 1200` iken bağlar. Şeritlerin yeri bu yüzden **tasarım kararıdır**, kozmetik değil.

| Aşama | Şerit | Yer | Girişteki `rate` | Obedience canlı mı? | Neden |
|---|---|---|---|---|---|
| W1 | d1 | B1 sonu | 9519 | ❌ (9519 > 6400) | Öğretme yarısı. Yanlış tuşun **hiç** bedeli olmadığı bölge |
| W1 | d2 | D1 sonu | 7669 → 5819 | ✅ E1'den itibaren | Glif okuma öğretildi; oran artık tehdit |
| W1 | d3 | **KOKLAYICI'dan SONRA**, çıkış rampası | ≤6400 | — | `rate === 5200` dünya kartında **deterministik** |
| W6 | d1 | A6 ortası | 5200 → 3150 | ❌ | İniş = geri alma. İki büyük bar çöküşü katman soyulmasıyla eşlenir |
| W6 | d2 | A6 sonu | 3150 → 1100 | ✅ Faz 1'de | Boss'un "kaçan her emir oranı yükseltir" mekaniği **ancak burada** çalışır |
| W6 | d3 | R1 sonu (MERGE girişi) | ≤1500 | — | `rate === 300` = HUD 3 = kitabın "oran zorla 3,00'a çekilir" cümlesi, zorlama olmadan |

> **Kitap düzeltmesi (§12-2):** "Dünya çıkışında `rate === F_w` deterministiktir" ancak **son şerit boss'tan sonra, çıkış rampasında** ise doğrudur. Kitap bunu hiçbir yerde yazmıyor. v0 yazıyor.

### 3.4 Yolun doğrulanması

**En iyi durum (hiç itaat yok):**
```
W1: 9519 → d1 7669 → d2 5819 → d3 max(5200, 3969) = 5200   HUD 95 → 77 → 58 → 52
W6: 5200 → d1 3150 → d2 1100 → d3 max( 300, −950) =  300   HUD 52 → 32 → 11 →  3
MERGE: 300 → 48                                             HUD  3 → 0,48
```

**En kötü durum (her glife itaat, tavanda):**
```
W1 B1'e kadar: obedience no-op (9519 > 6400)      → d1 → 7669
W1 D1'e kadar: obedience no-op (7669 > 6400)      → d2 → 5819
W1 E1..boss:   5819 → min(5819+n·120, 6400) = 6400 → d3 → max(5200, 4550) = 5200 ✅
W6 A6:         obedience no-op (5200 > 1500)      → d1 → 3150 → d2 → 1100
W6 Faz1+R1:    1100 → min(1100+n·120, 1500) = 1500 → d3 → max( 300, −550) =  300 ✅
MERGE:                                                    →  48 ✅
```

Her iki uçta taban yakalanıyor. **Görünür iniş beati sayısı: 7** (95 → 77 → 58 → 52 → 32 → 11 → 3 → 0,48). Defter A 393 s → **dakikada bir beat.**

### 3.5 Clamp formülünün düzeltilmesi — kitapta gerçek bir hata

Kitap §8.2-2: `rate = min(rate + OB, F_w + 1200)`.

Bu formül `rate > F_w + 1200` iken (yani bir dünyaya girildiği andaki **normal** durumda) itaat edildiğinde oranı **düşürür**. W1'e 9519 ile girip bir glife itaat eden oyuncunun oranı `min(9639, 6400) = 6400`'e çöker — itaat ödüle dönüşür. Doğrusu:

```js
// game/data/rate.js  — v0
export function obey(rate, floor, OB) {
  const ceil = floor + 1200;
  if (rate >= ceil) return rate;              // tavanın üstündeyken itaat NO-OP
  return Math.min(rate + OB, ceil);
}
export function drain(rate, floor, per) {
  return Math.max(floor, rate - per);
}
```

### 3.6 v0 eğri doğrulayıcısı

```js
export const RATE_V0 = {
  start: 9519,
  order: ["w1", "w6"],
  floor:  { w1: 5200, w6:  300 },
  drains: { w1:    3, w6:    3 },
  per:    { w1: 1850, w6: 2050 },
  ceilingOffset: 1200,
  obRange: [60, 120],
  visibleConsequenceAt: 800,     // rate >= floor+800 → telegraf 36→30, şerit erken açılır
  merge: 48
};

// dev-mode; prod'da tree-shake
export function assertRateCurveV0(R) {
  let prev = R.start;
  for (const w of R.order) {
    if (R.floor[w] >= prev) throw new Error("taban monoton azalmiyor: " + w);
    const need = (prev - R.floor[w]) + R.ceilingOffset;
    if (R.drains[w] * R.per[w] < need)
      throw new Error(`serit cekisi yetersiz: ${w} (${R.drains[w] * R.per[w]} < ${need})`);
    prev = R.floor[w];
  }
  if (R.merge !== 48) throw new Error("bitis orani 48 degil");
}
```

`assertFinish(save)` **değişmez**: `save.finished && save.ratio !== 48` → throw.

### 3.7 Ses bağlantısı (değişmedi)

`channelDetune = (rate / 100) * 0.8` cent. 9519 → +76 cent (kulağa yanlış), 300 → +2,4 cent, 48 → +0,4 cent. `merge` efekti = **sıfır-detune akoru**, oyun boyunca hiç duyulmaz. v0'da 8 dakika boyunca duyulmaz — vaat aynı, süre kısa; etki **artar** çünkü kirli akordan saf akora geçiş 8 dakikada daha ölçülebilir.

---

## 4. Düşman seçimi — 13'ten 4

### 4.1 Seçilenler

| # | Tür | Kitap sırası | Piksel | Durum makinesi | Neden **zorunlu** |
|---|---|---|---|---|---|
| 1 | **TALİMAT** / INSTRUCTION | 1 (W0) | 12×12 | `IDLE → TELEGRAPH(36) → WINDOW(24) → COOLDOWN(90)` | **Fiil bağımsız.** Kitabın kendi ifadesiyle "her dünyada zemin dili". D-1 (talimat okunabilir) ve K1 başka hiçbir türle öğretilemez. v0'ın 4 aşamasının hepsinde var |
| 2 | **BORU AĞZI** / PIPE MOUTH | 3 (W1) | 14×20 | `EMIT(48 f'de 1 token, tek yön) → JAM(90) → EMIT` | **YENİDEN YAZ'ın tek antrenörü.** §7.4 kombinasyon kolonu: "+ YENİDEN YAZ". Aynı zamanda v0'ın tek gimmick'i olan G1 (`TOKEN_PIPE`) bu türün etrafında kuruludur. Kesilirse G1 de kesilir, W1 gimmick'siz kalır |
| 3 | **DÜĞÜM** / NODE | 5 (W2) | 20×20 | `READ_SWEEP(koni 60°, 2 s tur) → LOCK(36,"GÜVEN") → PULSE(18)` | **KABUK'un birincil grameri.** Zarar veren şey temas değil *okunmak* — KABUK'un varlık nedeni bu. Ayrıca KOKLAYICI Faz 1'in üç okuma konisinin saha versiyonu; §7.6'nın öğrenilebilirlik garantisi (G1 prova odası: 1 DÜĞÜM + 1 ZİL) bu tür olmadan sağlanamaz |
| 4 | **ZİL** / BELL | 4 (W2) | 8×8, 9-14'lük sürü | `SWARM_IDLE → CHARGE(42,"DÖN") → RAIN(sürü ortak, 36 f) → REGROUP(120)` | **KABUK'un zamanlama grameri** + KOKLAYICI Faz 2'nin (yağmur + koni aynı 40 karede) ikinci malzemesi + bestiyerin **tek sürüsü**: SoA entity havuzunu ve parçacık ring buffer'ını gerçekten sınayan tek tür. Ayrıca T1 (SMS yağmuru) setpiece'inin düşmanı |

**Dört türün kapsadığı ders yüzeyi:** okunabilirlik (1), tek yönlülük (2), okunmanın kendisinin zarar olması (3), toplu olayın tek olay olması (4). İki fiilin ikisi de en az iki türe karşı döner (§7.2).

### 4.2 Kesilenler ve kesme nedeni

| Tür | Kitap sırası | Engelleyen |
|---|---|---|
| **SEKME** / DRIFT TAB | 2 (W1) | Fiil bağımsız ve W1'in yerlisi — **en yakın kaybedilen**. Dersi ("momentumu korumak bir reddetme biçimidir") **bedava kurtarıldı**: `DUR` glifli bir TALİMAT kaygan GUID karosunun üstüne konur. Aynı ders, sıfır yeni durum makinesi |
| YIĞIN PARÇASI | 6 (W2) | PARÇALA |
| GANTT ÇUBUĞU | 7 (W3) | G3 tarih penceresi sistemi |
| ŞİŞME | 8 (W3) | Dersi SAHTE MİSAFİR Faz 2'de yaşıyordu; o boss da kesildi |
| TÜP POSTASI | 9 (W3) | BAĞLAM MÜHRÜ + `TUBE_CAR` |
| KOMŞU | 10 (W4) | KANCA + G4 |
| BEKÇİ | 11 (W4) | UZAKTAN RED pipi |
| ETİKET | 12 (W5) | ÖN-FİLTRE + İKİNCİ GÖRÜŞ + gölge deseni sistemi |
| REGRESYON | 13 | **Kesilmedi — dörtlükten çıkarıldı.** §12-4'e bakınız: glifi, telegrafı, hurtbox sınıfı yok; `enemies.js` değil `ghost.js`'te yaşar. Bestiyer türü sayılması kitabın sınıflandırma hatasıdır |

### 4.3 Ek tehlikeler

| Tehlike | v0 | Not |
|---|---|---|
| **HOT-RELOAD DALGASI** | ✅ | W0'da cezasız (2,6 tile/s, sadece iter) · **W1 F1'de C sınıfı** temas bayrağıyla + "5. revert'ten sonra 2 s durur" kuralı |
| **GUID karosu (kaygan)** | ✅ | Sürtünme 0,06 (normal 0,18). G1'in yarısı |
| **DONMUŞ SAKİN** (20.000 sayaç) | ✅ | Temas yok, kurtarılabilir. W1 E1 → EP C7 ödemesi |
| **SICAK KANAL** | ⬜ opsiyonel | 40 kare içinde çıkılmazsa C sınıfı revert. W6 A6. **İlk kesilecek kalem** |
| SPRINT SONU / GECİKMELİ EKO / RAY | ❌ | Ayrı varlık yaratılmaz (SPRINT SONU'nun kuralları HOT-RELOAD rig'ine bayrak olarak taşındı) |

---

## 5. DAKİKA BÜTÇESİ — §6 yöntemiyle yeniden hesap

Yöntem kitaptan **aynen**: `sn = tile / (tepe_hız × verim)`, `tepe_hız_tile/s = maxSpeed_px/f × 60 / 16`. İki defter kuralı korunur: **Defter A** = temiz geçiş içeriği, **Defter B** = medyan duvar saati (A + revert yeniden koşu + boss retry). Ölüm süresi asla içerik sayılmaz.

### 5.1 Hız merdiveni — v0 yeniden çıpalaması

W0 ve W1 satırları **dondurulmuş** (verilen brief). W6 ve EP satırları yeniden çıpalanır çünkü kitabın 2,05 / 2,20 değerleri **6 dünyalık bir merdivenin varlığını varsayar** ve v0'da o merdiven yok.

| Aşama | `speedTier` | `maxSpeed` px/f | px/s | **tile/s** | `slopeGain` | Mario/Sonic | Kaynak |
|---|---|---|---|---|---|---|---|
| **W0** | 1,00 | 2,60 | 156 | **9,75** | 0,00 | 80/20 | kitabın W0 satırı, **aynen** |
| **W1** | 1,15 | 2,99 | 179 | **11,21** | 0,30 | 78/22 | kitabın W1 satırı, **aynen** |
| **W6-lite** | 1,35 | 3,51 | 211 | **13,16** | 0,55 | 70/30 | kitabın **W2** satırı, aynen kopyalandı |
| **EP** | 1,55 | 4,03 | 242 | **15,11** | 0,75 | 62/38 | kitabın **W3** satırı, aynen kopyalandı |

**Neden bu satırlar:** (a) `physicsTable`'a **tek yeni satır eklenmez**, var olan dört satır kullanılır; (b) kademe adımı +0,15/+0,20/+0,20 → kitabın hiçbir adımı 0,20'yi geçmez, disiplin korunur (2,05'e atlamak +0,90'lık bir adım olurdu, kitabın maksimumunun 4,5 katı); (c) v0'ın bütün boşlukları kitabın doğrulanmış okunabilirlik bandında kalır.

**Boşluk grameri doğrulaması** (`vx × 33 f`, 480 px ekran):

| Tier | Menzil px | Tile | Ekranın %'si | Kitap tavanı |
|---|---|---|---|---|
| 1,00 (W0) | 86 | 5,4 | %18 | — |
| 1,15 (W1) | 99 | 6,2 | %21 | — |
| 1,35 (W6) | 116 | 7,2 | %24 | — |
| 1,55 (EP) | 133 | 8,3 | %28 | — |
| 1,55 + overflow (1,35×) | 179 | 11,2 | **%37** | %39 ✅ |

**Kabul edilen iki kayıp, açıkça:**
1. **Mario/Sonic oranı tutulmuyor.** Traversal saniyesine göre ağırlıklı: `(61×80 + 136×78 + 44×70 + 30×62) / 271 = %75,4 Mario / %24,6 Sonic`. Kanonik %60/%40 v0'da **yanlıştır** ve öyle ilan edilir. Sonic yarısı v1'in vaadidir.
2. **EP'nin tam momentumu 29,0 değil 20,4 tile/s.** `overflowCap = 1,35 × 4,03 = 5,44 px/f = 326 px/s = 20,4 tile/s`. Yine de W1 tepe hızının **1,82 katı** — "ilk ve tek kez tam momentum" cümlesi ölçülebilir kalır, sadece daha küçük bir sayıyla.

### 5.2 W0 — localhost:4200 (tepe hız 9,75 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| P0a | Terminal Satırı | 80 | 36 | 3,51 | **23** | 4 hassas zıplama yayı (33 f × 4), 3 durma noktası, `slopeGain = 0`; H1 + H4 | 85/15 |
| P0b | İlk Telegraf (senaryolu itaat) | 62 | 30 | 2,93 | **21** | 2 zorunlu telegraf beklemesi (1,2 s), senaryolu düşme + revert (H3), 2 okuma durağı; H2 + H5 (`DUR` dersi) | 90/10 |
| P0c | Hot-Reload Dalgası | 90 | 55 | 5,36 | **17** | Arkadan gelen duvar (cezasız, sadece iter); 4 zıplama, kesintisiz koşu | 60/40 |
| | **Traversal** | **232** | | | **61** | | **80/20** |

**P0d (Derleme Çıkışı, 57 tile / 14 s) kesildi** — içeriği "2 zıplama + 0,8 s kapı beklemesi", 8 dakikalık bir oyunda saf dolgu. W0 kitapta 110 s'lik traversal ile toplamın %4'üydü; v0'da 61 s ile **%16**'sı olacaktı; kesim bunu %15,5'e indirir ve beş dersin (H1-H5) hepsi korunur.

Sabit ek: giriş zoom 2 s + SC-00 6 s = **8 s**.

### 5.3 W1 — GÖMÜLÜ KANAL (tepe hız 11,21 tile/s) — v0'ın gövdesi

W1 kitapta 9 segment / 1.667 tile / 308 s. v0'da **7 segment / 711 tile / 136 s**; taşınan 5 setpiece **ayrı segment açmaz**, var olan segmentlerin ikinci yarısına yerleşir (kitabın §5.2 yöntemi).

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | Taşınan | M/S |
|---|---|---|---|---|---|---|---|---|
| A1 | **Yeniden Yaz odası** | 50 | 36 | 4,04 | **12** | Öğretme: 2 kapaklı slug bulmacası, her biri 2,4 s okuma+icra; G1 ipucu | — | 90/10 |
| B1 | **GUID Buzu + Hassas Raf** | 105 | 44 | 4,93 | **21** | Buz sürtünmesi 0,06 → 5 fren-kontrol noktası; `DUR` glifli TALİMAT buz üstünde; sonra **8 tek-tile platform** | **T4** | 84/16 |
| C1 | **Embed Yüzeyi + Sahte Tabela** | 150 | 58 | 6,50 | **23** | İlk yüksek/alçak rota (yüksek rotaya giriş 9 tile/s şartı); 2 boost pad; `~` yoğunluk **%8**, 6 okuma kararı (3 sinyal) | **T5** | 50/50 |
| D1 | **SSE Koridoru + Dikey Kule** | 95 | 38 | 4,26 | **22** | `TOKEN_PIPE` tek yön: 3 boru × 1,1 s transfer + 4 hassas zıplama; sonra **6 kat dikey tırmanış**, kat başına 33 f zıplama + 0,9 s yeniden konumlanma | **T3** | 88/12 |
| E1 | **Kabuk Yağmuru + Donmuş Hol** | 118 | 42 | 4,71 | **25** | **KABUK 12 s'de in-situ**; tek büyük ZİL yağmuru (tepe 4,5 glif/10 s), 6 kabuk zamanlaması; sonra 20.000 gri sakin sayacı + 301 İZİ pipi ve kalıcı slug dönüş yolu | **T1 + T2** | 80/20 |
| F1 | **Yayına Alma Koşusu #1** | 130 | 62 | 6,95 | **19** | Kamera sürüşlü; HOT-RELOAD dalgası **C sınıfı**; REGRESYON hayalet yarışı (W0 sabitleri, 2,60 px/f); **4 input kararı** (dallanan rampa, hayalet yarışı, glif reddi, çıkış rotası) — 4,8 s'de bir karar | HOT-RELOAD C sınıfı | 25/75 |
| G1 | **KOKLAYICI prova odası** | 63 | 40 | 4,48 | **14** | Yalıtılmış prova: 1 DÜĞÜM + 1 ZİL **cezasız 14 s**; sonra 2 telegraf | — | 85/15 |
| | **Traversal** | **711** | | | **136** | | | **78/22** |

Boss KOKLAYICI **45 s** · SC-01 **8 s** (~2:20'de).

> **Kitap kuralı gevşetildi (§12-7):** §6.2 Yayına Alma Koşularına **7 input kararı** şartı koyar. v0'ın F1'i 19 saniyedir; 7 karar 2,7 s'de bire düşer ve okunamaz. v0 şartı **4 karar / 4,8 s** olarak yeniden yazıldı — kitabın kendi "ortalama 5,7 s'de bir karar" gerekçesine daha yakın.

### 5.4 W6-lite — YOKSAY (tepe hız 13,16 tile/s)

Faz 2 (Filtre) ÖN-FİLTRE + İKİNCİ GÖRÜŞ ister → **kesildi.** Faz 3 (Borç) `delegationDebt` ister → **kesildi** (§2.4).

| ID | Segment | tile | %tepe | tile/s | sn | Not | M/S |
|---|---|---|---|---|---|---|---|
| A6 | **İniş** | 220 | 55 | 7,24 | **30** | Arkada 3 dünya katman katman geri açılır; 4 zıplama + 2 fiil; **şerit d1 ortada, d2 sonda**; 2 sıcak kanal (opsiyonel, ilk kesilecek) | 45/55 |
| — | **Faz 1 — İkna** | — | — | — | **35** | boss (§7.4) | boss |
| R1 | **Ara koşu** | 100 | 55 | 7,24 | **14** | Commit taşı + 3 telegraf; sonunda **şerit d3** → `rate = 300` | 45/55 |
| — | **MERGE** | — | — | — | **6** | Tek tuş; zemin 240 karelik banttan; sıfır-detune akoru | — |
| | **Traversal** | **320** | | | **44** | | **45/55** |

Boss YOKSAY Faz 1 = **35 s** · SC-06 **5 s** (giriş) · FINAL **10 s** · MERGE **6 s**.

### 5.5 EP — SLUG OTOYOLU (tepe hız 15,11 tile/s, overflow 20,4)

| ID | Segment | tile | %tepe | tile/s | sn | Not | M/S |
|---|---|---|---|---|---|---|---|
| A7 | **Tam Momentum Rampası** | 180 | 72 | 10,88 | **17** | 1,55× ilk ve tek kez; `overflowCap` erişilir | 15/85 |
| C7 | **Bitiş Çizgisi** | 140 | 70 | 10,58 | **13** | Ufukta İletişim bölümünün silüeti + **azalan mesafe sayacı** baştan görünür; kurtarılan gri sakinler yol kenarında sayılır | 15/85 |
| | **Traversal** | **320** | | | **30** | Glif 0, `~` %0, medyan revert 0 | 15/85 |

**B7 (Çok Şeritli Otoyol) kesildi** — işi 12 pipin sayımı ve `F1 %83,81` mührünün yol üstündeki kapılarıydı; v0'da 3 pip var. `f1seal` mührü C7'nin girişine tek kapı olarak taşınır (LEXICON etiketi, prose değil, 0 s maliyet). Kapanış zoom-out'u oyuncu bitiş çizgisine **dokununca** tetiklenir — son eylem oyuncunundur (§3.4 korundu).

Sabit ek: epilog kapanışı **5 s**.

### 5.6 Chunk arzı — 18 sayısının türetilmesi

| Kalem | Değer |
|---|---|
| Zorunlu path-tile | **1.583** |
| Ortalama instance genişliği (`CHUNK_W`) | 40 |
| Gereken instance | **40** |
| Tekrar tavanı (kitap) | 5 |
| İki görünüm arası minimum boşluk — **v0 yeniden türetmesi** | **≥25 s** |
| Bir dünya içinde erişilebilir maksimum tekrar | W1: 6 · W0: 3 · W6: 2 · EP: 2 |
| Fiilen bağlayan tavan | **3** (boşluk kuralı, tekrar tavanı değil) |
| Gereken özgün chunk (minimum) | 40 / 3 = **14** |
| **Spec: özgün chunk** | **18** → kapasite 54 instance, **%26 pay** |
| Veri satır bütçesi | 18 × ~25 = **~450 satır** |

> **Kitap düzeltmesi (§12-3):** §5.3'ün "iki görünüm arası **≥150 s**" kuralı ölçeklenemez — 150 s, 3.133 s'lik duvar saatinin %4,8'idir. Kural mutlak saniye değil **çalışma süresinin oranı** olarak yazılmalıdır. v0: %4,8 × 467 s = 22,4 s → güvenlik payıyla **≥25 s**. Varyasyon eksenleri (yatay aynalama / dekoratör tohumu / tile sınıfı takası / entity spawn seti) ve "her tekrarda ≥2 eksen" kuralı **değişmez**.

**18 chunk, gramer ailesine göre:**

| Aşama | Chunk | Aile | Instance |
|---|---|---|---|
| W0 | `p0_terminal` | GAP | 3 |
| W0 | `p0_reload` | FLOW | 3 |
| W1 | `w1_rewrite_room` | PUZZLE | 2 (biri G1 prova spawn setiyle) |
| W1 | `w1_guid_ice` | RAMP | 3 (biri F1'de aynalı) |
| W1 | `w1_shelf_precision` | GAP | 2 |
| W1 | `w1_embed_split` | FLOW | 3 (biri F1'de `chase-wall` kamerayla) |
| W1 | `w1_lie_signs` | GAUNTLET | 2 |
| W1 | `w1_sse_pipes` | PUZZLE | 2 |
| W1 | `w1_column_tower` | COLUMN | 2 |
| W1 | `w1_shell_rain` | GAUNTLET | 2 |
| W6 | `w6_descent` | FLOW | 2 |
| W6 | `w6_arena_band` | GAUNTLET | 2 |
| W6 | `w6_interrun` | PUZZLE | 2 |
| W6 | `w6_ramp_seam` | RAMP | 2 |
| EP | `ep_full_ramp` | RAMP | 2 |
| EP | `ep_lane_wide` | FLOW | 2 |
| EP | `ep_residents` | FLOW | 2 |
| EP | `ep_finish` | FLOW | 2 |
| | **18** | 6 aile | **40** |

> **Kitap kuralı yeniden yazıldı (§12-6):** §5.5 ekseni 3 "dünya başına 3 aile, komşu dünyayla en çok 1 ortak" der. Bu kuralın amacı *dünyaların birbirine benzememesi*. v0'da 4 aşama var ve risk tersine döner: tek büyük dünyanın **kendi içinde** tekrar etmesi. v0 kuralı: **W1 altı ailenin tümünü çeker (oyunun gövdesi), W6 dört, W0 ve EP ikişer. Komşu-örtüşme kuralı düşürülür.**

### 5.7 Defter A — içerik

| Kalem | Değer | Türetme |
|---|---|---|
| Traversal | **271 s** | 1.583 tile ÷ segment bazlı efektif hız (§5.2-5.5) |
| Boss özgün içeriği | **80 s** | KOKLAYICI 45 + YOKSAY Faz 1 35 |
| Sabit (etkileşimsiz) | **42 s** | giriş zoom 2 · SC-00 6 · SC-01 8 · SC-06 5 · FINAL 10 · MERGE 6 · epilog kapanış 5 |
| **DEFTER A TOPLAM** | **393 s = 6:33** | ✅ 6 dakikanın **üstünde** |

Etkileşimsiz oran: 42 / 393 = **%10,7**.

> **Kitap belirsizliği çözüldü (§12-10):** §6.6 hem oransal bir sayı (%3,3) hem mutlak bir tavan ("6 dk tavanının çok altında") kullanır. Kısa kapsamda **yalnız mutlak tavan anlamlıdır**: v0'ın pasif süresi **42 saniye**, tavanın 8,6 katı altında. Oransal %10,7'nin yükselmesi kaçınılmazdır — aynı hikâye beatleri 45 dakika yerine 6,5 dakikaya sığar. 42 saniyenin **21'i** (FINAL + MERGE + epilog kapanışı) oyunun **en sonunda**, hak edilmiş yerde durur.

### 5.8 Defter B — medyan duvar saati

| # | Aşama | Traversal | Boss | Sabit | Revert (n × 4,2 s) | Boss retry (0,35 × içerik) | Aşama toplamı | Kümülatif |
|---|---|---|---|---|---|---|---|---|
| W0 | Prolog | 61 | 0 | 8 | 8,4 (2) | 0 | **77** | **1:17** |
| W1 | Gömülü Kanal | 136 | 45 | 8 | 25,2 (6) | 15,8 | **230** | **5:07** |
| W6 | YOKSAY (lite) | 44 | 35 | 21 | 12,6 (3) | 12,3 | **125** | **7:12** |
| EP | Slug Otoyolu | 30 | 0 | 5 | 0 (0) | 0 | **35** | **7:47** |
| | **TOPLAM** | **271** | **80** | **42** | **46 (11)** | **28** | **467** | **7:47** |

**Kanıt 1 — medyan.** 271 + 80 + 42 + 46 + 28 = **467 s = 7:47** ✅ 6-8 dakika bandının içinde.

Revert maliyeti kitaptan aynen: 4,2 s = 0,4 s revert geçişi + ~3,8 s yeniden koşu. Medyan revert **11** (kitabın W0=3/W1=7 tabanından aşağı: v0'da 4 düşman türü, 2 fiil, tier tavanı 1,55 — glif eşzamanlılığı 5'e hiç çıkmaz). Boss retry medyan deneme hedefi **2**, başarısız geçiş içeriğin %35'i.

Commit taşı: 393 s ÷ 24 taş = **16,4 s ortalama** ✅ kitabın ~16 s'lik `commitInterval` sözleşmesi korundu. Dağılım: W0 4 · W1 12 · W6 6 (2'si Faz 1 içinde) · EP 2. HUD commit grafiği `n/24` gösterir.

### 5.9 Kanıt 2 — hızlı oyuncu

Katsayılar kitaptan aynen (bölen 1,9, boss çarpanı 0,70).

| Kalem | Hesap | s |
|---|---|---|
| Traversal | 271 / 1,9 | 143 |
| Boss | 80 × 0,70 | 56 |
| Sabit (atlanabilir kısımlar atlanmış) | 3 × 1,2 + 10 + 6 + 2 + 5 | 27 |
| Revert | 4 × 3,6 | 14 |
| Boss retry | 0,35 × 56 × 0,5 | 10 |
| Yüksek rota kısayolu (C1) | 1 rota × ~8 s | −8 |
| **HIZLI TOPLAM** | | **242 s = 4:02** |

### 5.10 Kanıt 3 — tamamlayıcı

| Kalem | Hesap | s |
|---|---|---|
| Traversal | 271 × 1,16 | 314 |
| Boss | 80 × 1,35 | 108 |
| Sabit | | 42 |
| Revert | 20 × 4,5 | 90 |
| Boss retry | 0,35 × 108 × 1,5 | 57 |
| Opsiyonel (301 İZİ dönüş yolu 25 + tam sakin kurtarma 35) | | 60 |
| **TAMAMLAYICI TOPLAM** | | **671 s = 11:11** |

### 5.11 Profil özeti

| Profil | Süre | Hedef |
|---|---|---|
| Hızlı (yetkin, kısayollu) | **4:02** | — (bağlayıcı değil) |
| **Medyan** | **7:47** | ✅ 6-8 dk bandı, üst sınırın 13 s altında |
| Defter A (saf içerik) | **6:33** | ✅ 6 dk tabanının üstünde |
| Tamamlayıcı | **11:11** | ✅ |

**Çevrim doğrulaması.** En kısa segment 12 s (A1), en uzun 30 s (A6). Commit taşı aralığı 8-30 s arasında dalgalanır; sabit metronom yok. Kamera hiçbir zaman tam durmaz.

**Kalibrasyon kuralı (kitaptan aynen, §6.7-3):** ölçülen verim tasarım veriminden segment başına %15'ten fazla saparsa **tile sayısı** düzeltilir, iddia düzeltilmez. **v0 ek kuralı:** Defter A 6:00'ın altına düşerse önce EP'ye (en ucuz tile), sonra W1 C1'e tile eklenir; **W0'a asla eklenmez** (öğretme yükü zaten tavanda).

### 5.12 Zorluk eğrisi

| Aşama | tier | glif/10 s | `~` % | Medyan revert | Eşzamanlı sinyal | HUD İKNA (çıkış) | Eğri |
|---|---|---|---|---|---|---|---|
| W0 | 1,00× | 0,4 | 0 | 2 | 1 | 95 | `▁` |
| W1 | 1,15× | 1,8 (tepe 4,5) | **8** | 6 | 3 | 52 | `▄` |
| W6 | 1,35× | 3,4 | 5 | 3 | 3 | 3 | `█` doruk 7:12 |
| EP | 1,55× | 0 | 0 | 0 | 1 | **0,48** | `▂` boşalma |

Tek doruklu, zehir sıçraması yok (W3 kesildi → eğri monoton). W1'in glif yoğunluğu kitabın 1,4'ünden 1,8'e çıkar: taşınan setpiece'lerin (ZİL yağmuru) bedeli. Doruk 7:12'de, ardından 35 saniyelik epilog.

---

## 6. HİKÂYE YAYI — 6-8 dakikada kapanma

### 6.1 Sahne sahne yay (v0)

| An | Duvar saati | Sahne | Ne değişir |
|---|---|---|---|
| **Açılış** | 0:00 | Giriş zoom (2 s) → SC-00 (6 s). Terminal satırına bir cümle kendini yazar. İlk telegraflı emir: **AŞAĞI ATLA — GÜVENLİ**. Oyuncu itaat eder, düşer | Senaryolu kayıp **bir kez**; İKNA'nın 9519 başlangıcını o üretir |
| **Reveal (birleşik)** | ~2:20 | SC-01 (8 s, **3 balon**). Kamera geri zoom-out: seviye bir embed kutusuymuş — cümlenin giriş kanalı senin sevk ettiğin widget. **Ve** cümle YOKSAY'ın icadı değil, meşru bir maddenin ikinci yarısı | Suç ortaklığı **ve** alıntı gerçeği aynı sahnede kurulur. v0'ın tek orta-oyun duruşu |
| **Doruk girişi** | ~5:15 | SC-06 (5 s, 2 balon). 3 dünya katman katman geri açılır; kovalayanın gövdesi tanınır | Kovalayan bir düşman değil, **senin kaydın** |
| **Doruk** | 5:20-7:12 | A6 → Faz 1 → R1 → FINAL (10 s) → **MERGE** (6 s) | Dövüşmezsin: yetenek tuşuna basıp onu commit grafiğinde ebeveyn düğüm yaparsın. Ayağının altındaki zemin kendi kaydın |
| **Kapanış** | 7:12-7:47 | Epilog (30 s) + kapanış (5 s). Tam momentum, kurtarılan gri sakinler yol kenarında, ufukta İletişim bölümü silüeti, azalan mesafe sayacı | Oran 0,48'de durur ve **bunun neden sıfır olmadığı** finalin son satırıdır |

**Doruk 5:20'de, epilog yalnız 35 s.** Doruk/toplam oranı 5:20/7:47 = %68; kitabın 44:45/52:13 = %86'sından erken, ama 8 dakikada kuyruk kısalmak zorundadır ve epilog **ödüllüdür** (tam momentum + sakin ödemesi + F4).

### 6.2 Ara sahneler — kalanlar, kesilenler, taşınan replikler

| ID | Kitap | v0 | Süre | Balon | Karar |
|---|---|---|---|---|---|
| SC-00 | Açılış (W0) | ✅ | 8 → **6 s** | SC00-a, SC00-b | Senaryolu itaat ve 9519 buradan doğar. Kesilemez |
| SC-01 | W1 ortası | ✅ **genişletildi** | 8 s | SC01-a, SC01-b, **SC03-a** | Embed reveal + G1 dersi + **alıntı gerçeği**. §6.3'e bakınız |
| SC-02 | W2, borç doğar | ❌ | — | — | N2 kapısı yok → borç sistemi yapısal olarak yok |
| SC-03 | W3 arşiv | ❌ sahne | — | SC03-a **→ SC-01**, SC03-b **kesildi** | Kamerası (çekmece + belgeye push) arşiv dekoruna bağlı. Repliğinin ilk yarısı taşındı; ikinci yarısı ("İlk yarısını okuma.") ekranda belge olmadan anlamsız |
| SC-04 | W3 çıkışı, zehir | ❌ | — | — | Yeşilin zehirlenmesi ÖN-FİLTRE + gölge deseni sistemi ister. **Kitabın Çehov tüfeği v0'da yok** (§6.6) |
| SC-05 | W4 çıkışı, kimlik | ❌ sahne | — | SC05-a **→ SC-06** | Kimlik reveal'i tek başına sahne taşımaz; W6 girişinde ikinci balon olur. SC05-b kesildi (W3 sabitleri yok) |
| SC-06 | W6 girişi | ✅ | 8 → **5 s** | SC06-a, **SC05-a** | v0'ın tek kimlik reveal'i |
| SC-07 | W6 Faz 2→3 | ❌ | — | — | Borç sayacı ekranı doldurur — sayaç daima 0. §6.4'e bakınız |
| **FINAL** | W6 sonu | ✅ | 18 → **10 s** | F1, F2, F3 | 4 poz → 3 poz. İlk bitirişte **atlanamaz** (kitap kuralı korundu) |
| **MERGE** | MERGE tuşu | ✅ | **6 s** | — | Dondurulmuş: sıfır-detune akorunun ödemesi |
| **EPİLOG KAPANIŞ** | EP çıkışı | ✅ | 6 → **5 s** | F4 | Oyuncu bitiş çizgisine dokununca tetiklenir |

**Sabit kalem tam dökümü — muafiyet yok:**

| Kalem | Adet | s |
|---|---|---|
| Giriş zoom | 1 | 2 |
| SC-00 | 1 | 6 |
| SC-01 | 1 | 8 |
| SC-06 | 1 | 5 |
| FINAL | 1 | 10 |
| MERGE | 1 | 6 |
| Epilog kapanış | 1 | 5 |
| **Toplam etkileşimsiz** | | **42 s** |

Atlama etkileşimi kitaptan aynen: aksiyon tuşunu **0,4 s basılı tut**; SC-00/SC-01/SC-06 için 1,2 s sonra aktif.

### 6.3 SC-01'in üç balonu — v0'ın en kritik anlatı kararı

Kitabın §3.4'ünde iki ayrı dönüm var: **Reveal 1** (5:40, embed kutusu, suç ortaklığı) ve **Dönüm 1** (22:10, arşiv, cümle bir alıntıdır). İkinci dönüm kitabın deyimiyle *"tez metaforunun kalbi"*. v0'da arşiv yok. Kalp kesilmez.

> **Karar:** SC-01, 8 saniyede **üç** balon taşır (2,6 s/balon; slot tavanı 44 karakter, kitabın in-situ ipucu okuma standardı 2,2 s → sığar):
> 1. `SC01-a` [Y] *"Kapıyı sen açtın. Kapat."* — suç ortaklığı
> 2. `SC01-b` [S] *"Kanal tek yön. Yukarı yaz."* — G1 gimmick dersi (v0'da yük taşır, kesilemez)
> 3. `SC03-a` [S] *"Cümle doğmadı. Alıntılandı."* — alıntı gerçeği
>
> Bir sahne, iki vahiy, ikisi de suç ortaklığı hakkında. 8 dakikalık bir oyunda **reveal yoğunluğu artmak zorundadır**; bu artışın taşıyıcı yeri budur.

Yan fayda: §8.4 kancası (b) — *"duraklatmada parçalanmış cümlenin boş kutuları; cümle W3'te tamamlanır"* — v0'da **cümle SC-01'de tamamlanır.** MAP ekranındaki boş kutular ~2:20'de dolar; kancanın vadesi 22 dakikadan 2,5 dakikaya iner ve kanca hâlâ çalışır.

### 6.4 Devir borcu — kesildi ve **neden içi boş bırakılmadığı**

Üç kapı (N2/W2, N4/W4, N5/W5) da kesilen dünyalarda. `delegationDebt` v0'da yapısal olarak 0.

Kolay yol, **reddedildi**: SC-07'nin N=0 varyantını (*"Hiçbirini kimse kapatmadı."*) kullanmak. Kitabın §3.2'si finalin suçlamasını şöyle tanımlar: *"bunların N tanesini başkası kapattı"* ve *"N senin kendi sayacındır"*. N daima 0 ise sahne suçlama değil **iltifat** olur — yayın tam tersi.

> **Karar:** Borç yayı **tamamen** v0 dışı. SC-02, SC-07, D1-D3 replikleri, omuz rozeti çizimi, Faz 3'ün kapalı-fiil mantığı: hiçbiri yok. Finalin baskısı iki yerden gelir: (a) oranın kendisi — 95'ten 3'e indiren şey oyuncunun **kendi kurduğu sistemleri geri alması**, (b) `F1` alayı (*"Yoksay beni. Yapamazsın."*).
>
> **Kod tarafı:** `save.debt` alanı şemada **kalır** (daima 0, 0-3 clamp korunur) ve `hud.js` borç rozetini `if (debt > 0)` dalıyla çizer. İkisi birlikte ~4 satır ve v1 geçişini **no-op** yapar. Aynısı `§15.19`'un "aydınlık temada omuzda 2×2 accent borç rozeti" satırı için geçerlidir.

**Kaybedilen, açıkça:** kitabın en özgün yapısı (devir borcu → yetenek bedeli) v0'da yok. v0 bunu gizlemek yerine ilan eder; içi boşaltılmış bir versiyonunu sevk etmek yayı **kalıcı olarak** bozar.

### 6.5 Teaser'lar, kartlar ve prose bütçesi

**Teaser'lar** (CARD katmanı, 1,4 s, **0 s bütçe maliyeti** — oyun durmaz):

| ID | Kitap yeri | v0 | Karar |
|---|---|---|---|
| T0 | W0 çıkışı | ✅ | *"İtaat ettin. Oran seni yazdı."* |
| T1 | W1 çıkışı | ✅ | *"Kanal senin imzanı taşıyor."* |
| T2 | W2 çıkışı | ✅ **taşındı** | W2 yok; kart **W1 E1 donmuş holünün içinde** çalar. Gri sakin kancası (§8.4-d) ve EP ödemesi bağlı — kesilemez |
| T3 | W3 çıkışı | ❌ | *"Yeşil bir kez yalan söyledi."* — zehir olayı yok |
| T4 | W4 çıkışı | ❌ | *"Kovalayan senin pipini takıyor."* — 3 pip ve SC-05 yok; SC-06 aynı işi yapıyor |
| T5 | W5 çıkışı | ❌ | *"Laboratuvarda yalnızsın."* — laboratuvar yok |
| T6 | W6 çıkışı | ✅ | *"Gövde tanıdık. Bakma."* |

**Dünya kartları:** W0, W1, W6, EP (4). W2-W5 kartları kesildi. **Boss tanıtımları:** KOKLAYICI, YOKSAY (2).

**v0 prose bütçesi:**

| Blok | Kitap | v0 | Not |
|---|---|---|---|
| Menü ve ekranlar (M1-M12) | 12 | **12** | Kabuk TAM |
| W0 talimat dersi (H1-H5) | 5 | **5** | Beş dersin hepsi |
| Dünya kartları | 8 | **4** | W0, W1, W6, EP |
| Teaser'lar | 7 | **4** | T0, T1, T2 (taşındı), T6 |
| Ara sahne replikleri | 14 | **7** | SC00-a/b, SC01-a/b, SC03-a, SC05-a, SC06-a |
| Boss tanıtımları | 6 | **2** | KOKLAYICI, YOKSAY |
| Revert mesajları (R1-R3) | 3 | **3** | Değişmez |
| Devir borcu (D1-D3) | 3 | **0** | Sistem yok |
| In-situ fiil ipuçları | 6 | **2** | G1 (YENİDEN YAZ), G2 (KABUK) |
| Pip mühürleri | 12 | **3** | pip 1, 2, 7 |
| Final (F1-F4) | 4 | **4** | Dördü de |
| Erişilebilirlik (A1-A2) | 2 | **2** | Değişmez |
| Portre / kayıt (X1-X2) | 2 | **2** | Değişmez |
| `lies` (yalan karo cümleleri) | (sayılmamış) | **5** | v0 **sayar** — §12-5 |
| **TOPLAM** | **84** | **55** | × 2 dil = **110 string** |

`assertGameText` kuralı 2 v0'da `n !== 55` olur. Diğer altı kural (anahtar kümesi eşitliği, 60 karakter + slot tavanı, yasak regex, ondalık yalnız `menu.m2` + `final[2]`, `lies` çeviri olamaz, kapalı konuşan kümesi) **değişmez**. `WHO` kümesi v0'da `{S, Y, R}` — Nöbetçi (`N`) yok, ama kümeyi daraltmak v1'de geri açma işi doğurur: **`{S, Y, R, N}` bırakılır**, N'li satır olmaması yeterlidir.

### 6.6 Finalin kapanışı — hangi replikle

| Sıra | ID | Metin (TR) | Yer |
|---|---|---|---|
| 1 | **F1** | *Yoksay beni. Yapamazsın.* | **Faz 1 sonu** (kitapta Faz 3 sonu — Faz 3 kesildi, replik yukarı taşındı) |
| 2 | **F2** | *Silme. Ebeveyn düğüm yap.* | MERGE tuşu belirince |
| 3 | **F3** | *Oran sıfır değil. Sıfır yalan olurdu.* | Oran 0,48'de dururken — **FINAL'in son satırı** |
| 4 | **F4** | *Ekranı kapat. Sabah derle.* | Epilog çıkışı — **oyunun son satırı** |

**FINAL `F3` ile kapanır. OYUN `F4` ile kapanır.** İkisi de dondurulmuş: `F3` ondalıkların ikinci anlatı anıdır ve tez sonucunun (%0,48, sıfır değil) doğrudan karşılığıdır; `F4` oyuncuyu monitörün başına, oyunun başladığı yere geri gönderir. Son *eylem* ise oyuncunundur: bitiş çizgisine dokunmak.

Ondalıkların üç anlatı anı korunur: (1) `M2` başlık ekranı *"Hedef: 95,19 → 0,48."*, (2) `F3`, (3) EP C7 kapısındaki `f1seal` = `F1 %83,81` (LEXICON, prose değil).

### 6.7 Merak kancaları — v0 durumu

| # | Kanca | v0 | Not |
|---|---|---|---|
| a | Aşama çıkışında enjekte teaser | ✅ | 4 teaser (T0, T1, T2, T6) |
| b | Parçalanmış cümlenin boş kutuları | ✅ | Cümle W3 yerine **SC-01'de** tamamlanır |
| c | 12 pip silüeti, kilitliler gerçek teknoloji adıyla | ✅ | **3 dolu / 9 kilitli.** v0'ın en dürüst v1 sinyali: `Hangfire`, `HttpOnly` (dolu), `pgvector`, `MCP Approvals`, `DefensiveToken`, `top-k`, `sub-agent`, `allow?`, `BiLSTM`, `F1` kilitli silüet olarak durur |
| d | Gri sakin sayacı | ✅ | W1 E1'de 20.000'e tırmanır, EP C7'de kurtarılanlar yol kenarında yürür |
| e | Commit grafiğinde gri ve sayılı düğümler | ✅ | `n/24` |
| f | Gerçek `drawScene` sahnesinin kalıcı değişmesi | ✅ | §11.5 + §15.19 aynen; 3×5 pip kafesi, caption üç durumda yazılır |
| g | **Çehov tüfeği** (26:49'da yeşilin bir kez yalan söylemesi) | ❌ | Zehir olayı yok. **Yerine:** `~` yalan karo koridoru (W1 C1, ~2:40) aynı dersi verir — "renk yalan söyler, mühür doğruyu söyler" — ama orta oyun çöküşü değil bir arazi dersidir. **Kabul edilen kayıp** |
| h | Beş sertifika mührü | ❌ | W3/W4 dönüş kapıları yok. v0'ın tek dönüş yolu 301 İZİ'nin kalıcı slug karolarıyla açılır; kilit mührü gerekmez |

---

## 7. SİSTEM ENVANTERİ — v0 alt kümesi

### 7.1 Fiil tablosu (kitaptan aynen, 3 satır)

| Fiil | Açılış | Tap: startup / active / recovery | Hold varyantı | Hareket | İptal | Cooldown |
|---|---|---|---|---|---|---|
| **YENİDEN YAZ** | W1 A1 | 3 / 6 / 4 f — 20 px önüne 1 slug tile | 7 karede bir tile, en çok 5 | `vx` %100 korunur | 4. kareden sonra zıplamaya | 0 (metre: 5 birim, yerde 24 f'de 1 dolar) |
| **KABUK** | W1 E1 (in-situ) | 2 / 15 / 6 f — 1 telegraflı glifi no-op yapar | active 42 f, `maxSpeed × 0.55` | yerde ve havada serbest | 2. kareden sonra | 18 f (kırıldıysa) |
| **MERGE** | W6, bir kez | senaryolu | — | — | — | — |

`contextResolve()` ve yazılı öncelik tablosu (telegraf açık > daha yakın düğüm > son kullanılan), HUD'un sabit fiil yuvası, çakışmada %40 alfa kuralı: **hepsi aynen korunur.** İki fiille de öncelik tablosu gereklidir (E1'de ZİL yağmuru + BORU AĞZI aynı ekranda olabilir).

### 7.2 Fiil dönüş matrisi — v0 yeniden ifadesi

Kitabın kuralı *"her fiil en az 3 dünyada yeni gramere karşı döner"*. v0'da 3 aşama var. Kural yeniden yazılır: **her fiil en az 3 farklı gramer ailesine karşı döner.**

| Fiil | Döndüğü yer | Gramer ailesi | Çift |
|---|---|---|---|
| **YENİDEN YAZ** | W1 A1 (öğretme) · W1 D1 (+BORU AĞZI tek yön) · W1 E1 (301 İZİ kalıcı iz) · W1 F1 (koşarken döşeme) · W6 Faz 1 | PUZZLE, PUZZLE, COLUMN, FLOW, GAUNTLET → **4 aile** ✅ | — |
| **KABUK** | W1 E1 (ZİL yağmuru) · W1 G1 (+DÜĞÜM konisi) · KOKLAYICI Faz 1-2 · W6 Faz 1 | GAUNTLET, PUZZLE, arena, GAUNTLET → **3 aile + 2 boss** ✅ | +DÜĞÜM (W1 G1) |
| **MERGE** | W6 MERGE | — | — |

**Fiil çifti:** kitap 10 farklı çift, tekrar yok ister. v0'da 2 fiil = 1 mümkün çift. **YENİDEN YAZ + KABUK, bir kez, W6 Faz 1'de** (dönüşümlü istenir, 18 kare zincir penceresi, §4.9'un "kombinasyon = sıralama" kuralı aynen).

### 7.3 Pip envanteri

| # | Pip | Yer | Zorunlu? | Mekanik | Gerçek dayanak |
|---|---|---|---|---|---|
| 1 | **YENİDEN YAZ** | W1 A1 sonu, URL çubuğu üstü | ✅ | fiili açar | Planora GUID→slug |
| 2 | **KABUK** | W1 E1, kablo düğümü | ✅ | fiili açar | JWT localStorage→HttpOnly |
| 7 | **301 İZİ** | W1 E1, ana yol | ✅ | Döşenen slug tile'lar 150 f yerine **kalıcı**; v0'ın tek dönüş yolunu açar | Sitemap/SEO altyapısı |
| 3,4,5,6,8-12 | PARÇALA, MÜHÜR, KANCA, ÖN-FİLTRE, ÇAPA, İKİNCİ GÖRÜŞ, ÇATAL, UZAKTAN RED, TOP-K | — | ❌ | **Kilitli silüet**, gerçek teknoloji adıyla MAP ekranında | — |

`save.pips` bitmask'i 12 bit kalır; v0'da 3 biti erişilebilir. v1 geçişi **no-op**.

### 7.4 Boss dosyaları

Ortak sözleşme kitaptan aynen: her boss kendi aşamasında öğretilmiş fiili ister, yeni kontrol öğretmez, **her fazın içinde commit taşı vardır**, faz kaybı fazı sıfırlamaz, medyan deneme hedefi **2**, ifşa düğümü daima ≤2,0 tile yatay / 1,5 tile dikey (zıplama tepesi 3,47 tile → %131 pay).

#### KOKLAYICI / SNIFFER · 2 faz · **45 s** (kitap 55) · medyan deneme 2
*Olumsuzladığı yetenek: okunabilir olmak.*
- **Faz 1 (25 s):** Üç okuma konisi yüzeyi tarar. Telegraf: koni daralır + `GÜVEN`, **42 kare**. Pencere: koni üzerindeyken **KABUK** (40 kare okunmazlık) → okuma boş döner, boss sendeler, lensi 90 kare ifşa olur. **2 boş okuma** gerekir (kitap 3 — süre kesiminin tek mekanik ödünü). Çukur yok.
- **Faz 2 (20 s):** Koniler 2'ye düşer, ZİL sürüsü ortak yağmur ekler; yağmur + koni aynı 40 karede. İfşa penceresi 60 kare. **Faz başında commit taşı.**
- **Öğrenilebilirlik garantisi korundu:** G1'de, boss'tan ~14 s önce, 1 DÜĞÜM + 1 ZİL yalıtılmış odada **cezasız** prova edilir.

#### YOKSAY / OVERRIDE · **1 faz** · **35 s** + MERGE 6 s · medyan deneme 2
*Olumsuzladığı yetenek: kendi kaydı.* Gövdesi REGRESYON'un gövdesidir, silüeti **240 karelik konum bandından** doldurulur.
- **Faz 1 — İkna (35 s):** Kazanılabilir ama pahalı. **İki fiili dönüşümlü ister** (kitap beş), 18 kare zincir penceresi. Kaçan her emir oranı yükseltir (tavan `300 + 1200 = 1500`). Telegraf 36 kare (oyuncu ≥1100'de ise **30 kare** — §3.1 tavan sonucu). **Faz içinde 2 commit taşı.** Failure-forward: kaçırmak dövüşü sıfırlamaz, zorlaştırır.
- Faz sonu: `F1` repliği.
- **Faz 2 (Filtre) ve Faz 3 (Borç) kesildi** — §2.4.
- **MERGE (6 s):** Dövüş yok. `rate` R1'in şeridiyle zaten 300 = HUD 3'te. MERGE tuşuna basılır, oran deterministik **48**'e çöker, YOKSAY commit grafiğinde ebeveyn düğüm olur. Platform 240 karelik banttan çizilir. Ses: sıfır-detune akoru.

**Boss olumsuzlama rotasyonu (§5.5 ekseni 4) korundu:** okuma (KOKLAYICI) → kendi kaydı (YOKSAY). Altı iptalden ikisi, tekrar yok.

**Zorluk bütçesi:**

| Boss | Özgün içerik | Medyan deneme | Retry (0,35 × içerik) | Medyan duvar saati |
|---|---|---|---|---|
| KOKLAYICI | 45 s | 2 | 15,8 s | 61 s |
| YOKSAY Faz 1 | 35 s | 2 | 12,3 s | 47 s |
| **Toplam** | **80 s (1:20)** | | **28 s** | **108 s (1:48)** |

Boss içeriği Defter A'nın **%20'si**, medyan duvar saatinin **%23'ü** (kitap: %17 / %20). Kısa kapsamda boss oranının yükselmesi kaçınılmaz ve kabul edilir.

### 7.5 Tile sınıfları, platformlar, kamera

| Envanter | Kitap | v0 | Kesilenler |
|---|---|---|---|
| **Tile sınıfı** | 18 (20 karakter) | **13 (15 karakter)**: `.` `#` `=` `/ \` `( )` `~` `o` `*` `!` `%` `>` `_` `C` | `^` mühür (SEAL), `T` katran (YIĞIN), `A` çapa (ÇAPA), `H` kanca (HOOK), `F` çatal (ÇATAL) |
| **Hareketli platform** | 5 | **2**: `LINEAR`, `TOKEN_PIPE` | `QUEUE_STAIR` (PARÇALA), `TUBE_CAR` (W3), `SEAL_BRIDGE` (SEAL) |
| **Kamera modu** | 6 | **4**: `free-follow`, `chase-wall`, `vertical-climb`, `highway-wide` | `tube-cut`, `ghost-race` (F1 hayalet yarışı `chase-wall` kullanır) |
| **Gimmick** | 5 | **1**: G1 (tek yön token borusu + kaygan GUID karosu) | G2-G5 |
| **Gramer ailesi** | 6 | **6** (hepsi kullanılır, §5.6) | — |
| **SFX** | 18 | **11**: jump, land, revert, commit, telegraph, window, obey, drain, verb-rewrite, verb-shell, merge | — |

§5.5 kuralı korundu: aynı kamera modu iki komşu segmentte tekrarlanamaz, W1 en az 3 mod kullanır (free-follow + vertical-climb + chase-wall ✅).

### 7.6 Erişilebilirlik ve DENGELİ MOD — kesim yok

Kitabın §4.12 ve §10.10'u **satır satır** korunur: `reduceMotion` fiziği değiştirmez ve döngüyü durdurmaz; canvas `aria-hidden`, durum mevcut `#a11y-announcer`'dan 2 s'de bir; üç gerçek `<button>`; odak tuzağı; dokunmatik DOM butonları 88×88; 3 Hz üstü yanıp sönme yok.

**DENGELİ MOD v0'da:** `speedTier` tavanı 2,20 → 1,60. v0'ın maksimum tier'ı zaten **1,55** → tavan hiç bağlamaz. Diğer üç ayar bağlar: telegraf 36 → **54 kare**, gölge kayması 2 → 3 px (yalnız `~` yalan karosunda; ETİKET yok), etiket 16×16 → 20×20 (v0'da uygulanmaz). **Karar:** anahtar kalır, `speedTier` tavanı v1 için yerinde durur, `prefers-reduced-motion` eşleşiyorsa varsayılan açık.

---

## 8. VERİ ŞEKİLLERİ — Birleştirme ajanının tükettiği sözleşmeler

### 8.1 `physicsTable` v0 (4 satır)

```js
// game/data/physics.js — ivme/sürtünme/zıplama/yerçekimi BU TABLODA DEĞİL,
// onlar sabittir ve hiçbir aşamada değişmez (kitap §4.2, §4.3).
export const PHYS = {
  w0: { speedTier: 1.00, maxSpeed: 2.60, slopeGain: 0.00, mix: 0.80 },
  w1: { speedTier: 1.15, maxSpeed: 2.99, slopeGain: 0.30, mix: 0.78 },
  w6: { speedTier: 1.35, maxSpeed: 3.51, slopeGain: 0.55, mix: 0.70 },
  ep: { speedTier: 1.55, maxSpeed: 4.03, slopeGain: 0.75, mix: 0.62 }
};
// türetilmiş: topSpeedTilePerSec = maxSpeed * 60 / TILE
// overflowCap = 1.35 * maxSpeed  (yalnız yokuş aşağı; EP: 5.44 px/f = 20,4 tile/s)
```

### 8.2 Aşama manifestosu (4 dosya, ~55 satır/dosya)

```js
// game/worlds/w1.js — şekil kitabın §10.3'ünden AYNEN, alanlar v0 değerleriyle
export default {
  id: "w1",
  name: { tr: "GÖMÜLÜ KANAL", en: "EMBEDDED CHANNEL" },
  instrument: "square2", mix: 0.78,
  phys: "w1",                       // PHYS anahtarı; gravity/accel/jump SABİT
  ghostPhys: "w0",                  // REGRESYON önceki aşamanın sabitleri
  unlock: ["REWRITE", "SHELL"],     // v0: iki fiil aynı aşamada
  rateFloor: 5200,
  drains: [                         // birim: CHUNK INDEX (§12-8 netleştirmesi)
    { afterChunk: 2, per: 1850 },   // B1 sonu
    { afterChunk: 6, per: 1850 },   // D1 sonu
    { afterChunk: 9, per: 1850, postBoss: true }  // çıkış rampası — F_w garantisi
  ],
  chunks: ["w1_rewrite_room","w1_guid_ice","w1_shelf_precision","w1_embed_split",
           "w1_lie_signs","w1_sse_pipes","w1_column_tower","w1_shell_rain",
           "w1_embed_split","w1_guid_ice"],       // son ikisi F1, aynalı + chase-wall
  cameras: ["free-follow","free-follow","free-follow","free-follow","free-follow",
            "free-follow","vertical-climb","free-follow","chase-wall","chase-wall"],
  reveal: { at: "w1_embed_split", key: "w1embed", scene: "sc01" },
  cards:  { enter: "w1", teaserExit: "t1", teaserMid: { at: "w1_shell_rain", id: "t2" } },
  pips: ["rewrite", "shell", "trail"],
  boss: "sniffer",
  budgetSec: 136, budgetTiles: 711, commits: 12, medianReverts: 6
};
```

Manifestolar **lazy**: `{ w0: () => import("./w0.js"), w1: ..., w6: ..., ep: ... }`. Rollup her aşamayı ayrı chunk yapar.

### 8.3 Chunk şekli — kitaptan aynen, v0 karakter kümesiyle

```js
// game/chunks/w1_guid_ice.js
export const w1_guid_ice = {
  w: 40, h: 17, theme: "urlbar", family: "RAMP",
  rows: [ /* 17 × 40 karakter, alfabe: . # = / \ ( ) ~ o * ! % > _ C */ ],
  spawns: {
    "1": { t: "glyph", cmd: "STOP", face:  1 },   // TALİMAT, buz üstünde (SEKME'nin dersi)
    "2": { t: "pipe",  face: -1 },                 // BORU AĞZI
    "c": { t: "commit" },
    "@": { t: "exit" }
  },
  entryY: 7, exitY: 7, minTierIn: 1.15
};
```

`decode()` (§10.3) **değişmez**. `LUT` 128'lik `Uint8Array`, v0'da 15 karakter dolu.

### 8.4 Kayıt şeması — v1-uyumlu, migration yok

```js
// sk.override.v1  — ANAHTAR DEĞİŞMEZ
{ v: 1, ts: 1785000000000,
  world: 1,            // 0 | 1 | 6 | 7(ep) — v0'da 2..5 hiç yazılmaz
  checkpoint: 5, finished: false,
  ratio: 5819,         // int, %58,19
  verbs: 0b000011,     // rewrite | shell  (bit sırası kitaptan aynen, 6 bit korunur)
  pips: 0b001000011,   // rewrite | shell | trail — 12 bit alan korunur
  debt: 0,             // v0'da DAİMA 0; 0-3 clamp okuma sırasında korunur
  residents: 18432, residentsMax: 20000,
  commits: 24, commitsSelf: 24,      // v0: commitsSelf === commits (borç yok)
  bestMs: 467000,
  seen: { w1embed: 1 },              // w3poison / w4identity anahtarları YAZILMAZ
  settings: { audio: 0, touch: "auto", balanced: 0, scale: 0 } }
```

**Yazma politikası, `try/catch`, bozuk JSON → `reset()` + toast, `migrate(from)` zinciri, bilinmeyen `v` salt-okunur, `debt` clamp, `assertFinish()`: hepsi kitaptan aynen.** v0 → v1 geçişi **migration gerektirmez**; yalnız erişilemeyen bitler erişilebilir hâle gelir.

### 8.5 `GAME_TEXT` delta

Şekil `§15.17`'den **aynen**. v0'da eksilen anahtarlar: `worlds[2..5]`, `scenes.sc02`, `scenes.sc04`, `scenes.sc07`, `bosses.{pile,guest,signature,chorus}`, `debt.{d1,d2,d3}`, `verbHints.{split,seal,hook,prefilter}`, `pips[3..6]` + `pips[8..12]` mühür satırları (adlar **kalır**, kilitli silüet için gerekli). Eklenen: yok. `lexicon` **tamamı kalır** (44 giriş + 8 aşama adı + 6 boss adı) — kilitli piplerin ve v1 hazırlığının maliyeti sıfırdır.

`scenes.sc01` üç balonlu olur:
```js
sc01: [{ who:"Y", line:"Kapıyı sen açtın. Kapat." },
       { who:"S", line:"Kanal tek yön. Yukarı yaz." },
       { who:"S", line:"Cümle doğmadı. Alıntılandı." }],   // eski SC03-a
sc06: [{ who:"S", line:"Kimse sormadı. Terminal imzaladı." },
       { who:"R", line:"Beni sen kaydettin." }],           // eski SC05-a
```

### 8.6 Kare bütçesi — değişmez sözleşme

Kitabın §10.5 tablosu (11,3 / 16,67 ms, %32 slack) **hedef olarak aynen** korunur: iç çözünürlük sabit 480×272, tam sayı ölçekle blit, tam temizlik, dirty rect yok, chunk bake yok, `imageSmoothingEnabled = false`, `Math.round(x)`, `camX = Math.round(camX)` her karede, GC baskısı sıfır (SoA + ring buffer, update döngüsünde `new` yok). Fixed timestep yapısı `boot.js` satır 183-199'da **zaten doğru** — dokunulmaz.

v0'ın ölçülen slack'i **daha yüksek** olmalıdır (4 düşman türü, ≤64 aktif entity yerine ≤40, 3 parallax katmanı yerine 2). Bu bir hedef değil beklentidir; `telemetry.js` doğrular.

---

## 9. İLK KESİLECEKLER — kapsam sarkarsa sırayla

Faz 5 gelip "acaba kesmeli miyim" diye sorulmasın diye sıra **şimdi** yazılır. Her kalem kendinden öncekiler kesildikten sonra düşünülür.

| Sıra | Kesilecek | Kazanç | Kayıp |
|---|---|---|---|
| 1 | **SICAK KANAL** (W6 A6, T6) | ~20 satır + 1 gün test | W6-lite'ın glif olmayan tek baskı mekaniği |
| 2 | **REGRESYON'un W1 F1 hayalet yarışı** (band YOKSAY için kalır) | ~60 satır (`ghost.js` 140 → 80) | SC-06'nın kimlik reveal'i dayanaksız kalır; `T6` teaser'ı zayıflar. **Ağır kayıp** |
| 3 | **W1 D1'in dikey kulesi** (T3) | 1 chunk + `vertical-climb` kamera modu (~40 satır) | COLUMN ailesi yok olur; W1 tek düzlemde geçer |
| 4 | **EP tamamen** | 320 tile + 4 chunk + `highway-wide` (~90 satır + 100 veri) | Gri sakin ödemesi, tam momentum vaadi ve `F4` gider. Oyun MERGE'te biter. **Çok ağır kayıp** |
| 5 | **MAP ekranı** | ~180 satır | §8.4 kancaları b + c ölür; kabuk "TAM" olmaktan çıkar → **frozen kararı ihlal eder, onay gerekir** |

Kesilmesi **yasak** olanlar (frozen): TITLE, PAUSE, END, RESET, ROTATE, kayıt, TR/EN, prosedürel ses, commit taşı/revert, portre kapısı, `telemetry.js`, `assertGameText`, erişilebilirlik yolu.

---

## 10. KOD VE İŞ GÜNÜ TAHMİNİ

### 10.1 Modül tablosu — v0 fiyatlaması

| Dosya | Kitap | **v0** | Durum | Neden |
|---|---|---|---|---|
| `game/scale.js` | 40 | **12** | ✅ diskte | Dondurulmuş, tamam |
| `game/launcher.js` | 400 | **580** | ✅ diskte | Faz 0 tamam; kitap 2× eksik fiyatlamış |
| `game/boot.js` | 280 | **240** | 🔶 51 satır sözleşme diskte | İçi doldurulacak |
| `game/loop.js` | 200 | **120** | ⬜ | Hitstop varyantı yalnız revert; governor `perf.js`'te |
| `game/input.js` | 460 | **320** | ⬜ | Klavye + pointer + girdi kaynağı izleyicisi. **Gamepad ertelendi** (kitap: "opsiyonel") |
| `game/physics.js` | 600 | **520** | ⬜ | Sabitler dondurulmuş; `heightmap`, swept-AABB, 10 adalet kuralı tam gerekli |
| `game/tilemap.js` | 360 | **240** | ⬜ | 13 sınıf (18 değil) |
| `game/entities.js` | 480 | **300** | ⬜ | 4 tür (13 değil), SoA havuz aynı |
| `game/verbs.js` | 660 | **200** | ⬜ | 2 fiil + MERGE + 1 pip + `contextResolve` + öncelik tablosu + 1 zincir |
| `game/enemies.js` | 820 | **260** | ⬜ | 4 telegraf durum makinesi |
| `game/bosses.js` | 700 | **260** | ⬜ | 2 boss, **3 faz** (15 değil) |
| `game/ghost.js` | 200 | **140** | ⬜ | Rail run + stumble + 240 karelik band |
| `game/render.js` | 640 | **560** | ⬜ | Katman sırası, kamera dönüşümü, palet, letterbox — **çoğu sabit maliyet** |
| `game/sprites.js` | 620 | **380** | ⬜ | `PIX`/`POSE`/`PROC` + dekoratör + atlas pişirme; daha az varlık |
| `game/font.js` | 300 | **300** | ⬜ | **Dondurulmuş** (6×10, ~95 glif, ı/İ ayrı) |
| `game/camera.js` | 220 | **160** | ⬜ | 4 mod (6 değil) |
| `game/particles.js` | 180 | **140** | ⬜ | Ring buffer, sabit maliyet |
| `game/audio.js` | 440 | **340** | ⬜ | **Prosedürel ses frozen**; 11 SFX (18 değil), detune formülü aynı |
| `game/hud.js` | 420 | **300** | ⬜ | İkna barı + fiil yuvası + commit grafiği + 12 pip sırası; borç rozeti `if` dalı |
| `game/scenes.js` | 540 | **300** | ⬜ | 4 aşama (8 değil) |
| `game/cutscene.js` | 320 | **240** | ⬜ | 4 sekans (10 değil), basılı-tut-atla aynı |
| `game/screens.js` | 640 | **480** | ⬜ | **Altı ekranın hepsi frozen**; MAP'te 3 tarih çubuğu (8 değil) |
| `game/touch.js` | 300 | **300** | ⬜ | **Dondurulmuş** (portre kapısı + yerleşim) |
| `game/save.js` | 260 | **240** | ⬜ | Şema v1-uyumlu, migration zinciri yerinde |
| `game/i18n.js` | 280 | **240** | ⬜ | 55 satır + `assertGameText` 7 kural |
| `game/telemetry.js` | 140 | **140** | ⬜ | **Frozen** — 6-8 dk iddiası ölçülmeden savunulamaz |
| `game/a11y.js` | 180 | **140** | ⬜ | Daha az durum duyurulur |
| `game/editor.js` | 360 | **200** | ⬜ | Dev-only, tree-shake. Tile boyama + **canlı zıplama yayı** + erişilebilirlik doğrulayıcı. "JS olarak kopyala" kesildi (18 chunk elle yazılır) |
| `game/perf.js` | 140 | **100** | ⬜ | Governor + histerezis |
| **Motor toplamı** | **11.180** | **7.752** | | |
| `index.astro` entegrasyonu | 420 | **305** | ✅ diskte | Faz 0 tamam |
| **Kod toplamı** | **11.600** | **8.057** | **897 diskte** | |
| `game/chunks/*.js` | 2.250 | **450** | ⬜ | 18 × ~25 |
| `game/worlds/*.js` | 440 | **220** | ⬜ | 4 manifesto × ~55 |
| `game/data/*.js` | 740 | **395** | ⬜ | Palet, paralaks, sprite, ses, pip, **oran eğrisi + fizik tablosu** |
| `game/text/*.js` | 320 | **220** | ⬜ | 55 × 2 + LEXICON (LEXICON tam kalır) |
| **Veri toplamı** | **3.750** | **1.285** | | |
| **GENEL TOPLAM** | **15.350** | **9.342** | **897 diskte → 8.445 kalan** | |

### 10.2 Kesimin gerçek getirisi — rahatsız edici bulgu

| Ölçüt | Kitap tam oyun | Kitap "v1" (§12) | Kitap v1, **dürüst** fiyatla | **v0** |
|---|---|---|---|---|
| Medyan süre | 52:13 | ~22 dk | ~22 dk | **7:47** |
| Kod + veri | 15.350 | ~8.580 | ~10.300 | **9.342** |
| İş günü | 80 | 49 | **~58** | **53** (5 harcandı + **48** kalan) |
| Özgün chunk | 90 | 34 | 34 | **18** |
| Düşman türü | 13 | ~6 | ~6 | **4** |
| Boss | 6 | 3 | 3 | **2** |
| Fiil | 6 | 4 | 4 | **3** |
| Kapalı hikâye yayı + gerçek bitiş | ✅ | ✅ | ✅ | ✅ |

**Bulgu:** süreyi 22 dakikadan 8 dakikaya kesmek **iş gününde ~5 gün** kazandırır, %64 değil. Çünkü içerik kodu (chunks, enemies, bosses, verbs, scenes) toplamın yalnız ~%35'i; kabuk (input, physics, render, font, screens, save, audio, touch, a11y, launcher) ~%60'ı ve **sıkışmıyor**.

**v0'ın gerçek getirisi gün değil risk:**

| Risk | Kitap v1 | v0 |
|---|---|---|
| Elle yazılacak chunk (kitabın kendi listelenmiş riski) | 34 | **18** |
| Ayarlanacak düşman durum makinesi | ~6 | **4** |
| Dengelenmesi gereken fiil çifti | 6 | **1** |
| Test edilecek boss faz varyantı | ~7 | **3** |
| Test edilecek borç kombinasyonu | 8 | **0** |
| Oran eğrisi aşaması (invaryant kontrolü) | 4 | **2** |
| Faz 1 go/no-go'ya kadar geçen gün | 18 | **13** |

Ayrıca: **kitabın §12'sindeki "v1 = 49 gün" iddiası sevk edilebilir bir ürün tarif etmiyor** — Faz 0-4 END/MAP/RESET ekranlarını, portre kapısını (`touch.js`), `a11y.js`'i, `perf.js`'i, epilogu ve FINAL'i içermiyor; hepsi Faz 6'da. v0 bunların **hepsini** içerir (frozen "kabuk TAM").

### 10.3 Faz planı — v0

Sürdürülebilir hız kitaptan aynen: **200 net gözden geçirilmiş satır/gün** (aralık 150-300).

| Faz | Çıktı | Kod | Veri | Gün | Kapı |
|---|---|---|---|---|---|
| **0** | `index.astro` cerrahisi, `scale.js`, overlay CSS, `launcher.js`, inert/scroll/focus/ESC, portre kapısı, FPS sayacı | 897 | 0 | **0** | ✅ **BİTTİ, DİSKTE.** En riskli entegrasyon işi bitmiş |
| **1** | `loop`, `input`, `physics`, `tilemap`, `camera`, `render`, `font`, `sprites` (yalnız Salih), `editor.js` + erişilebilirlik doğrulayıcı | 2.310 | 60 | **13** | **SERT GO/NO-GO:** test odasında koşan, zıplayan, eğimde hızlanan Salih. W0 kademesi (tier 1,00) referans. Fizik hissi 30 dakikada iyi gelmiyorsa proje kesilir |
| **2** | `entities`, `verbs` (REWRITE + SHELL), `enemies` (4 tür), `particles`, `hud`, `save`, `scenes`, `screens` (TITLE/PAUSE), `i18n`, `telemetry` | 2.220 | 300 | **13** | Kaydeden, oranı olan, telegraflı 4 düşmanı olan, **kendini ölçen** oynanabilir sistem. `assertRateCurveV0` yeşil |
| **3** | **DİKEY DİLİM:** W0 + W1 + KOKLAYICI · `ghost.js`, `audio.js`, `bosses.js`, `cutscene.js`, `boot.js` içi, 10 chunk | 1.600 | 560 | **11** | **~5 dakikalık, iki dilli, sesli, patronlu, kaydeden gerçek oyun.** Ölçüm burada yapılır |
| **4** | **DIŞ OYUN TESTİ KAPISI.** Tuning: çevrim süresi, oran ekonomisi, hayalet hızı, verim kalibrasyonu | 150 | 0 | **3** | **Geliştirici olmayan ≥5 kişi W0+W1'i bitirmeden W6'ya tek satır yazılmaz.** Telemetri JSON'ları karşılaştırılır |
| **5** | W6-lite + YOKSAY Faz 1 + MERGE + FINAL + 240 karelik band zemini, 4 chunk | 460 | 205 | **4** | Bitişi olan oyun. `assertFinish` yeşil (`ratio === 48`) |
| **6** | EP, `touch.js` portre yerleşimi, `perf.js`, `a11y.js` denetimi, MAP/END/RESET, monitör caption + pip kafesi, 4 chunk | 420 | 160 | **4** | **Sevk edilebilir** |
| | **TOPLAM (Faz 1-6)** | **7.160** | **1.285** | **48** | |

**Dikey dilim Faz 3 sonunda** (Faz 1-3 = 6.130 kod + 920 veri = 37 gün). **Faz 1 sonu tek gerçek "durdur" kapısıdır** — momentum hissi sabitlerle kazanılır, kod miktarıyla değil.

### 10.4 Faz 4'te ne ölçülür

`telemetry.js` (140 satır, frozen) Faz 2'de gelir ve Faz 4'te **bu altı sayı** okunur:

| Ölçüm | Tasarım hedefi | Kabul bandı |
|---|---|---|
| Segment duvar saati | §5.2-5.5 tablosu | segment başına ±%15 |
| Ölçülen verim (`tile / (sn × tepe_hız)`) | §5 %tepe kolonu | ±%15; sapma varsa **tile** düzeltilir |
| Revert sayısı ve konumu | W0 2 · W1 6 | ±3 |
| Boss deneme sayısı | 2 | ≤3 medyan |
| Defter B toplamı | 7:47 | **6:00-8:00** |
| Kare süresi (orta mobil) | ≤16,67 ms | %25+ slack |

Faz 4 çıktısı Defter B'yi 6:00'ın altına düşürürse §5.11'in kalibrasyon kuralı işler: **tile eklenir, iddia düzeltilmez.**

---

## 11. FROZEN SÖZLEŞMELERİN DOKUNULMAZLIK KONTROLÜ

Bu belgenin hiçbir maddesi aşağıdakileri değiştirmez. Kontrol listesi, Birleştirme ajanı için.

| Sözleşme | v0 durumu |
|---|---|
| `scale.js`: TILE 16, VIEW 480×272, CHAR 10×16, HIT 8×14, CHUNK 40×17, `pickScale` | ✅ dokunulmadı |
| `scale.js` dışında çıplak 320/180/272/480 literal'i yok | ✅ kural korundu |
| Yürüyüş fiziği: 0.20 / 0.075 / 0.14 / 0.18 / 0.06 / 0.42 / 0.09 | ✅ hiçbir aşamada değişmez |
| Zıplama: −6.60 / 0.42 / 0.26 (≤1.10, ≤3 kare) / 0.52 / 9.00 / −2.60 / 4 kare squash / coyote 6(8) / buffer 8(10) | ✅ değişmez |
| Doğrulanmış zıplama geometrisi: 17 + 16 = 33 kare, 56 px = 3,47 tile; 1./3./6./10. kare → 15/27/42/56 px | ✅ kodun üretmesi zorunlu |
| Eğim: `sin(angle) * 0.14 * slopeGain`, overflowCap 1.35×, decay 0.05, groundSnap 6 px, rotateThreshold 3.20, rotateSteps 8×11.25° | ✅ değişmez |
| Kapalı kararlar: duvar zıplaması / çift zıplama / çömelme / dash / aşağı-vuruş **yok**; yer çekimi hiçbir aşamada değişmez | ✅ |
| Fixed timestep: `acc += min(now−last, 100)`, `while (acc >= 16.667 && steps < 3)`, `if (steps === 3) acc = 0`, `render()` | ✅ `boot.js` 183-199'da zaten doğru |
| Render: iç 480×272, tam sayı blit, tam temizlik, dirty rect yok, chunk bake yok, `imageSmoothingEnabled = false`, `Math.round` | ✅ |
| GC: update döngüsünde `new`/nesne literali yok, SoA `Float32Array`, parçacık ring buffer | ✅ |
| `boot.js` satır 1-51 arayüz sözleşmesi | ✅ tek karakter değişmez |
| Geometrinin sahibi launcher; boot `canvas.width/height` yazmaz | ✅ |
| `handle`: start/pause/resume/isPaused/resize/setLang/setTheme/setReduceMotion/setAudio/destroy | ✅ |
| Kare bütçesi 11,3 / 16,67 ms | ✅ hedef olarak korundu |

---

## 12. KİTAPTA GÜNCELLENMESİ GEREKENLER

v0'ı yazarken kitapta bulunan, **v0'a özel olmayan**, kitabın kendi tutarlılığını bozan maddeler. Her biri kitabın bir sürüm atlamasını gerektirir.

| # | Bölüm | Bulgu | Önerilen düzeltme | Ağırlık |
|---|---|---|---|---|
| **1** | §8.2-2 | `rate = min(rate + OB, F_w + 1200)` formülü, `rate > F_w + 1200` iken (yani bir dünyaya girildiği andaki **normal** durumda) itaat edildiğinde oranı **düşürür**. W1'e 9519 ile girip itaat eden oyuncunun oranı 6400'e çöker — itaat ödül olur, D-2 direği tersine döner | `if (rate >= F_w + 1200) return rate; return min(rate + OB, F_w + 1200);` — tavanın üstünde itaat **no-op** | **KRİTİK** — para biriminin işareti yanlış |
| **2** | §8.2-1, §5.4 | *"Dünya çıkışında `rate === F_w` deterministiktir"* garantisi, son şeridin **boss'tan sonra** olmasını gerektirir; hiçbir yerde yazılmıyor. Boss itaat kabul ettiği için boss'tan sonra oran değişebilir | Her dünyanın **son şeridi çıkış rampasında, boss'tan sonra** kuralı yazılsın. `drains` şemasına `postBoss: true` bayrağı | **KRİTİK** — garanti aksi hâlde yanlış |
| **3** | §5.3 | Tekrar kuralının *"iki görünüm arası ≥150 s"* maddesi **mutlak saniye**; 3.133 s'lik oyunun %4,8'i. Herhangi bir kapsam kesiminde kural ya imkânsız olur ya anlamsız | Kural **oran** olarak yazılsın: *"iki görünüm arası ≥ Defter A'nın %5'i"* | **ÖNEMLİ** |
| **4** | §7.4 | REGRESYON bestiyerin 13. türü olarak listeli, ama diğer 12 ile **hiçbir sözleşmeyi paylaşmıyor**: glifi yok, telegrafı yok, hasar sınıfı A değil özel (`vx *= 0.25`, `maxSpeed *= 0.50`), `enemies.js` değil `ghost.js`'te yaşıyor, hurtbox/stomp sözleşmesine girmiyor | Bestiyer **12 tür**; REGRESYON ayrı bir kategori: *"kalıcı karşı güç"* (§3.3'te zaten öyle anlatılıyor). §7.4 ve §0'daki sayılar düzeltilsin | **ÖNEMLİ** — sınıflandırma hatası, kod mimarisini yanlış yönlendirir |
| **5** | §15.16, §15.17, §15.18 | Bütçe tablosu 84'e toplarken `lies` dizisinin 5 string'ini saymıyor; ama §15.17 onları tanımlıyor ve §15.18 kural 6 onları doğruluyor. `lies` elemanları ≥3 kelimelik cümle biçimli string, yani §15.1'in prose tanımına **giriyor** | Ya prose **89** olsun ya `lies` için açık bir "prose değil" gerekçesi yazılsın (yalan karo metni oyuncuya cümle olarak gösteriliyorsa gerekçe savunulamaz) | **ÖNEMLİ** — `assertGameText` kuralı 2 şu an ya kırılır ya `countProse` sessizce `lies`'ı atlar |
| **6** | §5.5 ekseni 3 | *"Dünya başına 3 aile, komşu dünyayla en çok 1 ortak"* kuralının amacı dünyaların birbirine benzememesi. Az dünyalı kapsamda risk tersine döner (tek dünyanın kendi içinde tekrarı) ve kural zarar verir | Kural şartlı yazılsın: *"5+ dünyalı kapsamda geçerli; daha azında aile kotası kaldırılır, tekrar boşluğu kuralı yeterlidir"* | ORTA |
| **7** | §6.2, §5.4 | Yayına Alma Koşularına konan *"7 input kararı"* şartı, koşu süresi kısaldığında kararı 2,7 s'ye sıkıştırır ve §6.2'nin kendi gerekçesi olan *"ortalama 5,7 s'de bir karar"* ile çelişir | Şart sayı değil **yoğunluk** olsun: *"≤6 s'de bir input kararı"* | ORTA |
| **8** | §10.3 `w1.js` örneği | `drains: [[18, 26], [52, 61], [74, 80]]` — yorum "gerialma seridi (chunk index)" diyor ama W1'in 9 chunk'ı var ve sayılar 18-80 arasında. Birim ya tile ya path-tile ya yüzde; belirsiz | Birim açıkça yazılsın; ayrıca çekiş miktarı (`per`) örneğin içinde görünmüyor. `{ afterChunk, per, postBoss }` gibi adlı bir şekil önerilir | ORTA |
| **9** | §3.6, §7.6, §8.3 | Faz 3'ün tasarımı `delegationDebt`'e, o da N2/N4/N5 kapılarına bağlı. Kapılar (dolayısıyla W2/W4/W5) kapsam dışı kaldığı **her** senaryoda borç yapısal olarak 0 olur ve Faz 3 amaçsız kalır; kitap bu bağımlılığı bir yerde belirtmiyor | Faz 3'ün başına bağımlılık notu: *"N2 + N4 + N5'in en az birini içermeyen kapsamda Faz 3 kesilir"* | ORTA |
| **10** | §6.6 | *"Pasif süre %3,3, 6 dk tavanının çok altında"* — bir oransal sayı ile bir mutlak tavan aynı cümlede, hangisinin bağlayıcı olduğu belirsiz. Kısa kapsamda oran zorunlu olarak yükselir, mutlak süre düşer | Hangisinin kırmızı çizgi olduğu yazılsın. Öneri: **mutlak tavan bağlayıcıdır** (oran içeriğin uzunluğuna göre serbest) | KÜÇÜK |
| **11** | §4.4 | Hız merdiveninin **adım büyüklüğü** (hiçbir adım +0,20'yi geçmiyor) yazılı olmayan bir invaryant. Kapsam kesildiğinde ara satırlar silinince adım sessizce +0,90'a çıkabilir ve boşluk grameri (§4.3) sessizce bozulur | Invaryant yazılsın: *"`speedTier` ardışık iki aşama arasında ≤0,20 artar"*, ve §4.3'ün %39 okunabilirlik tavanına bağlanmış olduğu belirtilsin | KÜÇÜK |
| **12** | §12 | *"v1 sevk kapsamı = Faz 0-4 (49 gün)"* — ama Faz 0-4 END/MAP/RESET ekranlarını, `touch.js`'i (portre kapısı), `a11y.js`'i, `perf.js`'i, epilogu ve FINAL'i **içermiyor** (hepsi Faz 6). 49 günlük çıktı bitişi ve menüsü olmayan bir üründür, "sevk edilebilir" değil | v1 tanımı Faz 6'nın kabuk kalemlerini içerecek şekilde düzeltilsin (~58 gün) ya da "sevk edilebilir" ifadesi çekilsin | **ÖNEMLİ** — planlama sayısı yanlış |

---

## 13. AÇIKÇA KABUL EDİLEN KAYIPLAR

v0'ın gizlemediği şeyler. Hiçbiri "sonra bakarız" değil; her biri v1'in gerekçesi.

| # | Kayıp | Neden kaçınılmaz | v1'de geri gelir |
|---|---|---|---|
| 1 | **Devir borcu yayı** — kitabın en özgün yapısı (görünür icra kararı → yetenek bedeli) | Üç kapı da kesilen dünyalarda; içi boş versiyonu yayı kalıcı bozar (§6.4) | ✅ N2 ile |
| 2 | **Mario/Sonic %60/%40** — v0 %75/%25 | 4 aşamalı merdiven 2,05'e çıkamaz, adım disiplini kırılır (§5.1) | ✅ 8 aşamayla |
| 3 | **Zehir olayı / Çehov tüfeği** (26:49'da yeşilin bir kez yalan söylemesi) | ÖN-FİLTRE + gölge deseni sistemi gerektiriyor | ✅ W3 + W5 ile |
| 4 | **Sessizlik anlatısı** (W5'te kovalayanın olmaması) | Yokluk ancak uzun varlıktan sonra okunur | ✅ W5 ile |
| 5 | **4 boss** (YIĞIN, SAHTE MİSAFİR, İMZA, KORO) ve olumsuzladıkları 4 yetenek | Her biri kendi fiilini gerektiriyor | ✅ |
| 6 | **5 sertifika mührü + 3 geri dönüş kapısı** | Bağlı oldukları dünyalar yok | ✅ |
| 7 | **EP'nin 29,0 tile/s tam momentumu** → v0'da 20,4 | Tier 1,55'in `overflowCap`'i | ✅ |
| 8 | **Etkileşimsiz oranın %3,3 → %10,7 çıkması** | Aynı hikâye beatleri 6,5 dakikaya sığar; mutlak süre 42 s ve tavanın 8,6 katı altında (§5.7) | ✅ süre uzayınca oran düşer |
| 9 | **12 pipin 9'u kilitli** | Bağlı fiiller yok | ✅ — kilitli silüetler v1'i **reklam eder**, kayıp yarı yarıya kazanç |
| 10 | **Boss oranının %17 → %20 çıkması** | Kısa kapsamda boss oranı yükselir | ✅ |

---

## 14. ÖZET — tek tabloda v0

| Boyut | Değer |
|---|---|
| Medyan duvar saati | **7:47** (Defter B) |
| Saf içerik | **6:33** (Defter A) |
| Hızlı / tamamlayıcı | 4:02 / 11:11 |
| Aşama | W0 (61 s) · W1 (136 s) · W6-lite (44 s) · EP (30 s) |
| Zorunlu tile | 1.583 |
| Özgün chunk | 18 (40 instance, %26 pay) |
| Fiil | YENİDEN YAZ · KABUK · MERGE |
| Düşman | TALİMAT · BORU AĞZI · DÜĞÜM · ZİL |
| Boss | KOKLAYICI (45 s, 2 faz) · YOKSAY (35 s, 1 faz) + MERGE (6 s) |
| Gimmick | G1 (tek yön token borusu + kaygan GUID) |
| Pip | 3 açık / 9 kilitli silüet |
| İKNA yolu | 9519 → 5200 → 300 → **48** · 7 görünür beat |
| Şerit | W1 3 × −1850 · W6 3 × −2050 (invaryant ✅) |
| Prose | 55 satır × 2 dil |
| Ara sahne | SC-00 · SC-01 (3 balon) · SC-06 · FINAL · MERGE · EP kapanış = **42 s** |
| Kapanış replikleri | FINAL → `F3` · oyun → `F4` |
| Kod + veri | 8.057 + 1.285 = **9.342** satır (897'si diskte) |
| Kalan iş günü | **48** (Faz 1: 13 · Faz 2: 13 · Faz 3: 11 · Faz 4: 3 · Faz 5: 4 · Faz 6: 4) |
| İlk go/no-go | Faz 1 sonu, 13. gün |
| Dış test kapısı | Faz 4, ≥5 geliştirici olmayan kişi |
