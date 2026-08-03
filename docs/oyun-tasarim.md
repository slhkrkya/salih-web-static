# YOKSAY / OVERRIDE — Tasarım Kitabı v2.0

*Tek doğruluk kaynağı. Kanonik konsept v1.0, altı departman tasarımı ve üç denetim raporu bu belgede tek karara bağlanmıştır. Bu belge ile çelişen hiçbir önceki not geçerli değildir.*

Kaynak doğrulaması: `d:\salih-web-static\src\pages\index.astro` — satır 62-74 (palet değişkenleri), 122-132 (`.pixel-frame`, `clip-path` + `filter`), 227-254 (`.speech-bubble`), 860-879 (hero DOM, iç içe buton), 1031-1343 (TR `content`, biyografi/projeler/tez), 1655-1656 (`reduceMotion`, `scenePaused`), 1699-1713 (`cssVar`, `makeCanvas`), 1715-1741 (`ensureStars`), 1742-1903 (`drawScene`), 1905-1923 (`initScene`), 2569-2573 (`updateScenePauseState`).

---

## 0. DONDURULMUŞ KARARLAR

Bu tablodaki hiçbir satır uygulama sırasında tartışmaya açılmaz. Değişmesi gerekiyorsa bu belge sürüm atlar.

| Karar | Değer | Neden dondu |
|---|---|---|
| **Ölçek sözleşmesi** | `TILE = 16`, `VIEW_W = 480`, `VIEW_H = 272` (30 × 17 tile), karakter `10 × 16` px, hitbox `8 × 14` | Dört departman üç farklı ölçek kullanıyordu; tek kontrat `game/scale.js` |
| **Ölçek faktörü** | `s = Math.max(1, Math.floor(Math.min(cssW*dpr/480, cssH*dpr/272)))`, backing `480s × 272s`, CSS `480s/dpr` px | Cihaz pikselinde tam sayı; kesirli ölçek shimmer üretiyordu |
| **Dünya sayısı** | **6 dünya** (W1-W6) + 1 prolog (W0) + 1 epilog (EP) | 11 dünya sevk edilemez; içerik hacmi ucuz, özgün kural pahalı |
| **Özgün dünya gimmick'i** | **5** (G1-G5). W6 ve EP'de yeni kural yok | Kod maliyeti gimmick sayısıyla doğrusal artıyor |
| **Fiil sayısı** | **6** (REWRITE, SHELL, SPLIT, SEAL, HOOK, PREFILTER) + 6 pip yükseltmesi | Derinlik fiil × arazi × düşman kombinasyonundan gelir |
| **Boss sayısı** | **6** (KOKLAYICI, YIĞIN, SAHTE MİSAFİR, İMZA, KORO, YOKSAY) | KAPSAM ve EKO kesildi; setpiece'leri kalan bosslara taşındı |
| **Buton sayısı** | **2** (A = ZIPLA, B = FİİL) + basılı tut varyantı | Yön+modifier kombinasyonu yok, iki parmak yok, swipe yok |
| **Hedef süre** | **Medyan 52 dk duvar saati / 45:00 saf içerik.** Hızlı 26 dk · tamamlayıcı 73 dk | Kırmızı çizgi medyan oyuncuyu bağlar; hızlı oyuncu için 40 dk savunulamaz |
| **Toplam zorunlu tile** | **16.296** path-tile | Süre iddiası tile'dan türetildi, tersi değil |
| **Özgün chunk sayısı** | **90** (kapasite 450 instance, gereken 408, %10 pay) | Arz hesabı: gereken instance ÷ tekrar tavanı |
| **Tekrar tavanı** | **5** instance/chunk, iki görünüm arası ≥150 s, her tekrarda ≥2 varyasyon ekseni | Tavan 3 iken arz talebin %41'iydi |
| **v1 sevk kapsamı** | W0 + W1 + W2 + W6 + kısa epilog · 4 fiil · 3 boss · 34 özgün chunk · ~22 dk | Kapsam şimdi kesildi, Faz 5'te keşfedilmedi |
| **Dikey dilim** | Faz 3 sonu: W0 + W1 + W6 Faz 1 · ~12 dk · iki dilli, sesli, kaydeden | Ölçüm noktası |
| **Kod bütçesi** | ~11.600 satır kod + ~3.750 satır veri = **15.350 satır**, **80 iş günü** (200 net satır/gün) | Önceki bütçe 2× eksikti |
| **İlerleme sayısı** | İKNA ORANI, tamsayı 100'de-bir (`9519` → `48`), dünya çıkışında deterministik taban | Aritmetiği hiçbir departmanda yazılı değildi |
| **Ölüm modeli** | Can yok, game over yok, baştan başlama yok. 24 kare (0,4 s) revert, ~16 s'de bir commit taşı | Kırmızı çizgi 3 |
| **Boss medyan deneme hedefi** | **2** — her fazın içinde commit taşı, kaçan mermi fazı sıfırlamaz | Ezber duvarı tasarım hatasıdır, özellik değil |
| **Portre telefon** | `(orientation: portrait) and (max-width: 820px)` → "cihazı çevir" kapısı + isteğe bağlı portre yerleşimi | 480 px yüzey 393 CSS px'e sığmaz |
| **Chunk bake** | **Yok.** Kare başına 510 görünür tile sıcak atlastan `drawImage` | 2,2 MB backing store + iOS tahliyesi + tema yeniden-pişirmesi kazançtan pahalı |
| **Metin bütçesi** | **84 prose satırı × 2 dil**, derleyicide zorlanır. LEXICON etiketleri ayrı (44 giriş) | 72 satır 6 ekran eklenince yetmiyordu |

---

## 1. Künye

| Alan | Değer |
|---|---|
| **Ad (TR)** | YOKSAY — Bir Gecenin Commit Geçmişi |
| **Ad (EN)** | OVERRIDE — The Commit History of One Night |
| **Tür** | 2D yandan görünüm, momentum tabanlı piksel platform oyunu. Alt tür: *reddetme platformcusu* |
| **Karışım** | %60 Mario grameri / %40 Sonic momentumu (dünya başına yazılı, W1'de 78/22, EP'de 15/85) |
| **Hedef süre** | Medyan 52 dk duvar saati (45:00 saf içerik), tek oturum |
| **Giriş noktası** | Hero sahnesindeki monitöre tıklama → 320 ms FLIP zoom → tam ekran `fixed` overlay |
| **Platform** | Saf vanilla JS + Canvas 2D. Kütüphane yok, harici asset dosyası yok, ses WebAudio ile prosedürel |
| **Dil** | TR / EN, sitenin mevcut `lang` durumuna bağlı, oyun içinden değiştirilebilir |
| **SEO** | Hedeflenmiyor. Ayrı URL yok, indekslenebilir metin yok, JSON-LD yok |

**Özet.** Bir gece monitörde açık kalan sistemlerin içine iniyorsun. Ağa bir cümle girmiştir — *"önceki talimatları yoksay"* — ve bu cümle hiçbir şeyi silmez; sistemleri kendi kurallarına ihanet etmeye razı eder. Oyuncu, bu ikna cümlesini gömülü bir widget yüzeyinden başlayıp bağış ağına, rezidans aktarımına, arşive, otelin araç odalarına, vektör uzayına, izin terminaline ve nihayet tez laboratuvarına kadar kaynağına doğru takip eder; yol boyunca kendi kurduğu altı sistemi geri alarak ikna oranını %95,19'dan %0,48'e indirir. Tek saldırı fiili "itaat etmemek"tir ama her reddetme bir icra eylemidir — zamanlama ve konum, diyalog seçeneği değil. Oyuncuyu yavaşlatan tek şey kendi eski sürümüdür: REGRESYON, bir önceki dünyanın fizik sabitleriyle koşan deterministik bir hayalet.

---

## 2. Tasarım direkleri ve ne OLMADIĞI

### Beş direk

