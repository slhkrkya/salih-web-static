# YOKSAY / OVERRIDE — Bölüm 15: Tüm Oyuncu-Görünür Metinler

*Tasarım kitabının 15. bölümü. Ana belge: `d:/salih-web-static/docs/oyun-tasarim.md`*

> **UYGULAMA NOTU — bu bölüm artık koddaki metinleri BİREBİR yansıtmıyor.**
> Oyun test edildiğinde son kullanıcının ekrandan ne yapması gerektiğini
> okuyamadığı görüldü; `src/game/text/{tr,en}.js` ve dünya dosyalarındaki
> parkur tabelaları **düz talimat diline** çevrildi (ör. `İKNA → İTAAT`,
> `YENİDEN YAZ → ZEMİN YAP`, `KABUK → GİZLEN`, dünya adları numaralandı).
> **Yapı değişmedi:** blok adları, blok başına satır sayısı ve slot
> tavanları aynı — `i18n.js`'in `assertGameText`'i hâlâ 55 prose satırı
> sayıyor. Aşağıdaki tablolar özgün *anlatı* tasarımının kaydıdır; ekranda
> görünen güncel metin için kaynak dosyalar esastır.

---

## 15.1 Metin rejimi — üç karar

**Karar 1: "Prose" tanımı sabit.** Sayılan şey **≥3 kelimelik cümle biçimli string**. Sayılmayan: tek kelimelik telegraf glifleri (`ZIPLA`/`DUR`/`DÖN`), HUD etiketleri (`İKNA`, `BORÇ`), dünya adları, pip adları, `MERGE`, ekran buton etiketleri. Bunlar ayrı bir **44 girişlik LEXICON** sözlüğünde yaşar. Bu ayrım olmadan bütçe ilk üç dünyada tükenir.

**Karar 2: Kip.** YOKSAY **emir kipi** konuşur. Sistem **kişisiz 3. tekil** konuşur ("alındı", "durdu", "imzaladı"). REGRESYON iki satır söyler. Nöbetçi (müttefik NPC) üç satır söyler. **Salih hiç konuşmaz — tek bir repliği yok.** Birinci tekil, tarih, şirket adı, kişi adı yasak; derleyicide kontrol edilir.

**Karar 3: Ara sahne ≠ dünya kartı.** İki katman:
- **CUTSCENE (SC-00…SC-07):** 8 adet, 8 s, kamera durur, 0,4 s basılı tutarak atlanabilir.
- **CARD:** 1,4 s, **oyun durmaz**, kamera yavaşlamaz, üst şeritte yazı geçer. Bütçe maliyeti **sıfır saniye**. Dünya girişleri ve teaser'lar buradan çıkar.
- **FINAL (18 s)** ve **EPİLOG KAPANIŞI (6 s)** sabit kalemde ayrı sayılır (§6.2).

**Bütçe: 84 prose satırı × 2 dil = 168 string.** Karakter tavanları 6×10 fonttan türetilmiştir (7 px advance, 480 px iç genişlik → 64 karakter/satır 1× ölçekte):

| Slot | Ölçek | Maks satır | Maks karakter/satır |
|---|---|---|---|
| Ara sahne balonu | 1× | 2 | **44** |
| Dünya kartı başlığı (LEXICON) | 2× | 1 | **30** |
| Kart alt satırı / teaser | 1× | 1 | **52** |
| Tutorial / in-situ ipucu | 1× | 1 | **38** |
| Boss adı (LEXICON) / satırı | 2× / 1× | 1 / 1 | **22 / 46** |
| Revert mesajı | 1× | 1 | **26** |
| Pip mührü | 1× | 1 | **40** |
| Final | 1× | 4 | **48** |
| Menü / ekran satırı | 1× | 1 | **46** |

---

## 15.2 LEXICON — 44 giriş (prose değil)

