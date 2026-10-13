const puppeteer = require('puppeteer');
const path = require('path');

const targetDir = 'C:/Users/Admin/.gemini/antigravity-ide/brain/2a4e2233-7930-482a-a584-35659164e63e/';

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  async function loginAndCapture(email, password, targetUrl, outputFile) {
    console.log(`Starting capture for ${email} -> ${targetUrl}`);
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email');
    await page.type('#email', email);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    
    if (!page.url().includes(targetUrl)) {
      await page.goto(`http://127.0.0.1:3000${targetUrl}`, { waitUntil: 'networkidle2' });
    }

    await new Promise((r) => setTimeout(r, 2000));

    const outPath = path.join(targetDir, outputFile);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot to ${outPath}`);
    await page.close();
    await context.close();
  }

  try {
    await loginAndCapture('doctor@test.com', 'password123', '/triage', 'doctor_triage_dashboard_phase4.png');
    await loginAndCapture('patient@test.com', 'password123', '/patient', 'patient_portal_dashboard_phase4.png');
  } catch (err) {
    console.error('Error in capture:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

capture();
