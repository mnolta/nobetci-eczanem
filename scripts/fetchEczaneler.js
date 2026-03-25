const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

async function fetchEczaneler() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const url = `https://www.aeo.org.tr/getPharmacies/${today}`;

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/html'
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
