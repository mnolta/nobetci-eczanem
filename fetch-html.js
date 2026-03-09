const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });
  
  const page = await browser.newPage();
  try {
    await page.goto('https://www.aeo.org.tr/nobetci-eczaneler', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    await new Promise(r => setTimeout(r, 3000));
    
    const content = await page.content();
    fs.writeFileSync('/tmp/eczane-page.html', content);
    
    console.log('HTML kaydedildi: /tmp/eczane-page.html');
    console.log('HTML boyutu:', content.length, 'bytes');
    
    // Hızlı analiz
    const h4Count = (content.match(/<h4/g) || []).length;
    const pCount = (content.match(/<p>/g) || []).length;
    console.log('H4 tags:', h4Count);
    console.log('P tags:', pCount);
    
  } catch (e) {
    console.error('Hata:', e.message);
  } finally {
    await browser.close();
  }
})();
