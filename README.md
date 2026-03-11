# Nöbetçi Eczane Bulucu

Bu proje, kullanıcıların konumlarını veya şehir/ilçe seçimlerini kullanarak yakındaki nöbetçi eczaneleri bulmalarını sağlar.

## Kullanım

1. `npm install`
2. `npm run dev`
3. Tarayıcıdan `http://localhost:3000` adresine gidin.

## Yayınlamak

- GitHub'a yükleyin.
- Vercel'e bağlayıp projeyi deploy edin.

## Özellikler

- Konum izni ile harita üzerinde gösterim
- Şehir ve ilçe seçimi ile eczane listesi
- Harita pinlerinde Eczane isimleri
- Yol tarifi alma imkanı

---

## 🔄 Cache Mekanizması

Bu uygulama **24 saatlik cache sistemi** ile nöbetçi eczane verilerini yönetir. Aşağıda tüm ilgili dosyalar ve işleyiş açıklanmıştır.

### Dosya Yapısı

```
nobetci-eczanem/
├── lib/
│   └── cache.js                 # Cache yönetim fonksiyonları
├── pages/
│   ├── index.js                 # Frontend (React)
│   └── api/
│       └── crawl.js             # API endpoint (Puppeteer scraping)
├── public/
│   └── eczaneler-cache.json     # Cache dosyası (runtime'da oluşturulur)
└── vercel.json                  # Cron job konfigürasyonu
```

---

## 📋 Kod Açıklaması

### 1. Cache Yönetim Klasörü: `lib/cache.js`

24 saatlik cache sistemi için 4 temel fonksiyon:

#### `getCachedData()`
Cache dosyasını okur ve döndürür.
```javascript
function getCachedData() {
  // public/eczaneler-cache.json dosyasını oku
  // Timestamp ve data kontrolü yap
  // Valid ise data döndür, yoksa null
}
```

**Döndürür:**
```javascript
{
  timestamp: 1773256629458,        // Cache oluşturulma zamanı (ms)
  data: {                          // Eczaneler (Province → District → Array)
    "Ankara": {
      "Çankaya": [
        { isim, adres, latitude, longitude }
      ]
    }
  },
  ilceler: ["Çankaya", "Sincan", ...]  // District listesi
}
```

#### `isCacheValid()`
Cache'in 24 saatinden yeni olup olmadığını kontrol eder.
```javascript
const isValid = isCacheValid();
// true: Cache fresh, use it
// false: Cache old, scrape new data
```

**TTL:** 24 saat (86,400,000 ms)

#### `setCachedData(data, ilceler)`
Başarılı scraping sonrası veriyi cache'e kaydeder.
```javascript
setCachedData(grouped, allIlceler);
// public/eczaneler-cache.json dosyasına yaz
// Timestamp otomatik eklenir
```

#### `clearCache()`
Cache dosyasını siler (opsiyonel, test için).

---

### 2. API Endpoint: `pages/api/crawl.js`

Web scraping ve cache yönetim logic'i.

#### Flow Diyagramı

```
API Request → /api/crawl?force=true (optional)
    ↓
[isCacheValid() kontrol]
    ├─ Cache fresh → Cached data döndür (0.016s) ⚡
    └─ Cache stale → Puppeteer scraping başlat (30-40s) ⌛
        ├─ https://www.aeo.org.tr/nobetci-eczaneler ziyaret
        ├─ HTML parse (h4, p, Google Maps link)
        ├─ Veri extract ve gruplayıp
        ├─ setCachedData() ile cache'e yaz
        └─ JSON response döndür (fromCache: false)
    [Hata oluşursa]
        ├─ getCachedData() ile fallback cache dön
        └─ Hiç cache yoksa 500 error
```

#### Başlıca Kod Bölümleri

**Cache kontrol:**
```javascript
if (req.query.force !== 'true' && isCacheValid()) {
  const cachedData = getCachedData();
  return res.status(200).json({
    ilceler: cachedData.ilceler,
    eczaneler: cachedData.data,
    fromCache: true
  });
}
```

**Puppeteer scraping:**
```javascript
await page.goto('https://www.aeo.org.tr/nobetci-eczaneler', {
  waitUntil: 'networkidle2',
  timeout: 30000
});
// HTML'den h4 (pharmacy name) ve p (address) çıkar
// Google Maps link'inden koordinat çıkar
// Regex ile parse et
```

**Cache'e yazma:**
```javascript
setCachedData(grouped, allIlceler);
return res.status(200).json({
  ilceler: allIlceler,
  eczaneler: grouped,
  fromCache: false   // ← İlk defa veya force refresh
});
```

