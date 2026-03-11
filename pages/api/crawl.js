const puppeteer = require('puppeteer');
const { getCachedData, isCacheValid, setCachedData } = require('@/lib/cache');

const ANKARA_DISTRICTS = [
  'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Balıseyh', 'Beypazarı', 'Çamlıdere',
  'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül',
  'Haymana', 'Kalecik', 'Karakeçili', 'Keçiören', 'Kızılcahamam', 'Mamak',
  'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Sulakyurt', 'Şereflikoçhisar',
  'Yahşihan', 'Yenimahalle', 'İncek'
];

export default async function handler(req, res) {
  let browser;

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
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 10000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to page
    await page.goto('https://www.aeo.org.tr/nobetci-eczaneler', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    const content = await page.content();

    // Extract district list from option tags
    const ilceRegex = /<option[^>]*value=['"](.*?)['"][^>]*>(.*?)<\/option>/g;
    const ilceler = [];
    let match;

    while ((match = ilceRegex.exec(content)) !== null) {
      const value = match[1].trim();
      const text = match[2].trim();
      if (value && value !== '-' && text && text !== '-') {
        ilceler.push(text);
      }
    }

    const filteredIlceler = ilceler.filter(ilce => ANKARA_DISTRICTS.includes(ilce));
    const uniqueIlceler = [...new Set(filteredIlceler)].sort();

    // Extract pharmacies from HTML
    const h4Regex = /<h4[^>]*>([^<]+)<\/h4>/g;
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;

    const h4s = [];
    let h4Match;
    while ((h4Match = h4Regex.exec(content)) !== null) {
      h4s.push({
        title: h4Match[1].trim(),
        index: h4Match.index
      });
    }

    const eczaneler = [];

    h4s.forEach((h4, idx) => {
      const nextH4Index = idx + 1 < h4s.length ? h4s[idx + 1].index : content.length;
      const searchContent = content.substring(h4.index, nextH4Index);
      const pMatches = [...searchContent.matchAll(pRegex)];

      if (pMatches.length > 0) {
        const title = h4.title;
        const adresHtml = pMatches[0][1];
        const adres = adresHtml.replace(/<[^>]*>/g, '').trim();

        // Validate pharmacy name and address
        if (!title.includes('ECZANE') || !adres.match(/\/\s*ANKARA/)) {
          return;
        }

        // Extract coordinates from Google Maps link
        const linkMatch = searchContent.match(/href="([^"]*google\.com\/maps[^"]*)"/);
        let latitude = 0;
        let longitude = 0;

        if (linkMatch) {
          const queryMatch = linkMatch[1].match(/query=([\d.]+),([\d.]+)/);
          if (queryMatch) {
            latitude = parseFloat(queryMatch[1]);
            longitude = parseFloat(queryMatch[2]);
          }
        }

        eczaneler.push({
          isim: title,
          adres: adres,
          latitude,
          longitude
        });
      }
    });

    // Group pharmacies by district
    const grouped = { "Ankara": {} };

    eczaneler.forEach(eczane => {
      let ilce = 'Diğer';

      // Try to extract district from address
      const ankaraMatch = eczane.adres.match(/\/\s*([^\/]+?)\s*(?:\/\s*)?ANKARA/);
      if (ankaraMatch) {
        const candidate = ankaraMatch[1].trim();
        if (ANKARA_DISTRICTS.includes(candidate)) {
          ilce = candidate;
        }
      }

      // If not found, search for district name in address
      if (ilce === 'Diğer') {
        for (const ilceCandidate of ANKARA_DISTRICTS) {
          if (eczane.adres.includes(ilceCandidate)) {
            ilce = ilceCandidate;
            break;
          }
        }
      }

      if (!grouped["Ankara"][ilce]) grouped["Ankara"][ilce] = [];
      grouped["Ankara"][ilce].push(eczane);
    });

    // Combine districts from options and extracted data
    const ilceFromEczaneler = Object.keys(grouped["Ankara"]);
    const allIlceler = [...new Set([...uniqueIlceler, ...ilceFromEczaneler])].sort();

    // Save to cache
    setCachedData(grouped, allIlceler);

    return res.status(200).json({
      ilceler: allIlceler,
      eczaneler: grouped,
      fromCache: false
    });
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
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e.message);
      }
    }
  }
}