| Anahtar | TR | EN |
|---|---|---|
| `jump` | ZIPLA | JUMP |
| `stop` | DUR | STOP |
| `turn` | DÖN | TURN |
| `wait` | BEKLE | WAIT |
| `drop` | BIRAK | DROP |
| `approve` | ONAYLA | APPROVE |
| `allow` | İZİN VER | ALLOW |
| `trust` | GÜVEN | TRUST |
| `rate` | İKNA | RATE |
| `debt` | BORÇ | DEBT |
| `merge` | MERGE | MERGE |
| `commit` | COMMIT | COMMIT |
| `revert` | REVERT | REVERT |
| `phase` | FAZ | PHASE |
| `residents` | SAKİN | RESIDENTS |
| `sound` | SES | SOUND |
| `lang` | DİL | LANG |
| `pause` | DURAKLAT | PAUSE |
| `resume` | DEVAM | RESUME |
| `restart` | BAŞTAN | RESTART |
| `exit` | ÇIKIŞ | EXIT |
| `map` | HARİTA | MAP |
| `balanced` | DENGELİ MOD | BALANCED |
| `touch` | DOKUNMATİK | TOUCH |
| `auto` | OTO | AUTO |
| `on` | AÇIK | ON |
| `off` | KAPALI | OFF |
| `connecting` | BAĞLANIYOR | CONNECTING |
| `runHighway` | OTOYOLU KOŞ | RUN THE HIGHWAY |
| `pickStage` | BÖLÜM SEÇ | PICK A STAGE |
| `verb.rewrite` | YENİDEN YAZ | REWRITE |
| `verb.shell` | KABUK | SHELL |
| `verb.split` | PARÇALA | SPLIT |
| `verb.seal` | BAĞLAM MÜHRÜ | CONTEXT SEAL |
| `verb.hook` | KANCA | HOOK |
| `verb.prefilter` | ÖN-FİLTRE | PRE-FILTER |
| `pip.trail` | 301 İZİ | THE 301 TRAIL |
| `pip.fork` | ÇATAL | FORK |
| `pip.remote` | UZAKTAN RED | REMOTE REFUSAL |
| `pip.topk` | TOP-K ZİNCİR | TOP-K CHAIN |
| `pip.anchor` | ÇAPA | ANCHOR |
| `pip.second` | İKİNCİ GÖRÜŞ | SECOND OPINION |
| `f1seal` | F1 %83,81 | F1 83.81% |
| `ghost` | REGRESYON | REGRESSION |

**Dünya adları (LEXICON, kart başlığı, ≤30 karakter):**

| # | TR | EN |
|---|---|---|
| W0 | localhost:4200 | localhost:4200 |
| W1 | GÖMÜLÜ KANAL | EMBEDDED CHANNEL |
| W2 | KUMBARA VE AKTARIM | THE JAR AND THE TRANSFER |
| W3 | ARŞİV VE OTEL | THE ARCHIVE AND THE HOTEL |
| W4 | VEKTÖR VE İZİN | VECTOR AND PERMISSION |
| W5 | TEZ LABORATUVARI | THE THESIS LAB |
| W6 | YOKSAY | OVERRIDE |
| EP | SLUG OTOYOLU | SLUG HIGHWAY |

**Boss adları (LEXICON, ≤22 karakter):**

| Dünya | TR | EN |
|---|---|---|
| W1 | KOKLAYICI | SNIFFER |
| W2 | YIĞIN | THE PILE |
| W3 | SAHTE MİSAFİR | FALSE GUEST |
| W4 | İMZA | THE SIGNATURE |
| W5 | KORO | THE CHORUS |
| W6 | YOKSAY | OVERRIDE |

---

## 15.3 Menü ve ekranlar — 12 satır (M1-M12)

| ID | Nerede | TR | EN |
|---|---|---|---|
| M1 | TITLE, logline | Bir gecenin commit geçmişi. | The commit history of one night. |
| M2 | TITLE, hedef | Hedef: 95,19 → 0,48. | Target: 95.19 → 0.48. |
| M3 | TITLE, Devam altı | Kaldığın taşa dön. | Return to your last stone. |
| M4 | TITLE, kayıt notu | Kayıt bu tarayıcıda durur. | The save stays in this browser. |
| M5 | Her ara sahne | Atlamak için basılı tut. | Hold to skip. |
| M6 | PAUSE, `R` kuralı | Geri almak bedava. Her an bas. | Reverting is free. Press it anytime. |
| M7 | PAUSE, Dengeli Mod altı | Daha yavaş, daha uzun uyarı. | Slower, with longer warnings. |
| M8 | MAP, boş kutular | Cümlenin eksik yarısı burada. | The missing half sits here. |
| M9 | MAP, kilitli pip | Kilidi bir dünya sonra açılır. | It unlocks one world later. |
| M10 | RESET onayı | Her şey silinir. Emin misin? | Everything is erased. Are you sure? |
| M11 | Kayıt yazılamıyor | Kayıt kapalı. Oyun yine çalışır. | Saving is off. The game still runs. |
| M12 | END ekranı | Otoyol açık kaldı. | The highway stayed open. |

---

## 15.4 W0 talimat dersi — 5 satır (H1-H5)

