/* game/text/tr.js — v0 GAME_TEXT (TR).
 *
 * TON KARARI: metinler OYNANIS TALIMATIDIR, edebi anlati degil. Ilk surumde
 * her satir sitenin anlatisina gonderme yapiyordu (ORAN/IKNA, "Cümle doğmadı.
 * Alıntılandı." gibi) ve oyuncu ekranda ne yapmasi gerektigini HICBIR YERDEN
 * okuyamiyordu. Kural: her satir ya NE YAPACAGINI ya da NE OLDUGUNU duz
 * Turkce soyler. Ozel adlar (oyun basligi, bolum/patron adlari) kalir.
 *
 * Kaynak yapisi (blok adlari ve SAYILARI) docs/oyun-v0-kapsam.md §6.5 ile
 * ayni: i18n.js'in countProse'u 55 prose satiri sayar ve blok basina slot
 * tavanlarini dogrular — yapiyi degistirmeden yalniz METIN yenilendi. */
export default {
  lexicon: {
    jump: "ZIPLA", stop: "DUR", turn: "DÖN", wait: "BEKLE", drop: "BIRAK",
    approve: "ONAYLA", allow: "İZİN VER", trust: "GÜVEN",
    /* HUD'da gorunen terimler: jargon degil, NE OLDUGUNU soyleyen kelimeler.
     * `rate` ust soldaki cubugun adi, `verb.*` sag ustteki aksiyon yuvasi. */
    rate: "İTAAT", debt: "BORÇ", merge: "BİTTİ", commit: "KAYIT", revert: "GERİ AL",
    phase: "BÖLÜM", residents: "SAKİN", sound: "SES", lang: "DİL",
    pause: "DURAKLAT", resume: "DEVAM", restart: "BAŞTAN", exit: "ÇIKIŞ", map: "HARİTA",
    balanced: "KOLAY MOD", touch: "DOKUNMATİK", auto: "OTO", on: "AÇIK", off: "KAPALI",
    connecting: "AÇILIYOR",
    pickStage: "BÖLÜM SEÇ", locked: "KİLİTLİ", cancel: "İPTAL",
    controls: "TUŞLAR", pips: "YETENEK",
    boss: "PATRON", shootAt: "ATEŞ ET", shielded: "KALKANI AÇIK",
    atk: { rain: "GÖKTEN MERMİ", volley: "YATAY SALVO", summon: "AVCI ÇAĞIRIYOR" },
    keyAction: "J", keyGround: "Q", keyJump: "BOŞLUK",
    stageJumpNote: "Seçtiğin bölümün başından başlarsın.",
    confirmKeys: "AKSİYON onaylar, ZIPLA iptal eder.",
    mapKeys: "Sol/sağ seçer, AKSİYON girer, ZIPLA çıkar.",
    gateLocked: "Kapı kilitli: geri dön, KOKLAYICI'yı yen.",
    verb: { rewrite: "ZEMİN YAP", shoot: "ATEŞ ET" },
    pip: { trail: "SAĞLAM ZEMİN" },
    f1seal: "F1 %83,81", ghost: "ESKİ HÂLİN"
  },
  /* Tus efsanesi (baslik ekrani + DURAKLAT + 1. bolum giris ipucu). */
  controls: [
    "A D veya yön tuşları: yürü",
    "BOŞLUK, W veya YUKARI: zıpla",
    "J veya SHIFT: ateş et, basılı tut seri atar",
    "Q: önüne zemin koy (yerdeyken)",
    "P veya ESC: duraklat",
    "M: harita ve bölüm seçimi, T: dokunmatik"
  ],
  worldNames: {
    w0: "1 — EĞİTİM", w1: "2 — KANAL", w6: "3 — YOKSAY", ep: "4 — OTOYOL"
  },
  bossNames: { sniffer: "KOKLAYICI", override: "YOKSAY" },
  menu: {
    m1: "Küçük bir platform oyunu, 4 bölüm.",
    m2: "Amaç: bitişe ulaş, İTAAT çubuğunu düşür.",
    m3: "Kaldığın yerden devam edersin.",
    m4: "Kayıt bu tarayıcıda saklanır.",
    m5: "Geçmek için AKSİYON'u basılı tut.",
    m6: "Ölmek ceza değil. Son kayıttan dönersin.",
    m7: "Kolay mod: daha yavaş, daha uzun uyarı.",
    m8: "Bir bölüm seç, oraya geç.",
    m9: "Kutular: topladığın yetenekler.",
    m10: "Tüm ilerleme silinecek. Emin misin?",
    m11: "Kayıt kapalı ama oyun yine çalışır.",
    m12: "Bölümleri istediğin gibi tekrar oyna."
  },
  hints: [
    "Sağa doğru koş.",
    "Zıplarken tuşu basılı tut.",
    "Düşmek seni cezalandırmaz.",
    "Zıpla, ateş et, önüne zemin koy.",
    "Tuşların listesi DURAKLAT'ta yazar."
  ],
  worlds: [
    { id: "w0", sub: "Yürümeyi ve zıplamayı öğren.", teaser: "Hazırsın. Sıradaki bölüm daha hızlı." },
    { id: "w1", sub: "Zemin yapmayı ve ateş etmeyi öğren.", teaser: "İlk patronu geçtin." },
    { id: "w6", sub: "Öğrendiğin iki yeteneği birlikte kullan.", teaser: "Son düzlük açıldı." },
    { id: "ep", sub: "Sadece koş ve bitiş çizgisine dokun.", teaser: null }
  ],
  midTeaser: "Yarısını geçtin. Aynı şekilde devam.",
  scenes: {
    sc00: [
      { who: "S", line: "Sağa koş, boşlukları zıplayarak geç." },
      { who: "Y", line: "Düşersen kaybetmezsin, geri dönersin." }
    ],
    sc01: [
      { who: "Y", line: "Buradan sonra iki yetenek toplayacaksın." },
      { who: "S", line: "J ile ateş et: düşmanları durdurur." },
      { who: "S", line: "Q ile önüne zemin koy, boşlukları geç." }
    ],
    sc06: [
      { who: "S", line: "Son bölüm: iki yeteneği de kullanacaksın." },
      { who: "R", line: "Kırmızı şeritlerde durma, koşmaya devam et." }
    ]
  },
  /* `hints` alanlari prose butcesine SAYILMAZ (sayim yalniz `.line` gezer) —
   * boss dogdugunda replikten sonra balon olarak oynatilir ve patronun
   * ustundeki canli etiketle ayni kelimeleri kullanir (bkz. bosses.js). */
  bosses: {
    sniffer: {
      line: "Bu patronu yenmeden çıkış kapısı açılmaz.",
      hints: [
        "J ile ateş et, canını düşür.",
        "Işını sana kilitliyken kalkanı açılır: kaç.",
        "Kilit dolunca bir avcı doğar, onu da vur."
      ]
    },
    override: {
      line: "Son patron. Kalkanı inince ateş et.",
      hints: [
        "Üstünde sıradaki saldırının adı yazar.",
        "Gökten mermi yağarsa işaretsiz boşluğa geç.",
        "Salvoyu zıpla ya da Q ile siper alarak geç."
      ]
    }
  },
  revert: ["Geri alındı.", "Son kayda döndün.", "Hiçbir şey kaybolmadı."],
  verbHints: {
    rewrite: "Q: yerdeyken önüne zemin koyar.",
    shoot: "J: ateş eder. Basılı tut, seri atar."
  },
  /* 12 yetenek kutusu: v0'da yalniz 0/1/6 toplanabilir ve toplaninca `seal`
   * satiri balon olarak cikar. Kalan 9'u HARITA'da "?" olarak durur. */
  pips: [
    { id: "rewrite", name: "ZEMİN YAP", locked: "?", seal: "Yeni yetenek: Q ile önüne zemin koy." },
    { id: "shell", name: "ATEŞ ET", locked: "?", seal: "Yeni yetenek: J ile ateş et." },
    { id: "split", name: "PARÇALA", locked: "?", seal: null },
    { id: "seal", name: "MÜHÜR", locked: "?", seal: null },
    { id: "hook", name: "KANCA", locked: "?", seal: null },
    { id: "prefilter", name: "FİLTRE", locked: "?", seal: null },
    { id: "trail", name: "SAĞLAM ZEMİN", locked: "?", seal: "Koyduğun zemin çok daha geç kayboluyor." },
    { id: "anchor", name: "ÇAPA", locked: "?", seal: null },
    { id: "second", name: "İKİNCİ ŞANS", locked: "?", seal: null },
    { id: "fork", name: "ÇATAL", locked: "?", seal: null },
    { id: "remote", name: "UZAKTAN RED", locked: "?", seal: null },
    { id: "topk", name: "ZİNCİR", locked: "?", seal: null }
  ],
  final: [
    "Patronu geçtin, yol açıldı.",
    "AKSİYON tuşuna bas ve son bölüme geç.",
    "Son düzlük. Buradan sonrası sadece koşu.",
    "Bitirdin. Oynadığın için teşekkürler."
  ],
  a11y: {
    a1: "Bölüm {w}, itaat {r}, kayıt noktası {c}.",
    a2: "Bu bir platform oyunu; hareket kaldırılamaz."
  },
  gate: {
    x1: "Telefonu yan çevirirsen daha rahat oynarsın.",
    x2: "Ekran hazırlanıyor."
  },
  /* Sahte zemin uyarilari: TR ve EN AYRI yazilir, ceviri degil (assertGameText
   * kural 6 bunu dogrular). */
  lies: [
    "Bu yol kısa görünüyor.",
    "Zemin burada devam ediyor gibi.",
    "Kapı zaten açık sanki.",
    "Bu şerit güvenli görünüyor.",
    "Buradan geçilir herhâlde."
  ]
};
