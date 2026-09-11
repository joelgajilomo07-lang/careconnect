const puppeteer = require('puppeteer');

async function captureScreenshots() {
  console.log('Starting screenshot generation...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const artifactDir = './screenshots/';

  const takeScreenshot = async (email, password, urlPath, filename) => {
    console.log(`Starting isolated context for ${email} -> ${urlPath}...`);
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    // Login
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#email');
    await page.type('#email', email);
    await page.type('#password', password);
    await page.click('button[type="submit"]');
    
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    } catch (e) {
      console.log(`Navigation wait timed out for ${email}`);
    }

    if (urlPath && !page.url().includes(urlPath)) {
      console.log(`Navigating explicitly to http://127.0.0.1:3000${urlPath}...`);
      await page.goto(`http://127.0.0.1:3000${urlPath}`, { waitUntil: 'networkidle2' });
    }

    // Give charts/data extra time to render
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: artifactDir + filename, fullPage: true });
    console.log(`Successfully saved ${filename} (${page.url()})`);
    
    await page.close();
    await context.close();
  };

  try {
    await takeScreenshot('caregiver@test.com', 'password123', '/log-vitals', 'log_vitals_screenshot.png');
    await takeScreenshot('doctor@test.com', 'password123', '/triage', 'triage_screenshot.png');
    await takeScreenshot('patient@test.com', 'password123', '/patient', 'patient_screenshot.png');
    await takeScreenshot('family_member@test.com', 'password123', '/family', 'family_screenshot.png');
    await takeScreenshot('caregiver@test.com', 'password123', '/history', 'history_screenshot.png');
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
    console.log('Finished capturing all screenshots.');
  }
}

captureScreenshots();
