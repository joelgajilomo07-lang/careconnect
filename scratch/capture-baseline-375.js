const puppeteer = require('puppeteer')
const path = require('path')

const artifactDir = './screenshots/'
const patientId = 'afb3262b-c15d-46bd-885a-264b4987de01'
const vitalsLogId = 'a9a20134-4af4-4291-ad64-18f928f291c1'

async function captureBaseline() {
  console.log('Starting 375px baseline captures...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const viewport375 = { width: 375, height: 667, isMobile: true, hasTouch: true }

  // Helper to log in and capture
  async function captureForRole(email, password, pages) {
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(60000)
    await page.setViewport(viewport375)

    if (email && password) {
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.type('#email', email)
      await page.type('#password', password)
      await page.click('button[type="submit"]')
      await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 30000 })
      await new Promise(r => setTimeout(r, 1000))
    }

    for (const p of pages) {
      console.log(`Capturing baseline: ${p.url}`)
      await page.goto(`http://localhost:3000${p.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await new Promise(r => setTimeout(r, 2000))
      await page.screenshot({ path: path.join(artifactDir, p.filename), fullPage: true })

      if (p.scrollBottom) {
        console.log(`Capturing scrolled bottom baseline: ${p.url}`)
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await new Promise(r => setTimeout(r, 500))
        await page.screenshot({ path: path.join(artifactDir, p.scrollBottom), fullPage: false })
      }
    }

    await context.close()
  }

  // 3. Doctor Review
  console.log('Capturing doctor review...')
  await captureForRole('doctor@test.com', 'password123', [
    { url: `/review/${vitalsLogId}`, filename: 'baseline_375_doctor_review.png' },
  ])

  // 4. Patient
  console.log('Capturing patient...')
  await captureForRole('patient@test.com', 'password123', [
    { url: '/patient', filename: 'baseline_375_patient.png' },
  ])

  // 5. Family Member
  console.log('Capturing family...')
  await captureForRole('family_member@test.com', 'password123', [
    { url: '/family', filename: 'baseline_375_family.png' },
  ])

  // 6. Admin
  console.log('Capturing admin...')
  await captureForRole('admin@test.com', 'password123', [
    { url: '/admin', filename: 'baseline_375_admin.png' },
    { url: '/admin/invite', filename: 'baseline_375_admin_invite.png' },
    { url: '/care-teams', filename: 'baseline_375_care_teams.png' },
  ])

  await browser.close()
  console.log('All remaining baseline 375px captures complete!')
}

captureBaseline().catch(err => {
  console.error('Error during baseline capture:', err)
  process.exit(1)
})
