const puppeteer = require('puppeteer');
const path = require('path');

const targetDir = 'C:/Users/Admin/.gemini/antigravity-ide/brain/2a4e2233-7930-482a-a584-35659164e63e/';

async function capture() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#email');
  await page.type('#email', 'patient@test.com');
  await page.type('#password', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await page.goto('http://127.0.0.1:3000/patient', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const outPath = path.join(targetDir, 'patient_portal_fullpage_phase4.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved fullpage screenshot to ${outPath}`);

  await browser.close();
}

capture();
