const puppeteer = require('puppeteer');

async function testPuppeteerNav() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  
  const testUser = async (email, expectedUrl) => {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.type('#email', email);
    await page.type('#password', 'password123');
    await page.click('button[type="submit"]');
    
    console.log(`Submitted for ${email}, waiting for navigation...`);
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    } catch (e) {
      console.log(`Navigation wait timed out for ${email}`);
    }
    console.log(`Current URL for ${email}: ${page.url()}`);
    
    if (expectedUrl && !page.url().includes(expectedUrl)) {
      console.log(`Navigating to ${expectedUrl}...`);
      await page.goto(`http://127.0.0.1:3000${expectedUrl}`, { waitUntil: 'networkidle2' });
      console.log(`After explicit nav URL for ${email}: ${page.url()}`);
    }
    
    await page.screenshot({ path: `./screenshots/test_${email.split('@')[0]}.png` });
    await context.close();
  };

  await testUser('caregiver@test.com', '/log-vitals');
  await testUser('doctor@test.com', '/triage');
  await testUser('patient@test.com', '/patient');
  await testUser('family_member@test.com', '/family');
  await testUser('caregiver@test.com', '/history');

  await browser.close();
}

testPuppeteerNav();
