const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');

async function fetchWithRetry(url, opts = {}, attempts = 3) {
  const delays = [200, 800, 2000];
  for (let i = 0; i < attempts; i++) {
    try {
      return await axios.get(url, opts);
    } catch (err) {
      const code = err && err.response && err.response.status;
      // For 4xx (except 429) don't retry
      if (code && code >= 400 && code < 500 && code !== 429) throw err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delays[i] || 1000));
      else throw err;
    }
  }
}

async function fetchEczaneler() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const url = `https://www.aeo.org.tr/getPharmacies/${today}`;

    // Build proxy-aware target URL if environment variables are provided.
    function buildProxyUrl(originalUrl) {
      const scraperKey = process.env.SCRAPERAPI_KEY;
      const scrapingbeeKey = process.env.SCRAPINGBEE_KEY;
      const proxyUrl = process.env.PROXY_URL; // custom proxy endpoint

      if (scraperKey) {
        return `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(originalUrl)}`;
      }
      if (scrapingbeeKey) {
        return `https://app.scrapingbee.com/api/v1?api_key=${scrapingbeeKey}&url=${encodeURIComponent(originalUrl)}&render_js=false`;
      }
      if (proxyUrl) {
        if (proxyUrl.includes('{url}')) return proxyUrl.replace('{url}', encodeURIComponent(originalUrl));
        const sep = proxyUrl.includes('?') ? '&' : '?';
        return `${proxyUrl}${sep}url=${encodeURIComponent(originalUrl)}`;
      }
      return originalUrl;
    }

    const targetUrl = buildProxyUrl(url);

    const res = await fetchWithRetry(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.aeo.org.tr/',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });

    let body = res.data;
    // Some responses are JSON with { status, html }
    if (typeof body === 'object' && body.html) {
      body = body.html;
    }

    const $ = cheerio.load(String(body || ''));

    const ilIlceMap = { Ankara: {} };

    $('.inline-box').each((i, el) => {
      const name = $(el).attr('data-name') || $(el).find('h4').text().trim();
      const ilce = $(el).attr('data-district') || 'Diğer';
      const adres = $(el).find('p').first().text().replace(/\n/g, ' ').trim();
      const telefon = $(el).find('p span').first().text().trim() || '';

      // Coordinates from google maps link if present
      let latitude = null;
      let longitude = null;
      const mapLink = $(el).find('.right a[href*="google.com/maps"]').first().attr('href') || '';
      const q = mapLink.match(/query=([\d.\-]+),([\d.\-]+)/);
      if (q) {
        latitude = parseFloat(q[1]);
        longitude = parseFloat(q[2]);
      }

      if (!ilIlceMap.Ankara[ilce]) ilIlceMap.Ankara[ilce] = [];

      ilIlceMap.Ankara[ilce].push({
        isim: name,
        adres,
        telefon,
        latitude,
        longitude
      });
    });

    // Dosya yolu
    const filePath = path.join(__dirname, '..', 'public', 'eczaneler.json');

    // JSON dosyasına kaydet
    const jsonString = JSON.stringify(ilIlceMap, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf-8');

    // metadata: timestamp + checksum
    const checksum = 'sha256:' + crypto.createHash('sha256').update(jsonString).digest('hex');
    const meta = {
      generatedAt: new Date().toISOString(),
      source: url,
      fetchedVia: targetUrl === url ? 'direct' : (process.env.SCRAPERAPI_KEY ? 'scraperapi' : process.env.SCRAPINGBEE_KEY ? 'scrapingbee' : 'proxy'),
      checksum
    };
    const metaPath = path.join(__dirname, '..', 'public', 'eczaneler-meta.json');
    try {
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Meta yazılamadı:', e.message);
    }

    console.log(`✅ Veriler ${filePath} dosyasına kaydedildi. (meta: ${meta.generatedAt}, ${meta.checksum})`);
  } catch (error) {
    console.error('Veri çekme hatası:', error.message);
    process.exitCode = 1;
  }
}

fetchEczaneler();
