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
  
  // İlçe option tags'larını ara
  const optionRegex = /<option[^>]*value=['"](.*?)['"][^>]*>(.*?)<\/option>/g;
  let match;
  let optionsFound = [];
  
  while ((match = optionRegex.exec(content)) !== null) {
    optionsFound.push({
      value: match[1].trim(),
      text: match[2].trim()
    });
  }
  
  console.log('Toplam option tags: ' + optionsFound.length);
  console.log('\nTüm options:');
  optionsFound.forEach((opt, i) => {
    console.log(`${i}: value="${opt.value}" text="${opt.text}"`);
  });
  
  await browser.close();
})();
