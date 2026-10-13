const puppeteer = require('puppeteer-core');

async function testLaunch() {
  try {
    console.log('Attempting to launch Chrome...');
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Chrome launched successfully!');
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    console.log('Page title:', await page.title());
    await page.screenshot({ path: 'manuscript_screenshots/fig08_login_page.png' });
    console.log('Screenshot saved to manuscript_screenshots/fig08_login_page.png');
    await browser.close();
    console.log('SUCCESS!');
  } catch (err) {
    console.error('Launch error:', err);
  }
}

testLaunch();
