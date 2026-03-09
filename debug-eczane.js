const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });
  
  const page = await browser.newPage();
  await page.goto('https://www.aeo.org.tr/nobetci-eczaneler', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  await new Promise(r => setTimeout(r, 3000));
  
  const content = await page.content();
  
  // <h4> taglarının sayısı
  const h4Matches = content.match(/<h4[^>]*>/g);
  console.log('Toplam <h4> tag sayısı:', h4Matches ? h4Matches.length : 0);
  
  // 'ECZANE' içeren h4'lerin sayısı
  const h4s = [...content.matchAll(/<h4[^>]*>([^<]+)<\/h4>/g)];
  const eczaneH4s = h4s.filter(m => m[1].includes('ECZANE'));
  console.log('ECZANE içeren <h4> sayısı:', eczaneH4s.length);
  
  // 'ANKARA' içeren <p>'lerin sayısı
  const ps = [...content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)];
  const ankaraPs = ps.filter(m => m[1].includes('ANKARA'));
  console.log('ANKARA içeren <p> sayısı:', ankaraPs.length);
  
  // Regex kombinasyonu
  const eczaneRegex = /<h4[^>]*>([^<]+)<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
  const regex_matches = [...content.matchAll(eczaneRegex)];
  console.log('Regex ile bulunan <h4>+<p> kombinasyonu:', regex_matches.length);
  
  const filtered = regex_matches.filter(m => m[1].includes('ECZANE') && m[2].includes('ANKARA'));
  console.log('ECZANE + ANKARA filtresiyle:', filtered.length);
  
  // İlçeleri sayıyalım
  const ilceMap = {};
  filtered.forEach(m => {
    const ilceMatch = m[2].match(/\/ ([^\/]+)\/ ANKARA/);
    const ilce = ilceMatch ? ilceMatch[1].trim() : 'Diğer';
    ilceMap[ilce] = (ilceMap[ilce] || 0) + 1;
  });
  
  console.log('\nİlçe dağılımı:');
  Object.entries(ilceMap).sort((a,b) => b[1] - a[1]).forEach(([ilce, count]) => {
    console.log(`  ${ilce}: ${count}`);
  });
  
  // Örnek: ilçe çıkaramadığı birkaç eczaneyi göster
  console.log('\nİlçe çıkaramadığı eczaneler:');
  filtered.forEach((m, i) => {
    const ilceMatch = m[2].match(/\/ ([^\/]+)\/ ANKARA/);
    if (!ilceMatch) {
      console.log(`${i}: ${m[1].substring(0, 30)}... adres: ${m[2].substring(0, 80)}...`);
    }
  });
  
  await browser.close();
})();