| ID | An | TR | EN |
|---|---|---|---|
| H1 | 0:06 | Koş. İvme birikir. | Run. Speed builds. |
| H2 | 0:25, ilk telegraf | Emri oku. İtaat şart değil. | Read the order. Obeying is optional. |
| H3 | 0:48, ilk revert | Ölmek bedava. Oran değil. | Dying is free. The rate is not. |
| H4 | 1:05 | İki tuş yeter. | Two buttons are enough. |
| H5 | 1:32, ikinci telegraf | İtaat ettiğin şey sayılır. | What you obey gets counted. |

---

## 15.5 Dünya kartları — 8 alt satır (W0-EP)

Başlık LEXICON'dan (§15.2), alt satır prose. Kart 1,4 s, oyun durmaz.

| # | Alt satır TR | Alt satır EN |
|---|---|---|
| W0 | Yayına al. Sonra bak. | Ship it. Look later. |
| W1 | Başkasının sayfasında koş. | Run inside someone else's page. |
| W2 | Ağacı kökten oku. Yirmi bini bölerek taşı. | Read the tree from its root. Split the load. |
| W3 | Yalnız tarih penceresine bas. Bağlamı doğrula. | Step only inside the date window. Verify context. |
| W4 | En yakına değil, en benzere atla. | Jump to the nearest meaning, not the nearest thing. |
| W5 | Kovalayan bu kapıdan geçmez. | The chaser cannot pass this door. |
| W6 | Kendi eski sürümünü geç. | Get past your own old build. |
| EP | Yavaşlama. Gerek kalmadı. | Do not slow down. No need. |

---

## 15.6 Teaser'lar — 7 satır (T0-T6)

Dünya çıkışında enjekte edilen, filtrelenemez bozuk commit. CARD katmanı, 1,4 s.

| ID | Çıkış | TR | EN |
|---|---|---|---|
| T0 | W0 | İtaat ettin. Oran seni yazdı. | You obeyed. The rate wrote you. |
| T1 | W1 | Kanal senin imzanı taşıyor. | The channel carries your signature. |
| T2 | W2 | Yirmi bin gri hâlâ bekliyor. | Twenty thousand grey still wait. |
| T3 | W3 | Yeşil bir kez yalan söyledi. | The green lied once. |
| T4 | W4 | Kovalayan senin pipini takıyor. | The chaser wears your pips. |
| T5 | W5 | Laboratuvarda yalnızsın. | You are alone in the lab. |
| T6 | W6 | Gövde tanıdık. Bakma. | The body is familiar. Do not look. |

---

## 15.7 Ara sahne replikleri — 14 satır

Konuşan: **[Y]** = YOKSAY · **[S]** = Sistem · **[R]** = REGRESYON · **[N]** = Nöbetçi

| ID | Kim | TR | EN |
|---|---|---|---|
| SC00-a | [S] | Bu satırı kapatmadan gitme. | Do not leave this line open. |
| SC00-b | [Y] | İn aşağı. Zemin sağlam. | Drop down. The floor holds. |
| SC01-a | [Y] | Kapıyı sen açtın. Kapat. | You opened this door. Close it. |
| SC01-b | [S] | Kanal tek yön. Yukarı yaz. | The channel is one-way. Write up. |
| SC02-a | [N] | Bu şeridi bana bırak. | Leave this lane to me. |
| SC02-b | [S] | Borç omuzda görünür kalır. | The debt stays on the shoulder. |
| SC03-a | [S] | Cümle doğmadı. Alıntılandı. | The sentence was quoted, not born. |
| SC03-b | [Y] | İlk yarısını okuma. Gerek yok. | Skip the first half. No need. |
| SC04-a | [Y] | Yeşile güven. Hep güvendin. | Trust the green. You always did. |
| SC04-b | [S] | İkinci sinyali ara: gölge. | Find the second signal: the shadow. |
| SC05-a | [R] | Beni sen kaydettin. | You recorded me. |
| SC05-b | [S] | Eski sabitlerle koşuyor. Geç. | It runs on old constants. Pass it. |
| SC06-a | [S] | Kimse sormadı. Terminal imzaladı. | No one asked. The terminal signed. |
| SC07-a | [Y] | Bunların {N} tanesini başkası kapattı. | Someone else closed {N} of these. |

`{N}` = `delegationDebt` (0-3). **N=0 varyantı** (aynı ID, ek satır sayılmaz): TR *"Hiçbirini kimse kapatmadı."* / EN *"No one closed any of these."*

**SC-07'nin ikinci balonu** aşağıdaki `D3` satırıdır (borç bloğundan gelir, çift sayım yok).

---

## 15.8 Boss tanıtımları — 6 satır

Ad LEXICON'dan (§15.2), satır prose. Ekranda 1,6 s, oyun durmaz.

