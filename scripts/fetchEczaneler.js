const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

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

    const res = await fetchWithRetry(url, {
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
    fs.writeFileSync(filePath, JSON.stringify(ilIlceMap, null, 2), 'utf-8');
    console.log(`✅ Veriler ${filePath} dosyasına kaydedildi.`);
  } catch (error) {
    console.error('Veri çekme hatası:', error.message);
    process.exitCode = 1;
  }
}

fetchEczaneler();
