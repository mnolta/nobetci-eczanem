const puppeteer = require('puppeteer');

export default async function handler(req, res) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 10000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Sayfaya git
    await page.goto('https://www.aeo.org.tr/nobetci-eczaneler', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Veri yüklenmesi için bekle
    await new Promise(resolve => setTimeout(resolve, 3000));

    // HTML içeriğini al
    const content = await page.content();

    // İlçe listesini option tags'larından çıkar
    const ilceRegex = /<option[^>]*value=['"](.*?)['"][^>]*>(.*?)<\/option>/g;
    const ilceler = [];
    let optionMatch;
    
    while ((optionMatch = ilceRegex.exec(content)) !== null) {
      const value = optionMatch[1].trim();
      const text = optionMatch[2].trim();
      if (value && value !== '-' && text && text !== '-') {
        ilceler.push(text);
      }
    }
    
    // Sadece Ankara ilçelerini tut (Kırıkkale ilçelerini çıkar)
    const ankaraIlceler = [
      'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Balıseyh', 'Beypazarı', 'Çamlıdere',
      'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül',
      'Haymana', 'Kalecik', 'Karakeçili', 'Keçiören', 'Kızılcahamam', 'Mamak',
      'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Sulakyurt', 'Şereflikoçhisar',
      'Yahşihan', 'Yenimahalle', 'İncek'
    ];
    
    const filteredIlceler = ilceler.filter(ilce => ankaraIlceler.includes(ilce));
    const uniqueIlceler = [...new Set(filteredIlceler)].sort();

    // Tüm <h4> ve <p> taglarını bul
    const h4Regex = /<h4[^>]*>([^<]+)<\/h4>/g;
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    
    let h4Match;
    const h4s = [];
    while ((h4Match = h4Regex.exec(content)) !== null) {
      h4s.push({
        title: h4Match[1].trim(),
        index: h4Match.index
      });
    }
    
    const eczaneler = [];
    
    // Her h4 (eczane ismi) için en yakın p (adres) bulma
    h4s.forEach((h4, idx) => {
      // Bir sonraki h4'ün index'ini bul (search range sınırı)
      const nextH4Index = idx + 1 < h4s.length ? h4s[idx + 1].index : content.length;
      
      // Bu h4 ile sonraki h4 arasındaki içerikte p'ler ara
      const searchContent = content.substring(h4.index, nextH4Index);
      const pMatches = [...searchContent.matchAll(pRegex)];
      
      if (pMatches.length > 0) {
        const title = h4.title;
        const adresHtml = pMatches[0][1]; // İlk p
        
        // HTML'i temizle
        const adres = adresHtml.replace(/<[^>]*>/g, '').trim();
        
        // Eczane ismi kontrolü
        if (!title.includes('ECZANE')) {
          return;
        }
        
        // Sadece ANKARA iline ait eczaneleri al
        // Adreslerde "/ ANKARA" pattern'i var eğer Ankara'da ise
        if (!adres.includes('/') || !adres.match(/\/\s*ANKARA/)) {
          return;
        }
        
        // Koordinatları linkten çıkar
        const linkMatch = searchContent.match(/href="([^"]*google\.com\/maps[^"]*)"/);
        let latitude = 0, longitude = 0;
        
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

    console.log(`${eczaneler.length} eczane bulundu`);
    console.log(`${uniqueIlceler.length} ilçe bulundu`);

    // İlçelere göre grupla
    const grouped = { "Ankara": {} };
    const ankaraIlceList = [
      'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Balıseyh', 'Beypazarı', 'Çamlıdere',
      'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül',
      'Haymana', 'Kalecik', 'Karakeçili', 'Keçiören', 'Kızılcahamam', 'Mamak',
      'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Sulakyurt', 'Şereflikoçhisar',
      'Yahşihan', 'Yenimahalle', 'İncek'
    ];
    
    eczaneler.forEach(eczane => {
      let ilce = 'Diğer';
      
      // Adresde "/[İLÇE]/ANKARA" ara - ondan önceki ilçeyi çıkar
      let ankaraMatch = eczane.adres.match(/\/\s*([^\/]+?)\s*(?:\/\s*)?ANKARA/);
      if (ankaraMatch) {
        const candidate = ankaraMatch[1].trim();
        if (ankaraIlceList.includes(candidate)) {
          ilce = candidate;
        }
      }
      
      // Hala "Diğer" ise, listedeki ilçeleri doğrudan ara
      if (ilce === 'Diğer') {
        for (const ilceCandidate of ankaraIlceList) {
          if (eczane.adres.includes(ilceCandidate)) {
            ilce = ilceCandidate;
            break;
          }
        }
      }

      if (!grouped["Ankara"][ilce]) grouped["Ankara"][ilce] = [];
      grouped["Ankara"][ilce].push(eczane);
    });

    // İlçe listesini eczanelerin adlarından da çıkar (sitedekilerle birleştir)
    const ilceFromEczaneler = Object.keys(grouped["Ankara"]);
    const allIlceler = [...new Set([...uniqueIlceler, ...ilceFromEczaneler])].sort();

    // Her zaman tüm veriyi döndür (frontend'de local filtering yapılıyor)
    return res.status(200).json({
      ilceler: allIlceler,
      eczaneler: grouped
    });
  } catch (error) {
    console.error('Puppeteer hatası:', error.message);
    return res.status(500).json({
      message: 'Nöbetçi eczane verileri şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.',
      error: error.message
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Browser kapatma hatası:', e);
      }
    }
  }
}