**Hata handling (Fallback):**
```javascript
catch (error) {
  const cachedData = getCachedData();
  if (cachedData && cachedData.data) {
    // Scraping başarısız → cache'den ye
    return res.status(200).json({
      ...cachedData,
      warning: 'Live data unavailable'
    });
  }
  // Cache de yok → 500 error
  return res.status(500).json({ error: error.message });
}
```

---

### 3. Frontend: `pages/index.js`

Data fetching ve retry logic.

```javascript
useEffect(() => {
  const fetchData = async (isRetry = false) => {
    const url = isRetry ? '/api/crawl?force=true' : '/api/crawl';

    try {
      const res = await fetch(url);
      const data = await res.json();

      setIlcelerListesi(data.ilceler);
      setEczaneVerisi(data.eczaneler);
      setLoading(false);
    } catch (err) {
      // İlk deneme başarısız → 2 saniye sonra retry
      if (!isRetry) {
        setTimeout(() => fetchData(true), 2000);
      } else {
        // İkinci deneme de başarısız → error göster
        setError('Veri yüklenemiyor...');
      }
    }
  };

  fetchData();  // İlk deneme
}, []);
```

**Retry Stratejisi:**
1. İlk çağrı: `/api/crawl` (normal cache check)
2. Başarısız olursa 2s bekleme
3. İkinci çağrı: `/api/crawl?force=true` (cache bypass)
4. Başarısız olursa hata mesajı göster

---

## 🔧 Vercel Deployment

### Cron Jobs (`vercel.json`)

Cache'i güncel tutmak için otomatik scraping:

```json
{
  "crons": [
    {
      "path": "/api/crawl",
      "schedule": "0 18 * * *"    // Her gün saat 18:00 UTC
    },
    {
      "path": "/api/crawl",
      "schedule": "0 0 * * *"     // Her gün saat 00:00 UTC
    }
  ]
}
```

**Sonuç:** Cache günde 2 kez otomatik güncellenir.

---

## 📊 Performans

| Senaryo | Süre | Detay |
|---------|------|-------|
| **Cache hit (fresh)** | ~16ms | File'dan oku + parse |
| **Cache scrape** | 30-40s | Web scraping (Puppeteer) |
| **API hata + fallback** | <100ms | Cache'den döner |
| **Hızlanma faktörü** | ~2500x | Cache vs. scraping |

---

## 🔄 Değişiklik Yapmak İçin

### Yeni field eklemek (örn: telefon)

**Adım 1:** `pages/api/crawl.js` içinde extract et:
```javascript
// Var olan:
eczaneler.push({
  isim: title,
  adres: adres,
  latitude,
  longitude
});

// Yeni:
eczaneler.push({
  isim: title,
  adres: adres,
  latitude,
  longitude,
  telefon: extractedPhone  // ← yeni field
});
```

**Adım 2:** Cache otomatik yeni field'ı inside alır (dynamic JSON)

**Adım 3:** Frontend'de kullan:
```javascript
// pages/index.js veya component içinde
eczaneler.Ankara.Çankaya[0].telefon  // ← erişim
```

### Cache TTL'i değiştirmek

`lib/cache.js` içinde:
```javascript
const CACHE_TTL = 24 * 60 * 60 * 1000;  // Şu anki: 24 saat

// 12 saate değiştirmek için:
const CACHE_TTL = 12 * 60 * 60 * 1000;  // 12 saat
```

### API kaynağını değiştirmek

`pages/api/crawl.js` içinde:
```javascript
await page.goto('https://www.aeo.org.tr/nobetci-eczaneler', {
  // ↑ Bu URL'i değiştirebilirsiniz
});
```

Yeni URL'de veri yapısı farklıysa, HTML parsing logic'ini (h4, p, regex) güncelle.

### Cron job zamanlarını değiştirmek

`vercel.json` içinde:
```json
"schedule": "0 18 * * *"  // Cron format (UTC)
// 0 18 * * * = Her gün 18:00 UTC
// 0 */6 * * * = Her 6 saatte bir
```

[Cron syntax referans](https://crontab.guru/)

---

## 🐛 Debug

Cache dosyasını kontrol et:
```bash
cat public/eczaneler-cache.json | python3 -m json.tool
```

Cache'i sil ve yeniden oluştur:
```bash
rm public/eczaneler-cache.json
curl http://localhost:3000/api/crawl?force=true
```

---

## Katkıda Bulunmak

Projeye katkıda bulunmak ister misiniz? Harika! 🎉
Başlamadan önce lütfen [CONTRIBUTING.md](./CONTRIBUTING.md) dosyasını okuyun.
Orada, doğru katkıda bulunma adımlarını ve kod düzeni kurallarımızı bulabilirsiniz.
