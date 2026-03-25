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
# Nöbetçi Eczane Bulucu

Bu repo, kullanıcılara Ankara içindeki nöbetçi eczaneleri harita ve liste şeklinde gösterir. Uygulama hem kullanıcı tarafında `/api/crawl` API'sini kullanır hem de repository içine commit edilen statik `public/eczaneler.json` dosyasını okuyarak hata/fallback durumunda hizmet verir.

## Hızlı başlangıç

1. Node paketlerini yükleyin:

```bash
npm install
```

2. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

3. Tarayıcıda açın: http://localhost:3000

Not: `scripts/fetchEczaneler.js` ile yerel olarak `public/eczaneler.json` dosyasını oluşturabilirsiniz (aşağıda nasıl çalıştığı anlatılıyor).

## Değişiklik özeti (yeni)

- Puppeteer tabanlı scraping kaldırıldı (serverless ortamlar için kırılgandı).
- Veriler artık doğrudan sitenin sunduğu HTML parçası üzerinden çekiliyor: `https://www.aeo.org.tr/getPharmacies/<YYYY-MM-DD>`.
- HTML parse işlemi için Cheerio kullanılıyor (server-side, hafif).
- `scripts/fetchEczaneler.js` ile günlük otomatik güncelleme sağlanıyor ve bu script GitHub Actions ile zamanlanarak `public/eczaneler.json` dosyasını güncelliyor.

## Veri kaynağı & parsing

- API endpoint: `https://www.aeo.org.tr/getPharmacies/<YYYY-MM-DD>` → çoğunlukla JSON içinde `html` alanı veya doğrudan HTML fragment döner.
- `pages/api/crawl.js` bu HTML'i Cheerio ile parse eder, `.inline-box` öğelerinden eczane isim, adres, telefon (varsa) ve Google Maps linklerinden koordinatları alır.
- Sonuç, yapılandırılmış bir obje olarak `Ankara` → `ilçe` → [eczaneler] şeklinde döner.

## Cache davranışı

- Cache dosyaları: `public/eczaneler-cache.json` (runtime cache) ve `public/eczaneler.json` (statik snapshot).
- Uygulama `lib/cache.js` içindeki helper'larla cache kontrolü yapar. (Mevcut TTL: 12 saat.)
- `GET /api/crawl` çağrısı:
  - Eğer cache geçerliyse (TTL içinde) cache döner (fromCache: true).
  - Aksi hâlde canlı fetch/parsing yapılır; başarı halinde cache güncellenir ve `fromCache: false` döndürülür.
  - Hata durumunda mevcut cache varsa fallback olarak döner; cache yoksa 500 döner.

## Otomasyon (GitHub Actions)

Bir workflow eklendi: `.github/workflows/update-eczaneler.yml`

- Zamanlama: cron ile günlük iki kez (06:00 ve 16:00 UTC).
- Yapacağı iş: `node scripts/fetchEczaneler.js` çalıştırır, `public/eczaneler.json` değiştiyse commit edip push'lar.

Bu yaklaşım, Vercel'e yapılan deploy'lar aracılığıyla statik JSON'ın güncel kalmasını sağlar (Vercel genelde `main` merge/push'ta deploy eder).

## Nasıl manuel çalıştırılır / test edilir

- Lokal fetch script'i çalıştırıp dosya oluşturmak:

```bash
node scripts/fetchEczaneler.js
# → public/eczaneler.json dosyası oluşturulur/güncellenir
```

- API'yi test etmek (dev server çalışırken):

```bash
curl http://localhost:3000/api/crawl?force=true | jq '.'
```

## PR / Deploy süreci

- Değişiklikler `update/fetch-automation` branch'inde hazırlandı ve bir PR oluşturuldu: https://github.com/mnolta/nobetci-eczanem/pull/4
- PR'ı merge ettiğinizde Vercel otomatik olarak yeni commit'i derleyip deploy edecektir (Vercel ayarlarınıza bağlı olarak). Merge sonrası üretimde `GET /api/crawl` veya site üzerindeki liste güncel olmalıdır.

## Troubleshooting (yaygın sorunlar)

- Eğer `/api/crawl` canlı veriyi alamıyorsa:
  1. `public/eczaneler-cache.json` dosyasını kontrol edin.
  2. Manuel fetch çalıştırın: `node scripts/fetchEczaneler.js`.
  3. Hala sorun varsa, deploy loglarını (Vercel) veya GitHub Actions loglarını kontrol edin.

- Eğer site farklı bir HTML döndürürse, parsing selector'larını `pages/api/crawl.js` ve `scripts/fetchEczaneler.js` içinde güncellemeniz gerekir.

## Geliştirici notları

- `.next/` içeriği working tree'de görünüyorsa localde build sırasında oluşmuştur; bunlar commitleme dışı bırakılmalıdır (varsayılan `.gitignore` zaten `.next/` içerir).
- Workflow şu an sadece zamanlanmış ve manuel (workflow_dispatch) tetiklenir. İsterseniz `on: push` veya `on: pull_request` gibi tetikleyiciler ekleyebilirim.

---

Katkı veya başka bir değişiklik isterseniz bana söyleyin — PR'ı merge edeyim ve deploy sonrası prod doğrulaması yapabilirim.