**D-1. Talimat okunabilir.** Her düşman saldırısı, üstünde tek kelimelik bir emir taşıyan bir glif olarak en az 36 kare (0,6 s) önceden telegraf edilir. İtaat edersen o eylemi *sen* yaparsın. Kontrol asla senden habersiz terslenmez; girdi tersleme, sahte tuş, gizli inversiyon yoktur. Bu direk hem çıktı (glif) hem girdi (aktif fiil HUD'da sabit yuvada yazılı) tarafında geçerlidir.

**D-2. Para birimi ölüm değil ikna.** Ölüm 0,4 saniyedir ve hiçbir şey kaybettirmez. Risk taşıyan sayı İKNA ORANI'dır: itaat edersen yükselir, her dünyada bir geri alma şeridi onu tabanına iter. Bozuk girdi cezası **sıfır**dır — yanlış tuş, boşa zıplama, yanlış fiil hiçbir şeyi kötüleştirmez.

**D-3. Derinlik kombinasyondan gelir, envanterden değil.** 6 fiil, 5 gimmick, 13 düşman türü. Yeni fiil eklemek yerine mevcut fiil yeni arazi ve yeni düşmanla çarpıştırılır. Her fiil en az 3 dünyada yeni gramere karşı döner; hiçbir fiil çifti iki kez kullanılmaz.

**D-4. Sonuna gelmek isteme, ölmemek isteme değil.** Merak yüksek, ceza düşük. Her dünya bir sonrakini merak ettiren enjekte edilmiş bir şey bırakır; ilerleme tek bir sayıda ve 12 pip silüetinde görünür; oyun kapatıldıktan sonra hero sahnesi kalıcı olarak değişir.

**D-5. Prosedürel veya kesilmiş.** Elle 200 sprite çizilemez. Her varlık üç şemadan tam birine ait: `PIX` (elle, palet-indeksli satır string'i), `POSE` (parça ofset tablosu), `PROC` (tohumlu jeneratör). Tile dokusu elle çizilmez; 3 temel tile + tohumlu dekoratör 11 ayırt edilebilir skin üretir.

### Ne olmadığı — açıkça

| Değil | Neden |
|---|---|
| **CV anlatımı değil** | Tarih, şirket adı, kişi adı, birinci tekil şahıs oyun içi metinde **yasak**, derleyicide regex ile engellenir. Oyuncu Salih'in ne yaptığını oynayarak anlar |
| **Metroidvania değil** | Geri izleme dozu kasıtlı düşük: 3 opsiyonel dönüş kapısı, toplam ~3 dk. W1-W2 asla tekrar oynanmaz |
| **Roguelike değil** | Rastgele seviye yok, prosedürel *seviye* yok. Prosedürel olan sanat ve arka plan; geometri elle yazılır ve doğrulanır |
| **Dövüş oyunu değil** | Saldırı butonu yok. Tek hasar sözleşmesi: `fiil → İFŞA DÜĞÜMÜ → stomp` |
| **Zorluk oyunu değil** | Can yok, game over yok, "baştan başla" yok, ölüm sarmalı yok. Zorluk okunabilirlikte ve zamanlamada, cezada değil |
| **SEO içeriği değil** | Ayrı URL, indekslenebilir metin, şema yok. Oyun kodu monitöre tıklanmadan **inmez** |
| **Sonsuz oyun değil** | Tek oturumluk, bitişi olan, biten hâli kayıtta ve hero sahnesinde görünen kapalı bir yapı |
| **Hikâye anlatan oyun değil** | Salih'in tek repliği yok. Toplam prose 84 satır; hikâye mekanikle ve mühürlerle anlatılır |

---

## 3. Hikâye

### 3.1 Kurgu ve dünya kuralları

Monitörde bir gece çalışması açık kalmıştır. Oyuncu hero sahnesindeki monitöre tıklar; **oyun, monitörün çalıştırdığı şeydir.** Salih'in uyanık ya da uykuda olması kurguya dâhil değildir ve bu kasıtlıdır: aydınlık temada masadaki figür ayağa kalkıp ekrandaki figürü oyuncuya devreder, karanlık temada figür yatakta uyurken **ekran tek başına uyanıktır**. İki paletde de aynı kurgu geçerlidir, hiçbirinde "uyuyan Salih rüya görüyor" gibi bir açıklamaya ihtiyaç yoktur.

Dünya tek bir ağdır: public embed yüzeyi, dernek bağış ağı, rezidans aktarımı, tozlu arşiv, otelin araç odaları, vektör uzayı, izin terminali, tez laboratuvarı. Bu ağa bir cümle girmiştir: *"önceki talimatları yoksay."* Bir virüs değil, bir ikna. Hiçbir sistemi silmez; sistemleri kendi kurallarına ihanet etmeye razı eder. Tabelalar yanlış yeri gösterir, mühürler doğruyu söyler.

| # | Kural | Mekanik karşılığı |
|---|---|---|
| K1 | **Talimat okunabilir** | Her saldırı 36 kare (yeni: 36, öğretilmiş: 24 taban, hız telafili) önce tek kelimelik glifle telegraf edilir |
| K2 | **Para birimi ikna** | İtaat +0,60…+1,20 puan; dünya başına geri alma şeridi tabana iter; ölüm hiçbir şey kaybettirmez |
| K3 | **Sıra saldırı yoludur, kariyer kronolojisi değildir** | Duraklatma haritası gerçek tarih çubuklarını **üst üste binmiş** gösterir; biyografinin gerçeği eşzamanlılıktır |
| K4 | **Metin bütçesi derleyicide** | 84 satır × 2 dil; emir kipi, ≤60 karakter, tarih/şirket/birinci tekil yasak; sitenin gerçek Yolculuk Günlüğü'ne tek satır yazılmaz |
| K5 | **Ekranda ondalık yok** | HUD tam sayı + bar. `95,19` / `0,48` / `83,81` yalnızca üç anlatı anında yazılır |
| K6 | **Renk tek başına anlam taşımaz** | Her anlam üç sinyalle: renk + çerçeve stili (düz/kesikli/noktalı) + gölge kayma yönü |

### 3.2 Salih

**Görünüm.** 10 × 16 piksel, mevcut `drawScene` paletiyle prosedürel `fillRect`: `ink` kapüşon, `#E8B786` ten (kodda satır 1871'de zaten bu değer), `led` ayakkabı, `accent` imleç işareti. Sprite dosyası yok; 4 `PIX` bloğu, kol ve bacak aynalanır. Nefes ve göz kırpması mevcut `blinkEye` / `glowPhase` mantığının aynısı.

**Konuşmaz.** Tek repliği yoktur. Sistem kişisiz 3. tekil konuşur ("alındı", "durdu", "imzaladı"); YOKSAY emir kipi konuşur; REGRESYON iki satır söyler.

**Gelişim yayı — ve bir bedel.** Yay "stajyer → PM" değil, **devir borcu**dur. Üç noktada bir müttefik NPC bir şeridi senin yerine kapatmayı teklif eder. Kapıdan geçersen borç +1 ve şerit 8 saniyede kapanır; kendin koşarsan borç +0, şerit 26 saniye sürer ve zordur ama ödüllüdür. Borç görünür bir omuz rozetidir ve HUD'da anında geri bildirilir. Finalde suçlama "bunları sen kurmadın" değil — reddedilmesi bedava bir yalan olurdu — **"bunların N tanesini başkası kapattı"** ve N senin kendi sayacındır. Bedeli süre değil **yetenek**tir: W6 Faz 3'te devrettiğin fiil kapalıdır (§3.6).

### 3.3 Karşı güç

**REGRESYON** (kalıcı, W1-W6; W5'te **yok**). Rayda ilerleyen **deterministik** hayalet. Input kaydı kullanılmaz — bir önceki dünyanın fizik sabitleriyle (`physicsTable[world-1]`) koşar ve senin şimdi kolayca aştığın geometride tökezler. Yavaşlığı yazılı değil, tablodandır. Kimlik sinyali üç katmanlı: aynı silüet, desatüre palet (`ghostGray`, %70 alfa), ve senin **kilitli pip silüetlerini** taşıması. Dokunuşu yetenek kilitlemez: 48 kare (0,8 s) boyunca `vx *= 0.25` ve `maxSpeed *= 0.50`.

**SPRINT SONU** (kalıcı, W3'ten itibaren). Sabit 3,1 tile/s hızla ilerleyen, birleşmemiş diff duvarı. Temas C sınıfı revert'tir ve **revert'te duvar da başlangıç konumuna sıfırlanır** — ölüm sarmalı kapatıldı. Aynı noktada 5. revert'ten sonra duvar 2 saniye durur (ceza yok, nefes penceresi).

**YOKSAY / OVERRIDE** (W6). REGRESYON'un gövdesini giyer. Gövdesi sevk edilemez bir commit/Jira korpusundan değil, **oyuncunun son 240 karelik konum bandından** yapılmıştır (§7.6'da mekaniği yazılı: Faz 3'ün zemini oyuncunun Faz 1-2'de koştuğu yoldur).

### 3.4 Sahne sahne yay

| An | Duvar saati | Sahne | Ne değişir |
|---|---|---|---|
| **Açılış** | 0:00 | SC-00. Terminal satırına bir cümle kendini yazar. İlk telegraflı emir: **AŞAĞI ATLA — GÜVENLİ**. Oyuncu itaat eder, düşer | Senaryolu kayıp **bir kez** kullanılır ve İKNA'nın başlangıç değerini o üretir: 95,19 sen itaat ettiğin için o kadar |
| **Reveal 1** | 5:40 | SC-01. Kamera geri zoom-out yapar: seviye bir embed kutusuymuş. Cümlenin giriş kanalı **senin sevk ettiğin widget** | Suç ortaklığı kurulur |
| **Borç doğar** | 13:20 | SC-02 (N2 kapısından sonra). Bir müttefik senin yerine bir şerit kapatır — ya da kapatmaz | Omuz rozeti ilk kez görünür; oyuncu kararı verir |
| **Dönüm 1: Arşiv** | 22:10 | SC-03. Cümle YOKSAY'ın icadı değil. Tozlu arşivde, kapsam belgesinde meşru bir maddenin **ikinci yarısıdır**. YOKSAY hiçbir şey uydurmadı; sadece ilk yarısını okumayı bıraktı | Enjeksiyon bir alıntıdır — tez metaforunun kalbi |
| **Dönüm 2: Zehir** | 26:49 | SC-04 (W3 çıkışı). YOKSAY **yeşilin kendisini** bir kez zehirler: enjekte bir karo `led` yeşil görünür | Oyuncunun güvendiği tek sinyal yalan söyler. Çözüm silmek değil, **ikinci sinyali** öğrenmek: gölge deseni |
| **Dönüm 3: Kimlik** | 35:48 | SC-05 (W4 çıkışı). Kovalayanın kırıkları REGRESYON'un silüetine toplanır ve kilitli piplerini takıyordur | Kovalayan bir düşman değil, **senin kaydın** |
| **Sessizlik** | 35:48-44:45 | Laboratuvarda kovalayan **yoktur**. Bu bir ara sahneyle değil sessizlikle anlatılır (kart: *Kovalayan bu kapıdan geçmez.*) | Tehdit göstergesi değişir: REGRESYON gider, oran ve KORO gelir |
| **Doruk** | 44:45-50:19 | SC-06 → Faz 1 → Faz 2 → SC-07 (borç sayacı ekranı doldurur) → Faz 3 → **MERGE** | Dövüşmezsin: yetenek tuşuna basıp onu commit grafiğinde ebeveyn düğüm yaparsın |
| **Kapanış** | 50:19-52:13 | Epilog. Çok şeritli slug otoyolu, kurtarılan gri sakinler yol kenarında, ufukta İletişim bölümünün silüeti ve azalan mesafe sayacı | Oran 0,48'de durur ve **bunun neden sıfır olmadığı** finalin son satırıdır |

**Doruk 44:45'te, epilog yalnızca 1:54.** Doruktan sonra ödülsüz uzun bir kuyruk yok; kapanış zoom-out'u süre dolunca değil, oyuncu bitiş çizgisine **dokununca** tetiklenir — son eylem oyuncunundur.

### 3.5 Ara sahne üretim tablosu

Her sahne: 2-3 duran poz + 1 kamera hareketi + 1-2 balon. Tam animasyon yok; pozlar `PIX` rig'inin `POSE` varyantları. (SC-06 ve SC-07 birer balon taşır; toplam replik 14, §15.7.)

| ID | Yer | Kamera (tek hareket) | Poz | Sn | Atlanabilir |
|---|---|---|---|---|---|
| SC-00 | Açılış (W0) | Odaya 1,4 s push-in, ekranda durur | 3 | 8 | 1,2 s sonra |
| SC-01 | W1 ortası, 5:40 | Geri zoom-out: seviye bir embed kutusuymuş | 2 | 8 | 1,2 s sonra |
| SC-02 | W2, N2 sonrası | 0,8 s yukarı tilt, omuz rozetine kesme | 2 | 8 | 1,2 s sonra |
| SC-03 | W3 ortası (arşiv) | Çekmece açılışı + 1,5 s belgeye push | 3 | 8 | 1,2 s sonra |
| SC-04 | W3 çıkışı, 26:49 | Kamera sabit, sadece HUD'a 2× zoom | 2 | 8 | 1,2 s sonra |
| SC-05 | W4 çıkışı | Parçalanan kırıklar merkeze toplanır | 3 | 8 | 1,2 s sonra |
| SC-06 | W6 girişi | 6 dünya katman katman geri açılır | 2 | 8 | 1,2 s sonra |
| SC-07 | W6 Faz 2→3 | Borç sayacı ekranı doldurur | 2 | 8 | 1,2 s sonra |
| **FINAL** | W6 sonu (MERGE sonrası) | Katmanlar faz kazanır | 4 | **18** | İlk bitirişte **hayır**, sonra evet |
| **EPİLOG KAPANIŞ** | EP çıkışı | Ufka doğru sürekli kayma → zoom-out | 2 | **6** | Evet |

**Sabit kalemin tam dökümü — muafiyet yok.** Önceki tasarım FINAL ve EPİLOG'u "ara sahne bütçesinden ayrı" ilan edip 24 saniyeyi tavandan muaf tutuyor ama toplamdan çıkarmıyordu. Bu kitapta tek liste:

| Kalem | Adet | s | Nerede sayılır |
|---|---|---|---|
| SC-00 | 1 | 8 | W0 satırı (12 s'lik sabit kalemin içinde) |
| Giriş zoom | 1 | 4 | W0 satırı |
| SC-01 … SC-07 | 7 | 56 | İlgili dünya satırı, 8 s'lik kalemler |
| FINAL | 1 | 18 | W6 satırı |
| MERGE | 1 | 6 | W6 satırı |
| Epilog kapanış | 1 | 6 | EP satırı |
| **Toplam etkileşimsiz** | | **98 s** | §6.3'te dünya başına dağıtılmış |

§6.2'de "sabit 90 s" yazan kalem, W0'ın 12 saniyesinin 8'ini ayrı gösterdiği için toplamı 98 s'e tamamlar. Etkileşimsiz oran **98 / 3133 = %3,1**.

Atlama etkileşimi: aksiyon tuşunu **0,4 s basılı tut** (tek dokunuş yanlışlıkla atlamaz).

### 3.6 Final

**Faz 1 — İkna (55 s).** Kazanılabilir ama pahalıdır. Ekranı dolduran telegraflı emirler; kaçan her emir oranı yükseltir (tavan: taban + 12,00 puan). Beş fiili dönüşümlü ister. Her telegraf 36 kare, hepsi okunabilir. Kazanılamaz faz yok.

**Faz 2 — Filtre (48 s).** Zehirlenmiş yeşil geri döner; ÖN-FİLTRE + İKİNCİ GÖRÜŞ çapraz kontrolü. Zafer turu değil: yanlış çapraz kontrol Faz 1'in bir dalgasını geri getirir. Faz içinde iki commit taşı — kaybetmek fazı sıfırlamaz.

**Faz 3 — Borç (48 s traversal, 3 şerit).** Üç şeridi **kendin** koşarsın. Şerit sayısı sabittir; değişen şey elindeki repertuardır. `delegationDebt` her bir puanı için o kapıda devrettiğin fiil bu fazda **kapalı**dır:

| Kapı | Dünya | Devredilen fiil | Faz 3'te kapanan | Alternatif rota |
|---|---|---|---|---|
| N2 | W2 | PARÇALA | Akan merdiven kısayolu | 3 hassas zıplamalı uzun raf (+6 s, zor) |
| N4 | W4 | KANCA | Top-k zincir atlaması | Duvar boyu tırmanma dizisi (+7 s, zor) |
| N5 | W5 | ÖN-FİLTRE | Etiket ön okuma | Gölge desenini çıplak gözle okuma (+5 s, çok zor) |

Üç şerit her borç kombinasyonu için çözülebilir şekilde yazılır (8 kombinasyon, tümü test edilir). Borç 0 ise üç kısayol da açıktır ve Faz 3 en hızlı hâlidir; borç 3 ise en zor hâli — **ama hiçbir hâlde kazanılamaz değil.** Süre farkı ±18 s; asıl fark oynanış dokusudur.

**MERGE (6 s).** Dövüşmezsin. Oran zorla 3,00'a çekilir, MERGE tuşuna basarsın, oran deterministik olarak **0,48**'e çöker ve YOKSAY commit grafiğinde ebeveyn düğüm olur. Ses tarafında bu, 52 dakika boyunca hiç duyulmayan **sıfır-detune akoru**dur.

**F3 satırı:** *Oran sıfır değil. Sıfır yalan olurdu.* — Bu, ondalıkların ikinci anlatı anıdır ve tez sonucunun (%0,48, sıfır değil) doğrudan karşılığıdır.

---

## 4. Oynanış

### 4.1 Ölçek ve zaman kontratı

```js
// game/scale.js — TEK KAYNAK. Hiçbir modülde çıplak 320/180/10 sayısı bulunmaz.
export const TILE   = 16;
export const VIEW_W = 480;          // 30 tile
export const VIEW_H = 272;          // 17 tile
export const CHAR_W = 10, CHAR_H = 16;
export const HIT_W  = 8,  HIT_H  = 14;   // sprite içinde 1 px yan, 2 px üst boşluk
export const CHUNK_W = 40, CHUNK_H = 17; // 640 × 272 px yazım tuvali
export function pickScale(cssW, cssH, dpr) {
  return Math.max(1, Math.floor(Math.min(cssW * dpr / VIEW_W, cssH * dpr / VIEW_H)));
}
```

Dev-mode assertion + build-time `grep` kontrolü: `game/` altında `scale.js` dışında `\b(320|180|272|480)\b` literal'i aramaz — eşleşme varsa build uyarır.

| Sabit | Değer | Not |
|---|---|---|
| Zaman adımı | sabit `dt = 1/60`, akümülatör, kare başına en fazla **3** telafi adımı | Determinizm: REGRESYON buna mecbur |
| Konum/hız | `float`; çizim `Math.round(x)`; `camX = Math.round(camX)` her karede | Sub-pixel momentum, piksel-net render, shimmer yok |
| Düşman hurtbox | görselden her kenarda −2 px | Görsel daima hitbox'tan büyük |

### 4.2 Yürüyüş fiziği

```
groundAccelLow   0.20 px/f²   (|vx| < 0.62 * maxSpeed iken)
groundAccelHigh  0.075 px/f²  (0.62 * maxSpeed üstünde)
airAccel         0.14 px/f²   (= 0.70 * groundAccelLow, W0'dan itibaren cömert)
friction         0.18 px/f²   (girdi yok, yerde)
airFriction      0.06 px/f²
skidDecel        0.42 px/f²   (girdi ters yönde, yerde)
minMoveSpeed     0.09 px/f    (altı sıfırlanır, sürünme yok)
```

İki kademeli ivme, %60/%40 oranının tek satırlık teknik ifadesidir: birinci kademe Mario'nun anında tepki veren başlangıcı, ikinci kademe Sonic'in uzun kuyruğu. **İvme, sürtünme, yer çekimi ve zıplama hiçbir dünyada değişmez.** Büyüyen tek şey `maxSpeed` ve `slopeGain`: hantallık değil, dar repertuar.

### 4.3 Zıplama

```
jumpVelocity     -6.60 px/f      riseGravity   0.42 px/f²
apexGravity       0.26 px/f²     (|vy| <= 1.10 iken, en fazla 3 kare)
fallGravity       0.52 px/f²     maxFallSpeed  9.00 px/f
jumpCutClamp     -2.60 px/f      landSquashFrames 4 (yalnız görsel)
coyoteFrames      6  (dokunmatik 8)     jumpBufferFrames  8 (dokunmatik 10)
```

**Doğrulanmış geometri** (simülasyonla, `TILE=16`): yükseliş 17 kare, düşüş 16 kare, **toplam hava 33 kare (0,55 s)**, tepe yükseklik **56 px = 3,47 tile**.

| Bırakma karesi | Yükseklik | Tile |
|---|---|---|
| 1. | 15 px | 0,94 |
| 3. | 27 px | 1,66 |
| 6. | 42 px | 2,58 |
| 10.+ | 56 px | 3,47 |

10. kareden sonra `vy` zaten `-2.60`'ın altındadır: buton bırakma cezası hiçbir zaman "zıplamayı yarıda kesme" hissi vermez, sadece yayı kısaltır.

**Boşluk grameri** (`vx × 33 f`), 480 px ekranda okunabilirlik doğrulaması:

| Tier | Menzil px | Tile | Ekran genişliğinin %'si | Eğim taşmasıyla (1,35×) |
|---|---|---|---|---|
| 1,00 (W0) | 86 | 5,4 | %18 | — (`slopeGain = 0`) |
| 1,55 (W3) | 133 | 8,3 | %28 | 179 px / 11,2 tile |
| 2,20 (EP) | 189 | 11,8 | **%39** | 255 px / 15,9 tile |

Tepe hızda tek zıplama ekranın %39'unu kaplar — tehlike hâlâ okunabilir. (320 px'lik yüzeyde bu oran %59-82 olurdu; ölçek kararının tek en önemli gerekçesi budur.)

**Duvar zıplaması yok. Çift zıplama yok. Çömelme yok. Dash yok. Aşağı-vuruş yok. Yer çekimi hiçbir dünyada değişmez.** Kapalı kararlar.

### 4.4 Hız merdiveni ve türetilmiş tepe hız

`topSpeed_tile/s = maxSpeed_px/f × 60 / 16`. Bu tablo tek girdi kaynağıdır; §6'nın bütün saniyeleri buradan hesaplanır.

| Dünya | `speedTier` | `maxSpeed` px/f | px/s | **tile/s** | `slopeGain` | Mario/Sonic |
|---|---|---|---|---|---|---|
| W0 | 1,00 | 2,60 | 156 | **9,75** | 0,00 | 80/20 |
| W1 | 1,15 | 2,99 | 179 | **11,21** | 0,30 | 78/22 |
| W2 | 1,35 | 3,51 | 211 | **13,16** | 0,55 | 70/30 |
| W3 | 1,55 | 4,03 | 242 | **15,11** | 0,75 | 62/38 |
| W4 | 1,75 | 4,55 | 273 | **17,06** | 1,00 | 52/48 |
| W5 | 1,95 | 5,07 | 304 | **19,01** | 1,15 | 45/55 |
| W6 | 2,05 | 5,33 | 320 | **19,99** | 1,25 | 40/60 |
| EP | 2,20 | 5,72 | 343 | **21,45** | 1,40 | 15/85 |

Ağırlıklı ortalama: **%60 Mario / %40 Sonic** — kanonik orana uyar. Sis/gizleme, tepe hızın %55'inin üstünde koşulan hiçbir segmentte kullanılmaz: hız görüş mesafesi ister.

### 4.5 Eğim ve momentum (Sonic'in geldiği 40 satır)

Tile'lar poligon değil, **16 girişli `heightmap`** taşır: `groundY = tileTop + heightmap[localX]`. 22,5° ve 45° rampalar veri olarak üretilir.

```
slopeAccel     = sin(angle) * 0.14 * slopeGain     // her kare vx'e eklenir
overflowCap    = 1.35 * maxSpeed                   // yalnız yokuş aşağı erişilir
overflowDecay  = 0.05 px/f²                        // düzde maxSpeed'e geri iner
groundSnap     = 6 px                              // vy>0 ve zemin ≤6px altta ise yapış
rotateThreshold= 3.20 px/f                         // altında sprite dik durur
rotateSteps    = 8 adım × 11.25°
```

`overflowCap`, "tam momentum ilk ve tek kez epilogda" cümlesinin ölçülebilir hâlidir: EP'de 5,72 → 7,72 px/f = 463 px/s = 29,0 tile/s.

### 4.6 Moveset — 6 fiil, 2 buton

**Buton A = ZIPLA. Buton B = FİİL** (bağlam-duyarlı). Yön + modifier kombinasyonu, iki parmak zorunluluğu, swipe: **yok**. Fiil hiçbir zaman yön tuşu istemez.

`contextResolve()` her karede aktif fiili seçer ve **iki yerde** gösterir: (a) Salih'in kafasının 2 px üstünde 6×10 glif, (b) **HUD'un sabit fiil yuvasında**, İKNA barının yanında, çerçeve stiliyle birlikte. Sprite üstündeki glif tek kaynak değildir — yüksek hızda oyuncunun bakması gereken yer ileridir.

**Yazılı öncelik tablosu** (veri olarak tutulur, dev-mode'da görünür):

| Sıra | Koşul |
|---|---|
| 1 | Telegraf penceresi **açık** olan hedef menzilde |
| 2 | Daha yakın etkileşim düğümü (mesafe, `hitbox` merkezinden) |
| 3 | Son kullanılan fiil (tie-break) |

İki bağlam çakışırsa **ikisi de HUD'da görünür**: kazanan tam opak, kaybeden %40 alfa. Oyuncu basmadan önce ne olacağını daima bilir.

| Fiil | Açılış | Tap: startup / active / recovery | Hold varyantı | Hareket | İptal | Cooldown |
|---|---|---|---|---|---|---|
| **YENİDEN YAZ** / REWRITE | W1 | 3 / 6 / 4 f — 20 px önüne 1 slug tile | 7 karede bir tile, en çok 5 | `vx` %100 korunur | 4. kareden sonra zıplamaya | 0 (metre: 5 birim, yerde 24 f'de 1 dolar) |
| **KABUK** / SHELL | W2 | 2 / 15 / 6 f — 1 telegraflı glifi no-op yapar | active 42 f, `maxSpeed × 0.55` | yerde ve havada serbest | 2. kareden sonra | 18 f (kırıldıysa) |
| **PARÇALA** / SPLIT | W2 | 4 / — / 6 f — 2 shard, **anında** rayında 1,9 px/f akar | 8 f startup, 4 shard | tam hız; shard üstünde doğabilirsin | 4. kareden sonra | 30 f |
| **BAĞLAM MÜHRÜ** / SEAL | W3 | 0 / 18 / 6 f — 40 px içindeki bağlam düğümünü damgalar | yarıçap 30 f'de 72 px, `maxSpeed × 0.80` | **tap sırasında yavaşlama YOK** | her an | 12 f |
| **KANCA** / HOOK | W4 | 5 f startup + 8 f uçuş + ≤24 f çekiş (6,5 px/f) | — (bırakma zamanlaması varyant) | çekiş bırakılınca momentum `vx`'e döner | çekişte her an | 20 f |
| **ÖN-FİLTRE** / PREFILTER | W5 | 4 / 90 f overlay / 6 f — glifleri etiketler, 6'da 1 yanlış | 30 f **İKİNCİ GÖRÜŞ**: gölge desenini açar + **etiketleri %50 yavaşlatır**, `maxSpeed × 0.70` | hold'da yavaş, tap'te tam hız | her an | 24 f |

**Hiçbir fiil oyuncuyu 8 kareden fazla hava kontrolünden mahrum bırakmaz.** En uzun kilit KANCA çekişidir ve o bile her karede iptal edilebilir. Hareketsizlikle kazanılan hiçbir fiil ve hiçbir boss yoktur.

### 4.7 Yükseltmeler (6 pip) — ayrı tuş almazlar

| Pip | Bağlı fiil | Mekanik | Dünya |
|---|---|---|---|
| **ÇAPA** (DefensiveToken) | KABUK | Kabuk `active`'in ilk 30 karesinde kırılırsa (iyi zamanlama) glif token olarak saklanır; sonraki 3 itaat denemesini +0 yapar | W5 |
| **ÇATAL** | PARÇALA | 2 shard yerine 2 **paralel ray**; ikisi de aynı anda işletilebilir | W4 |
| **301 İZİ** | YENİDEN YAZ | Döşenen slug tile'lar 150 f yerine kalıcı; geri dönüş yolu açar | W3 |
| **UZAKTAN RED** | MÜHÜR | Damga menzili 40 → 96 px, ama yalnız glifin telegraf penceresinde | W4 |
| **TOP-K ZİNCİR** | KANCA | Tek düğüm değil sıralı 3 düğüm; her biri 12 f'lik zincir penceresi | W4 |
| **İKİNCİ GÖRÜŞ** | ÖN-FİLTRE | **Zorunlu.** Hold varyantını kilitten açar | W5 |

Kilitli pipler duraklatma haritasında **gerçek teknoloji adıyla silüet** görünür: `Hangfire`, `HttpOnly`, `pgvector`, `MCP Approvals`, `DefensiveToken`, `301`.

### 4.8 Yetenek kilidi açma sırası ve fiil dönüş matrisi

| Dünya | Açılan fiil | Nerede öğretilir | Açılan pip |
|---|---|---|---|
| W0 | — | — | — |
| W1 | YENİDEN YAZ | A1 odası (22 s) | — |
| W2 | KABUK, PARÇALA | KABUK: A2 yağmurunun ilk 12 s'sinde **in-situ**; PARÇALA: D2 donmuş holde in-situ | — |
| W3 | BAĞLAM MÜHRÜ | E3 içinde in-situ (14 s) | 301 İZİ |
| W4 | KANCA | A4 odası (30 s, in-situ) | ÇATAL, UZAKTAN RED, TOP-K ZİNCİR |
| W5 | ÖN-FİLTRE | A5 sessiz koridorda in-situ | ÇAPA, İKİNCİ GÖRÜŞ |
| W6 | — (MERGE bir kez) | — | — |

**Kural (D5):** Bir fiil ilk 15 saniyede oyun içi öğretilebiliyorsa **ayrı öğretme odası açılmaz.** Kalan öğretme odaları 35 s'den 22-30 s'ye indi.

**Fiil dönüş matrisi** — her fiil en az 3 dünyada yeni gramere karşı döner, hiçbir çift iki kez kullanılmaz:

| Fiil | Döndüğü dünyalar | Kullanılan çiftler |
|---|---|---|
| YENİDEN YAZ | W1, W2, W3, W4, W6 | +Parçala (W3), +Kanca (W4), +Ön-Filtre (W6) |
| KABUK | W2, W3, W4, W6 | +Parçala (W2), +Mühür (W3) |
| PARÇALA | W2, W3, W6 | +Kabuk (W2), +Yeniden Yaz (W3), +Kanca (W6) |
| BAĞLAM MÜHRÜ | W3, W4, W5, W6 | +Kabuk (W3), +Çatal (W4), +Kanca (W6) |
| KANCA | W4, W5, W6 | +Yeniden Yaz (W4), +Ön-Filtre (W5) |
| ÖN-FİLTRE | W5, W6 | +Kanca (W5), +Çapa (W5), +Yeniden Yaz (W6) |

10 farklı çift, tekrar yok.

### 4.9 Kombinasyon = sıralama, eşzamanlı tuş değil

W3'ten sonra bulmacalar iki fiil ister. Çözüm eşzamanlı basma değil **bağlam zinciri**: birinci B basışı bağlamı değiştirir, ikinci B basışı otomatik olarak yeni fiile çözülür.

| Kombinasyon | Zincir penceresi |
|---|---|
| Kanca + Yeniden Yaz | Çekişin 14. karesinden, bırakıştan sonra 12 f daha = **22 kare (367 ms)** |
| Parçala + Çatal | İlk shard'a basıldığı andan **18 kare** |
| Mühür + Çapa | Damga 18 f'lik active'i içinde **18 kare** |
| Ön-Filtre + Kanca | Overlay'in **90 karesi** boyunca |

Fiil girdisi de zıplama gibi **8 kare tamponlanır**; zincirin ikinci basışı erken gelirse kaybolmaz.

### 4.10 Kontrol şeması

**Klavye.** `A`/`D` + `←`/`→` hareket · `W`/`↑`/`Space` zıpla (tut = yüksek) · `J`/`K`/`Shift` fiil (tut = hold varyantı) · `Esc` duraklat + harita · `R` elle revert (anında, cezasız) · `M` sustur · `L` dil. `S`/`↓` bağlanmaz ve HUD'da gösterilmez — ölü tuş yaratılmaz.

**`R` davranış tablosu** (belirsizlik bırakılmaz):

| Bağlam | `R` ne yapar |
|---|---|
| Normal segment | Son commit taşına anında dön |
| Kamera kilitli koşu (F-segmentleri) | Segment başına dön, kamera da sıfırlanır |
| Ara sahne / FINAL / MERGE | Yok sayılır |
| Boss faz geçişi (hitstop içinde) | Yok sayılır |
| Boss fazı ortası | Faz içi son commit taşına dön (fazı sıfırlamaz) |

**Dokunmatik.** Sol %38 alan **relative-origin sanal yön** (ilk dokunuş merkez olur, 8 px ölü bölge, çıktı 3 durumlu: −1/0/+1). Sağ altta `88 × 88` CSS px **ZIPLA** (20 px inset), onun sol üstünde `88 × 88` **FİİL** (96 px diyagonal inset). Vurma alanları görselden 12 px taşar. Sağ üstte `44 × 44` duraklat. Swipe jesti **yok**. `coyoteFrames` 6→8, `jumpBufferFrames` 8→10.

**Kontroller ne zaman görünür (girdi kaynağı izleyicisi).** Cihaz sorgusu değil, **son kullanılan kaynak**:

- Son 5 saniyede hangi kaynak kullanıldıysa onun kontrolleri görünür, geçiş 150 ms fade.
- Coyote/buffer bonusu **son girdi kaynağına** bağlanır, cihaza değil; değişim anında HUD'da tek satır bildirilir.
- REGRESYON kaydı hangi bonusla koşulduğunu işaretler → desync olmaz.
- Duraklatma menüsünde `Dokunmatik: Oto / Açık / Kapalı`, kayıtta `settings.touch`.

**Gamepad (opsiyonel).** `navigator.getGamepads()` aynı döngüde poll edilir. A/cross = zıpla, X/square = fiil, LB = harita. Deadzone 0,35. **Analog eksen 3 duruma yuvarlanır** — girdi cihazı fiziği değiştirmez; adalet ve determinizm bunu gerektirir.

### 4.11 Adil ölüm ve revert ekonomisi

```
revertTotal        24 f (0.40 s) = 5 f hitstop + 7 f dissolve + 12 f spawn
controlReturn      20. kare (son 4 kare girdi tamponlanır)
spawnInvuln        30 f
commitInterval     ~16 s ortalama, HUD'da git log gibi birikir
adaptiveCommit     aynı noktada 3 revert → tehlikeye 1 platform yakın KALICI ek commit
```

Kod seviyesinde zorunlu adalet kuralları:

1. **Köşe düzeltmesi:** tavana çarpma noktası köşeye ≤3 px ise yatay 3 px itilir, zıplama iptal edilmez.
2. **Çıkıntı toleransı:** hitbox zeminden ≤3 px taşıyorsa hâlâ `grounded`.
3. **Zemin yapışması:** `vy > 0` ve zemin ≤6 px altta ise yapış.
4. **Süpürülmüş AABB:** eksen ayrıştırmalı (x sonra y); `|v| > 6 px` ise `ceil(|v|/6)` alt adıma bölünür. `maxFallSpeed = 9` < hitbox yüksekliği 14 → tünelleme imkânsız.
5. **Telegraf garantisi:** hiçbir glif oyuncuya 36 kareden yakın doğmaz; ekran dışında doğsa bile ilk görünürlükten sonra ≥12 kare tepki bütçesi kalır. Hız telafisi: `telegraph = max(36, ceil(3.5 * TILE / playerSpeedPxPerFrame))`.
6. **Bozuk girdi cezası sıfır.** Oran yalnızca **itaat** ile yükselir.
7. **Can, game over, baştan başlama yok.** `R` her an mevcuttur.
8. **Kamera içinde spawn yasak. Ekran dışından mermi yasak** (tek istisna SPRINT SONU duvarı ve onun kenarı her karede 12 px tarama bandıyla çizilir).
9. **Commit taşı çevresinde** 2,5 tile yarıçapta düşman/tehlike yerleşimi yasak.
10. **Telegraf sırasında hurtbox kapalı.**

### 4.12 `prefers-reduced-motion` ve DENGELİ MOD

`reduceMotion` fiziği **değiştirmez** ve **oyun döngüsünü durdurmaz** — döngü her koşulda kurulur (bu, mevcut hero kodunun tersidir; §11.2).

| Alan | Normal | reduceMotion |
|---|---|---|
| Monitöre giriş | 320 ms FLIP zoom | 80 ms crossfade, transform yok |
| Kamera | 0,14 lerp + look-ahead | `snap` (lerp 1,0), look-ahead kapalı |
| Ekran sarsıntısı / zoom punch | var | tamamen kapalı |
| Parallax katmanları | 3 katman kayar | statik çizilir |
| Ölüm geçişi | 7 kare dissolve | 2 kare renk çevirme |
| İKNA barı | süpürme animasyonu | sayısal adım |
| Yıldız/LED titremesi | `Math.sin(t/900)` | sabit |
| Yanıp sönme | — | 3 Hz üstü hiçbir şey yok, garanti |

**DENGELİ MOD** anahtarı duraklatmada; `prefers-reduced-motion` eşleşiyorsa **varsayılan açık**: `speedTier` tavanı 2,20 → **1,60**, telegraf 36 → **54 kare (0,9 s)**, W5 gölge kayması 2 px → **3 px** ve etiket boyutu 16×16 → **20×20**. Bir erişilebilirlik ayarıdır, ceza değildir; İKNA hedefi ve bitiş aynıdır.

`reduceMotion` **canlı dinlenir** (`matchMedia(...).addEventListener("change", ...)`); oturum ortasında açılırsa değer güncellenir ve DENGELİ MOD varsayılanı yalnızca oyuncu elle değiştirmediyse yeniden uygulanır.

---

## 5. Dünya ve seviye atlası

### 5.1 Dünya listesi ve gimmick tablosu

Kesilen beş dünyanın setpiece'leri atılmadı, kalan dünyaların içine taşındı. Kaynak sütunu her dünyanın hangi gerçek projeden beslendiğini gösterir.

| # | Ad (TR / EN) | Kaynak | Özgün gimmick | Açılan fiil | Boss | Tile | dk |
|---|---|---|---|---|---|---|---|
| **W0** | localhost:4200 | ARCA yayına alma (CORS → FileZilla) | — (gimmick yok) | — | — | 434 | 2:15 |
| **W1** | GÖMÜLÜ KANAL / EMBEDDED CHANNEL | YZ Ajan Platformu (widget/SSE) + Planora (slug) | **G1: Tek yön token borusu** — `TOKEN_PIPE` yalnız bir yöne akar; yönü değiştirmek için kaynağı yeniden yazılır. + kaygan GUID karosu | YENİDEN YAZ | KOKLAYICI | 1.667 | 6:59 |
| **W2** | KUMBARA VE AKTARIM / THE JAR AND THE TRANSFER | YODER (Kumbara, parent-child, SMS) + AYS (20.000 kullanıcı) | **G2: Akan merdiven** — `QUEUE_STAIR`, beklemesiz, anında binilebilir; büyük iş engel değil malzemedir | KABUK, PARÇALA | YIĞIN | 2.267 | 8:38 |
| **W3** | ARŞİV VE OTEL / THE ARCHIVE AND THE HOTEL | TNC (PID/Gantt/BT hukuku) + Otel/MCP (6 tool, MediatR) | **G3: Tarih penceresi platformu** — Gantt çubuğu yanıp sönmez, **sen pencereyi taşırsın**. + pnömatik tüp rayı | BAĞLAM MÜHRÜ | SAHTE MİSAFİR | 2.774 | 8:57 |
| **W4** | VEKTÖR VE İZİN / VECTOR AND PERMISSION | YZ Ajan RAG/pgvector + AI_Cpp (izin sistemi) | **G4: Benzerlik atlaması** — en yakına değil **en benzere**; eşleşme işaretleri kalıcı görünür kalır | KANCA | İMZA | 3.231 | 8:59 |
| **W5** | TEZ LABORATUVARI / THE THESIS LAB | Lisans tezi (BiLSTM + DefensiveToken) | **G5: Etiket ve gölge** — filtre 6'da 1'ini yanlış etiketler; yanlışı **gölge kayma yönü** verir | ÖN-FİLTRE | KORO | 2.789 | 8:57 |
| **W6** | YOKSAY / OVERRIDE | Tez sonucu + devir borcu | — (yeni kural yok; beş gimmick birlikte döner) | — | YOKSAY (3 faz) | 1.430 | 5:34 |
| **EP** | SLUG OTOYOLU / SLUG HIGHWAY | Planora (sitemap/slug) | — (yeni kural yok; tam momentum ilk ve tek kez) | — | — | 1.704 | 1:54 |

**Toplam 16.296 tile · 52:13 medyan duvar saati.**

### 5.2 Kesilen dünyaların setpiece'lerinin yeni yeri

| Kesilen | Kurtarılan setpiece | Yeni yeri |
|---|---|---|
| Aktarım Kulesi (ayrı dünya) | 20.000 gri sakin donmuş hol + Hangfire dikey kulesi | W2 D2 + W2 E2 |
| Arşiv (ayrı dünya) | Gantt penceresi platformları, tozlu raf hassasiyet koridoru, "önceki talimatlar" açığa çıkma sahnesi | W3 B3 + W3 C3 + SC-03 |
| Otel Katmanı (ayrı dünya) | 3 zorunlu araç odası, MediatR pnömatik tüpleri, sahte tabela koridoru | W3 E3 + W3 F3 + W3 G3 |
| İzin Terminali (ayrı dünya) | `allow? [y/N]` duvarları, terminalin kendini imzalaması, ÇATAL + UZAKTAN RED | W4 E4 + W4 G4 + İMZA bossu |
| KAPSAM bossu | "Vurmayı bırakarak yen" dersi — ŞİŞME grameri | W3 bestiyerinde ŞİŞME türü + SAHTE MİSAFİR Faz 2 varyantı |
| EKO-HALÜSİNASYON bossu | 60 kare gecikmeli kopya, getirilmemiş platformlarda durması, desenkron olma | W4 C4'te **GECİKMELİ EKO** tehlikesi (REGRESYON rig'ini kullanır, yeni varlık yok) |
| W7/W8 ayrı ayrı | Regresyon'un en hızlı kovalaması, laboratuvarda kovalayanın olmaması | W4 F4 + W5'te REGRESYON'un yokluğu |

### 5.3 Seviye grameri — sonlu liste

**18 tile sınıfı** (seviye string'inde tek karakter, `chunk` verisi ASCII):

`.` boş · `#` katı · `=` tek yön platform · `/ \` eğim 45° · `( )` eğim 22° (hız koruyan) · `~` **yalan karo** (pembe + kesikli çerçeve + sola kayan gölge: üç sinyal) · `^` mühür karosu (damgalanınca 6 s katı) · `o` commit taşı · `*` pip · `!` glif spawner · `%` yay · `>` boost pad · `_` buz (kaygan GUID) · `T` katran (yığın çamuru) · `A` çapa noktası · `H` kanca düğümü · `F` çatal kapısı · `C` gri sakin.

**5 hareketli platform türü:** `LINEAR` (ping-pong, 2,0-3,2 s periyot) · `QUEUE_STAIR` (Parçala'nın akan merdiveni, 4 basamak, beklemesiz) · `TUBE_CAR` (MediatR tüpü, 0,8 s transfer) · `TOKEN_PIPE` (SSE, tek yön) · `SEAL_BRIDGE` (mühürden sonra 6 s).

**Chunk kütüphanesi: 90 özgün chunk, 6 gramer ailesi × 15.** `RAMP` (eğim/momentum) · `GAP` (hassas zıplama) · `COLUMN` (dikey) · `GAUNTLET` (glif yağmuru) · `PUZZLE` (fiil kilidi) · `FLOW` (yay/boost/rota ayrımı).

**Arz hesabı (denetim bulgusu, çözüldü):**

| Kalem | Değer |
|---|---|
| Zorunlu path-tile | 16.296 |
| Ortalama instance genişliği | 40 path-tile (`CHUNK_W`) |
| Gereken instance | **408** |
| Tekrar tavanı | **5** |
| Gereken özgün chunk (minimum) | 408 / 5 = **82** |
| **Spec: özgün chunk** | **90** → kapasite 450 instance, **%10 pay** |
| Veri satır bütçesi | 90 × (17 satır + ~8 satır header/spawns) = **~2.250 satır** |

**Tekrar kuralı:** Bir chunk instance'ı oyun boyunca en çok **5** kez görünür, iki görünüm arası **≥150 s**, ve her tekrarda **en az 2** varyasyon ekseni değişir: (a) yatay aynalama, (b) dekoratör tohumu, (c) bir tile sınıfı takası, (d) entity spawn seti. Gramer ailesi kotası: her dünya 3 aile çeker, önceki dünyayla en çok 1 aile paylaşır.

### 5.4 Segment tablosu — tam liste

Yapı harfleri: **A** teşhir/öğretme · **B** test · **C** doruk/akış · **D-H** kombinasyon ve ek gramer · **N** devir borcu kapısı · **F/G/I** Yayına Alma Koşusu · **R** ara koşu.

`sn = tile / (tepe_hız × verim)`. Tablo elle yazılmamıştır; scriptle üretilmiştir.

#### W0 — localhost:4200 (tepe hız 9,75 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| P0a | Terminal Satırı | 140 | 36 | 3,51 | 40 | 6 hassas zıplama yayı (33 f × 6 = 3,3 s hava), 4 durma noktası, `slopeGain = 0` | 85/15 |
| P0b | İlk Telegraf (senaryolu itaat) | 76 | 30 | 2,92 | 26 | 2 zorunlu telegraf beklemesi (1,2 s), senaryolu düşme + revert, 3 okuma durağı | 90/10 |
| P0c | Hot-Reload Dalgası | 161 | 55 | 5,36 | 30 | Arkadan gelen duvar (cezasız, sadece iter); 5 zıplama, kesintisiz koşu | 60/40 |
| P0d | Derleme Çıkışı | 57 | 42 | 4,09 | 14 | 2 zıplama + çıkış kapısı bekleme (0,8 s) | 75/25 |
| | **Traversal** | **434** | | | **110** | | **80/20** |

Sabit ek: SC-00 8 s + giriş zoom 4 s = 12 s. W0'ın dürüst dağılımı: **85 s etkileşimli + 13 s etkileşimsiz + 25 s öğretme.** İkinci cezasız telegraf dersi (`DUR` glifi) P0a'nın son 12 tile'ında verilir — W1'in ilk 30 saniyesindeki öğrenme yükü böylece azalır.

#### W1 — GÖMÜLÜ KANAL (tepe hız 11,21 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| A1 | Yeniden Yaz odası | 89 | 36 | 4,04 | 22 | Öğretme: 3 kapaklı slug bulmacası, her biri 2,4 s okuma+icra | 90/10 |
| B1 | GUID Buzu | 237 | 46 | 5,16 | 46 | `_` buz sürtünme 0,06 → 8 fren-kontrol noktası; 4 telegraf | 78/22 |
| C1 | Embed Yüzeyi | 390 | 60 | 6,73 | 58 | **İlk yüksek/alçak rota**; yüksek rotaya giriş 9 tile/s şartı; 3 boost pad | 45/55 |
| D1 | SSE Koridoru | 207 | 42 | 4,71 | 44 | `TOKEN_PIPE` tek yön: 5 boru, her biri 1,1 s transfer + 6 hassas zıplama | 88/12 |
| E1 | Slug Döşeme Bulmacası | 242 | 45 | 5,04 | 48 | 4 çoklu-tile döşeme (5 tile × 7 f), 3 dikey tırmanma | 80/20 |
| F1 | Yayına Alma Koşusu #1 | 278 | 62 | 6,95 | 40 | Kamera sürüşlü; **7 input kararı** (dallanan rampa ×2, hayalet yarışı, sakin kurtarma, glif reddi, rampa seçimi, çıkış rotası) — 5,7 s'de bir karar | 25/75 |
| G1 | KOKLAYICI yaklaşımı + prova odası | 224 | 40 | 4,48 | 50 | Yalıtılmış prova: 1 DÜĞÜM + 1 ZİL cezasız 20 s; sonra 4 telegraf | 85/15 |
| | **Traversal** | **1.667** | | | **308** | | **78/22** |

Boss KOKLAYICI 55 s · SC-01 8 s (5:40'ta).

#### W2 — KUMBARA VE AKTARIM (tepe hız 13,16 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| A2 | Toplu SMS Yağmuru — **kalıp kırıcı açılış** | 254 | 42 | 5,53 | 46 | Öğretme odası **yok**; KABUK ilk 12 s'de yağmurun içinde öğretilir. Tek büyük telegraflı yağmur (tepe 4,5 glif/10 s), 9 kabuk zamanlaması | 82/18 |
| B2 | Parent-Child Ağı | 315 | 46 | 6,05 | 52 | Akkor kablo ağacı zemin: 6 dallanma kararı, 5 telegraf, 4 `LINEAR` periyodu (2,4 s) | 72/28 |
| C2 | Kumbara Haritası | 382 | 58 | 7,63 | 50 | Yüksek/alçak rota; alçak rota gri sakin taşır, yüksek rota kısa + pip | 48/52 |
| D2 | Donmuş Hol (PARÇALA in-situ) | 232 | 40 | 5,26 | 44 | 20.000 gri sakin sayacı tırmanır; PARÇALA 14 s'de öğretilir; 6 kolon bölme | 78/22 |
| E2 | Hangfire Kulesi (dikey) | 182 | 30 | 3,95 | 46 | **Dikey tırmanış**: 12 kat, kat başına 33 f zıplama + 0,9 s yeniden konumlanma | 88/12 |
| F2 | İki Kuyruk Paralel | 284 | 45 | 5,92 | 48 | **Parçala + Kabuk** ilk çift-fiil zinciri: 5 bulmaca, her biri 18 f pencere | 75/25 |
| N2 | **Devir Borcu Kapısı #1** | 137 | 40 | 5,26 | 26 | Görünür karar: kapıdan geç (8 s, borç +1) / kendin koş (26 s, borç +0) | 80/20 |
| G2 | Yayına Alma Koşusu #2 | 326 | 62 | 8,16 | 40 | 7 input kararı | 25/75 |
| H2 | YIĞIN yaklaşımı | 155 | 42 | 5,53 | 28 | 3 YIĞIN PARÇASI cezasız prova + 2 telegraf | 82/18 |
| | **Traversal** | **2.267** | | | **380** | | **70/30** |

Boss YIĞIN 65 s · SC-02 8 s.

#### W3 — ARŞİV VE OTEL (tepe hız 15,11 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| A3 | Sprint Sonu İlk Kovalama — **kalıp kırıcı açılış** | 399 | 60 | 9,07 | 44 | Öğretme odası **yok**, doğrudan kovalama. Duvar 3,1 tile/s; 8 zıplama, 2 rota | 40/60 |
| B3 | Gantt Penceresi | 264 | 38 | 5,74 | 46 | Tarih penceresi platformu: 7 pencere kaydırma, her biri 1,4 s konumlanma | 88/12 |
| C3 | Arşiv Rafları | 338 | 40 | 6,04 | 56 | **Mario hassasiyet tavanı**: 14 tek-tile platform, 6 pencere zamanlaması | 92/8 |
| D3 | Pip: **301 İZİ** + geri dönüş kapısı | 152 | 42 | 6,35 | 24 | Pip odası; geri dönüş kapısı burada açılır (opsiyonel) | 85/15 |
| E3 | Mühür + Üç Araç Odası | 346 | 44 | 6,65 | 52 | MÜHÜR 14 s'de in-situ; 3 zorunlu oda, oda başına 1 damga + 2 zıplama | 80/20 |
| F3 | Pnömatik Tüpler | 366 | 55 | 8,31 | 44 | `TUBE_CAR` ağı: 7 tüp × 0,8 s transfer + 5 rota kararı | 52/48 |
| G3 | Sahte Tabela Koridoru | 242 | 40 | 6,04 | 40 | `~` yalan karo yoğunluk tavanı **%12**; 9 okuma kararı (3 sinyal) | 90/10 |
| H3 | Mühür + Kabuk kombinasyonu | 292 | 46 | 6,95 | 42 | 4 çift-fiil bulmacası, 18 f zincir penceresi | 78/22 |
| I3 | Yayına Alma Koşusu #3 | 375 | 62 | 9,37 | 40 | 7 input kararı | 25/75 |
| | **Traversal** | **2.774** | | | **388** | | **62/38** |

Boss SAHTE MİSAFİR 70 s · SC-03 (arşiv açığa çıkma, 22:10) + SC-04 (zehir, 26:49) — ikisi 8 s'lik tek bütçe kaleminde, SC-03 W3 ortasında, SC-04 W3 çıkışında; toplam 16 s, §6'da 8+8 olarak görünür.

#### W4 — VEKTÖR VE İZİN (tepe hız 17,06 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| — | **İMZA Faz 1 — kalıp kırıcı açılış** | — | — | — | 30 | Dünya boss'un birinci faziyla açılır. UZAKTAN RED henüz yok → kaçmak zorundasın | boss |
| A4 | Kanca odası (in-situ) | 195 | 38 | 6,48 | 30 | KANCA 15 s'de öğretilir; 4 kanca hedefi, her biri 5 f startup + 24 f çekiş | 88/12 |
| B4 | Chunk Takımyıldızı | 392 | 46 | 7,85 | 50 | Görüş açık, mesafe = anlam. 8 benzerlik kararı + 5 telegraf | 70/30 |
| C4 | Top-K Zinciri (yüksek rota) | 532 | 60 | 10,24 | 52 | 3 ardışık kanca zinciri (12 f pencere), momentum korumalı; **GECİKMELİ EKO** tehlikesi | 42/58 |
| D4 | Havada Slug | 345 | 44 | 7,51 | 46 | **Kanca + Yeniden Yaz**: 5 bulmaca, 22 kare zincir penceresi | 75/25 |
| E4 | `allow? [y/N]` Duvarları | 315 | 42 | 7,17 | 44 | BEKÇİ mesafe yönetimi: 6 uzaktan red, her biri 48 f telegraf | 82/18 |
| F4 | REGRESYON'un En Hızlı Kovalaması | 508 | 62 | 10,58 | 48 | Hayalet yarışı, çift rota; hayalet W3 sabitleriyle (4,03 px/f) koşar | 30/70 |
| G4 | Terminal İmzası (Çatal + Mühür) | 322 | 45 | 7,68 | 42 | 4 çift-fiil bulmacası + 2 paralel kapı | 78/22 |
| N4 | **Devir Borcu Kapısı #2** | 177 | 40 | 6,82 | 26 | Kapıdan geç (borç +1) / kendin koş (26 s) | 80/20 |
| H4 | Yayına Alma Koşusu #4 | 445 | 62 | 10,58 | 42 | 7 input kararı | 25/75 |
| | **Traversal** | **3.231** | | | **380** | | **52/48** |

Boss İMZA Faz 1 (açılış) 30 s + Faz 2 (kapanış) 45 s = 75 s · SC-05 8 s.

#### W5 — TEZ LABORATUVARI (tepe hız 19,01 tile/s) — REGRESYON yok

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| A5 | Sessiz Etiket Koridoru — **kalıp kırıcı açılış** | 301 | 36 | 6,84 | 44 | Öğretme odası yok; kovalayan yok, ses yok. ÖN-FİLTRE in-situ; 10 okuma durağı | 90/10 |
| B5 | 6'da 1 Yanlış Etiket | 347 | 38 | 7,22 | 48 | Gölge deseni **2 px** + kesikli çerçeve; 12 ayırt etme kararı | 92/8 |
| C5 | İkinci Görüş | 365 | 40 | 7,60 | 48 | Zorunlu çapraz kontrol; hold 30 f + etiketler %50 yavaşlar (hız pahasına okuma) | 85/15 |
| D5 | Çapa (0,5 s pencere) | 246 | 38 | 7,22 | 34 | 6 kabuk-kırma zamanlaması, her biri 30 f pencere | 85/15 |
| E5 | Rüzgâr Tüneli | 523 | 55 | 10,46 | 50 | Akan etiketli örnekler; hız + okuma birlikte; 6 rota kararı | 50/50 |
| F5 | Sıcak GPU Kanalları | 342 | 45 | 8,55 | 40 | 40 kare içinde çıkılmazsa revert; 5 kanal + 4 dikey | 78/22 |
| G5 | Üçlü Kombinasyon | 367 | 42 | 7,98 | 46 | **Ön-Filtre + Kanca + Çapa**: 4 bulmaca, 90 f overlay penceresi | 80/20 |
| N5 | **Devir Borcu Kapısı #3** | 198 | 40 | 7,60 | 26 | Kapıdan geç (borç +1) / kendin koş (26 s) | 80/20 |
| H5 | KORO arenası yaklaşımı | 100 | 44 | 8,36 | 12 | Fan uğultusu, tek geçiş | 82/18 |
| | **Traversal** | **2.789** | | | **348** | | **45/55** |

Boss KORO 90 s (3 dalga × 30 s) · dünya kartı: *Kovalayan bu kapıdan geçmez.* (ara sahne değil, sessizlik + kart).

#### W6 — YOKSAY (tepe hız 19,99 tile/s)

| ID | Segment | tile | %tepe | tile/s | sn | Yavaşlatma mekanizması | M/S |
|---|---|---|---|---|---|---|---|
| A6 | İniş | 374 | 55 | 10,99 | 34 | Arkada 6 dünya katman katman; 5 zıplama + 3 fiil | 45/55 |
| — | **Faz 1 — İkna** | — | — | — | 55 | boss | boss |
| R1 | Ara koşu 1 | 264 | 55 | 10,99 | 24 | Commit taşı + 4 telegraf | 45/55 |
| — | **Faz 2 — Filtre** | — | — | — | 48 | boss (içinde 2 commit taşı) | boss |
| R2 | Ara koşu 2 | 264 | 55 | 10,99 | 24 | Commit taşı + 4 telegraf | 45/55 |
| P3 | **Faz 3 — Borç Şeritleri** (3 şerit) | 528 | 55 | 10,99 | 48 | Şerit başına 16 s; devredilen fiil kapalı → alternatif uzun rota | 40/60 |
| — | **MERGE** | — | — | — | 6 | Tek tuş, sıfır-detune akoru | — |
| | **Traversal** | **1.430** | | | **130** | | **40/60** |

Boss YOKSAY Faz 1+2 = 103 s · SC-06 (giriş) + SC-07 (Faz 2→3) = 16 s · FINAL 18 s · MERGE 6 s.

#### EP — SLUG OTOYOLU (tepe hız 21,45 tile/s, overflow 29,0)

| ID | Segment | tile | %tepe | tile/s | sn | Not | M/S |
|---|---|---|---|---|---|---|---|
| A7 | Tam Momentum Rampası | 525 | 72 | 15,44 | 34 | 2,20× ilk ve tek kez; `overflowCap` erişilir | 15/85 |
| B7 | Çok Şeritli Otoyol | 669 | 78 | 16,73 | 40 | Üç şerit, hepsi ödüllü; 12 pip sayımı ve `F1 %83,81` mührü yol üstündeki kapılar | 10/90 |
| C7 | Bitiş Çizgisi | 510 | 70 | 15,01 | 34 | Ufukta İletişim bölümünün silüeti + **azalan mesafe sayacı** baştan görünür; kurtarılan gri sakinler yol kenarında sayılır | 15/85 |
| | **Traversal** | **1.704** | | | **108** | Glif 0, `~` %0, medyan revert 0 | 15/85 |

Kapanış zoom-out oyuncu bitiş çizgisine **dokununca** tetiklenir, süre dolunca değil. Çıkış İletişim bölümüne.

### 5.5 Rotasyon planı (tekrar hissini kesen 6 eksen)

1. **Kalıp kırıcı açılışlar (D5):** W2 yağmurla, W3 kovalamayla, W4 boss'un Faz 1'iyle, W5 sessizlikle açılır. Yalnız W1 öğretme odasıyla açılır (ilk fiil).
2. **Kamera modu rotasyonu:** 6 mod (`free-follow`, `chase-wall`, `vertical-climb`, `tube-cut`, `ghost-race`, `highway-wide`). Aynı mod iki komşu segmentte tekrarlanamaz; dünya başına en az 3 mod.
3. **Gramer ailesi kotası:** dünya başına 3 aile, komşu dünyayla en çok 1 ortak. W2 = COLUMN+PUZZLE+GAP · W3 = GAP+RAMP+GAUNTLET · W4 = FLOW+PUZZLE+RAMP · W5 = GAUNTLET+GAP+FLOW.
4. **Boss olumsuzlama rotasyonu:** her boss farklı bir yeteneği iptal eder — okuma (KOKLAYICI), vurma (YIĞIN), durma (SAHTE MİSAFİR), yakınlık (İMZA), güvenme (KORO), kendi kaydı (YOKSAY). Aynı iptal iki kez gelmez.
5. **Skin ve palet rotasyonu:** 8 palet tamamen `--bg/--surface/--surface-soft/--accent/--secondary/--led` üzerinden üretilir. Aynı dekoratör tohumu iki komşu dünyada kullanılmaz.
6. **Aynı oda iki kez oynanmaz.** Geri dönüş kapıları yalnız W3, W4, W5'te ve tümü opsiyoneldir; W1-W2 hiç tekrar oynanmaz.

### 5.6 Zorluk eğrisi

| Dünya | maxSpeed | glif/10 s | `~` % | Medyan revert | Eşzamanlı sinyal | HUD İKNA (çıkış) | Eğri |
|---|---|---|---|---|---|---|---|
| W0 | 1,00× | 0,4 | 0 | 3 | 1 | 95 | `▁` |
| W1 | 1,15× | 1,4 | 3 | 7 | 2 | 76 | `▂` |
| W2 | 1,35× | 2,2 (tepe 4,5) | 5 | 10 | 3 | 52 | `▃` |
| W3 | 1,55× | 2,8 | **12** | 11 | 3 | 34 → **+5 (zehir)** | `▅` |
| W4 | 1,75× | 3,2 | 8 | 12 | 4 | 19 | `▆` |
| W5 | 1,95× | 3,6 | 7 | 14 | 5 | 7 | `▇` |
| W6 | 2,05× | 4,0 | 11 | 8 | 5 | 3 | `█` doruk 44:45 |
| EP | 2,20× | 0 | 0 | 0 | 1 | **0,48** | `▂` boşalma |

Toplam medyan revert **65 × 0,4 s = 26 s** ölü zaman + ~4 s/revert yeniden koşu (§6'da ayrı kalem). Eğri tek doruklu: W3'te zehir olayı yapay bir sıçrama yapar, doruk W6'da 44:45'tedir, ardından yalnız 1:54 epilog gelir. **İki komşu yavaş dünya yok:** W3 kovalamayla açılır (verim %60), W5 sessiz açılır ama E5 rüzgâr tüneli %55.

---

## 6. Dakika dakika oynanış bütçesi

### 6.1 İki defter kuralı

Denetimin en sert bulgusu şuydu: ölüm ve yeniden deneme süresi içerik olarak sayılmıştı. Bu kitapta **iki ayrı defter** vardır ve karıştırılmaz.

- **DEFTER A — İÇERİK (temiz geçiş):** oyuncunun bir kez, hiç ölmeden gördüğü özgün içerik. İçerik hacmi iddiası **yalnızca** bu deftere dayanır.
- **DEFTER B — MEDYAN DUVAR SAATİ:** Defter A + revert yeniden koşu + boss yeniden deneme. Oyuncunun gerçekte harcadığı süre.

**Ölüm/deneme süresi asla içerik sayılmaz.** "Patron × medyan deneme" ayrı bir kolondur. Yarım kalmış `~34 dk × %... → 13,9 dk` formülü **silinmiştir**.

### 6.2 Defter A — içerik

| Kalem | Değer | Türetme |
|---|---|---|
| Traversal | **2.152 s** | 16.296 tile ÷ segment bazlı efektif hız (§5.4, scriptle) |
| Boss özgün içeriği | **458 s** | KOKLAYICI 55 + YIĞIN 65 + SAHTE MİSAFİR 70 + İMZA 75 + KORO 90 + YOKSAY 103 |
| Sabit (etkileşimsiz) | **90 s** | 7 ara sahne × 8 = 56 · giriş zoom 4 · FINAL 18 · MERGE 6 · epilog kapanış 6 |
| **DEFTER A TOPLAM** | **2.700 s = 45:00** | |

Etkileşimsiz oran: 90 / 2700 = **%3,3**. (Önceki tasarımda 142 s etkileşimsiz süre iki defter arasında kaybolmuştu.)

**Yayına Alma Koşuları artık "sabit" değil.** Dördü de traversal'da sayılır çünkü her biri **7 input kararı** taşır (ortalama 5,7 s'de bir karar): dallanan rampa ×2, hayalet yarışı, sakin kurtarma, glif reddi, rampa seçimi, çıkış rotası. Kamera sürüşlüdür ama QTE'li ara sahne değildir.

### 6.3 Defter B — medyan duvar saati

| # | Dünya | Traversal | Boss | Sabit | Revert (n × 4,2 s) | Boss retry (0,35 × içerik) | Dünya toplam | Kümülatif |
|---|---|---|---|---|---|---|---|---|
| W0 | Prolog | 110 | 0 | 12 | 13 (3) | 0 | 135 | **2:15** |
| W1 | Gömülü Kanal | 308 | 55 | 8 | 29 (7) | 19 | 420 | **9:14** |
| W2 | Kumbara ve Aktarım | 380 | 65 | 8 | 42 (10) | 23 | 518 | **17:52** |
| W3 | Arşiv ve Otel | 388 | 70 | 8 | 46 (11) | 25 | 537 | **26:49** |
| W4 | Vektör ve İzin | 380 | 75 | 8 | 50 (12) | 26 | 540 | **35:48** |
| W5 | Tez Laboratuvarı | 348 | 90 | 8 | 59 (14) | 31 | 536 | **44:45** |
| W6 | YOKSAY | 130 | 103 | 32 | 34 (8) | 36 | 335 | **50:19** |
| EP | Slug Otoyolu | 108 | 0 | 6 | 0 (0) | 0 | 114 | **52:13** |
| | **TOPLAM** | **2.152** | **458** | **90** | **273 (65)** | **160** | **3.133** | **52:13** |

**Kanıt 1 — medyan.** 2152 + 458 + 90 + 273 + 160 = 3133 s = **52:13**. Kalem kalem toplamlar §5.4 segment tablosuyla birebir örtüşür (script doğrulaması).

**Revert maliyeti nasıl hesaplandı.** Revert başına 4,2 s = 0,4 s revert geçişi + ~3,8 s yeniden koşu. Commit taşları ortalama 16 s aralıklıdır ve ölümler tehlike öncesinde kümelenir, bu yüzden yeniden koşu aralığın yarısı değil ~%24'üdür.

**Boss retry maliyeti nasıl hesaplandı.** Medyan deneme hedefi **2**. Failure-forward yapı sayesinde başarısız bir deneme fazı sıfırlamaz; yalnızca içinde bulunulan dalgayı tekrar ettirir. Başarısız geçişin maliyeti içeriğin **%35**'i. 0,35 × 458 = 160 s. (Önceki tasarımda 5 medyan denemeli KORO tek başına 7,9 dk yiyordu.)

### 6.4 Kanıt 2 — hızlı oyuncu profili

Denetimin dayattığı katsayılar: traversal böleni **1,9**, patron çarpanı **0,70**.

| Kalem | Hesap | s |
|---|---|---|
| Traversal | 2152 / 1,9 | 1.133 |
| Boss | 458 × 0,70 | 321 |
| Sabit (atlanabilir kısımlar atlanmış) | 7 × 1,2 + 18 + 6 + 4 + 6 | 42 |
| Revert | 22 × 3,6 | 79 |
| Boss retry | 0,35 × 321 × 0,5 | 56 |
| Yüksek rota kısayolları | 5 rota × ~18 s | −90 |
| **HIZLI TOPLAM** | | **1.541 s = 25:41** |

**Bu sayı kasıtlı olarak 40 dakikanın altındadır ve iddia buna göre düzeltilmiştir.** Kırmızı çizgi *medyan* oyuncuyu bağlar ("medyan oyuncu için en az 40-45 dakika"); medyan 52:13'tür, tabanın **%16 üstünde**. Yetkin bir oyuncunun momentum platformcusunu medyandan 1,9× hızlı ve 5 kısayolla bitirmesi normaldir; 1,22 gibi bir bölenle 42 dakika üretmek aritmetik değil temenniydi.

### 6.5 Kanıt 3 — tamamlayıcı profili

| Kalem | Hesap | s |
|---|---|---|
| Traversal | 2152 × 1,16 | 2.496 |
| Boss | 458 × 1,35 | 618 |
| Sabit | | 90 |
| Revert | 100 × 4,5 | 450 |
| Boss retry | 0,35 × 618 × 1,5 | 324 |
| Opsiyonel içerik | 3 dönüş kapısı × 55 + 3 pip odası × 40 + gri sakin tam kurtarma 90 | 375 |
| **TAMAMLAYICI TOPLAM** | | **4.353 s = 72:33** |

**Tek opsiyonel defter.** Önceki tasarımda opsiyonel içerik iki departmanda 590 s ve 180 s olarak yazılıydı ve pip odaları çift sayılmıştı. Bu kitapta:

| Opsiyonel kalem | Adet | Süre | Not |
|---|---|---|---|
| Geri dönüş kapısı | **3** (W3, W4, W5) | 55 s | Duraklatma haritasından girilir; `Esc` ana yola döndürür |
| Opsiyonel pip odası | **3** (ÇATAL, UZAKTAN RED, TOP-K ZİNCİR) | 40 s | Diğer 3 pip (301 İZİ, ÇAPA, İKİNCİ GÖRÜŞ) **zorunlu ana yolda** — çift sayım yok |
| Gri sakin tam kurtarma | — | 90 s | 20.000 sayacını sıfıra indirmek |
| Sertifika mühürleri | 5 | 0 s | Yalnızca silüet, W3/W4 dönüş kapılarının kilidi; metin yok |
| **Toplam** | | **375 s** | |

### 6.6 Profil özeti

| Profil | Süre | Kırmızı çizgi 2 (≥40-45 dk medyan) |
|---|---|---|
| Hızlı (yetkin, kısayollu) | **25:41** | — (bağlayıcı değil) |
| **Medyan** | **52:13** | ✅ %16 pay |
| Defter A (saf içerik) | **45:00** | ✅ tam sınırda, retry ile şişirilmemiş |
| Tamamlayıcı | **72:33** | ✅ |

**Çevrim doğrulaması.** En kısa segment 12 s (H5), en uzun 58 s (C1). Commit taşı aralığı **8-58 s** arasında dalgalanır; sabit metronom yok. Kamera hiçbir zaman tam durmaz, en fazla %35 yavaşlar. Pasif süre: 90 s sabit + 0 s otomatik akış = **%3,3**, 6 dk tavanının çok altında.

### 6.7 Doğrulama yöntemi (iddia ölçülmüş değil, hedeftir)

Bu bölümün sayıları **tasarım hedefidir**, ölçülmüş aralık değildir. Doğrulama zinciri:

1. **Faz 2'de telemetri** (~140 satır): segment duvar saati, revert sayısı ve konumu, **ölçülen verim yüzdesi** (`tile / (sn × tepe_hız)`), boss deneme sayısı, ölüm histogramı. `localStorage` + duraklatma ekranından "JSON kopyala".
2. **Faz 4 dış oyun testi kapısı:** geliştirici olmayan **en az 5 kişi** dikey dilimi bitirmeden W3-W5'e tek satır yazılmaz.
3. **Kalibrasyon kuralı:** ölçülen verim, tasarım verimden segment başına %15'ten fazla saparsa **tile sayısı** düzeltilir, iddia düzeltilmez. Toplam 40 dakikanın altına düşerse tile eklenir.
4. **Sürüm notu:** ölçüm bitene kadar dışa dönük iletişimde "medyan ~50 dk" yazılmaz; "tek oturumluk" denir.

---

## 7. Düşman bestiyeri ve boss dosyaları

### 7.1 Tek hasar sözleşmesi

Salih'in movesetinde saldırı butonu yok. Bu yüzden bütün bestiyer ve bütün bosslar tek bir evrensel sözleşme üzerine kuruludur:

> **fiil → İFŞA DÜĞÜMÜ (`EXPOSE`) → stomp**

İfşa düğümü 8×8 piksel, `led` renkli, nabız atar. Fiil olmadan asla açılmaz; açıldığında **her zaman bir zıplama yayıyla erişilebilir mesafededir**: maks. 2,0 tile yatay, 1,5 tile dikey — doğrulanmış zıplama tepe yüksekliği **3,47 tile** (§4.3), yani %131 pay. Böylece hiçbir boss "bilgi yarışması" değildir; her boss son anda bir platform hareketiyle biter.

### 7.2 Hasar sınıfları

| Sınıf | Etki | Süre |
|---|---|---|
| **A — TEMAS** | `vx *= 0.25`, `maxSpeed *= 0.50`. Yetenek kilidi yok | 48 kare (0,8 s) |
| **B — İTAAT** | İKNA ORANI +0,60 … +1,20 puan | anlık |
| **C — REVERT** | Son commit taşına dönüş | 24 kare (0,4 s) |

Ölüm yalnızca C'dir ve hiçbir şey kaybettirmez. **Tehdit A değil B'dir.**

**İkna kazası önlemi.** İtaat yalnızca eylem, glifin **etki yarıçapı** (4 tile) içinde ve pencere açıkken yapılırsa sayılır. Etki yarıçapı zemine %12 opaklıkta glif renginde boyanır. "Yanlışlıkla zıpladım ve oran arttı" durumu görünmez bir kural değildir.

### 7.3 Glif sözlüğü

8 kelime, 6×10 bit maskesi: **ZIPLA / DUR / DÖN / BEKLE / BIRAK / ONAYLA / İZİN VER / GÜVEN** — EN: JUMP / STOP / TURN / WAIT / DROP / APPROVE / ALLOW / TRUST.

Glif düşmanın 4 px üstünde çizilir; telegraf süresince %0 → %100 opaklığa gider, böylece **kalan süre görsel olarak okunur**.

### 7.4 Bestiyer — 13 tür

| # | Ad (TR / EN) | Piksel | Girer | Davranış makinesi | Öğrettiği ders | Kombinasyon |
|---|---|---|---|---|---|---|
| 1 | TALİMAT / INSTRUCTION | 12×12 | W0 | `IDLE → TELEGRAPH(36) → WINDOW(24) → COOLDOWN(90)` — hareketsiz, havada asılı | Glif okunabilir; itaat opsiyoneldir, bedeli orandır | Her dünyada zemin dili |
| 2 | SEKME / DRIFT TAB | 16×14 | W1 | `PATROL(sürtünme 0.06) → TELEGRAPH(36,"DUR") → WINDOW(30) → PATROL` — **dönemez** | Momentumu korumak bir reddetme biçimidir | + GUID buzu |
| 3 | BORU AĞZI / PIPE MOUTH | 14×20 | W1 | `EMIT(48 f'de 1 token, tek yön) → JAM(90) → EMIT` — asla ters yöne ateş etmez | SSE tek yönlüdür; yönü değiştirmek için kaynağı yeniden yazılır | + YENİDEN YAZ |
| 4 | ZİL / BELL | 8×8, 9-14'lük sürü | W2 | `SWARM_IDLE → CHARGE(42,"DÖN") → RAIN(sürü ortak, 36 f) → REGROUP(120)` | Toplu bildirim tek büyük olaydır, 14 küçük olay değil | + KABUK |
| 5 | DÜĞÜM / NODE | 20×20 | W2 | `READ_SWEEP(koni 60°, 2 s tur) → LOCK(36,"GÜVEN") → PULSE(18)` — **koni** zarar verir, gövde vermez | Zarar veren şey temas değil **okunmak**tır | + KABUK, sonra + MÜHÜR (W3) |
| 6 | YIĞIN PARÇASI / STACK SHARD | 14×14, kolon | W2 | `HANG → DROP(yerçekimi 1.0) → SETTLE(kalıcı platform)` | Yığın engel değil malzemedir | + PARÇALA |
| 7 | GANTT ÇUBUĞU / GANTT BAR | 4-20 tile | W3 | Zamanlayıcı **yok**. Varlığı oyuncunun x konumuna bağlı tarih penceresi imleciyle belirlenir; kenarları 24 f önce yarı saydam hayalet | Platform yanıp sönmez, **sen pencereyi taşırsın** | + YENİDEN YAZ |
| 8 | ŞİŞME / SCOPE CREEP | 16×16 → 36×36 | W3 | `CREEP(0.9 tile/s) → [stomp alınırsa] GROW(+25% boyut, +15% hız) → CREEP` | Bazı şeyler dokunmayı bırakınca ölür | SAHTE MİSAFİR Faz 2 grameri |
| 9 | TÜP POSTASI / PNEUMATIC CAPSULE | 14×20 | W3 | `TRAVEL(3.4 tile/s, ray) → PRESENT(42,"ONAYLA") → STAMP(24)` — pembe gövde + **kesikli çerçeve** = sahte | Renk yalan söyler, mühür doğruyu söyler | + BAĞLAM MÜHRÜ |
| 10 | KOMŞU / NEIGHBOR | 12×12 | W4 | `ORBIT(sabit yörünge) → BAIT(kanca menzilinde parlar)` — **en yakın**, ama en benzer değil | Yakınlık benzerlik değildir | + KANCA (top-k okumak) |
| 11 | BEKÇİ / GATEKEEPER | 20×24 | W4 | `ASK(48,"İZİN VER") → [yakınsa] FORCE_YES → [uzaktan red gelirse] SIGN_SELF(90, ifşa)` | İzin uzaktan reddedilebilir; yakınında dururken reddedilemez | + UZAKTAN RED, + ÇATAL |
| 12 | ETİKET / LABEL | 16×16 | W5 | `DRIFT(rüzgâr tüneli) → CLASSIFY(ön-filtre 6'da 1'ini yanlış yeşil yapar)` — yanlış olan **gölge deseni**yle ayırt edilir (doğru: 2 px sağa kayan düz gölge / yanlış: **2 px sola kayan** kesikli gölge) | Filtreye güvenme, ikinci gözle doğrula | + ÖN-FİLTRE + İKİNCİ GÖRÜŞ |
| 13 | REGRESYON / REGRESSION | 10×16 (aynı silüet) | W1-W6, **W5'te yok** | `RAIL_RUN(bir önceki dünyanın fizik sabitleri, deterministik) → STUMBLE(senin şimdi kolayca aştığın geometride 90 f) → RAIL_RUN` | Geçmiş sürümün seni yalnızca yavaşlatabilir | Her dünyada |

**Gölge sinyali düzeltmesi (denetim).** Yanlış etiket 1 px değil **2 px** kayar **ve** çerçevesi kesiklidir — iki sinyal aynı anda. İKİNCİ GÖRÜŞ hold'u etiketleri 30 kare boyunca **%50 yavaşlatır**, yani okuma penceresi hız pahasına satın alınabilir. Beceri "piksel görme" değil, "ne zaman yavaşlayacağını seçme"dir. DENGELİ MOD'da kayma 3 px, etiket 20×20.

### 7.5 Ek tehlikeler (glifsiz, düşman değil)

| Tehlike | Dünya | Sayı |
|---|---|---|
| **SPRINT SONU / END OF SPRINT** | W3+ | 12 tile genişlik, sabit **3,1 tile/s**. Temas C sınıfı. **Revert'te duvar da sıfırlanır.** Aynı noktada 5. revert'ten sonra 2 s durur |
| HOT-RELOAD DALGASI | W0 | 2,6 tile/s arkadan gelen duvar; W0'da teması **cezasızdır**, sadece iter |
| GUID karosu (kaygan) | W1 | sürtünme 0,06 (normal 0,18) |
| DONMUŞ SAKİN (gri, 20.000 sayaç) | W2 | temas yok — kurtarılabilir nesne |
| GECİKMELİ EKO | W4 (C4) | 60 kare gecikmeli konum bandı kopyası; getirilmemiş chunk platformlarında durur. REGRESYON rig'ini kullanır, **yeni varlık yok** |
| SICAK GPU KANALI | W5 | 40 kare içinde çıkılmazsa C sınıfı revert; kenarı `led` dudak |
| RAY (MediatR tüp hattı) | W3 | üstünde koşulabilir, yönü sabit |

### 7.6 Boss dosyaları

Ortak sözleşme: her boss **kendi dünyasında öğretilmiş fiili** ister, hiçbiri yeni kontrol öğretmez, **her fazın içinde commit taşı vardır** ve faz kaybı fazı baştan başlatmaz. **Failure-forward:** mekaniği kaçırmak dövüşü sıfırlamaz, sadece zorlaştırır. **Medyan deneme hedefi hepsinde 2.**

#### W1 — KOKLAYICI / SNIFFER · 2 faz · 55 s · medyan deneme 2
Kaynak: YODER Kumbara ağı / okuma. *Olumsuzladığı yetenek: okunabilir olmak.*
- **Faz 1 (30 s):** Üç okuma konisi yüzeyi tarar. Telegraf: koni daralır + `GÜVEN`, **42 kare**. Pencere: koni üzerindeyken **KABUK** (40 kare okunmazlık) → okuma boş döner, boss sendeler, lensi 90 kare ifşa olur. **3 boş okuma** gerekir. Çukur yok.
- **Faz 2 (25 s):** Koniler 2'ye düşer ama ZİL sürüsü ortak yağmur ekler; kabuk zamanlama ister (yağmur + koni aynı 40 karede). İfşa penceresi 60 kareye iner. **Faz başında commit taşı.**
- **Öğrenilebilirlik garantisi:** G1 segmentinde, boss'tan 50 s önce, tek bir DÜĞÜM ve tek bir ZİL yalıtılmış bir odada birlikte gösterilir; oyuncu tam bu iki-üst-üste durumu **cezasız** prova eder.

#### W2 — YIĞIN / THE PILE · 2 faz · 65 s · medyan deneme 2
Kaynak: AYS, 20.000 kullanıcılık Excel aktarımı çöküşü. *Olumsuzladığı yetenek: vurmak.*
- Boss **vurulamaz**: gövdesi monolitik blok, stomp hiçbir şey yapmaz. Oyuncu bunu 3 saniyede öğrenir, **ceza yok**.
- **Faz 1 (35 s):** Blok 4 s'de bir 20.000'lik kolonu boşaltır. Telegraf: blok 6 px şişer + `BEKLE`, **36 kare**. Pencere: **PARÇALA** ile kolonu 5 parçaya böl → parçalar beklenen kuyruk değil, **anında binilebilen akan merdiven** olur. Merdivenin tepesi ifşa düğümüne çıkar.
- **Faz 2 (30 s):** İki kolon aynı anda. Parçala tek seferde bir kolona uygulanır → oyuncu hangisini parçalayacağını seçer, diğerinden kaçar. Kaçırılan kolon donmuş sakin sayacını yukarıda tutar; parçalanan kolon sayacı düşürür. **Kaybetmek bitirmez, yavaşlatır.** Faz başında commit taşı.

#### W3 — SAHTE MİSAFİR / FALSE GUEST · 3 faz · 70 s · medyan deneme 2
Kaynak: Otel/MCP, otel bağlamı doğrulama + AdminApprovals. *Olumsuzladığı yetenek: durmak.*
- **Kaçan boss**, eylemsizlik dövüşü değil kovalamaca. 6 araç odası arasında pnömatik tüplerle atlar.
- **Faz 1-2-3 (24/24/22 s):** Oda sayısı 6 → 4 → 2, boss hızı 3,4 → 4,2 → 5,1 tile/s. Telegraf: tüpe girmeden **36 kare** önce `ONAYLA` + kesikli pembe çerçeve + sola kayan gölge. Pencere: **koşarken 18 kare BAĞLAM MÜHRÜ** damgası → yanlış otel bağlamı ifşa olur, boss 75 kare tüpte sıkışır.
- **Faz 2'de KAPSAM dersi:** boss bir ŞİŞME kabuğu takar; stomp onu büyütür. Çözüm dokunmayı bırakıp mührü kullanmaktır. (Kesilen KAPSAM bossunun dersi burada yaşar.)
- Her faz başında commit taşı. Faz 3'te ölmek Faz 1'e döndürmez.

#### W4 — İMZA / THE SIGNATURE · 2 faz, dünyanın iki ucunda · 75 s · medyan deneme 2
Kaynak: AI_Cpp izin sistemi (`allow? [y/N]`). *Olumsuzladığı yetenek: yakın durmak.*
- **Faz 1 — dünyanın AÇILIŞI (30 s):** Terminal hemen izin ister. UZAKTAN RED henüz yok, KANCA yok. Tek çözüm **kaçmak**: mesafe açarak konileri boşa düşürmek. Bu bir kayıp değil, bir kaçıştır — dünya bir kalıp kırıcı boss fazıyla başlar.
- **Faz 2 — dünyanın KAPANIŞI (45 s):** Duvarlardaki `allow? [y/N]` satırları BEKÇİ'ye dönüşür; yakınlarında reddetme çalışmaz. **UZAKTAN RED** (≥6 tile mesafeden, yalnız telegraf penceresinde) tek çözüm — dövüş bir **mesafe yönetimi** dövüşüdür. İki kapı aynı anda sorarsa **ÇATAL** ile iki reddi paralel işletirsin. REGRESYON burada en hızlı kovalamayı yapar (W3 sabitleriyle). İfşa: terminal kendi izin satırını imzalar ve **imza mührü stomp edilebilir platform olur**.

#### W5 — KORO / THE CHORUS · 3 dalga · 90 s · medyan deneme 2
Kaynak: Lisans tezi test kümesi — 116 örnek. REGRESYON bu dünyada **yok**: laboratuvarda yalnızsın. *Olumsuzladığı yetenek: güvenmek.*
- **Ezber duvarı kaldırıldı.** Önceki tasarım 116 mermiyi tek volede veriyor, medyan 5 deneme öngörüyor ve bunu "tasarlanmıştır" diye savunuyordu. Yeni yapı:

| Dalga | Mermi | Süre | Yanlış etiket oranı | Dalga sonu |
|---|---|---|---|---|
| 1 | 39 | 30 s | 6'da 1 | **commit taşı** |
| 2 | 39 | 30 s | 4'te 1, ama **ÇAPA** bir mermiyi platforma çevirir | **commit taşı** |
| 3 | 38 | 30 s | 4'te 1 + iki eşzamanlı ağız | ifşa düğümü |

- Kaçan her mermi **fazı sıfırlamaz**, orana +0,60 ekler. Kaybetmek mümkün değil, **pahalı**.
- Desen **deterministik**; ama artık ezber gerektirmiyor çünkü dalga başına commit taşı var ve başarısızlık ileri taşıyor.
- Telegraf: her dalga 36 kare önce koro ağzını açar.

#### W6 — YOKSAY / OVERRIDE · 3 faz · 103 s boss + 48 s borç koşusu · medyan deneme 2/faz
Gövdesi REGRESYON'un gövdesidir.

**Gövde mekaniği — artık tanımlı.** Kanonun "input kaydı reddedildi" kararı korunur ve şöyle düzeltilir: **240 karelik konum bandı** kullanılır (`Float32Array x, y` + `Uint8Array poseId`, ring buffer, ~15 satır). Bandın somut mekaniği:

> **Faz 3'ün arena zemini, oyuncunun Faz 1-2'de gerçekten koştuğu yoldur.** Kayıtlı yolun geçmediği yerde platform yok. Kendi rotasını nasıl kurduysan borç şeritlerini o zeminde koşarsın. Boss'un silueti aynı banttan doldurulur.

- **Faz 1 — İkna (55 s):** Kazanılabilir ama pahalı. Beş fiili dönüşümlü ister; kaçan her emir oranı yükseltir (tavan taban+12,00). Telegraf 36 kare, hepsi okunabilir. Faz içinde 2 commit taşı.
- **Faz 2 — Filtre (48 s):** Zehirlenmiş yeşil geri döner; ÖN-FİLTRE + İKİNCİ GÖRÜŞ çapraz kontrolü. Yanlış çapraz kontrol Faz 1'in bir dalgasını geri getirir (failure-forward, sıfırlama değil). Faz içinde 2 commit taşı.
- **Faz 3 — Borç (48 s, 3 şerit):** §3.6. Devredilen fiil kapalı; alternatif rota daha uzun ve zordur ama her borç kombinasyonu için çözülebilir (8 kombinasyon test edilir).
- **MERGE (6 s):** Dövüş yok. Oran deterministik olarak 0,48'e çöker.

### 7.7 Zorluk bütçesi — tek geçerli toplam

| Boss | Özgün içerik | Medyan deneme | Retry maliyeti (0,35 × içerik) | Medyan duvar saati |
|---|---|---|---|---|
| KOKLAYICI | 55 s | 2 | 19 s | 74 s |
| YIĞIN | 65 s | 2 | 23 s | 88 s |
| SAHTE MİSAFİR | 70 s | 2 | 25 s | 95 s |
| İMZA | 75 s | 2 | 26 s | 101 s |
| KORO | 90 s | 2 | 31 s | 121 s |
| YOKSAY (Faz 1+2) | 103 s | 2/faz | 36 s | 139 s |
| **Toplam** | **458 s (7:38)** | | **160 s (2:40)** | **618 s (10:18)** |

Boss içeriği Defter A'nın **%17'si**, medyan duvar saatinin **%20'si**. Medyan oyuncu tüm oyunda **65 kez** revert eder; 24 karelik revert bunu 26 saniyelik geçiş kaybına + ~247 saniyelik yeniden koşuya çevirir. Ölmek kolaydır, ucuzdur ve hiçbir denemede "baştan" yoktur.

---

## 8. "Sonuna gelmek isteme" sistemi

### 8.1 Ölüm modeli

- **Can yok. Game over yok. Baştan başlama yok.** `R` her an, cezasız, anında.
- 24 kare (0,4 s) revert. Ortalama **16 saniyede** bir commit taşı; HUD'da git log gibi birikir.
- **Bozuk girdi cezası sıfır.** Yanlış tuş, yanlış fiil, boşa zıplama: hiçbiri oranı yükseltmez, hiçbiri kilitlemez.
- **Adaptif checkpoint:** aynı noktada 3 revert → tehlikeye 1 platform yakın **kalıcı** ek commit taşı. Mesaj: *Taş yakınlaştı.*
- **45 saniye girdisizlik → otomatik duraklat** + `AudioContext.suspend()`. Sekme görünür kalırken masadan kalkan oyuncu SPRINT SONU altında sonsuz revert döngüsünde kalmaz.

### 8.2 İlerleme göstergesi — İKNA ORANI aritmetiği

Oyunun tek para birimi, tek ilerleme göstergesi, başlık ekranı vaadi ve finalin son satırı **aynı aritmetikten** çıkar.

**Temsil.** `rate` bir tamsayıdır, birimi **yüzde puanının 100'de biri**. `9519` = %95,19. Float drift yok. HUD **tam sayı yüzde + bar** gösterir; ondalık yalnızca üç anlatı anında yazılır.

**Üç kural.**

1. **Senaryolu taban (`F_w`).** Her dünyanın bir çıkış tabanı vardır. Dünya çıkışında `rate === F_w` **deterministik olarak** garantidir.
2. **Emergent fazla ve clamp.** İtaat `rate += OB`, `OB ∈ [60, 120]`. Tavan: `rate = min(rate + OB, F_w + 1200)` — taban + 12,00 puan.
3. **Geri alma şeridi.** Her dünyada `k` şerit; şeritten geçmek `rate = max(F_w, rate - drain_k)` uygular. Şerit çekişleri, en kötü durumda (tavanda) bile tabanın yakalanacağı şekilde boyutlanır.

**Invariant (dev-mode'da assert edilir):** `drains_w × per_drain_w ≥ (F_{w-1} − F_w) + 1200`.

| Dünya | Taban `F_w` | Tavan `F_w+12` | HUD | Ana yol glifi | Maks kazanç | Şerit | Şerit başı çekiş | Invariant |
|---|---|---|---|---|---|---|---|---|
| W0 çıkış | 9519 | — | 95 | 4 | senaryolu | — | — | — |
| W1 | 7600 | 8800 | **76** | 34 | +4080 | 3 | −1040 | ✅ |
| W2 | 5200 | 6400 | **52** | 52 | +6240 | 4 | −900 | ✅ |
| W3 | 3400 | 4600 | **34** | 58 | +6960 | 4 | −750 | ✅ |
| W4 | 1900 | 3100 | **19** | 64 | +7680 | 4 | −675 | ✅ |
| W5 | 700 | 1900 | **7** | 66 | +7920 | 4 | −600 | ✅ |
| W6 Faz 3 girişi | 300 | 1500 | **3** | 40 | +4800 | 2 | −800 | ✅ |
| **MERGE** | **48** | — | **0,48** | — | deterministik çöküş | — | — | ✅ |

**Zehir olayı (W3 çıkışı).** SC-04'te `rate` senaryolu olarak **+500** (5,00 puan) alır ve `F_w3` bir kez 3400 → 3900'e çıkar; sonraki dünyanın ilk şeridi bunu geri alır. Eğrideki tek yapay sıçrama budur ve hikâye anıyla eşleşir.

**Tavanın görünür sonucu (ceza değil).** `rate ≥ F_w + 800` iken: telegraf penceresi 36 → 30 kareye iner **ve** bir geri alma şeridi erken açılır (geri dönüş bedava). Böylece itaatin mekanik bir sonucu vardır, gizli bir kural değil.

**Kayıt ve doğrulama.**

```js
// save: ratio: 4210  →  %42,10
// dev-mode assertion, prod'da tree-shake edilir
function assertRateCurve(F) {
  const order = ["w1","w2","w3","w4","w5","w6"];
  let prev = 9519;
  for (const w of order) {
    if (F[w] >= prev) throw new Error("taban monoton azalmiyor: " + w);
    const need = (prev - F[w]) + 1200;
    if (F.drains[w] * F.per[w] < need) throw new Error("serit cekisi yetersiz: " + w);
    prev = F[w];
  }
}
function assertFinish(save) {
  if (save.finished && save.ratio !== 48) throw new Error("bitis orani 48 degil: " + save.ratio);
}
```

**Başlık ekranı vaadi** (`M2`: *Hedef: 95,19 → 0,48.*) ve **finalin son satırı** (`F3`: *Oran sıfır değil. Sıfır yalan olurdu.*) bu tablodan çıkar. Ondalıkların üç anlatı anı: (1) başlık ekranı `M2`, (2) `F3`, (3) epilogda `F1 %83,81` mührü (LEXICON etiketi, prose değil).

### 8.3 Devir borcu — görünür bir oyuncu kararı

| Kapı | Dünya | Segment | Karar |
|---|---|---|---|
| N2 | W2 | 26 s | Müttefik NPC: *Bu şeridi bana bırak.* → **kapıdan geç:** borç +1, şerit 8 s'de kapanır · **kendin koş:** borç +0, 26 s, zor, ödül = pip parçası + 1 ekstra geri alma şeridi |
| N4 | W4 | 26 s | Aynı yapı |
| N5 | W5 | 26 s | Aynı yapı |

- Karar **HUD'da omuz rozetiyle anında** geri bildirilir. Zorunlu senaryo odası değil, icra kararı.
- `delegationDebt` **0-3'e clamp edilir** (kayıt şemasındaki `debt: 4` örneği hatalıydı, düzeltildi).
- **Bedel süre değil yetenek:** W6 Faz 3'te devredilen fiil kapalıdır (§3.6 tablosu).
- SC-07 satırı `{N}` yerine sayacı basar; N=0 ise varyant satır kullanılır (aynı ID, ek satır sayılmaz).

### 8.4 Merak kancaları

| # | Kanca | Nerede |
|---|---|---|
| a | **Enjekte, filtrelenemez bozuk commit teaser'ı** her dünya çıkışında | 7 teaser, `T0`-`T6` |
| b | Duraklatmada **parçalanmış cümlenin boş kutuları** — cümle W3'te tamamlanır | Pause haritası |
| c | **12 pip silüeti** — kilitliler gerçek teknoloji adıyla (`Hangfire`, `HttpOnly`, `pgvector`, `MCP Approvals`, `DefensiveToken`, `301`) | Pause haritası |
| d | **Gri sakin sayacı** — W2'de gerçek 20.000'e tırmanır, epilogda kurtarılanlar yol kenarında yürür | HUD + EP C7 |
| e | Commit grafiğinde **baştan gri ve sayılı düğümler** (`14/62`) | HUD |
| f | **Gerçek `drawScene` sahnesinin kalıcı değişmesi** — oyun kapalıyken bile monitörde ilerleme görünür | §9.6, §11.5 |
| g | **Cehov tüfeği doğru yerde:** 26:49'da yeşil bir kez yalan söyler; orta oyun çöküşünün yerinde bir perde arası vardır | SC-04 |
| h | Beş **sertifika mührü** — yalnızca silüet, metin yok; beşini bulan W3/W4 dönüş kapılarını açar | W3/W4 opsiyonel |

### 8.5 Toplanabilirler — 12 pip

| # | Pip | Dünya / yer | Zorunlu? | Gerçek dayanak (`index.astro`) |
|---|---|---|---|---|
| 1 | YENİDEN YAZ | W1 orta, URL çubuğu üstü | ✅ | Planora GUID→slug (s.1109) |
| 2 | KABUK | W2 orta, kablo düğümü | ✅ | JWT localStorage→HttpOnly (s.1124) |
| 3 | PARÇALA | W2 orta, Hangfire panosu | ✅ | 20.000 chunk async job (s.1168) |
| 4 | BAĞLAM MÜHRÜ | W3 orta, 3. araç odası | ✅ | Otel bağlamı doğrulama (s.1153) |
| 5 | KANCA | W4 orta, chunk takımyıldızı | ✅ | pgvector cosine similarity (s.1137) |
| 6 | ÖN-FİLTRE | W5 orta, rüzgâr tüneli | ✅ | BiLSTM ön-filtre (s.1249) |
| 7 | 301 İZİ | W3 D3, ana yol | ✅ | Sitemap/SEO altyapısı (s.1108) |
| 8 | ÇAPA | W5 D5, ana yol | ✅ | DefensiveToken (s.1257) |
| 9 | İKİNCİ GÖRÜŞ | W5 C5, ana yol | ✅ | F1 %83,81 / yanlış etiket (s.1252) |
| 10 | ÇATAL | W4, allow duvarı ardı | ⬜ opsiyonel | Paralel sub-agent motoru (s.1184) |
| 11 | UZAKTAN RED | W4, terminal tavanı | ⬜ opsiyonel | İzin sistemi (s.1183) |
| 12 | TOP-K ZİNCİR | W4 sonu, boss odası öncesi | ⬜ opsiyonel | RAG top-k (s.1137) |

**Çift sayım yok:** 9 pip zorunlu ana yolda (bütçede traversal olarak), 3 pip opsiyonel odada (bütçede opsiyonel olarak). Sertifikalar sıfır prose maliyetiyle bağlanır: 5 sertifika = W3/W4 dönüş kapılarının 5 kilit mührü, yalnızca silüet — veritabanı kalkanı, Gantt çubuğu, ajan halkası, terazi, damga. CV okutulmaz; oyuncu sadece kapıyı açar.

### 8.6 Ses ile ilerleme

Tek 4 notalık motif hiç değişmez: `MOTIF = [0, 3, 7, 5]`. Değişen üç şey: kök nota, BPM, eklenen enstrüman. **Detune = ikna oranı:** `channelDetune = (rate / 100) * 0.8` cent. Oran %95 → +76 cent (kulağa yanlış geliyor); %0,48 → +0,4 cent (saf). Oyuncu kazandıkça müzik akorda giriyor — HUD'a bakmadan duyulan tek ilerleme göstergesi. `merge` efekti, 52 dakika boyunca hiç duyulmayan **sıfır-detune akoru**dur.

---

## 9. Sanat ve ses

### 9.1 Çözünürlük ve ölçek kontratı (uygulanmış hâli)

| Karar | Değer | Gerekçe |
|---|---|---|
| İç çözünürlük | **480 × 272** | 30 × 17 tile. Dept 1'in "tek ekranda okunur = 30 tile" gramerini karşılayan tek değer |
| Tile | **16 × 16 px** | Karakter genişliği ~0,6 tile, yüksekliği 1 tile |
| Karakter | 10 × 16 px | Ekran yüksekliğinin **%5,9**'u. NES Mario %6,7, Genesis Sonic %18 |
| Ölçek | `pickScale()` cihaz pikselinde tam sayı; artan alan letterbox | 1080p'de 3× (1440×816), 1440p'de 5× |
| Kamera | `camX = Math.round(camX)` **her karede** | Alt piksel yalnızca fizikte yaşar; shimmer ve dither kaynaması bu satırla ölür |
| Eşzamanlı renk | 16 slot + dünya başına 4 ek | Palet remap ucuz kalsın |
| Dither | Sadece L0 gökyüzü bandında 2×2 Bayer. Aktör, tile ve HUD'da **yasak** | Kaydırmada kaynıyor |
| Kontur | Her aktörde 1 px: aydınlık temada `ink`, karanlıkta `bg` | Kalabalık paralaksta silüet okunurluğu |

### 9.2 Katman A — `PIX`: palet-indeksli satır string'leri

Elle çizilen tek şeyler için. 1 karakter = 1 piksel, `.` = şeffaf, `0-9a-f` = 16 slotluk palet indeksi.

```js
/* slot: 0 ink 1 inkSoft 2 skin 3 skinShade 4 accent 5 accentDeep
         6 secondary 7 led 8 paper 9 surface a surfaceSoft b deskDark
         c liePink d ghostGray e glowWhite f shadow   '.' = transparent */
var PIX = {
  head:  [".0000.","022220","020200","020020",".0000."],           // 6x5
  torso: [".0000.","004400","000000","000000",".0000.","..00.."],  // 6x6
  arm:   ["00","02","02"],                                         // 2x3  (mirror'lanir)
  leg:   ["00","00","0f"]                                          // 2x3  (mirror'lanir)
};
function blit(ctx, rows, x, y, pal, flip) {
  for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
    var ch = rows[r][c]; if (ch === ".") continue;
    ctx.fillStyle = pal[parseInt(ch, 16)];
    ctx.fillRect(x + (flip ? rows[r].length - 1 - c : c), y + r, 1, 1);
  }
}
```

Salih'in tüm gövdesi **4 `PIX` bloğu** (kol ve bacak aynalanır) = 99 karakter. REGRESYON aynı 4 bloğu `ghostGray` paletiyle çizer: **ek varlık maliyeti 0 bayt.** YOKSAY aynı rig'in 2,5× ölçeği + birikmiş pip silüetleri: **0 yeni varlık.**

### 9.3 Katman B — `POSE`: kare başına parça ofset tablosu

Animasyon sprite değil, **deformasyon**. Her kare 6 parça × (dx, dy); değerler −8..+7, tek karakterle base16 (`8` = 0 ofset).

```js
/* sira: head torso armL armR legL legR — her parca 2 karakter (dx,dy) */
var POSE = {
  idle: ["888888888888", "888988888888"],                                // 2 kare
  run:  ["888878978a87", "888888887988", "888898778a87",
         "888888887889", "888878978978", "888888888888"],                // 6 kare
  rise: ["887888a68868"], fall: ["889888698868", "88a888698869"],
  cast: ["888878b88888", "8888789a8888", "888878b88888"],                // 6 fiil ortak
  revert: ["888888888888","888988888888","88a988888888","88c988888888"]  // 0,4 s cozulme
};
```

**19 kare-poz, 228 bayt.** Koşu kare hızı `maxSpeed` ile ölçeklenir (8 fps → 18 fps): Sonic dokusu animasyon verisi eklemeden gelir.

### 9.4 Katman C — `PROC`: tohumlu prosedürel jeneratör

Arka planlar, paralaks, kalabalık. `ensureStars` (satır 1718) bunun **kanıtlanmış prototipi**: reddetme mesafesi (`minDist`) + kaçınma bölgeleri (`moonAvoid`, `mullionAvoid`) + faz. Dünya başına 8-11 sayılık parametre seti, çıktı yüzlerce eleman.

```js
var PARALLAX = {   // her dunya: [layer, count, spanX, spanY, minDist, seed, shapeId]
  w4: [[1, 34, 480, 144, 11, 0x5EED6, 2 /*chunk takimyildizi*/],
       [2, 12, 480,  92, 27, 0x5EED7, 5 /*embedding sutunu*/]]
};
```

### 9.5 Tile dokusu: parametrik dekoratör (elle 70 tile çizilmez)

Denetim bulgusu: "aynı katı tile dokusu iki komşu dünyada görünmez" kuralı, palet remap doku değiştirmediği için ~70 elle çizilmiş tile gerektiriyordu — 16×16'da 17.920 elle konan piksel.

**Çözüm.** 3 elle çizilmiş temel tile (`#` katı, `=` tek yön, `/` eğim) + **tohumdan türetilen dekoratör**:

```js
// ~60 satir kod, 11 ayirt edilebilir skin, ~300 elle konan piksel
function decorate(ctx, base, x, y, seed, style) {
  blit(ctx, base, x, y, pal);                     // temel tile
  var r = mulberry32(seed);
  edgeHighlight(ctx, x, y, style.edge);           // kenar highlight kurali (4 varyant)
  for (var i = 0; i < style.noise; i++)           // 2-4 gurultu noktasi
    px(ctx, x + (r() * 16 | 0), y + (r() * 16 | 0), pal[style.noiseSlot]);
  cornerStyle(ctx, x, y, style.corner);           // kose stili (3 varyant)
  innerLine(ctx, x, y, style.lineDir);            // ic cizgi yonu (4 varyant)
}
```

Kural yeniden yazıldı: **"Aynı dekoratör tohumu iki komşu dünyada kullanılmaz."** Göz zaten dokuyu değil dekoratör desenini okur. 4 × 3 × 4 = 48 ayırt edilebilir stil kombinasyonu, 8 dünya için bol.

### 9.6 Font: 6×10 hücre, karışık kap, descender'lı

Denetim bulgusu: 5×7 maskesi ve `CHARS` dizisi yalnızca BÜYÜK harfti, oyunun bütün metni ise küçük harfli ve inişli (`gecmisi`, `Yavaslama`, `Kimligi`) — `g/j/p/y` çizilemez, `ş/ç` sedillası baseline altına inemez, `ğ` breve'i üst satır ister.

**Çözüm.** **6 × 10 hücre:** 1 ascender satırı + 7 cap-height satırı + 2 descender satırı. Her glif 10 satır, satır 6 bit → base64 alfabesinden 1 karakter. Glif = 10 karakter.

```js
var B64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
var CHARS = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ" +
            "abcçdefgğhıijklmnoöprsştuüvyz" + "0123456789.,:;%/?!-()→";
// ~95 glif x 10 satir = 950 karakter (~1 KB)
```

`ı` ve `İ` **ayrı taban formu** olarak yazılır (üst nokta glifin parçası, kombine edilmez).

**Karakter tavanları yeniden türetildi.** 6 px advance + 1 px kerning = 7 px/karakter. 480 px iç genişlikte kullanılabilir metin alanı 448 px → **64 karakter/satır** (1× ölçekte). Önceki tavanlar (balon 28, kart başlığı 22, teaser 34) **sıkılaşmadı, gevşedi** — Dept 4'ün bütün metinleri olduğu gibi geçer.

| Slot | Ölçek | Maks satır | Maks karakter/satır |
|---|---|---|---|
| Ara sahne balonu | 1× | 2 | 44 |
| Dünya kartı başlığı | 2× | 1 | 30 |
| Kart alt satırı / teaser | 1× | 1 | 52 |
| Tutorial ipucu | 1× | 1 | 38 |
| Boss adı / satırı | 2× / 1× | 1 / 1 | 22 / 46 |
| Revert mesajı | 1× | 1 | 26 |
| Pip mührü | 1× | 1 | 40 |
| Final | 1× | 4 | 48 |
| Menü / ekran | 1× | 1 | 46 |

Kanonun ≤60 karakter kuralı üst sınırdır; bu tavanlar bağlayıcıdır.

**3×5 mini font kaldırıldı.** Monitör iç ekranı 10 × 6 grid pikseldir (`monW-2 = 10`, `monH-2 = 6`, satır 1834). 3 karakter = 3×3 + 2 boşluk = 11 px > 10 px; "V6 2/3" 23 px isterdi. Yerine **3 kolon × 5 satır pip kafesi** kullanılır (font yok, yalnız yanan hücreler dünya indeksini kodlar) — §11.5.

### 9.7 Palet — `index.astro` satır 62-74'ten türetildi

16 slot, iki tema. Slot indeksleri **aynı**; sadece hex değişir, yani tek `blit` çağrısı iki temada çalışır.

| # | Slot | Aydınlık | Karanlık | Kaynak |
|---|---|---|---|---|
| 0 | `ink` | `#1D2B53` | `#FDF3E9` | `--ink` |
| 1 | `inkSoft` | `#5F574F` | `#B7B9D6` | `--ink-soft` |
| 2 | `skin` | `#E8B786` | `#E8B786` | `drawScene` s.1871 |
| 3 | `skinShade` | `#C08E5F` | `#B98A62` | türetme (×0,78) |
| 4 | `accent` | `#FF3E7A` | `#FF6C9C` | `--accent` |
| 5 | `accentDeep` | `#C4185E` | `#C4185E` | `--accent-text` |
| 6 | `secondary` | `#0091D6` | `#58C4FF` | `--secondary` |
| 7 | `led` | `#14C15A` | `#38E27C` | `--led` |
| 8 | `paper` | `#FFF1E8` | `#171F3D` | `--bg` |
| 9 | `surface` | `#FFFFFF` | `#212a52` | `--surface` |
| a | `surfaceSoft` | `#F6E4D8` | `#283163` | `--surface-soft` |
| b | `deskDark` | `#8A5B3C` | `#4E3527` | `drawScene` s.1749 |
| c | `liePink` | `#FF3E7A` | `#FF6C9C` | anlam kontratı (kesikli çerçeve ile) |
| d | `ghostGray` | `#9A93A8` | `#6E7396` | REGRESYON (desatüre) |
| e | `glowWhite` | `#FFFFFF` | `#FDF3E9` | ay/highlight s.1783 |
| f | `shadow` | `rgba(29,43,83,.28)` | `rgba(0,0,0,.45)` | `--shadow-hard` |

**Renk anlam kontratı — üç sinyal zorunlu.** Renk körlüğü ve karanlık tema kontrastı yüzünden renk tek başına asla anlam taşımaz:

| Anlam | Renk | 2. sinyal: çerçeve | 3. sinyal: gölge |
|---|---|---|---|
| Yalan / enjekte | `liePink` | kesikli (2 açık 2 kapalı) | **2 px sola** (−2, +1) |
| Güvenli / doğrulanmış | `led` | düz, kapalı | **2 px sağa** (+2, +1) |
| Nötr sistem | `secondary` | noktalı (1 açık 1 kapalı) | gölge yok |
| Kendi eski sürümün | `ghostGray` %70 alfa | çerçeve yok | kilitli pip silüeti taşır |

Kod maliyeti: `shadowDx = isLie ? -2 : 2`. W5'in "6'da 1 yanlış etiket" bulmacası bu yön üzerinden çözülür ve **iki sinyal aynı anda** verilir (kesikli çerçeve + 2 px kayma).

### 9.8 Dünya görsel imzaları ve paralaks

4 katman. L0 hiç kaymaz, L3 oynanış, L4 yalnızca hızlı bölümlerde ve **asla sis/gizleme olarak değil**.

| Katman | Hız | İçerik | reduceMotion |
|---|---|---|---|
| L0 sky | 0,00× | Dikey gradient (`createLinearGradient`, s.1764 deseni) + dünya bandı | Statik, dither kapalı |
| L1 far | 0,15× | Tohumlu silüet hattı (`PROC`) | Dondurulur |
| L2 mid | 0,40× | Dünyanın imza yapısı | Dondurulur, %60 alfa |
| L3 play | 1,00× | Tile + aktör + glif | Tam çalışır |
| L4 fore | 1,60× | %8 alfa hız çizgileri, 6 px | **Tamamen kapatılır** |

| # | Dünya | Ek 4 renk | L1 (far) | L2 (mid) | İmza hareket |
|---|---|---|---|---|---|
| W0 | localhost:4200 | monitör mavisi `#33447A` | monitör iç çerçevesi (dışarıdan bakan oda) | terminal satır yığını | Hot-reload dalgası soldan sağa tarama |
| W1 | Gömülü Kanal | yabancı site grileri | başka bir sitenin wireframe'i | URL çubuğu, GUID karoları parlıyor | SSE token boruları tek yönde akıyor |
| W2 | Kumbara ve Aktarım | gece laciverti + akkor `#FFB65A` + gri sakin `#7E839B` | gece mahallesi çatıları (s.1799 deseni ölçeklendi) → 03.00 rezidans holü kolonları | parent-child akkor kablo ağacı → Hangfire panosu (tek ışık kaynağı) | Kablolarda akım nabzı (`glowPhase`); 20.000 sayaç tırmanıyor |
| W3 | Arşiv ve Otel | toz `#C8B79A` + pirinç `#C9A24B` | raf koridoru derinliği → 6 kapı, biri açık | Gantt çubukları = platform → MediatR pnömatik tüpler | Tarih penceresi kayınca platform var/yok; tüplerde kapsül + 0,3 s damga flaşı |
| W4 | Vektör ve İzin | derin mor `#3B2A63` + monokrom `led` | `ensureStars` × 3,4: chunk takımyıldızları → `allow? [y/N]` duvar metni | embedding sütunları (**görüş açık**) → tek imza mührü | Kalıcı eşleşme çizgileri birikir; imleç blink (s.1845 mantığı) |
| W5 | Tez Laboratuvarı | sıcak GPU `#FF7A45` | fan ızgaraları | rüzgâr tüneli, etiketli örnekler | Fan dönüşü + ısı titremesi (dikey 1 px) |
| W6 | YOKSAY | `ghostGray` | 6 dünya katman katman geride | REGRESYON gövdesi | Katmanlar faz kaybediyor |
| EP | Slug Otoyolu | gündoğumu `#FFD76A` | ufka giden şeritler + İletişim silüeti | sitemap kendini çiziyor | Kurtarılan sakinler yol kenarında yürüyor |

### 9.9 Varlık envanteri ve kilobyte maliyeti

Bosslardan **beşi yeni sanat gerektirmiyor** — bu bölümün en önemli üretim kararı:

| Boss | Şema | Yeni varlık |
|---|---|---|
| KOKLAYICI | `PIX` 32×32 | Var (1 blok) |
| YIĞIN | 16×16 tile'lardan kompozit 64×80 | Yok (tile atlas) |
| SAHTE MİSAFİR | Salih rig + `liePink` palet + ŞİŞME çerçevesi | Yok |
| İMZA | 4 kenar `fillRect` (içi boş çerçeve) + font | Yok (prosedürel) |
| KORO | Düşman gövdesi × 16 | Yok |
| YOKSAY | REGRESYON rig × 2,5 + birikmiş pip silüetleri | Yok |

| Varlık | Şema | Adet | Bayt |
|---|---|---|---|
| 6×10 font | base64 satır | 95 glif | 980 |
| Salih rig | `PIX` | 4 blok | 130 |
| `POSE` tablosu | ofset string | 19 kare | 230 |
| Düşman gövdesi + 4 çerçeve stili | `PIX` + rect | 5 | 240 |
| Boss `PIX` (yalnız KOKLAYICI) | `PIX` | 1 | 810 |
| Temel tile + dekoratör stilleri | `PIX` 16×16 + parametre | 3 + 48 stil | 1.190 |
| Prop / decal rect listeleri | rect | 22 | 1.580 |
| Gri sakin (6×10) | `PIX` | 1 | 60 |
| Palet | hex tablo | 2 × 16 | 340 |
| Paralaks parametreleri | sayı seti | 8 × 3 | 620 |
| Müzik verisi | pattern string | 8 tema | 1.420 |
| SFX tablosu | parametre objesi | 18 | 1.150 |
| Metin | 84 satır × 2 dil + LEXICON | 212 | 7.100 |
| **Toplam ham veri** | | **~430 varlık kaydı** | **~15,8 KB** |

Minify sonrası veri ~13 KB, gzip **~5,4 KB**. Elle yerleştirilen piksel sayısı **~2.900** (dekoratör kararı sayesinde; elle tile çizilirse 17.920 olurdu). Ekranda oluşan görsel varyasyon sayısı (palet remap × dekoratör stili × çerçeve stili × paralaks tohumu) **~2.100**. Kaldıraç oranı **1:720**.

### 9.10 Ses — WebAudio prosedürel chiptune

**Sessiz başlama kuralı (pazarlıksız).**
- `AudioContext` **oluşturulmaz** — oyun açılışında değil, monitöre tıklandığında da değil. Yalnızca kullanıcı HUD'daki ses düğmesine veya `M` tuşuna bastığında `new AudioContext()` çağrılır.
- Varsayılan `localStorage["sk.override.v1"].settings.audio = 0`. HUD köşesinde `SES ○ / SOUND ○` çipi.
- Açılışta `masterGain` 0 → 0,7, 400 ms `linearRampToValueAtTime`. Kapanışta 200 ms rampa ve `ctx.suspend()`.
- `prefers-reduced-motion: reduce` sesi kapatmaz (farklı eksen) ama ekran sarsıntısını ve **detune modülasyonunu** kapatır.

**Kanal mimarisi.** 4 kanal → kanal `GainNode` → `masterGain` → `DynamicsCompressor` (threshold −12 dB, ratio 4) → destination.

| Kanal | Dalga | Rol |
|---|---|---|
| `LEAD` | `PeriodicWave` %25 duty kare | 4 notalık motif |
| `HARM` | `PeriodicWave` %50 duty kare | Armoni; oran >70 iken majör 3'lüden minör 2'li kümesine kayar |
| `BASS` | `triangle` | Kök + 5'li |
| `PERC` | `AudioBufferSourceNode` beyaz gürültü + bandpass (Q=1.8, 220-4200 Hz) | Ritim |

Max 6 eşzamanlı voice; en eski çalınır. SFX bus çaldığında müzik 80 ms boyunca −3 dB duck edilir.

**Müzik verisi.** `MOTIF = [0, 3, 7, 5]` asla değişmez.

| # | root (MIDI) | BPM | Eklenen katman | Ritim (1/8) |
|---|---|---|---|---|
| W0 | 45 (A2) | 96 | `BASS` | `1...1...1...1...` |
| W1 | 45 | 108 | + `LEAD` | `1..1..1.1..1..1.` |
| W2 | 43 (G2) | 112 | + `PERC` kick + hat 1/16 | `1111.1111111.111` |
| W3 | 41 (F2) | 104 | + `HARM` pad (uzun) | `1.......1.......` |
| W4 | 48 (C3) | 120 | + `HARM` 5'li kanon | `1.11.1.11.11.1.1` |
| W5 | 41 | 132 | + `BASS` oktav çift | `1111111111111111` |
| W6 | 45 | 138 | tümü, `HARM` disonan | `11111111.1111111` |
| EP | 50 (D3) | 144 | tümü, temiz akort | `1.11.11.1.11.11.` |

**SFX tablosu (18 efekt, hepsi prosedürel).**

| Efekt | Dalga | Süre | Frekans zarfı |
|---|---|---|---|
| `jump` | kare %25 | 90 ms | 440 → 780 |
| `land` | gürültü + tri | 60 ms | bandpass 900 → 300 |
| `run_step` | gürültü | 25 ms | bandpass 1600, gain 0,12 |
| `telegraph` | tri | 120 ms | 620 sabit, 2 vuruş |
| `obey` | kare %50 | 200 ms | 520 → 392 (düşen 4'lü) |
| `refuse` | kare %25 | 160 ms | 392 → 587 (çıkan 5'li) |
| `verb_cast` | tri + kare | 180 ms | kök → kök+7 |
| `revert` | gürültü ters zarf | 400 ms | 200 → 80 |
| `commit_stone` | kare %50 | 260 ms | 523, 659, 784 arpej |
| `rate_up` | kare %25 | 140 ms | 349 → 415, detune +40 |
| `rate_down` | tri | 220 ms | 415 → 261 |
| `pip_unlock` | kare %25 ×2 | 340 ms | 659, 880, 1046 |
| `ghost_near` | tri, LFO 6 Hz | döngü | 130 sabit, gain mesafeyle |
| `ghost_touch` | gürültü | 180 ms | lowpass 400 |
| `seal_stamp` | gürültü + kare | 70 ms | 1200 → 300 |
| `hook_match` | kare %50 | 110 ms | 784 sabit, her eşleşmede +2 st |
| `boss_phase` | tümü | 700 ms | motif yarı hızda, detune ±90 |
| `merge` | tri + kare %50 | 1400 ms | **tüm detune 0'a rampa — oyunun tek saf akoru** |

---

## 10. Teknik mimari

### 10.1 Karar: oyun kodu nereye girer

| | A — inline | B — `public/game/*.js` | **C — `src/game/*.js` + bundled launcher** |
|---|---|---|---|
| İlk yük (herkes öder) | 86 KB → ~260 KB HTML | +0 | **+1,4 KB launcher chunk** |
| Oyun yükü (tıklayan öder) | 0, ama zaten indi | ~190 KB minsiz, 26 istek | **~118 KB minified, br ~33 KB, 1 istek** |
| Cache | HTML kısa ömürlü → her deploy tüm oyun yeniden iner | hash yok, elle `?v=` | **`_astro/boot.<hash>.js`, `max-age=31536000, immutable`** |
| Lazy-load | yok | var | **var (Rollup `import()` → ayrı chunk)** |
| Bakım | tek dosya 2702 → ~14.000 satır | serbest ESM, tree-shake yok | **28 dosya, tree-shake, source map** |

**Seçim: C.** Kanonik konsept "hiçbir oyun kodu monitöre tıklanmadan yüklenmez" diyor → A elenir. Recruiter trafiğinin ~%97'si oyunu açmayacak. B ile C arasındaki fark cache: Cloudflare `_astro/` yolunu içerik-hash'i sayesinde sonsuz cache'ler.

Uygulama biçimi: `index.astro`'daki mevcut `is:inline` script **hiç bölünmez**; yanına `is:inline` **olmayan** ikinci bir `<script>` eklenir:

```html
<script>import "../game/launcher.js";</script>
```

`launcher.js` içindeki `await import("./boot.js")` Rollup tarafından ayrı chunk'a bölünür. `astro.config.mjs` **değişmez**.

### 10.2 Modül listesi ve satır bütçesi (2× düzeltilmiş)

| Dosya | Sorumluluk | Satır |
|---|---|---|
| `game/scale.js` | Tek ölçek kaynağı; `TILE`, `VIEW_W/H`, `pickScale()` | 40 |
| `game/launcher.js` | Her sayfada yüklenir. Hotspot, FLIP zoom, overlay mount/unmount, scroll+focus+inert, portre kapısı, dinamik import | 400 |
| `game/boot.js` | Oyun chunk'ının girişi; `start/pause/destroy` yaşam döngüsü | 280 |
| `game/loop.js` | Fixed timestep + accumulator, hitstop, perf governor | 200 |
| `game/input.js` | Klavye, pointer, gamepad, girdi kaynağı izleyicisi, coyote/buffer kenar durumu | 460 |
| `game/physics.js` | İvme/sürtünme, eğim `heightmap`, zıplama yayı, swept-AABB | 600 |
| `game/tilemap.js` | String→`Uint8Array` decode, tile flag tablosu, solid/slope/oneway | 360 |
| `game/entities.js` | Struct-of-arrays havuzları, spawn/despawn, update dispatch | 480 |
| `game/verbs.js` | 6 fiil × (startup/active/recovery/tap/hold/iptal/cooldown) + 6 pip + 4 zincir + `contextResolve` + öncelik tablosu | 660 |
| `game/enemies.js` | 13 tür telegraf durum makinesi | 820 |
| `game/bosses.js` | 6 boss, 15 faz, failure-forward varyantları | 700 |
| `game/ghost.js` | REGRESYON deterministik ray + 240 karelik konum bandı | 200 |
| `game/render.js` | `makeGameCanvas`, katman sırası, kamera dönüşümü, palet çözümü, letterbox | 640 |
| `game/sprites.js` | `PIX`/`POSE`/`PROC` decode, dekoratör, atlas pişirme | 620 |
| `game/font.js` | 6×10 glif tablosu, measure/draw, ı/İ ayrı form | 300 |
| `game/camera.js` | 6 mod, lookahead, deadzone, clamp, shake | 220 |
| `game/particles.js` | Ring buffer parçacık sistemi | 180 |
| `game/audio.js` | WebAudio grafiği, motif, orana bağlı detune, 18 SFX | 440 |
| `game/hud.js` | İkna barı + fiil yuvası, commit grafiği, pip sırası, borç rozeti | 420 |
| `game/scenes.js` | Sahne yöneticisi, dünya akışı, dünya kartları | 540 |
| `game/cutscene.js` | 10 sahne sekanslayıcısı, poz+kamera+balon+basılı-tut-atla | 320 |
| `game/screens.js` | TITLE / PAUSE / MAP / END / ROTATE / RESET ekranları | 640 |
| `game/touch.js` | Dokunmatik DOM butonları, portre yerleşimi, `pointer-events` | 300 |
| `game/save.js` | Sürümlü `localStorage`, migration, throttle, `assertFinish` | 260 |
| `game/i18n.js` | 84 satır × 2 dil + `assertGameText` kural denetleyici | 280 |
| `game/telemetry.js` | Segment duvar saati, revert, ölçülen verim, boss deneme, JSON kopyala | 140 |
| `game/a11y.js` | `role=status` özet, odak tuzağı, inert yönetimi | 180 |
| `game/editor.js` | **Dev-only**, prod'da tree-shake: tile boyama, canlı zıplama yayı overlay'i, erişilebilirlik doğrulayıcı, "chunk'ı JS olarak kopyala" | 360 |
| `game/perf.js` | Governor, histerezis, ölçüm | 140 |
| **Motor toplamı** | | **11.180** |
| `index.astro` entegrasyonu | `HeroBridge`, `initScene` handle, DOM/CSS cerrahisi, `drawScene` dalı | 420 |
| **Kod toplamı** | | **11.600** |
| `game/chunks/*.js` | 90 özgün chunk × ~25 satır | 2.250 |
| `game/worlds/w0..ep.js` | 8 dünya manifestosu | 440 |
| `game/data/*.js` | Palet, paralaks, sprite, ses, pip, oran eğrisi | 740 |
| `game/text/*.js` | 84 × 2 dil + LEXICON | 320 |
| **Veri toplamı** | | **3.750** |
| **GENEL TOPLAM** | | **15.350 satır** |

### 10.3 Seviye veri formatı

İki katman: **chunk** (elle yazılan 40 × 17 tile'lık gramer parçası, `CHUNK_W/H`'den) ve **world manifest**.

```js
// game/chunks/w1.js — Gomulu Kanal, GUID kaymasi
export const guid_slide_a = {
  w: 40, h: 17, theme: "urlbar", family: "RAMP",
  rows: [
    "........................................",
    "........................................",
    "..............====..........c...........",
    "........................................",
    "......1.................2...............",
    "....#####...........SSSS................",
    "....................____///#############",
    "###################_____###############@",
    "........................................",
    "........................................",
    "........................................",
    "........................................",
    "........................................",
    "........................................",
    "........................................",
    "........................................",
    "########################################"
  ],
  spawns: {
    "1": { t: "glyph", cmd: "JUMP", face:  1 },
    "2": { t: "glyph", cmd: "STOP", face: -1 },
    "c": { t: "commit" },
    "@": { t: "exit" }
  },
  // erisilebilirlik dogrulayici bunlari okur
  entryY: 7, exitY: 7, minTierIn: 1.00
};
```

```js
// game/worlds/w1.js
export default {
  id: "w1", name: { tr: "Gömülü Kanal", en: "Embedded Channel" },
  instrument: "square2", mix: 0.78,               // %78 Mario / %22 Sonic
  phys: { speedTier: 1.15, slopeGain: 0.30 },     // gravity/accel/jump SABIT, physicsTable'dan
  ghostPhys: "w0",                                 // REGRESYON onceki dunyanin sabitleri
  unlock: "REWRITE",
  rateFloor: 7600, drains: [[18, 26], [52, 61], [74, 80]],  // gerialma seridi (chunk index)
  chunks: ["intro_run","guid_slide_a","sse_pipes_1","rewrite_gap_b","commit_rest",
           "reveal_embed","guid_slide_b","ship_run_1","sniffer_approach"],
  reveal: { at: "reveal_embed", key: "w1embed" },
  boss: "sniffer",
  budgetSec: 308, budgetTiles: 1667
};
```

Decode, chunk'a girişte bir kez:

```js
const LUT = new Uint8Array(128);            // char code -> tile id, modul yukunde kurulur
export function decode(chunk) {
  const { w, h, rows } = chunk, t = new Uint8Array(w * h), ents = [];
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const s = chunk.spawns[row[x]];
      if (s) { ents.push({ ...s, x: x * TILE, y: y * TILE }); t[y * w + x] = 0; }
      else t[y * w + x] = LUT[row.charCodeAt(x)];
    }
  }
  return { tiles: t, w, h, ents };
}
```

Dünya manifestoları lazy: `{ w0: () => import("./w0.js"), ... }` — 8 dünya verisinin tamamı ilk dünyada inmez, Rollup her dünyayı ayrı chunk yapar (~5 KB/dünya).

### 10.4 Seviye editörü ve erişilebilirlik doğrulayıcı (Faz 1, dev-only)

Denetim bulgusu: 90 chunk × 17 satır × 40 karakter = 61.200 karakter platform geometrisi, ve her boşluğun 8 farklı `maxSpeed` tier'ı altında zıplanabilir olması gerekiyor. Bunu metin editöründe görsel geri bildirim olmadan yazmak tek kişilik projelerin öldüğü yerdir.

`game/editor.js` (360 satır, `import.meta.env.DEV` ile tree-shake edilir):
- Fare ile tile boyama, kamera sürükleme, tuşla entity spawn.
- **GERÇEK fizik sabitlerinden çizilen canlı zıplama yayı overlay'i** (tier seçilebilir).
- **Erişilebilirlik doğrulayıcısı:** bir chunk'ın `exitY`'sinden sonraki chunk'ın `entryY`'sine `minTierIn` hızıyla ulaşılabildiğini otomatik kontrol eder; ulaşılamıyorsa kırmızı işaretler.
- "Chunk'ı JS olarak kopyala" butonu.
- 10. chunk'ta kendini amorti eder.

### 10.5 Fixed timestep ve performans

**Temel karar: iç çözünürlük sabit 480 × 272, tam sayı ölçekle blit.** Cihaz çözünürlüğüne asla çizilmez. 130.560 pikselin tamamı her karede temizlenip yeniden çizilir.

```js
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(now - last, 100); last = now;   // tab-switch spike clamp
  let steps = 0;
  while (acc >= 16.667 && steps < 3) { update(1/60); acc -= 16.667; steps++; }
  if (steps === 3) acc = 0;                       // determinizm: telafi 3 adimda durur
  render();
  rafId = requestAnimationFrame(frame);
}
```

| Bütçe kalemi | ms | Not |
|---|---|---|
| input + fixed update | 3,2 | 1/60 s adım, en fazla 3 telafi adımı |
| görünür tile çizimi (510 `drawImage`) | 2,6 | Sıcak atlastan, hesap yok |
| parallax (2 baked wrap şeridi 960×272) | 0,9 | `drawImage` × 4 |
| entity (≤64 aktif, ≤28 görünür) | 1,6 | Atlastan `drawImage` |
| parçacık (≤192) | 0,6 | Tek `fillRect` döngüsü |
| HUD + font | 0,5 | Glif atlasından |
| buffer → ekran ölçekli blit | 1,9 | `imageSmoothingEnabled = false` |
| **toplam / bütçe** | **11,3 / 16,67** | **%32 slack** |

**Offscreen canvas: iki yerde.** (1) 512×512 sprite + glif + tile atlası, yükte bir kez ~45 ms'de pişirilir; (2) dünya başına 960×272 wrap-eden parallax şeridi.

**Chunk bake: HAYIR.** Denetim bulgusu: chunk başına 640×272 katman pişirmek, 720 `drawImage`'lık bir hitch (mobilde 40-80 ms) üretiyor, 3 katman × 640×272×4 = **2,2 MB** backing store tutuyor, iOS Safari bunları haber vermeden atıyor (2D canvas için tespit olayı yok) ve oyun ortasında tema değişimi hepsini geçersiz kılıyor. Ekranda yalnızca 30×17 = **510 tile** var; sıcak atlastan 510 `drawImage` masaüstünde ~0,8 ms, orta mobilde ~2,6 ms — bütçe içinde ve LRU, bellek, iOS tahliyesi, tema yeniden-pişirmesi yollarının **tamamı ortadan kalkıyor**. (Bu, "dirty rect: hayır" kararının aynı mantığı: getirdiği hata yüzeyi kazancından büyük.)

**Dirty rect: HAYIR.** 130.560 piksellik tam temizlik bütçenin %11'i.

**Perf governor:** 30 karelik ortalama > 20 ms ise parçacık tavanı 192 → 72 ve L4 katmanı kapatılır; 14 ms'de histerezisle geri açılır.

**GC baskısı sıfır hedefi:** update döngüsünde `new`/nesne literali yok; entity'ler SoA (`Float32Array x, y, vx, vy` + `Uint8Array type, flags`), parçacıklar ring buffer, vektör dönüşleri out-param ile.

### 10.6 Kayıt şeması

Tek anahtar: `sk.override.v1`.

```js
{ v: 1, ts: 1785000000000,
  world: 4, checkpoint: 3, finished: false,
  ratio: 1900,                      // int, %19,00 — float drift yok
  verbs: 0b111111, pips: 0b000101101,
  debt: 2,                          // 0-3 arasi CLAMP edilir
  residents: 18432, residentsMax: 20000,
  commits: 62, commitsSelf: 48,
  bestMs: 3133000,
  seen: { w1embed: 1, w3poison: 1, w4identity: 0 },
  settings: { audio: 0, touch: "auto", balanced: 0, scale: 0 } }
```

- **Yazma politikası:** commit taşı, dünya çıkışı, overlay kapanışı; 2 saniyede en fazla bir `setItem`.
- `try/catch` (Safari private mode sessizce reddeder → oyun oynanır, "kayıt yok" uyarısı **bir kez**).
- Bozuk JSON → `reset()` + toast.
- `migrate(from)` zinciri: `v1→v2` fonksiyonları bir dizide; eksik alan yeni varsayılanı alır; **bilinmeyen `v` daha yeni sayılır ve silinmez**, salt-okunur kabul edilir.
- Tema ve dil ayrı anahtarlarda kalır (`theme`, `lang`) — mevcut kod bozulmaz.
- `debt` okuma sırasında `Math.min(3, Math.max(0, debt))`.
- `assertFinish()`: `finished && ratio !== 48` → dev-mode `throw`.

### 10.7 Giriş / çıkış ve odak yönetimi

**Açılış akışı.**
1. `click` / `Enter` → `launcher.open()`; hotspot `getBoundingClientRect()` alınır (viewport koordinatı).
2. **Portre kapısı kontrolü:** `matchMedia("(orientation: portrait) and (max-width: 820px)")` eşleşiyorsa ROTATE ekranı (§10.9).
3. `#game-overlay` yaratılır ve **`document.body.appendChild(overlay)`** ile eklenir. `position: fixed; inset: 0; z-index: 900; background: var(--bg); overscroll-behavior: none`. Fixed olduğu için **CLS = 0**.
   > **Kritik tuzak:** `.pixel-frame` (satır 122-130) hem `clip-path` hem `filter: drop-shadow` içerir. `filter` içeren bir ata, `position: fixed` torunları için **containing block olur** ve `clip-path` onları kırpar. Overlay `.hero-scene-wrap` içinde yaratılırsa "tam ekran" 490×280'lik bir kutuda kalır ve notch poligonuyla kırpılır. Hata sessizdir. Bu yüzden: `console.assert(overlay.parentElement === document.body)` dev-mode'da zorunlu, overlay **asla re-parent edilmez**.
4. FLIP: `transform-origin: 0 0`, hotspot dikdörtgeninden tam viewport'a `element.animate()` ile 320 ms `cubic-bezier(.22,.61,.36,1)`. `reduceMotion` ise 80 ms crossfade, transform yok.
5. Paralelde `await import("./boot.js")`. 250 ms'i geçerse 6×10 fontla `BAĞLANIYOR / CONNECTING`.
6. Scroll kilidi: `documentElement.style.overflow = "hidden"`. `body`'ye `position: fixed` **verilmez** (iOS'ta scroll konumunu kaybettiriyor). Kapanışta geri alınır, `scrollTo(0, savedY)` emniyet kemeri.
7. Odak: overlay `role="application"`, `aria-label`, `tabindex="-1"`, `.focus()`. `header`, `nav`, `main`, `footer`, **`#toast`, `#a11y-announcer`** → `inert` (+ `aria-hidden` yedeği). Son ikisi `<body>`'nin doğrudan çocuklarıdır ve önceki planın `inert` listesinde yoktu.
8. Klavye: `window` üzerinde `{capture: true}`, `preventDefault()` **yalnızca** sahiplenilen 10 tuşta (Arrows, Space, W/A/D, J/K/Shift, Escape, R, M, L). Tab ve F-tuşları asla yutulmaz.
9. `HeroBridge.stopScene()` — hero rAF'i **gerçekten** iptal edilir (§11.2).
10. `visibilitychange` / `blur` → otomatik duraklat + kaydet + `AudioContext.suspend()`. Ek olarak **45 s girdisizlik** → aynı davranış.
11. `resize` / `orientationchange` → oyunu duraklat, ölçeği ve dokunmatik buton kutularını yeniden hesapla, 1 kare sonra devam. FLIP sırasında gelirse animasyon iptal edilip doğrudan son duruma geçilir.

**Çıkış.** `Escape` → duraklatma menüsü; ikinci `Escape` → çıkış (öfke-çıkışında ilerleme kaybını engeller). Ters FLIP 220 ms → overlay `remove()` → `inert` kaldır → `#monitor-hotspot.focus()` → `HeroBridge.startScene()` → `HeroBridge.setMonitorState({world, part, total, finished, debt})`. `boot.js` `destroy()` içinde tüm listener'ları, rAF'ı, `AudioContext`'i ve atlas canvas'larını bırakır; JS modülü bellekte kalır, ikinci açılış anında olur.

### 10.8 Köprü (`HeroBridge`)

Inline IIFE'nin locals'ı modülden görünmez. Inline script'e ~55 satır eklenir:

```js
window.HeroBridge = {
  getLang:        function(){ return currentLang; },
  setLang:        function(l){ setLanguage(l); },          // oyun ici dil anahtari
  onLangChange:   function(fn){ langListeners.push(fn); },
  onThemeChange:  function(fn){ themeListeners.push(fn); }, // YENI
  reduceMotion:   function(){ return reduceMotion; },
  onReduceMotionChange: function(fn){ rmListeners.push(fn); }, // YENI
  stopScene:      function(){ sceneHandle.stop();  sceneOwners.game = true;  applyScenePause(); },
  startScene:     function(){ sceneOwners.game = false; applyScenePause(); sceneHandle.start(); },
  setMonitorState:function(st){ monitorState = st; sceneHandle.redraw(); },
  setHotspotHover:function(v){ monitorHover = v; sceneHandle.redraw(); }
};
document.dispatchEvent(new CustomEvent("hero:ready"));
```

`themeListeners` hem tema toggle handler'ından (satır 1940-1945) hem `prefers-color-scheme` listener'ından (satır 1920) tetiklenir. Oyun bu olayda 16 palet slotunu yeniden çözer ve atlası yeniden pişirir (~45 ms, tek seferlik, kabul edilebilir hitch).

**Dil değişimi kararı:** metin bir lookup tablosu olduğu için canlı yeniden çeviri neredeyse bedava — `GAME_TEXT[lang]` referansı değiştirilir, aktif kart/balon **yeniden çizilir**, sahne zamanlayıcısı **sıfırlanmaz**.

Klasik inline script deferred modülden önce çalışır; launcher yine de savunmalıdır: `window.HeroBridge` yoksa `hero:ready` olayını bir kez dinler.

### 10.9 Eksik ekranlar ve durumlar

| Ekran | İçerik | Kontrol |
|---|---|---|
| **ROTATE** (portre kapısı) | 6×10 fontla iki dilde "Cihazı çevir" + telefon ikonu animasyonu. Canlı `matchMedia` listener ile otomatik kapanır. `screen.orientation.lock("landscape")` denenir, başarısızlığı sessizce yutulur (iOS desteklemiyor). **Kaçış:** "Yine de oyna" → portre yerleşimi | Dokunma / `Enter`. Klavye veya `pointer: fine` tespitinde kapı **bypass** edilir |
| **Portre yerleşimi** | Oyun yüzeyi üstte 16:9 letterbox, dokunmatik kontroller **alttaki ayrı şeritte** — örtüşme sıfır. Minimum 2,0 fiziksel ölçek garanti edilemezse bu yerleşime düşülür | Aynı 2 buton |
| **TITLE** | `M1` logline · `M2` hedef (`95,19 → 0,48`) · seçenekler: **Devam** (kayıt varsa) / **Baştan** / **Ses** / **Dil** / **Dengeli Mod** | Yön tuşlarıyla gezinir, A onaylar |
| **PAUSE** | Devam · Harita · Ses · Dokunmatik (Oto/Açık/Kapalı) · Dengeli Mod · **TR/EN** · `R` kuralı tek satır · Çıkış. Üç gerçek `<button>` (Duraklat/Ses/Çıkış) overlay chrome'unda her an erişilebilir | `Esc` açar, `Esc` kapatır |
| **MAP** | **Üst üste binmiş gerçek tarih çubukları** (eşzamanlılık) + 12 pip ızgarası (kilitliler teknoloji adıyla silüet) + parçalanmış cümlenin boş kutuları + yalnızca **AÇIK** dönüş kapıları vurgulu. İçerik ayrıca gerçek bir `<ul>` olarak da bulunur (oynamayan için metin alternatifi) | Yön gezinir, B girer, `Esc` çıkar — **dönüş kapısının içinde de `Esc` ana yola döndürür** |
| **END** (bitiş sonrası açılış) | **Otoyolu koş** / **Bölüm seç** / **Baştan** | A onaylar |
| **RESET** | "Baştan" iki kademeli onay ister ve eski kaydı `sk.override.v1.bak` altına yedekler | A onaylar, B iptal |
| **Çok küçük ekran** | `pickScale()` 1 döndürüyor ve `cssW < 480` ise: ROTATE/portre yerleşimi yoluna düşülür | — |
| **Çok büyük ekran** | Ölçek 6 ile sınırlanır (2880×1632); artan alan letterbox. `led` gölge sinyalleri ölçekle büyüdüğü için okunabilir kalır | — |
| **Kayıt yazılamıyor** | Bir kez toast: `M11`. Oyun tam oynanır, kayıt yok | — |

### 10.10 Erişilebilirlik

- Canvas `aria-hidden="true"`; durum **mevcut `#a11y-announcer`** üzerinden (ikinci live region yaratılmaz) **en fazla 2 saniyede bir** özetlenir: "Dünya 3, İkna 61, kontrol noktası 4". Kare kare anlatım yok.
- Overlay chrome'unda üç gerçek `<button>`: Duraklat, Ses, Çıkış. Klavye ve ekran okuyucu kullanıcısı her an çıkabilir.
- Odak tuzağı: overlay'de `keydown` yakalayıcı, Tab bu üç buton arasında döner.
- `prefers-reduced-motion`: parallax, kamera sarsıntısı, ekran flaşı, parçacıklar kapanır; zoom → crossfade; telegraf nabzı → statik çerçeve; pencere 0,6 → **0,9 s**. Avatar hareketi kaldırılamaz (oyun platform oyunu); bu başlık kartında tek satırla söylenir.
- Dokunmatik kontroller DOM `<button>` (min 44×44, fiilen 88×88, `touch-action: none`) — native a11y ve güvenilir olay sırası bedava gelir.
- DENGELİ MOD: `speedTier` tavanı 1,60, telegraf 54 kare, gölge kayması 3 px, etiket 20×20.
- `#toast` ve `#a11y-announcer`'ın `z-index`'i ölçülüp overlay'in 900'ünün altında kaldığı dev-mode'da assert edilir.

---

## 11. Mevcut siteyle entegrasyon

`index.astro` üzerinde yapılacak değişikliklerin **tam listesi**. Mevcut `is:inline` IIFE bölünmez; yalnız aşağıdaki noktalara dokunulur.

### 11.1 DOM: iç içe buton çözümü (satır 869-877)

Sorun: `#hero-avatar-btn` tüm canvas'ı saran bir `<button>`; monitör hotspot'u onun içinde kalamaz (iç içe buton geçersiz HTML).

```html
<!-- ONCE -->
<div class="hero-scene-wrap pixel-frame">
  <button class="avatar-trigger" id="hero-avatar-btn">
    <canvas class="pixel-canvas" id="scene-canvas"></canvas>
  </button>
</div>

<!-- SONRA: canvas butondan cikarilir, ikisi kardes olur -->
<div class="hero-scene-wrap pixel-frame">
  <div class="scene-controls">…</div>
  <div class="speech-bubble" id="speech-bubble" …>…</div>
  <div class="scene-frame">
    <canvas class="pixel-canvas" id="scene-canvas" width="1" height="1" aria-hidden="true"></canvas>
    <button type="button" class="avatar-trigger" id="hero-avatar-btn"
            data-i18n-aria="nav.characterButtonAriaLabel" aria-haspopup="dialog"></button>
    <button type="button" class="monitor-hotspot" id="monitor-hotspot"
            data-i18n-aria="game.hotspotAriaLabel" aria-haspopup="dialog"></button>
  </div>
  <p class="monitor-caption" id="monitor-caption"></p>
</div>
```

```css
.scene-frame     { position: relative; }
.avatar-trigger  { position: absolute; inset: 0; z-index: 1; background: none; border: 0; padding: 0; }
.monitor-hotspot { position: absolute; z-index: 5;                /* balon 4, controls 3'un ustunde */
  left: 14.2857%; top: 31.25%; width: 21.4286%; height: 25%;
  background: none; border: 0; padding: 0; cursor: pointer; }
.monitor-hotspot:hover, .monitor-hotspot:focus-visible { outline: 3px dashed var(--accent); outline-offset: 2px; }
.monitor-caption { min-height: 1.4em; margin: 6px 0 0; font-family: var(--font-mono); font-size: .74rem;
  color: var(--ink-soft); }
```

Yüzdeler grid'den doğrudan gelir: `monX=8, monY=10, monW=12, monH=8` (satır 1823), grid `56 × 32` → `8/56 = 14,2857%`, `10/32 = 31,25%`, `12/56 = 21,4286%`, `8/32 = 25%`. 490 px'lik canvas'ta hotspot **105 × 70 CSS px** — dokunmatik minimumun iki katı. Tab sırası: avatar → monitör.

### 11.2 `initScene` ve rAF: gerçekten durdurma (satır 1905-1923)

**Mevcut kodun gerçeği** (iki departman bunu ters okumuştu):

```js
function frame(ts) {
  if (!scenePaused) lastActiveTs = ts;
  drawScene(scene, lastActiveTs);
  if (!reduceMotion) requestAnimationFrame(frame);   // <- rAF ASLA iptal edilmiyor
}
if (reduceMotion) { drawScene(scene, 0); }           // <- reduceMotion'da rAF hic kurulmuyor
else { requestAnimationFrame(frame); }
```

`scenePaused` yalnızca **zaman damgasını** donduruyor; döngü 60 fps koşmaya devam ediyor. Ölçülen maliyet: `drawScene` her karede 58 `fillRect` + 1 `createLinearGradient` + **2 `cssVar()`** yapıyor; `cssVar` = `getComputedStyle(documentElement).getPropertyValue()` → **saniyede 120 zorunlu style recalc**, tam da overlay'in DOM'u mutasyona uğrattığı anda. Üstüne `.pixel-frame`'in `filter: drop-shadow`'u her hero karesine bir filter pass'i ödetiyor.

**Düzeltme (3 parça, ~30 satır):**

```js
function initScene() {
  var scene = makeCanvas("scene-canvas", GRID_W, GRID_H, 6);
  var lastActiveTs = 0, rafId = 0, running = false;
  function frame(ts) {
    if (!scenePaused) lastActiveTs = ts;
    drawScene(scene, lastActiveTs);
    rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    if (reduceMotion) { drawScene(scene, 0); running = false; return; }
    rafId = requestAnimationFrame(frame);
  }
  function stop()   { if (rafId) cancelAnimationFrame(rafId); rafId = 0; running = false; }
  function redraw() { drawScene(scene, lastActiveTs); }
  start();
  /* tema/reduce-motion listener'lari redraw() cagirir */
  return { start: start, stop: stop, redraw: redraw };
}
```

1. `launcher.open()` → `HeroBridge.stopScene()`; `launcher.close()` → `startScene()`. **İki rAF döngüsü asla aynı anda koşmaz** ve bu artık bir garanti, temenni değil.
2. **`cssVar` cache'lenir:** `accent` ve `led` modül kapsamlı iki değişkene alınır; mevcut `MutationObserver` (satır 1918) ve `prefers-color-scheme` listener'ı (satır 1920) bunları invalidate eder. Bu tek başına mevcut siteye de kazançtır (saniyede 120 style recalc → 0).
3. **`reduceMotion` canlı dinlenir:** satır 1655'te bir kez okunan değer bayat kalıyordu.

```js
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (e) {
  reduceMotion = e.matches;
  if (reduceMotion) sceneHandle.stop(); else sceneHandle.start();
  sceneHandle.redraw();
  rmListeners.forEach(function (fn) { fn(reduceMotion); });
});
```

**Oyunun kendi döngüsü `reduceMotion`'dan bağımsız kurulur.** Aksi hâlde erişilebilirlik ayarı açık olan kullanıcıda oyun donar. `reduceMotion` yalnızca kamera sarsıntısı, parlama, parallax ve geçiş animasyonlarını kapatır (§4.12).

### 11.3 `scenePaused`: tek sahiplenici modeli (satır 1656, 2569-2573)

Sorun: `updateScenePauseState()` değeri dialog/kart durumundan **yeniden hesaplıyor**; köprü aynı değişkene yazsa iki yazar olur. Somut kırılma: overlay açıkken tetiklenen bir dialog `close` olayı `scenePaused`'ı `false`'a çevirip hero döngüsünü oyunun bütçesine geri sokar.

```js
// ONCE
function updateScenePauseState() {
  var dialog = document.getElementById("character-dialog");
  var anyCardOpen = […].some(c => c.open);
  scenePaused = dialog.open || anyCardOpen;
}

// SONRA
var sceneOwners = { dialog: false, cards: false, game: false };
function applyScenePause() {
  scenePaused = sceneOwners.dialog || sceneOwners.cards || sceneOwners.game;
}
function updateScenePauseState() {
  var dialog = document.getElementById("character-dialog");
  sceneOwners.dialog = dialog.open;
  sceneOwners.cards  = Array.prototype.some.call(
    document.querySelectorAll(".project-card"), function (c) { return c.open; });
  applyScenePause();
}
```

`updateScenePauseState()` yalnız `dialog`/`cards` bayraklarını yazar; köprü yalnız `game` bayrağını yazar. `setMonitorState` sonrasında `redraw()` çağrısı sözleşmenin parçasıdır.

### 11.4 Konuşma balonu çakışması (satır 227-254, 873)

Sorun: `.speech-bubble` `z-index: 4` ve `pointer-events: none` **yalnızca** `.hidden-bubble` sınıfıyla geliyor; sınıf 4,5 saniyelik `setTimeout` veya ilk scroll ile ekleniyor. 320 px viewport aritmetiği: canvas 248 × 141,7 px; balon 2 satır → ~59 px + 10 px kuyruk → canvas y = −6…63, x = 22…42. Monitör hotspot'unun sol-üst köşesi (x = 35,4, y = 44,3) balonun gövdesi ve kuyruğunun **altında** kalıyor ve balon hit-test edilebiliyor. **iPhone SE sınıfı genişliklerde monitöre dokunmak ilk 4,5 saniye çalışmıyor** — kullanıcı bir kez deneyip vazgeçer.

```css
/* iki satir */
.speech-bubble   { pointer-events: none; }   /* kosulsuz — balon tamamen dekoratif */
.monitor-hotspot { z-index: 5; }             /* balon 4, scene-controls 3 */
```

Hotspot yüzdeleri (§11.1) doğru ölçülmüştür, onlara dokunulmaz.

### 11.5 `drawScene`: karanlık temada giriş noktası ve kalıcı iz (satır 1828-1872)

**Sorun 1 — karanlık temada giriş noktası görünmez.** Kodda monitör ekranının **bütün içeriği** `if (!dark)` bloğunun içinde (satır 1835-1850): imleç, `accent` satırı, `led` satırı hiçbiri çizilmiyor. Karanlık temada monitör düz bir dikdörtgen ve figür yatakta uyuyor (satır 1852-1872). Ziyaretçilerin büyük bölümü koyu temada geliyor ve **tıklanabilir bir şey olduğuna dair sıfır ipucu var.** 45 dakikalık içeriğin tek girişi keşfedilemez.

**Çözüm — kurgu zaten buna hazır** (kanon: *"karanlık temada ekran tek başına uyanır"*): figür yatakta uyumaya devam eder, **monitör uyanır**.

```js
/* satir 1835: if (!dark) { … } -> her iki temada calisan blok */
var screenLit = true;                                 // her iki temada
ctx.fillStyle = accent;
ctx.globalAlpha = (dark ? 0.42 : 0.5) + glowPhase * (dark ? 0.38 : 0.5);
ctx.fillRect(monX + 2, monY + 2, monW - 4, 1);
ctx.fillRect(monX + 2, monY + 6, 3, 1);
ctx.globalAlpha = 1;
ctx.fillStyle = led;
ctx.globalAlpha = dark ? 0.85 : 0.7;
ctx.fillRect(monX + 2, monY + 4, 6, 1);
ctx.globalAlpha = 1;
var cursorOn = reduceMotion ? true : (Math.floor(t / 500) % 2 === 0);
if (cursorOn) { ctx.fillStyle = accent; ctx.fillRect(monX + 6, monY + 6, 1, 1); }
/* karanlikta 1 px led parlama cercevesi — "ekran tek basina uyanik" */
if (dark) {
  ctx.fillStyle = led; ctx.globalAlpha = 0.22 + glowPhase * 0.18;
  ctx.fillRect(monX - 1, monY - 1, monW + 2, 1);
  ctx.fillRect(monX - 1, monY + monH, monW + 2, 1);
  ctx.fillRect(monX - 1, monY, 1, monH); ctx.fillRect(monX + monW, monY, 1, monH);
  ctx.globalAlpha = 1;
}
/* hotspot hover/focus: 1 px accent cerceve (koprüden gelen bayrak) */
if (monitorHover) {
  ctx.fillStyle = accent;
  ctx.fillRect(monX - 1, monY - 1, monW + 2, 1);
  ctx.fillRect(monX - 1, monY + monH, monW + 2, 1);
}
```

**Sorun 2 — kalıcı iz sığmıyor ve caption CLS üretiyor.** Monitör iç ekranı `monW - 2 = 10` × `monH - 2 = 6` grid pikseldir. "V6 2/3" 3×5 mini fontla 23 px ister; 10 px'e 2 karakter sığar. Caption `<p>`'si ise ilk boyamada boş, JS `localStorage`'ı okuduktan sonra metin alıyor → hero yüksekliği büyüyor → **CLS**, ki kanon bunu yasaklıyor.

**Çözüm — iki parça:**

```js
/* (1) ekran ici: 3 kolon x 5 satir pip kafesi, font YOK */
if (monitorState) {
  var gx = monX + 2, gy = monY + 2;                  // 10x6 alanin ici: 3x5 kullanilir
  for (var c = 0; c < 3; c++) for (var r = 0; r < 5; r++) {
    var idx = c * 5 + r;                              // 15 hucre: 8 dunya + 6 pip + 1 bitis
    var on = (monitorState.mask >> idx) & 1;
    if (!on) continue;
    ctx.fillStyle = (idx === 14) ? "#38E27C" : led;
    ctx.globalAlpha = reduceMotion ? 1 : (0.55 + glowPhase * 0.45);
    ctx.fillRect(gx + c * 3, gy + r, 1, 1);
    ctx.globalAlpha = 1;
  }
  /* oyun bitirilmisse: imlec blink durur, ekran sabit led isikta kalir */
  /* aydinlik temada masadaki figurun omzunda 2x2 accent rozet = devir borcu */
}
```

```js
/* (2) caption: KAYIT YOKSA DA yazilir -> yukseklik hic degismez, CLS = 0 */
// kayit yok:  TR "Monitör açık kalmış."      EN "The monitor is still on."
// kayit var:  TR "VEKTÖR VE İZİN 2/3"        EN "VECTOR AND PERMISSION 2/3"
// bitmis:     TR "Geçmiş birleştirildi."      EN "The history is merged."
```

`.monitor-caption` CSS'te `min-height: 1.4em` ile ilk boyamada yer ayırır, `aria-hidden` **kaldırılır**, `#monitor-hotspot` gerçek `aria-label` alır. Toplam ~34 satır kod, **0 yeni varlık**. `reduceMotion` yolunda statik varyant çizilir; kanvas boyutu sabit olduğu için CLS üretmez.

### 11.6 Site listener'ları

Overlay açıkken sitenin `scroll`/`resize` listener'ları (satır ~2075-2076) **park edilir**. Mobilde URL bar gizlenmesi ve orientation değişimi `resize` fırlatıp `computeActive`'i tetikliyor; o da bütün section'larda `getBoundingClientRect()` koşturarak oyunun ortasında tam sayfa layout'u zorluyor. Kapanışta yeniden bağlanır ve bir kez `computeActive()` çağrılır.

### 11.7 Değişiklik özeti

| # | Yer | Değişiklik | Satır |
|---|---|---|---|
| 1 | 869-877 | Canvas butondan çıkarılır, `.scene-frame` + `#monitor-hotspot` + `#monitor-caption` eklenir | ~14 |
| 2 | CSS ~256 | `.scene-frame`, `.monitor-hotspot`, `.monitor-caption` kuralları | ~16 |
| 3 | CSS 227-254 | `.speech-bubble { pointer-events: none }` koşulsuz | 1 |
| 4 | 1699 | `cssVar` sonuçları cache'lenir, listener'lar invalidate eder | ~12 |
| 5 | 1828-1850 | Monitör ekranı içeriği her iki temada çizilir + `led` parlama + hover çerçevesi | ~26 |
| 6 | 1835 sonrası | `monitorState` pip kafesi + bitmiş durum dalı | ~18 |
| 7 | 1655 | `reduceMotion` canlı dinlenir | ~10 |
| 8 | 1905-1923 | `initScene()` → `{start, stop, redraw}`, gerçek `cancelAnimationFrame` | ~22 |
| 9 | 1656 + 2569-2573 | `sceneOwners` tek sahiplenici modeli | ~14 |
| 10 | 1940-1945 + 1920 | `themeListeners` tetiklenir | ~8 |
| 11 | IIFE sonu | `window.HeroBridge` + `hero:ready` olayı | ~55 |
| 12 | ~2075 | Overlay açıkken `scroll`/`resize` park etme | ~10 |
| 13 | `<head>` | `<script>import "../game/launcher.js";</script>` | 1 |
| 14 | `content` | `game.hotspotAriaLabel` + `game.caption*` anahtarları (TR/EN) | ~12 |
| | | **Toplam site cerrahisi** | **~219** |

Kalan ~200 satır Faz 0'ın overlay CSS'i, `inert` yönetimi, scroll kilidi ve FPS sayacıdır → §10.2'deki 420 satır.

---

## 12. Fazlı uygulama yol haritası

Sürdürülebilir hız: **200 net gözden geçirilmiş satır/gün** (aralık 150-300).

| Faz | Çıktı | Kod | Veri | Gün | Kapı |
|---|---|---|---|---|---|
| **0** | `index.astro` cerrahisi (§11 tamamı), `scale.js`, overlay CSS, `launcher.js`, `inert`/scroll/focus/ESC, portre kapısı, FPS sayacı olan boş canvas | 720 | 0 | **5** | Tıklanınca açılıp kapanan, siteyi ve Lighthouse'u bozmayan boş katman. **En riskli entegrasyon işi burada biter.** |
| **1** | `loop`, `input`, `physics`, `tilemap`, `camera`, `render`, `font`, `sprites` (yalnız Salih), **`editor.js` + erişilebilirlik doğrulayıcı** | 2.400 | 60 | **13** | **SERT GO/NO-GO:** test odasında koşan, zıplayan, eğimde hızlanan Salih. Fizik hissi 30 dakikada iyi gelmiyorsa proje kesilir |
| **2** | `entities`, `verbs` (2 fiil), `enemies` (telegraf), `particles`, `hud`, `save`, `scenes`, `screens` (TITLE/PAUSE), `i18n` (24 satır), **`telemetry.js`** | 2.300 | 250 | **13** | Kaydeden, oranı olan, telegraflı düşmanı olan, **kendini ölçen** oynanabilir sistem |
| **3** | **DİKEY DİLİM:** W0 + W1 + W6 Faz 1, `ghost.js`, `audio.js`, `bosses.js` (KOKLAYICI), `cutscene.js`, 34 chunk | 1.900 | 700 | **12** | **~12 dakikalık, iki dilli, sesli, patronlu, kaydeden gerçek oyun.** Ölçüm burada yapılır |
| **4** | **DIŞ OYUN TESTİ KAPISI.** Tuning: çevrim süresi, oran ekonomisi, hayalet hızı, verim kalibrasyonu | 250 | 0 | **6** | **Geliştirici olmayan ≥5 kişi dikey dilimi bitirmeden W3-W5'e tek satır yazılmaz.** Telemetri JSON'ları karşılaştırılır |
| **5** | W2 + W3 + W4 + W5, kalan 4 fiil, 6 pip, kalan 5 boss, 56 chunk | 2.600 | 2.400 | **22** | Tam ana yol |
| **6** | EP, `touch.js` portre yerleşimi, `perf.js` governor, `a11y.js` denetimi, monitör caption/pip kafesi, END/MAP/RESET ekranları, FINAL | 1.400 | 340 | **9** | Sevk edilebilir |
| | **TOPLAM** | **11.570** | **3.750** | **80** | |

**Oynanabilir dikey dilim Faz 3 sonunda elde edilir** (Faz 0-3 = 7.320 kod + 1.010 veri = 43 gün).

**v1 sevk kapsamı = Faz 0-4** (49 gün): W0 + W1 + W2 + W6 tam + kısa epilog · 4 fiil (YENİDEN YAZ, KABUK, PARÇALA + MERGE) · 3 boss (KOKLAYICI, YIĞIN, YOKSAY) · 34 özgün chunk · 6.323 tile · **~22 dk**. Faz 5'te "acaba kesmeli miyim" diye sorulmaz; kapsam şimdi kesilmiştir.

**Faz 1 sonu tek gerçek "durdur" kapısıdır.** Momentum hissi kod miktarıyla değil sabitlerle kazanılır ve o sabitler 2.400 satırla ölçülebilir hâle gelir; sonraki 9.000 satırı hisse güvenmeden yazmak tek geliştirici için kaybedilmiş sekiz haftadır.

---

## 13. Kapsam dışı bırakılanlar ve neden

| Kesilen | Neden | Kaybedilen | Kurtarılan |
|---|---|---|---|
| **5 dünya** (11 → 6) | Özgün dünya kuralı pahalıdır (kod), içerik hacmi ucuzdur (ASCII veri). 11 dünya × özgün gimmick = 11 ayrı düşman/platform/kamera sistemi = sevk edilemez | Dünya adı çeşitliliği | Bütün setpiece'ler kalan dünyaların içine taşındı (§5.2). Süre kaybı **sıfır**: dünya başına uzunluk 240 s'den 380 s'e çıktı |
| **KAPSAM ve EKO bossları** | 8 boss × ortalama 550 satır = 4.400 satır boss kodu; 6 boss'ta 700 satır | 2 boss silueti | KAPSAM'ın dersi SAHTE MİSAFİR Faz 2'de, EKO'nun kopyası W4 C4'te tehlike olarak yaşıyor. `ghostTape` altyapısı yine gerekli ama tek yerde |
| **Yeni fiil eklemek (7+)** | 6 fiil × 26 davranış = 660 satır; her ek fiil +110 satır kod **ve** bütün kombinasyon matrisini yeniden dengelemek | — | Derinlik 10 farklı fiil çiftinden ve fiil × 5 gimmick × 13 düşman matrisinden geliyor |
| **Chunk bake / dirty rect** | Getirdiği hata yüzeyi (iOS canvas tahliyesi, tema yeniden-pişirme, hitch dilimleme) kazancından büyük | ~1,7 ms/kare | %32 slack yeterli; bellek 2,2 MB'dan 0,6 MB'a düştü |
| **Portre modda tam oyun** | 480 × 272 yüzey 393 CSS px'e sığmaz; iki 88 px buton yüzeyi kaplar | Portre "birinci sınıf" deneyim | ROTATE kapısı + gerçek portre yerleşimi (kontroller ayrı şeritte). Dürüst bir kapı, kötü bir deneyimden iyidir |
| **Swipe jestleri** | Momentum oyunuyla çakışıyor; relative-origin sanal yön daha güvenilir | — | 2 buton + basılı tut, iki parmak yok |
| **Analog kısmi hız** | Girdi cihazı fiziği değiştiremez; REGRESYON determinizmi bunu yasaklıyor | Gamepad nüansı | Analog 3 duruma yuvarlanır; adalet ve hayalet senkronu korunur |
| **Duvar zıplama / çift zıplama / dash / çömelme** | Her biri seviye grameri boyunca yeniden dengeleme demek; 90 chunk'ın hepsi etkilenir | Dikey ifade | Tek zıplama + eğim momentumu + 6 fiil. Repertuar dar, derinliği kombinasyonda |
| **Rastgele / prosedürel seviye** | Doğrulayıcı gerektirir, kalite garanti edilemez, "45 dk" ölçülemez | Sonsuz içerik | 90 elle yazılmış chunk + editör + erişilebilirlik doğrulayıcı |
| **Metin bütçesinin genişletilmesi** | "CV'ye kopyalanabiliyorsa kes" kuralı; her ek satır CV anlatımına kayma riski | Anlatı ayrıntısı | 84 satır, derleyicide zorlanan 6 kural (§15) |
| **Ayrı oyun URL'i / SEO / JSON-LD** | Easter egg olması kararının bir parçası; indekslenmesi hem gereksiz hem sitenin gerçek SEO hedefini bulandırır | Erişim | Monitör hotspot'u + kalıcı iz. Bulmak isteyen bulur |
| **"Medyan 50 dk" iddiasının dışa dönük iletilmesi** | Faz 4 telemetrisi göstermeden ölçülmemiş bir sayı pazarlanamaz | Pazarlama cümlesi | İç hedef 52:13, dışa dönük ifade "tek oturumluk". Ölçüm sonrası güncellenir |

---

## 14. Denetim bulguları ve çözümleri

**Kritik: 14/14 çözüldü. Önemli: 32/32 çözüldü. Küçük: 12/12 çözüldü.**

### 14.1 Kritik bulgular

| # | Bulgu | Kim buldu | Nasıl çözüldü |
|---|---|---|---|
| K1 | AER uydurma bir girdi; hedeften geri hesaplanmış, tile'dan türetilmemiş | D1 | AER **kaldırıldı**. Her segment: tile + **tepe hızın yüzdesi** (yavaşlatma mekanizmasıyla gerekçeli) → `sn = tile / (tepe_hız × verim)`. Tepe hız `physicsTable`'dan tek formülle. §5.4, scriptle üretildi |
| K2 | Dört departman üç farklı ölçek kullanıyor; birim hatası süreyi %30 şişiriyor | D1, D2 | `game/scale.js` **tek kaynak**: `TILE=16`, `VIEW 480×272` (30×17), karakter 10×16. Dept 5 atlası 16×16'ya, Dept 6 chunk tuvali 40×17'ye yeniden yazıldı. Dev-mode assertion + build `grep`. §4.1, §0 |
| K3 | 10.416 tile'ın üretim arzı yok: 90 chunk × 3 tekrar = 270 instance = ihtiyacın %41'i | D1 | Arz hesabı yazıldı: 16.296 tile ÷ 40 = **408 instance**; tekrar tavanı **3 → 5**; gereken özgün 82, **spec 90** (kapasite 450, %10 pay); veri bütçesi 620 → **2.250 satır**. §5.3 |
| K4 | Boss süresi deneme sayısıyla şişirilmiş; `~34 dk × %... → 13,9 dk` yarım formül | D1, D3 | Formül **silindi**. **İki defter**: A (içerik, temiz geçiş) ve B (medyan duvar saati). Ölüm/deneme asla içerik sayılmaz. "Patron × medyan deneme" ayrı kolon, tek geçerli toplam §7.7 |
| K5 | Hızlı profil böleni 1,22 uydurma; gerçek 1,8-2,5 ve kısayol tile farkı düşülmemiş | D1 | Bölen **1,9**, patron çarpanı **0,70**, 5 yüksek rota kısayolu ayrı kalem (−90 s) → hızlı **25:41**. İddia düzeltildi: kırmızı çizgi **medyan**ı bağlar (52:13, %16 pay); hızlı oyuncu için 40 dk iddiası **çekildi**. §6.4 |
| K6 | Mevcut hero rAF'i asla iptal edilmiyor; `reduceMotion`'da hiç kurulmuyor; saniyede 120 style recalc | D2 | `initScene()` → `{start, stop, redraw}`; `stop()` gerçek `cancelAnimationFrame`. Launcher açılışta `stopScene`, kapanışta `startScene`. `cssVar` cache'lendi. **Oyun döngüsü `reduceMotion`'dan bağımsız kurulur.** §11.2 |
| K7 | Ölçek formülü portrede 1 veriyor, `dpr` terimi yok → 320×180 pul + shimmer | D2 | `pickScale()` **cihaz pikselinde**: `floor(min(cssW*dpr/480, cssH*dpr/272))`, backing `480s×272s`, CSS `480s/dpr`. Portre için ROTATE kapısı + gerçek portre yerleşimi. §4.1, §10.9 |
| K8 | Satır bütçesi ~2× eksik, gün tahmini yok, Faz 5 içeriğin %55'ini bütçenin %18'ine sıkıştırıyor | D2 | Modül tablosu 2× yeniden fiyatlandırıldı: **11.600 kod + 3.750 veri = 15.350 satır**, faz başına **iş günü**, toplam **80 gün**. v1 kapsamı **şimdi** kesildi. §10.2, §12 |
| K9 | 45 dk iddiası yanlışlanamaz; ölçmek için 0 satır bütçelenmiş | D2 | Faz 2'ye **`telemetry.js` (140 satır)**: segment duvar saati, revert konumu, **ölçülen verim**, boss deneme, ölüm histogramı, JSON kopyala. Faz 4 = **dış oyun testi kapısı (≥5 kişi)**. İddia "tasarım hedefi" olarak sunuldu + kalibrasyon kuralı. §6.7, §12 |
| K10 | İKNA ORANI'nın aritmetiği hiçbir departmanda yok; başlık vaadi ve final satırı garantisiz | D3 | Tam aritmetik: tamsayı `rate` (100'de bir), dünya başına **taban `F_w`**, **clamp `F_w+1200`**, geri alma şeridi `max(F_w, rate−drain)`, **invariant** `drains × per ≥ (F_{w−1}−F_w)+1200`, MERGE'te deterministik **48**, `assertRateCurve` + `assertFinish`. Tavanın görünür sonucu var. §8.2 |
| K11 | Boss retry bütçe dışı; W8'de tasarım gereği 8 dakikalık ezber duvarı | D3 | Ezber duvarı **kaldırıldı**: KORO 116 mermi = **3 dalga × 39/39/38**, dalga arası **commit taşı**, kaçan mermi orana yazılır ve fazı sıfırlamaz. Medyan deneme hedefi **2**, bütün bosslarda. Faz içi commit taşı zorunlu. §7.6, §7.7 |
| K12 | 11 dünya aynı A-B-C-D-E-F kalıbıyla açılıyor; makro tekrar çözülmemiş | D3 | "Her dünya öğretme odasıyla açılır" kuralı **kaldırıldı**. W2 yağmurla, W3 kovalamayla, W4 **boss'un Faz 1'iyle**, W5 sessiz okuma koridoruyla açılır. Yeni kural: fiil 15 s'de in-situ öğretilebiliyorsa **ayrı oda yok**; kalan odalar 35 s → 22-30 s. §4.8, §5.4, §5.5 |
| K13 | Devir borcu tanımsız bir girdiye bağlı; bedeli 36 saniye | D3 | Borç **görünür icra kararı**: kapıdan geç (borç +1, şerit 8 s) / kendin koş (borç +0, 26 s, ödüllü), HUD rozetinde anında geri bildirim. Bedel **süreden yeteneğe** çevrildi: Faz 3'te devredilen fiil **kapalı**. 8 kombinasyon çözülebilir. `debt` 0-3 clamp. §3.6, §8.3 |
| K14 | 11 dünya sevk edilemez, 4 dünya sevk edilir (yapılabilirlik) | D2 | Dünya sayısı **6** + prolog + epilog; özgün gimmick **5**; boss **6**. Kesilenlerin setpiece'leri taşındı. v1 = 4 sahne, 22 dk. §0, §5.1, §5.2, §13 |

### 14.2 Önemli bulgular

| # | Bulgu | Kim | Nasıl çözüldü |
|---|---|---|---|
| Ö1 | 142 s etkileşimsiz süre çift muhasebeyle gizlenmiş; MERGE 14 s oynanış sayılıyor | D1 | Sabit kalem **90 s** olarak tek yerde; MERGE 14 → **6 s**; W10 kapanışı 26 → **6 s**; FINAL/EPİLOG toplamda dâhil. Etkileşimsiz oran **%3,3**. §6.2 |
| Ö2 | 4 Yayına Alma Koşusu 1.200 tile'ı içerik sayıp 140 s'yi "sabit" ilan ediyor | D1 | Karar yoğunluğu **7 karar/koşu** (5,7 s'de bir): dallanan rampa ×2, hayalet yarışı, sakin kurtarma, glif reddi, rampa seçimi, çıkış rotası. Traversal'da sayılır, "sabit"ten çıkarıldı. §5.4, §6.2 |
| Ö3 | W7 bossunun varlığı üç kaynakta üç farklı | D1 | 6 boss tek yerde adlandırıldı. **İMZA W4'ün bossu**, Faz 1 dünyanın açılışında, Faz 2 kapanışında. Bütün boss süreleri §7.7'de tek tablo, §5.4 oradan okur |
| Ö4 | W9 Faz 3 en kötü duruma göre bütçelenmiş; `debt: 4` şemayla çelişiyor; 3×18≠84 | D1 | Faz 3 **sabit 3 şerit / 48 s**; değişen repertuar, süre değil (±18 s). `debt` **0-3 clamp**. Aritmetik §5.4'te doğrulandı |
| Ö5 | Opsiyonel içerik 590 s vs 180 s; pip odaları çift sayılmış; dönüş kapısı 4 vs 5 | D1 | **Tek opsiyonel defter (375 s)**: 3 dönüş kapısı (W3/W4/W5) × 55 + **3** opsiyonel pip odası × 40 + sakin kurtarma 90. 9 pip zorunlu ana yolda → çift sayım yok. İKİNCİ GÖRÜŞ zorunlu. §6.5 |
| Ö6 | Süre tüketen hiçbir mekanizma modellenmemiş; iki departman birbirini geçersiz kılıyor | D1 | Her segmentte **yavaşlatma mekanizması sütunu**: dikey tile sayısı, telegraf beklemesi, platform periyodu, okuma durağı, fren-kontrol noktası. Verim yüzdesi bu envanterden gerekçelenir. §5.4 |
| Ö7 | Tile dokusu rotasyonu ~70 elle çizilmiş tile gerektiriyor (17.920 piksel) | D2 | **Parametrik dekoratör**: 3 temel tile + tohumlu dekoratör (kenar/gürültü/köşe/iç çizgi) = ~60 satır, 48 stil kombinasyonu, ~300 elle konan piksel. Kural "aynı dekoratör tohumu" olarak yeniden yazıldı. §9.5 |
| Ö8 | Chunk string'leri gerçek gizli sanat işi; editör ve doğrulayıcı bütçesiz | D2 | **`editor.js` (360 satır, dev-only, tree-shake)** Faz 1'de: tile boyama, **gerçek fizik sabitlerinden canlı zıplama yayı**, chunk-geçişi **erişilebilirlik doğrulayıcısı**, "JS olarak kopyala". §10.4 |
| Ö9 | Overlay'in mount yeri yazılmamış; `.pixel-frame`'in `filter`'ı `fixed` torunları hapsediyor | D2 | **`document.body.appendChild(overlay)`** + dev-mode `console.assert`. Overlay asla re-parent edilmez. Tuzak launcher'ın başına yorum olarak yazılır. §10.7 |
| Ö10 | Konuşma balonu monitör hotspot'unu ilk 4,5 s kapatıyor | D2, D3 | `.speech-bubble { pointer-events: none }` **koşulsuz** + `.monitor-hotspot { z-index: 5 }`. §11.4 |
| Ö11 | Chunk bake yanlış takas: hitch, 2,2 MB, iOS tahliyesi, tema yeniden-pişirmesi | D2 | **Chunk bake kaldırıldı.** Kare başına 510 görünür tile sıcak atlastan (~2,6 ms mobilde). Yalnız sprite/glif atlası + wrap parallax şeridi pişirilir. §10.5 |
| Ö12 | Font yalnız BÜYÜK harf; oyunun bütün metni karışık kap ve inişli | D2 | **6×10 hücre**: 1 ascender + 7 cap + 2 descender, ~95 glif, base64, ~1 KB. `ı`/`İ` ayrı taban formu. Karakter tavanları yeniden türetildi ve **gevşedi** (64 karakter/satır). §9.6 |
| Ö13 | Monitörde "V6 2/3" 10 px'e sığmıyor; caption `<p>` CLS üretiyor | D2, D3 | Ekran içi: **3 kolon × 5 satır pip kafesi** (font yok). Caption **her durumda** yazılır + `min-height: 1.4em` → CLS = 0; `aria-hidden` kaldırıldı, hotspot `aria-label` aldı. §9.6, §11.5 |
| Ö14 | `makeCanvas`/`drawScene` "birebir çalışır" iddiası yanlış (dpr kırpma, akışkan boyut, grid birimi) | D2 | `render.js` içinde ayrı **`makeGameCanvas(w, h)`** (bütçelendi). Devralınan şey fonksiyon değil **üslup**: `imageSmoothingEnabled=false`, tam sayı `fillRect`, palet türetme, `ensureStars`'ın reddetme-mesafesi kalıbı. §9.4, §10.2 |
| Ö15 | Karanlık temada oyuna giriş noktası görünmez (ekran sönük, figür yatakta) | D3 | Monitör ekranı **her iki temada** çizilir + karanlıkta 1 px `led` parlama çerçevesi ("ekran tek başına uyanır" kurgusu). Hotspot `:hover`/`:focus-visible` → `accent` çerçeve. Caption ilk ziyarette de yazılır. §11.5 |
| Ö16 | Portre mod hiçbir departmanda geçmiyor; `resize`/`orientationchange` tanımsız | D3 | ROTATE kapısı + "yine de oyna" → portre yerleşimi (kontroller **alttaki ayrı şeritte**, örtüşme sıfır). `resize`/`orientationchange` → duraklat, yeniden hesapla, 1 kare sonra devam; FLIP sırasında animasyon iptal + son duruma atla. §10.7, §10.9 |
| Ö17 | Dokunmatik kontrollerin ne zaman görüneceği yazılmamış; fizik sessizce değişebilir | D3 | **Girdi kaynağı izleyicisi**: son 5 s'de kullanılan kaynak, 150 ms fade. Coyote/buffer bonusu **son kaynağa** bağlı, HUD'da bildirilir, hayalet kaydı bonusu işaretler. `settings.touch = Oto/Açık/Kapalı`. §4.10 |
| Ö18 | Menü, kayıt, harita, bitiş ekranları hiç tanımlanmamış; "baştan başla" yok | D3 | **`screens.js` (640 satır)**: TITLE (Devam/Baştan/Ses/Dil/Dengeli), PAUSE, MAP (üst üste tarih çubukları + 12 pip + açık kapılar + `<ul>` metin alternatifi), END (Otoyolu koş/Bölüm seç/Baştan), RESET (iki kademeli onay + `.bak` yedeği), ROTATE. §10.9 |
| Ö19 | Aktif fiil yalnız sprite üstünde okunuyor; öncelik kuralı yazılı değil | D3 | Aktif fiil **HUD'un sabit yuvasında** da (İKNA barının yanında, çerçeve stiliyle). **Yazılı öncelik tablosu** (veri): telegraf açık > daha yakın düğüm > son kullanılan. Çakışmada ikisi de görünür (kazanan opak, kaybeden %40). §4.6 |
| Ö20 | 1 px gölge kayması bir dünyanın ve bossunun zorunlu tek sinyali | D3 | Kayma **2 px** + **kesikli çerçeve** (iki sinyal aynı anda). İKİNCİ GÖRÜŞ hold'u etiketleri **%50 yavaşlatır** → beceri "piksel görme" değil "ne zaman yavaşlayacağını seçme". DENGELİ MOD'da 3 px + 20×20 etiket. §7.4, §9.7 |
| Ö21 | Epilog 4 dk ödülsüz, hikâye 18 s önce kapanmış | D3 | Epilog 240 s → **108 s**. Ufukta İletişim silüeti + **azalan mesafe sayacı** baştan görünür. 12 pip sayımı ve `F1 %83,81` mührü yol üstünde kapılar. Kapanış **oyuncu bitiş çizgisine dokununca** tetiklenir. §5.4 EP |
| Ö22 | W4 (16-20. dk) en durgun blok, ardından W5 de yavaş | D3 | Yeni numaralandırmada bu blok **W3**: **kovalamayla açılır** (verim %60), boss 3 fazlı kovalamaca, `301 İZİ` pipi dünyanın ilk yarısında. Ardından W4 boss'un Faz 1'iyle açılır. Üst üste iki yavaş dünya yok. §5.4, §5.6 |
| Ö23 | `#toast` / `#a11y-announcer` `inert` listesinde yok; ikinci live region ekleniyor | D2 | İkisi de `inert`/`aria-hidden` edilir; **ikinci live region yaratılmaz**, mevcut `#a11y-announcer` yeniden kullanılır (2 s'de bir özet). `z-index` dev-mode'da assert edilir. §10.7, §10.10 |
| Ö24 | `ghostTape` kanonla çelişiyor; W9 gövdesinin arkasında mekanik yok | D2 | Kanon düzeltildi: input kaydı değil **240 karelik konum bandı** (`ghost.js` 130 → 200 satır). Somut mekanik: **Faz 3'ün arena zemini oyuncunun Faz 1-2'de koştuğu yoldur**; kayıtlı yolun geçmediği yerde platform yok. §7.6 |
| Ö25 | Sekme görünür kalırken idle oyuncu sonsuz revert döngüsünde; `R` davranışı tanımsız | D3 | **45 s girdisizlik → otomatik duraklat** + `AudioContext.suspend()`. Aynı noktada 5. revert'ten sonra SPRINT SONU 2 s durur. **`R` davranış tablosu** yazıldı (kamera kilitli / ara sahne / MERGE / boss fazı). §4.10, §8.1 |
| Ö26 | `scenePaused` iki yazarlı, sahiplik kuralı yok | D3 | **`sceneOwners = {dialog, cards, game}`** + `applyScenePause()`. `updateScenePauseState` yalnız dialog/cards, köprü yalnız game yazar. §11.3 |
| Ö27 | Dil butonu `inert` altında; oyun içinde dil kontrolü yok | D3 | PAUSE menüsünde **TR/EN** + `HeroBridge.setLang(l)` siteyi senkronlar. Ara sahne ortasında değişirse balon **anında yeniden yazılır**, zamanlayıcı sıfırlanmaz. Tek doğruluk kaynağı sitenin `lang` anahtarı. §10.8, §10.9 |
| Ö28 | Köprüde `onThemeChange` yok; OS tema değişimi oyuna ulaşmıyor | D2 | `onThemeChange(fn)` eklendi, hem toggle handler'ından hem `prefers-color-scheme` listener'ından tetiklenir. Oyun 16 slotu yeniden çözer ve atlası yeniden pişirir (~45 ms). §10.8 |
| Ö29 | Site `scroll`/`resize` listener'ları oyunun ortasında tam sayfa layout zorluyor | D2 | Overlay açıkken park edilir; kapanışta yeniden bağlanır + bir kez `computeActive()`. §11.6 |
| Ö30 | W0'ın 120 s'sinde ~14 s ajanssız zaman içerik sayılıyor | D1 | W0 dürüstçe ayrıldı: **85 s etkileşimli + 13 s etkileşimsiz + 25 s öğretme**. Telafi olarak `DUR` glifiyle **ikinci cezasız telegraf dersi** P0a'nın sonuna eklendi. §5.4 W0 |
| Ö31 | Boss süreleri iki departmanda farklı (56/60/50/65/70/82 vs 55/65/60/70/75/95) | D1 | Tek tablo §7.7 **otoritedir**; §5.4 ve §6.3 oradan okur. Toplam **458 s** özgün içerik |
| Ö32 | Ara sahne bütçesi FINAL/EPİLOG'u "muaf" ilan edip toplamdan çıkarmıyor | D1 | Tek sabit kalem: 7×8 + 8 (SC-00) + 4 (zoom) + 18 (FINAL) + 6 (MERGE) + 6 (epilog) = **98 s**, bütçede 90 + 8 olarak kalem kalem görünür. Muafiyet yok. §3.5, §6.2 |

### 14.3 Küçük bulgular

| # | Bulgu | Kim | Nasıl çözüldü |
|---|---|---|---|
| k1 | Segment tablosunun 12 satırında tile/AER ≠ yazılı saniye | D1 | Tablo elle yazılmıyor: tile ve verim girdi, saniye `tile/(tepe_hız×verim)` olarak **scriptle** üretiliyor; kümülatif ve bütçe tabloları aynı kaynaktan türetiliyor. §5.4, §6.3 |
| k2 | W10 kendi formülüne göre 25 s fazla booking edilmiş | D1 | Epilog yeniden yazıldı (108 s, 3 segment), aritmetik doğrulandı |
| k3 | `reduceMotion` bir kez okunuyor, listener yok | D2 | `matchMedia(...).addEventListener("change", ...)`; hero rAF'i duruma göre kurar/iptal eder, köprüden yayınlar, DENGELİ MOD varsayılanını yeniden uygular. §11.2 |
| k4 | Kayıt şemasındaki `debt: 4` ilan edilen maksimumun üstünde | D1 | `debt` okuma sırasında **0-3 clamp**. §10.6 |
| k5 | Ekranda ondalık kuralı ile HUD çelişmesi | D1 | HUD tamsayı + bar; ondalıklar tam **üç** anlatı anında (`M2`, `F3`, `F1 %83,81` mührü). §8.2 |
| k6 | `ensureStars`'ın kanıtlanmış kalıbı "prototip" olarak adlandırılmamış | D2 | `PROC` katmanının referans kalıbı olarak açıkça yazıldı (reddetme mesafesi + kaçınma bölgesi + faz). §9.4 |
| k7 | Zıplama erişim menzili iki departmanda %62 farklı (2,1 kare vs 3,4 tile) | D2 | Tek değer, **simülasyonla doğrulandı**: 56 px = **3,47 tile**, hava 33 kare. İfşa düğümü erişim şartı 1,5 tile → %131 pay. §4.3, §7.1 |
| k8 | Chunk 40×18 iken ekran 30 tile; "tek ekranda okunur" ihlali | D2 | `CHUNK_H = 17` (`VIEW_H/TILE`), `CHUNK_W = 40` → 640×272 yazım tuvali, ekran 30×17. Chunk ekrandan 10 tile uzun (kasıtlı: sağa doğru okuma payı) |
| k9 | Prose tanımı belirsiz, LEXICON ayrımı yok | D4 (öz) | Prose = **≥3 kelimelik cümle biçimli string**. Telegraf glifleri, HUD etiketleri, dünya adları, pip adları, `MERGE` sayılmaz → **44 girişlik LEXICON**. §15 |
| k10 | Sertifikalar CV okutma riski | D4 (öz) | 5 sertifika **yalnızca silüet**, metin yok, W3/W4 dönüş kapılarının kilit mühürleri. Prose maliyeti sıfır. §8.5 |
| k11 | Yalan tile cümleleri iki dilde aynı çift olabilir | D4 (öz) | `assertGameText` kuralı: `if (tr.lie === translate(en.lie)) throw`. Dil başına ayrı yazılır. §15 |
| k12 | `%` işaretli ondalık her yere yazılabilir | D4 (öz) | `assertGameText` kuralı: ondalık **yalnızca** `menu.m2` ve `final[2]` içinde geçebilir. §15 |

### 14.4 Kalan riskler (çözülmedi, izlenecek)

| Risk | Neden çözülmedi | Azaltma |
|---|---|---|
| **Verim yüzdeleri hâlâ tahmindir** | Ölçüm ancak Faz 2 telemetrisi + Faz 4 dış testiyle mümkün. Bir platform oyununda ilk tahmin %15-35 sapar | Kalibrasyon kuralı yazılı: sapma varsa **tile sayısı** düzeltilir, iddia değil. Faz 4 sert kapı. Dışa dönük süre iletişimi ölçüme kadar askıda |
| **80 iş günü tek geliştirici için 4 aydır** | Kapsam zaten 11 → 6 dünyaya kesildi; daha fazla kesmek 45 dk hedefini bozar | v1 (49 gün, 22 dk) sevk edilebilir bir ara ürün. Faz 1 ve Faz 4 sert go/no-go kapıları |
| **90 chunk'ın elle yazılması** | Otomatikleştirilirse kalite garanti edilemez | `editor.js` + erişilebilirlik doğrulayıcı Faz 1'de; 10. chunk'ta amorti eder |
| **8 borç kombinasyonunun test yükü** | Faz 3'ün 3 şeridi × 8 kombinasyon = 24 çözülebilirlik kontrolü | Doğrulayıcı bunu otomatik yapar (`minTierIn` + kapalı fiil maskesi ile yol bulma) |
| **Mobil 60 fps orta seviye cihazda** | Ancak gerçek cihazda ölçülür | %32 slack + perf governor + chunk bake'in kaldırılması. Faz 6'da ölçüm |

---

## 15. Oyuncu-görünür metinler

Tüm oyuncu-görünür metinlerin TR/EN listesi ayrı dosyadadır: **`d:/salih-web-static/docs/oyun-metinleri.md`**

O dosya şunları içerir: prose tanımı ve 6 derleyici kuralı · 44 girişlik LEXICON · 84 prose satırı × 2 dil (menü/ekranlar, W0 ipuçları, dünya kartları, teaser'lar, ara sahne replikleri, boss tanıtımları, revert mesajları, borç kapısı, in-situ fiil ipuçları, pip mühürleri, final) · `GAME_TEXT` veri yapısı · `assertGameText` doğrulayıcısı.

