const axios = require('axios');
const { getCachedData, isCacheValid, setCachedData } = require('@/lib/cache');

const ANKARA_DISTRICTS = [
  'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Balıseyh', 'Beypazarı', 'Çamlıdere',
  'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül',
  'Haymana', 'Kalecik', 'Karakeçili', 'Keçiören', 'Kızılcahamam', 'Mamak',
  'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Sulakyurt', 'Şereflikoçhisar',
  'Yahşihan', 'Yenimahalle', 'İncek'
];

export default async function handler(req, res) {
  // Check if cache is valid (skip if force refresh requested)
  if (req.query.force !== 'true' && isCacheValid()) {
    const cachedData = getCachedData();
    if (cachedData && cachedData.data && cachedData.ilceler) {
      return res.status(200).json({
        ilceler: cachedData.ilceler,
        eczaneler: cachedData.data,
        fromCache: true
      });
    }
  }

  try {
    // Use the site's HTML endpoint which returns the pharmacy list fragment
    const today = new Date().toISOString().slice(0, 10);
    const apiUrl = `https://www.aeo.org.tr/getPharmacies/${today}`;

    // If a proxy / scraping service is configured via env, route the request through it.
    function buildProxyUrl(originalUrl) {
      const scraperKey = process.env.SCRAPERAPI_KEY;
      const scrapingbeeKey = process.env.SCRAPINGBEE_KEY;
      const proxyUrl = process.env.PROXY_URL;
      if (scraperKey) return `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(originalUrl)}`;
      if (scrapingbeeKey) return `https://app.scrapingbee.com/api/v1?api_key=${scrapingbeeKey}&url=${encodeURIComponent(originalUrl)}&render_js=false`;
      if (proxyUrl) {
        if (proxyUrl.includes('{url}')) return proxyUrl.replace('{url}', encodeURIComponent(originalUrl));
        const sep = proxyUrl.includes('?') ? '&' : '?';
        return `${proxyUrl}${sep}url=${encodeURIComponent(originalUrl)}`;
      }
      return originalUrl;
    }

    const targetUrl = buildProxyUrl(apiUrl);

    // lightweight retry helper
    async function getWithRetry(url, opts = {}, attempts = 3) {
      const delays = [200, 800, 2000];
      for (let i = 0; i < attempts; i++) {
        try {
          return await axios.get(url, opts);
        } catch (err) {
          const code = err && err.response && err.response.status;
          if (code && code >= 400 && code < 500 && code !== 429) throw err;
          if (i < attempts - 1) await new Promise(r => setTimeout(r, delays[i] || 1000));
          else throw err;
        }
      }
    }

    const response = await getWithRetry(targetUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.aeo.org.tr/',
        'Connection': 'keep-alive'
      }
    });

    let html = response.data || '';
    // Some endpoints return JSON { status, html: '<div...>' }
    if (typeof html === 'object' && html.html) {
      html = html.html;
    }
    html = String(html || '');

    // Parse HTML with cheerio
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);

    const grouped = { "Ankara": {} };
    const ilceSet = new Set();

    $('.inline-box').each((i, el) => {
      const name = $(el).attr('data-name') || $(el).find('h4').text().trim();
      const district = $(el).attr('data-district') || 'Diğer';
      const adres = $(el).find('p').first().text().replace(/\n/g, ' ').trim();
      const telefon = $(el).find('p span').first().text().trim() || '';

      // Try to extract coordinates from the first right-side google maps link
      let latitude = 0;
      let longitude = 0;
      const mapLink = $(el).find('.right a[href*="google.com/maps"]').first().attr('href') || '';
      const qMatch = mapLink.match(/query=([\d.\-]+),([\d.\-]+)/);
      if (qMatch) {
        latitude = parseFloat(qMatch[1]) || 0;
        longitude = parseFloat(qMatch[2]) || 0;
      }

      const ilce = district.trim() || 'Diğer';
      ilceSet.add(ilce);

      if (!grouped['Ankara'][ilce]) grouped['Ankara'][ilce] = [];

      grouped['Ankara'][ilce].push({
        isim: name,
        adres: adres,
        telefon: telefon,
        latitude,
        longitude
      });
    });

    const allIlceler = Array.from(ilceSet).sort();

    try {
      setCachedData(grouped, allIlceler);
    } catch (e) {
      console.error('Cache write failed:', e.message);
    }

    return res.status(200).json({ ilceler: allIlceler, eczaneler: grouped, fromCache: false });
  } catch (error) {
    console.error('Error:', error.message);

    // Try to return cached data as fallback
    const cachedData = getCachedData();
    if (cachedData && cachedData.data && cachedData.ilceler) {
      return res.status(200).json({
        ilceler: cachedData.ilceler,
        eczaneler: cachedData.data,
        fromCache: true,
        warning: 'Live data unavailable, serving cached data'
      });
    }

    return res.status(500).json({
      message: 'Nöbetçi eczane verileri şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.',
      error: error.message
    });
  }
}