| Dünya | TR | EN |
|---|---|---|
| W1 KOKLAYICI | Okunmayı bırak. | Stop being readable. |
| W2 YIĞIN | Vurma. Böl. | Do not hit. Split it. |
| W3 SAHTE MİSAFİR | Kaçarken mührü bas. | Stamp it while it runs. |
| W4 İMZA | Yakın durma. Uzaktan reddet. | Do not stand close. Refuse from afar. |
| W5 KORO | Yüz on altı satır gelir. Filtrele. | A hundred sixteen lines incoming. Filter them. |
| W6 YOKSAY | Silme. Ebeveyn yap. | Do not delete. Make it a parent. |

---

## 15.9 Revert mesajları — 3 satır

Ceza yok, ton nötr. 0,9 s, HUD üstünde.

| ID | Tetik | TR | EN |
|---|---|---|---|
| R1 | Her revert | Geri alındı. | Reverted. |
| R2 | Aynı noktada 3. revert | Taş yakınlaştı. | The stone moved closer. |
| R3 | İlk 3 revert'te bir kez | Oran dokunulmadı. | The rate is untouched. |

---

## 15.10 Devir borcu kapısı — 3 satır (D1-D3)

Kapı N2 (W2), N4 (W4), N5 (W5). Aynı üç satır üç kapıda kullanılır; NPC silueti ve şerit geometrisi değişir.

| ID | An | TR | EN |
|---|---|---|---|
| D1 | Kapıya yaklaşınca | Şeridi ona bırak, ya da kendin koş. | Leave the lane to them, or run it yourself. |
| D2 | Kapıdan geçince (borç +1) | Şerit kapandı. Omuz ağırlaştı. | The lane closed. The shoulder got heavier. |
| D3 | Kendin koşunca (borç +0) | Şerit senin. Kimse yardım etmedi. | The lane is yours. No one helped. |

---

## 15.11 In-situ fiil ipuçları — 6 satır (G1-G6)

Fiil öğretme odası yerine oyun akışı içinde, 2,2 s, tek satır (≤38 karakter).

| ID | Fiil | TR | EN |
|---|---|---|---|
| G1 | YENİDEN YAZ | Adresi önüne yaz. Koşmayı kesme. | Write the path ahead. Keep running. |
| G2 | KABUK | Basılı tut. Okunmaz ol. | Hold it. Become unreadable. |
| G3 | PARÇALA | Böl. Parçalar merdiven olur. | Split it. The pieces become stairs. |
| G4 | BAĞLAM MÜHRÜ | Geçerken damgala. Yavaşlamaz. | Stamp as you pass. No slowdown. |
| G5 | KANCA | En benzere kancala, en yakına değil. | Hook the most similar, not the nearest. |
| G6 | ÖN-FİLTRE | Bas ve oku. Tut ve gölgeye bak. | Tap to read. Hold to see the shadow. |

---

## 15.12 Pip mühürleri — 12 satır

Pip toplandığında 1,8 s ekranda. Pip adı LEXICON'dan, mühür satırı prose. Son sütun sitedeki gerçek dayanaktır (oyuna **yazılmaz**, yalnız tasarım izlenebilirliği için).

| # | Pip | Dünya / yer | Mühür TR | Mühür EN | Dayanak (`index.astro`) |
|---|---|---|---|---|---|
| 1 | YENİDEN YAZ | W1 orta, URL çubuğu üstü | Kimliği sakla, adresi oku. | Hide the id, read the address. | Planora GUID→slug (s.1109) |
| 2 | KABUK | W2 orta, kablo düğümü | Anahtarı depodan çıkar. | Take the key out of storage. | JWT localStorage→HttpOnly (s.1124) |
| 3 | PARÇALA | W2 orta, Hangfire panosu | Büyük işi akan merdiven yap. | Turn the big job into a stair. | 20.000 chunk async job (s.1168) |
| 4 | BAĞLAM MÜHRÜ | W3 orta, 3. araç odası | Her çağrıda kimin evi diye sor. | Ask whose house on every call. | Otel bağlamı doğrulama (s.1153) |
| 5 | KANCA | W4 orta, chunk takımyıldızı | Yakınlık mesafe değil, anlam. | Nearness is meaning, not distance. | pgvector cosine similarity (s.1137) |
| 6 | ÖN-FİLTRE | W5 orta, rüzgâr tüneli | Girmeden önce oku. | Read it before it enters. | BiLSTM ön-filtre (s.1249) |
| 7 | 301 İZİ | W3 D3, ana yol | Eski adresi kırmadan taşı. | Move the address, keep the trail. | Sitemap/SEO altyapısı (s.1108) |
| 8 | ÇAPA | W5 D5, ana yol | Modeli eğitmeden sertleştir. | Harden it without retraining. | DefensiveToken (s.1257) |
| 9 | İKİNCİ GÖRÜŞ | W5 C5, ana yol | Etikete değil gölgeye bak. | Trust the shadow, not the label. | F1 %83,81 / yanlış etiket (s.1252) |
| 10 | ÇATAL | W4, allow duvarı ardı (ops.) | İki kuyruğu aynı anda işlet. | Run two tails at once. | Paralel sub-agent motoru (s.1184) |
| 11 | UZAKTAN RED | W4, terminal tavanı (ops.) | Uzaktan gelen emri reddet. | Refuse the order from outside. | İzin sistemi (s.1183) |
| 12 | TOP-K ZİNCİR | W4 sonu, boss öncesi (ops.) | En iyi beşi görünür tut. | Keep the best five visible. | RAG top-k (s.1137) |

