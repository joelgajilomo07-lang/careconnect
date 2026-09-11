const puppeteer = require('puppeteer')
const path = require('path')

const artifactDir = './screenshots/'
const patientId = 'afb3262b-c15d-46bd-885a-264b4987de01'
const vitalsLogId = 'a9a20134-4af4-4291-ad64-18f928f291c1'

const viewports = [
  { name: '375', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: '390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: '768', width: 768, height: 1024, isMobile: false, hasTouch: false },
]

const testRoles = [
  {
    roleName: 'unauth',
    email: null,
    password: null,
    pages: [
      { name: 'login', path: '/login' },
    ],
  },
  {
    roleName: 'caregiver',
    email: 'caregiver@test.com',
    password: 'password123',
    pages: [
      { name: 'log_vitals', path: '/log-vitals' },
      { name: 'history', path: '/history', testScroll: true },
      { name: 'set_password', path: '/set-password' },
    ],
  },
  {
    roleName: 'doctor',
    email: 'doctor@test.com',
    password: 'password123',
    pages: [
      { name: 'triage', path: '/triage' },
      { name: 'doctor_patient', path: `/patients/${patientId}` },
      { name: 'doctor_review', path: `/review/${vitalsLogId}` },
    ],
  },
  {
    roleName: 'patient',
    email: 'patient@test.com',
    password: 'password123',
    pages: [
      { name: 'patient', path: '/patient', testScroll: true },
    ],
  },
  {
    roleName: 'family',
    email: 'family_member@test.com',
    password: 'password123',
    pages: [
      { name: 'family', path: '/family', testScroll: true },
    ],
  },
  {
    roleName: 'admin',
    email: 'admin@test.com',
    password: 'password123',
    pages: [
      { name: 'admin', path: '/admin' },
      { name: 'admin_invite', path: '/admin/invite' },
      { name: 'care_teams', path: '/care-teams' },
    ],
  },
]

async function runAudit() {
  console.log('Starting Mobile Audit Suite...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const results = {
    overflowChecks: [],
    touchTargetChecks: [],
    bottomScrollChecks: [],
    screenshotsCaptured: [],
  }

  for (const vp of viewports) {
    console.log(`\n================ Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ================`)

    for (const role of testRoles) {
      console.log(`\n--- Testing Role: ${role.roleName} at ${vp.name}px ---`)
      const context = await browser.createBrowserContext()
      const page = await context.newPage()
      page.setDefaultNavigationTimeout(60000)
      page.setDefaultTimeout(60000)
      await page.setViewport(vp)

      // Sign in if credentials provided
      if (role.email && role.password) {
        await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
        await page.type('#email', role.email)
        await page.type('#password', role.password)
        await page.click('button[type="submit"]')
        await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 30000, polling: 100 })
        await new Promise(r => setTimeout(r, 1000))
      }

      for (const p of role.pages) {
        console.log(`Visiting: ${p.path} [${p.name}]`)
        await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'domcontentloaded' })
        await new Promise(r => setTimeout(r, 1500))

        // 1. Check horizontal page overflow
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            innerWidth: window.innerWidth,
            hasSidewaysScroll: doc.scrollWidth > window.innerWidth,
          }
        })

        const overflowPass = !overflow.hasSidewaysScroll
        results.overflowChecks.push({
          viewport: vp.name,
          page: p.name,
          path: p.path,
          pass: overflowPass,
          details: overflow,
        })
        console.log(`  Horizontal Overflow: ${overflowPass ? 'PASS (scrollWidth <= innerWidth)' : 'FAIL: ' + overflow.scrollWidth + ' > ' + overflow.innerWidth}`)

        // 2. Measure touch targets on key interactive elements
        const touchTargets = await page.evaluate(() => {
          const elements = []
          // Check buttons, links with role/action, bell, sign out
          const candidates = Array.from(document.querySelectorAll('button, nav a, header a, form button, .cursor-pointer'))
          for (const el of candidates) {
            const rect = el.getBoundingClientRect()
            const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none'
            if (isVisible) {
              elements.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().substring(0, 30),
                ariaLabel: el.getAttribute('aria-label') || '',
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              })
            }
          }
          return elements
        })

        // Check specifically key controls: Sign Out, Bell, Bottom nav items, Selector buttons
        const keyControls = touchTargets.filter(t => 
          t.text.includes('Sign Out') || 
          t.ariaLabel.includes('Notifications') || 
          t.text.includes('Log Vitals') || 
          t.text.includes('History') || 
          t.text.includes('Triage') ||
          t.text.includes('Review') ||
          t.text.includes('Needs Review') ||
          t.text.includes('Flagged') ||
          t.text.includes('Submit')
        )

        results.touchTargetChecks.push({
          viewport: vp.name,
          page: p.name,
          controlsCount: keyControls.length,
          controls: keyControls,
        })

        // 3. Capture Full-Page Screenshot
        const fullPageFilename = `after_${vp.name}_${p.name}.png`
        const fullPagePath = path.join(artifactDir, fullPageFilename)
        await page.screenshot({ path: fullPagePath, fullPage: true })
        results.screenshotsCaptured.push(fullPageFilename)
        console.log(`  Captured full page screenshot: ${fullPageFilename}`)

        // 4. Test bottom scrolling visibility if requested (specifically at 375px)
        if (p.testScroll && vp.name === '375') {
          console.log(`  Testing scrolled-to-bottom visibility for ${p.name}...`)
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await new Promise(r => setTimeout(r, 800))

          // Evaluate bottom clearance
          const scrollEval = await page.evaluate(() => {
            const bottomBar = document.querySelector('nav[aria-label="Mobile Navigation"]')
            const bottomBarRect = bottomBar ? bottomBar.getBoundingClientRect() : null
            
            // Check last content element
            const main = document.querySelector('main')
            const lastChild = main ? main.lastElementChild : null
            const lastRect = lastChild ? lastChild.getBoundingClientRect() : null

            return {
              windowHeight: window.innerHeight,
              bottomBarTop: bottomBarRect ? Math.round(bottomBarRect.top) : null,
              bottomBarHeight: bottomBarRect ? Math.round(bottomBarRect.height) : null,
              lastChildBottom: lastRect ? Math.round(lastRect.bottom) : null,
              hasClearance: bottomBarRect && lastRect ? lastRect.bottom <= bottomBarRect.top : true,
            }
          })

          results.bottomScrollChecks.push({
            page: p.name,
            viewport: vp.name,
            evaluation: scrollEval,
          })

          const scrolledFilename = `after_375_${p.name}_scrolled_bottom.png`
          await page.screenshot({ path: path.join(artifactDir, scrolledFilename), fullPage: false })
          results.screenshotsCaptured.push(scrolledFilename)
          console.log(`  Captured scrolled bottom screenshot: ${scrolledFilename} (Clearance: ${scrollEval.hasClearance ? 'YES' : 'NO'})`)
        }
      }

      await context.close()
    }
  }

  await browser.close()
  console.log('\n================ AUDIT SUMMARY ================')
  console.log(`Total Screenshots Captured: ${results.screenshotsCaptured.length}`)
  
  const overflowFailures = results.overflowChecks.filter(c => !c.pass)
  console.log(`Horizontal Overflow Assertions: ${results.overflowChecks.length} checked, ${overflowFailures.length} failed`)
  if (overflowFailures.length > 0) {
    console.error('Overflow Failures:', overflowFailures)
  }

  console.log(`Bottom Scroll Checks: ${results.bottomScrollChecks.length} checked`)
  for (const b of results.bottomScrollChecks) {
    console.log(`  Page ${b.page}: bottom clearance = ${b.evaluation.hasClearance} (Last item bottom: ${b.evaluation.lastChildBottom}px, Bottom bar top: ${b.evaluation.bottomBarTop}px)`)
  }

  console.log('Audit completed successfully.')
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err)
  process.exit(1)
})
