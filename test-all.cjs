const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:8000/');
  await new Promise(r => setTimeout(r, 1000));
  
  const views = ['PROFILE', 'EVENTS', 'ARENA', 'MARKET'];
  
  for (const view of views) {
    console.log(`Navigating to ${view}...`);
    await page.evaluate((v) => {
      window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: v } }));
    }, view);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await browser.close();
  process.exit(0);
})();