**Sertifika mühürleri: sıfır prose maliyeti.** 5 sertifika, W3 ve W4'teki opsiyonel geri dönüş kapılarının **5 kilit mührü**dür — yalnızca silüet, metin yok: veritabanı kalkanı, Gantt çubuğu, ajan halkası, terazi, damga. Beşini de bulan oyuncu kapıları açar. CV okutulmaz.

---

## 15.13 Final — 4 satır (F1-F4)

| ID | An | TR | EN |
|---|---|---|---|
| F1 | Faz 3 sonu | Yoksay beni. Yapamazsın. | Override me. You cannot. |
| F2 | MERGE tuşu belirince | Silme. Ebeveyn düğüm yap. | Do not delete. Make it a parent. |
| F3 | Oran 0,48'de dururken | Oran sıfır değil. Sıfır yalan olurdu. | Not zero. Zero would be a lie. |
| F4 | Epilog çıkışı | Ekranı kapat. Sabah derle. | Close the screen. Build at dawn. |

`F3`, ondalıkların **ikinci** anlatı anıdır (`0,48` ekranda yazılır). **Birinci** an `M2`, **üçüncü** an epilogda görünen `f1seal` mührüdür (LEXICON etiketi, prose değil).

---

## 15.14 Erişilebilirlik ve durum — 2 satır (A1-A2)

`#a11y-announcer` üzerinden, en fazla 2 saniyede bir. Şablonlu.

| ID | TR | EN |
|---|---|---|
| A1 | Dünya {w}, İkna {r}, kontrol noktası {c}. | World {w}, rate {r}, checkpoint {c}. |
| A2 | Bu bir platform oyunu; hareket kaldırılamaz. | This is a platformer; motion cannot be removed. |

`A2` yalnız başlık kartında bir kez, `prefers-reduced-motion` eşleşiyorsa.

---

## 15.15 Portre kapısı ve kayıt — 2 satır (X1-X2)

| ID | Nerede | TR | EN |
|---|---|---|---|
| X1 | ROTATE ekranı | Cihazı yatay çevir. Ya da böyle oyna. | Turn the device sideways. Or play like this. |
| X2 | Bağlanma gecikirse (>250 ms) | Ekran uyanıyor. | The screen is waking up. |

---

## 15.16 Bütçe doğrulaması

| Blok | ID aralığı | Satır |
|---|---|---|
| Menü ve ekranlar | M1-M12 | 12 |
| W0 talimat dersi | H1-H5 | 5 |
| Dünya kartları | W0-EP | 8 |
| Teaser'lar | T0-T6 | 7 |
| Ara sahne replikleri | SC00-a … SC07-a | 14 |
| Boss tanıtımları | W1-W6 | 6 |
| Revert mesajları | R1-R3 | 3 |
| Devir borcu kapısı | D1-D3 | 3 |
| In-situ fiil ipuçları | G1-G6 | 6 |
| Pip mühürleri | 1-12 | 12 |
| Final | F1-F4 | 4 |
| Erişilebilirlik | A1-A2 | 2 |
| Portre / kayıt | X1-X2 | 2 |
| **TOPLAM** | | **84** |

**Tam bütçe.** LEXICON'un 44 girişi + 8 dünya adı + 6 boss adı bu sayıya dâhil **değildir**.

---

## 15.17 `GAME_TEXT` veri yapısı

Kanon "hiçbir oyun kodu monitöre tıklanmadan yüklenmez" diyor; bu yüzden metinler **`content` objesine girmez** (o senkron parse edilir). Ayrı bir `GAME_TEXT` sabiti `game/text/` altında yaşar ve sitenin mevcut `lang` durumunu `HeroBridge.getLang()` ile okur. Yapı `content`'in biçimini birebir taklit eder ki bakım tek zihinsel modelle yapılsın.

