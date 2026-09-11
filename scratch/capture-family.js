const puppeteer = require('puppeteer')

async function captureFamily() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // Log in as David Thorne
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' })
  await page.type('#email', 'david.family@example.com')
  await page.type('#password', 'password1234')
  await page.click('button[type="submit"]')

  await page.waitForFunction(() => window.location.pathname.includes('/family'), { timeout: 15000 })
  console.log('Arrived at:', page.url())

  // Wait for the patient header to render
  await page.waitForFunction(() => document.body.innerText.includes('Margaret Holloway'), { timeout: 15000 })
  console.log('Found Margaret Holloway on page!')

  await page.screenshot({ path: './screenshots/survey_family_dashboard.png', fullPage: true })
  console.log('Updated survey_family_dashboard.png')

  await browser.close()
}

captureFamily().catch(console.error)
