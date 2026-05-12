const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:8000/');
  
  // Wait for the app to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Click on the mercado button in the Navbar
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'MERCADO' } }));
  });
  
  // Wait 2 seconds for the error to appear
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
  process.exit(0);
})();