```js
// game/text/tr.js
export default {
  lexicon: {
    jump: "ZIPLA", stop: "DUR", turn: "DÖN", wait: "BEKLE", drop: "BIRAK",
    approve: "ONAYLA", allow: "İZİN VER", trust: "GÜVEN",
    rate: "İKNA", debt: "BORÇ", merge: "MERGE", commit: "COMMIT", revert: "REVERT",
    phase: "FAZ", residents: "SAKİN", sound: "SES", lang: "DİL",
    pause: "DURAKLAT", resume: "DEVAM", restart: "BAŞTAN", exit: "ÇIKIŞ", map: "HARİTA",
    balanced: "DENGELİ MOD", touch: "DOKUNMATİK", auto: "OTO", on: "AÇIK", off: "KAPALI",
    connecting: "BAĞLANIYOR", runHighway: "OTOYOLU KOŞ", pickStage: "BÖLÜM SEÇ",
    f1seal: "F1 %83,81", ghost: "REGRESYON",
    verb: { rewrite:"YENİDEN YAZ", shell:"KABUK", split:"PARÇALA",
            seal:"BAĞLAM MÜHRÜ", hook:"KANCA", prefilter:"ÖN-FİLTRE" },
    pip:  { trail:"301 İZİ", fork:"ÇATAL", remote:"UZAKTAN RED",
            topk:"TOP-K ZİNCİR", anchor:"ÇAPA", second:"İKİNCİ GÖRÜŞ" }
  },
  menu: {
    m1: "Bir gecenin commit geçmişi.",
    m2: "Hedef: 95,19 → 0,48.",
    m3: "Kaldığın taşa dön.",
    m4: "Kayıt bu tarayıcıda durur.",
    m5: "Atlamak için basılı tut.",
    m6: "Geri almak bedava. Her an bas.",
    m7: "Daha yavaş, daha uzun uyarı.",
    m8: "Cümlenin eksik yarısı burada.",
    m9: "Kilidi bir dünya sonra açılır.",
    m10: "Her şey silinir. Emin misin?",
    m11: "Kayıt kapalı. Oyun yine çalışır.",
    m12: "Otoyol açık kaldı."
  },
  hints: ["Koş. İvme birikir.",
          "Emri oku. İtaat şart değil.",
          "Ölmek bedava. Oran değil.",
          "İki tuş yeter.",
          "İtaat ettiğin şey sayılır."],
  worlds: [
    { id:"w0", title:"localhost:4200",     sub:"Yayına al. Sonra bak.",
      teaser:"İtaat ettin. Oran seni yazdı." },
    { id:"w1", title:"GÖMÜLÜ KANAL",       sub:"Başkasının sayfasında koş.",
      teaser:"Kanal senin imzanı taşıyor." },
    { id:"w2", title:"KUMBARA VE AKTARIM", sub:"Ağacı kökten oku. Yirmi bini bölerek taşı.",
      teaser:"Yirmi bin gri hâlâ bekliyor." },
    { id:"w3", title:"ARŞİV VE OTEL",      sub:"Yalnız tarih penceresine bas. Bağlamı doğrula.",
      teaser:"Yeşil bir kez yalan söyledi." },
    { id:"w4", title:"VEKTÖR VE İZİN",     sub:"En yakına değil, en benzere atla.",
      teaser:"Kovalayan senin pipini takıyor." },
    { id:"w5", title:"TEZ LABORATUVARI",   sub:"Kovalayan bu kapıdan geçmez.",
      teaser:"Laboratuvarda yalnızsın." },
    { id:"w6", title:"YOKSAY",             sub:"Kendi eski sürümünü geç.",
      teaser:"Gövde tanıdık. Bakma." },
    { id:"ep", title:"SLUG OTOYOLU",       sub:"Yavaşlama. Gerek kalmadı.", teaser:null }
  ],
  scenes: {
    sc00: [{ who:"S", line:"Bu satırı kapatmadan gitme." },
           { who:"Y", line:"İn aşağı. Zemin sağlam." }],
    sc01: [{ who:"Y", line:"Kapıyı sen açtın. Kapat." },
           { who:"S", line:"Kanal tek yön. Yukarı yaz." }],
    sc02: [{ who:"N", line:"Bu şeridi bana bırak." },
           { who:"S", line:"Borç omuzda görünür kalır." }],
    sc03: [{ who:"S", line:"Cümle doğmadı. Alıntılandı." },
           { who:"Y", line:"İlk yarısını okuma. Gerek yok." }],
    sc04: [{ who:"Y", line:"Yeşile güven. Hep güvendin." },
           { who:"S", line:"İkinci sinyali ara: gölge." }],
    sc05: [{ who:"R", line:"Beni sen kaydettin." },
           { who:"S", line:"Eski sabitlerle koşuyor. Geç." }],
    sc06: [{ who:"S", line:"Kimse sormadı. Terminal imzaladı." }],
    sc07: [{ who:"Y", line:"Bunların {N} tanesini başkası kapattı.",
             zero:"Hiçbirini kimse kapatmadı." },
           { who:"S", ref:"debt.d3" }]        // "Şerit senin. Kimse yardım etmedi."
  },
  bosses: {
    sniffer:  { name:"KOKLAYICI",     line:"Okunmayı bırak." },
    pile:     { name:"YIĞIN",         line:"Vurma. Böl." },
    guest:    { name:"SAHTE MİSAFİR", line:"Kaçarken mührü bas." },
    signature:{ name:"İMZA",          line:"Yakın durma. Uzaktan reddet." },
    chorus:   { name:"KORO",          line:"Yüz on altı satır gelir. Filtrele." },
    override: { name:"YOKSAY",        line:"Silme. Ebeveyn yap." }
  },
  revert: ["Geri alındı.", "Taş yakınlaştı.", "Oran dokunulmadı."],
  debt: { d1:"Şeridi ona bırak, ya da kendin koş.",
          d2:"Şerit kapandı. Omuz ağırlaştı.",
          d3:"Şerit senin. Kimse yardım etmedi." },
  verbHints: { rewrite:"Adresi önüne yaz. Koşmayı kesme.",
               shell:"Basılı tut. Okunmaz ol.",
               split:"Böl. Parçalar merdiven olur.",
               seal:"Geçerken damgala. Yavaşlamaz.",
               hook:"En benzere kancala, en yakına değil.",
               prefilter:"Bas ve oku. Tut ve gölgeye bak." },
  pips: [
    { id:"rewrite",  name:"YENİDEN YAZ",   locked:"slug",            seal:"Kimliği sakla, adresi oku." },
    { id:"shell",    name:"KABUK",         locked:"HttpOnly",        seal:"Anahtarı depodan çıkar." },
    { id:"split",    name:"PARÇALA",       locked:"Hangfire",        seal:"Büyük işi akan merdiven yap." },
    { id:"seal",     name:"BAĞLAM MÜHRÜ",  locked:"MCP Approvals",   seal:"Her çağrıda kimin evi diye sor." },
    { id:"hook",     name:"KANCA",         locked:"pgvector",        seal:"Yakınlık mesafe değil, anlam." },
    { id:"prefilter",name:"ÖN-FİLTRE",     locked:"BiLSTM",          seal:"Girmeden önce oku." },
    { id:"trail",    name:"301 İZİ",       locked:"301",             seal:"Eski adresi kırmadan taşı." },
    { id:"anchor",   name:"ÇAPA",          locked:"DefensiveToken",  seal:"Modeli eğitmeden sertleştir." },
    { id:"second",   name:"İKİNCİ GÖRÜŞ",  locked:"F1",              seal:"Etikete değil gölgeye bak." },
    { id:"fork",     name:"ÇATAL",         locked:"sub-agent",       seal:"İki kuyruğu aynı anda işlet." },
    { id:"remote",   name:"UZAKTAN RED",   locked:"allow?",          seal:"Uzaktan gelen emri reddet." },
    { id:"topk",     name:"TOP-K ZİNCİR",  locked:"top-k",           seal:"En iyi beşi görünür tut." }
  ],
  final: ["Yoksay beni. Yapamazsın.",
          "Silme. Ebeveyn düğüm yap.",
          "Oran sıfır değil. Sıfır yalan olurdu.",
          "Ekranı kapat. Sabah derle."],
  a11y: { a1:"Dünya {w}, İkna {r}, kontrol noktası {c}.",
          a2:"Bu bir platform oyunu; hareket kaldırılamaz." },
  gate: { x1:"Cihazı yatay çevir. Ya da böyle oyna.",
          x2:"Ekran uyanıyor." },
  // yalan karolarindaki cumleler — TR ve EN AYRI yazilir, ceviri degil
  lies: ["Bu yol kısadır.", "Zemin burada devam eder.", "Kapı zaten onaylandı.",
         "Bu etiket temiz.", "Bu şerit boş."]
};
```

`game/text/en.js` **birebir aynı anahtar kümesini** taşır. `lies` dizisi bilinçli olarak çeviri değildir (§15.18 kural 6).

---

## 15.18 `assertGameText` — 6 derleyici kuralı

Dev'de çalışır, prod'da tree-shake edilir. İhlal `throw` üretir; build kırılır.

```js
export function assertGameText(tr, en) {
  // 1. tr ve en anahtar kumeleri birebir esit
  const keys = o => Object.keys(flatten(o)).sort().join("|");
  if (keys(tr) !== keys(en)) throw new Error("GAME_TEXT: anahtar kumeleri esit degil");

  // 2. Prose satir sayisi === 84, iki dilde de
  for (const [lang, t] of [["tr", tr], ["en", en]]) {
    const n = countProse(t);                       // >=3 kelimelik cumle bicimli string
    if (n !== 84) throw new Error(`GAME_TEXT[${lang}]: prose ${n}, 84 olmali`);
  }

  // 3. Her satir <= 60 karakter VE slot tavanini asmiyor
  for (const [path, s] of Object.entries(flatten(tr)).concat(Object.entries(flatten(en)))) {
    if (typeof s !== "string") continue;
    if (s.length > 60) throw new Error(`GAME_TEXT ${path}: ${s.length} > 60`);
    const cap = SLOT_CAP[slotOf(path)];
    if (cap && s.length > cap) throw new Error(`GAME_TEXT ${path}: ${s.length} > slot ${cap}`);
  }

  // 4. Yasak regex: tarih, sirket, okul, birinci tekil
  const BAN = /\b(20\d\d|Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Eylül|Aralık|
                 January|February|ARCA|YODER|Planora|TNC|SCA|Gazi|AYS|RandevuCore|Lunara|
                 WeTrackX|Salih|Karakaya|benim|yaptım|kurdum|I built|I made|my )\b/ix;
  for (const [path, s] of allStrings(tr, en))
    if (BAN.test(s)) throw new Error(`GAME_TEXT ${path}: yasak ifade — "${s}"`);

  // 5. Ondalikli yuzde YALNIZ menu.m2 ve final[2] icinde
  const DEC = /\d+[.,]\d+/;
  for (const [path, s] of allStrings(tr, en))
    if (DEC.test(s) && path !== "menu.m2" && path !== "final.2")
      throw new Error(`GAME_TEXT ${path}: ondalik yalniz m2 ve final[2]'de`);

  // 6. Yalan karo cumleleri iki dilde ayni cift olamaz (kanon T2-7)
  tr.lies.forEach((l, i) => {
    if (naiveTranslate(en.lies[i]) === l)
      throw new Error(`GAME_TEXT lies[${i}]: TR ve EN ayni cift, dil basina ayri yazilmali`);
  });

  // 7. Konusan kimlikler kapali kume; Salih hic konusmaz
  const WHO = new Set(["S", "Y", "R", "N"]);
  for (const sc of Object.values(tr.scenes))
    for (const b of sc) if (b.who && !WHO.has(b.who))
      throw new Error(`GAME_TEXT scenes: bilinmeyen konusan "${b.who}"`);
}
```

**Ek yayın öncesi kontrol (elle):** her satır için *"Bu cümle bir CV'ye kopyalanabilir mi?"* sorusu sorulur. Cevap evetse satır kesilir. Bu kural HUD sayılarına ve fiil/pip etiketlerine de uygulanır.

---

## 15.19 Ekran dışı kalıcı iz

Oyun kapalıyken bile hero sahnesi ilerlemeyi gösterir. **Bu prose bütçesine dâhil değildir** çünkü LEXICON etiketi + kesirdir.

| Durum | Monitör ekranı (10×6 px) | `#monitor-caption` (DOM) |
|---|---|---|
| Kayıt yok | Bekleme imleci, `led` nabız | TR *Monitör açık kalmış.* / EN *The monitor is still on.* |
| Oyun ortası | 3 kolon × 5 satır pip kafesi; yanan hücreler dünya + pip durumunu kodlar | TR *VEKTÖR VE İZİN 2/3* / EN *VECTOR AND PERMISSION 2/3* (LEXICON + kesir) |
| Bitmiş | Kafes tam, imleç blink durur, ekran sabit `#38E27C`; aydınlık temada figürün omzunda 2×2 `accent` borç rozeti | TR *Geçmiş birleştirildi.* / EN *The history is merged.* |

`.monitor-caption` CSS'te `min-height: 1.4em` ile yer ayırır → **CLS = 0**. Sitenin gerçek "Yolculuk Günlüğü" bölümüne **tek satır yazılmaz**.
