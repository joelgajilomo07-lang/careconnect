const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const artifactDir = './screenshots/'

const admin = createClient(supabaseUrl, serviceRoleKey)

async function runVerification() {
  console.log('\n=============================================================')
  console.log('       RUNNING SURVEY PROVISIONING E2E VERIFICATION           ')
  console.log('=============================================================\n')

  // Read links file
  const linksFile = path.resolve(process.cwd(), 'scripts/provisioned-links.txt')
  const content = fs.readFileSync(linksFile, 'utf8')
  
  const sarahMatch = content.match(/Respondent #1: Sarah Jenkins[\s\S]*?Invitation Link : (http:\/\/[^\r\n]+)/)
  const davidMatch = content.match(/Respondent #2: David Thorne[\s\S]*?Invitation Link : (http:\/\/[^\r\n]+)/)

  if (!sarahMatch || !davidMatch) {
    throw new Error('Could not extract invitation links from scripts/provisioned-links.txt')
  }

  const sarahInviteUrl = sarahMatch[1]
  const davidInviteUrl = davidMatch[1]
  console.log('Sarah Invite URL:', sarahInviteUrl)
  console.log('David Invite URL:', davidInviteUrl)

  // 1. Walk Sarah Jenkins (Caregiver) invite link end-to-end via Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  console.log('\n1. Navigating to Sarah Jenkins invitation URL...')
  await page.goto(sarahInviteUrl, { waitUntil: 'networkidle2' })
  console.log('   Arrived at URL:', page.url())

  if (!page.url().includes('/set-password')) {
    throw new Error(`Expected /set-password, but got ${page.url()}`)
  }

  console.log('2. Setting password for Sarah Jenkins (password1234)...')
  await page.type('#password', 'password1234')
  await page.type('#confirmPassword', 'password1234')
  await page.click('button[type="submit"]')

  console.log('   Submitted password form. Waiting for redirect to /log-vitals...')
  await page.waitForFunction(() => window.location.pathname.includes('/log-vitals'), { timeout: 15000 })
  await new Promise(r => setTimeout(r, 2000))

  console.log('   Current URL:', page.url())
  const bodyText = await page.evaluate(() => document.body.innerText)
  
  const hasRobertChen = bodyText.includes('Robert Chen')
  const hasNoAssignedNotice = bodyText.includes('No Assigned Patients')
  console.log(`   Shows assigned patient "Robert Chen": ${hasRobertChen ? 'YES' : 'NO'}`)
  console.log(`   Shows empty state "No Assigned Patients": ${hasNoAssignedNotice ? 'YES (FAILURE)' : 'NO (CORRECT)'}`)

  await page.screenshot({ path: artifactDir + 'survey_caregiver_dashboard.png', fullPage: true })
  console.log('   Saved survey_caregiver_dashboard.png')

  // Navigate to history page to verify populated vitals and chart rendering
  console.log('3. Navigating to /history to verify populated vitals history & charts...')
  await page.goto('http://localhost:3000/history', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 2000))
  
  const historyText = await page.evaluate(() => document.body.innerText)
  const hasMeasurementHistory = historyText.includes('Measurement History')
  const hasEmptyHistory = historyText.includes('No Vitals Logs Recorded')
  console.log(`   Shows "Measurement History": ${hasMeasurementHistory ? 'YES' : 'NO'}`)
  console.log(`   Shows "No Vitals Logs Recorded": ${hasEmptyHistory ? 'YES (FAILURE)' : 'NO (CORRECT)'}`)

  await page.screenshot({ path: artifactDir + 'survey_caregiver_history.png', fullPage: true })
  console.log('   Saved survey_caregiver_history.png')

  await context.close()

  // 2. Set David Thorne's password too via browser so we can test authenticated RLS for both
  console.log('\n4. Navigating to David Thorne (Family Member) invitation URL...')
  const context2 = await browser.createBrowserContext()
  const page2 = await context2.newPage()
  await page2.setViewport({ width: 1440, height: 900 })

  await page2.goto(davidInviteUrl, { waitUntil: 'networkidle2' })
  console.log('   Arrived at URL:', page2.url())
  await page2.type('#password', 'password1234')
  await page2.type('#confirmPassword', 'password1234')
  await page2.click('button[type="submit"]')

  console.log('   Submitted password for David. Waiting for redirect to /family...')
  await page2.waitForFunction(() => window.location.pathname.includes('/family'), { timeout: 15000 })
  await new Promise(r => setTimeout(r, 2000))

  console.log('   Current URL:', page2.url())
  const familyBodyText = await page2.evaluate(() => document.body.innerText)
  const hasMargaretHolloway = familyBodyText.includes('Margaret Holloway')
  console.log(`   Shows assigned family patient "Margaret Holloway": ${hasMargaretHolloway ? 'YES' : 'NO'}`)

  await page2.screenshot({ path: artifactDir + 'survey_family_dashboard.png', fullPage: true })
  console.log('   Saved survey_family_dashboard.png')

  await context2.close()
  await browser.close()

  // 3. Verify Row-Level Security (RLS) Isolation between Respondent A and Respondent B
  console.log('\n5. Verifying Row-Level Security (RLS) Data Isolation between Respondents...')

  // Retrieve patient IDs for Robert Chen and Margaret Holloway from admin client
  const { data: robertUser } = await admin.from('users').select('id').eq('full_name', 'Robert Chen').single()
  const { data: margaretUser } = await admin.from('users').select('id').eq('full_name', 'Margaret Holloway').single()

  const robertPatientId = robertUser.id
  const margaretPatientId = margaretUser.id

  console.log(`   Robert Chen (Sarah's Patient) ID    : ${robertPatientId}`)
  console.log(`   Margaret Holloway (David's Patient) ID: ${margaretPatientId}`)

  // Authenticate as Sarah Jenkins (Caregiver) using standard anon key + client login
  const sarahClient = createClient(supabaseUrl, anonKey)
  const { error: sarahLoginErr } = await sarahClient.auth.signInWithPassword({
    email: 'sarah.caregiver@example.com',
    password: 'password1234'
  })
  if (sarahLoginErr) throw sarahLoginErr

  // Authenticate as David Thorne (Family Member)
  const davidClient = createClient(supabaseUrl, anonKey)
  const { error: davidLoginErr } = await davidClient.auth.signInWithPassword({
    email: 'david.family@example.com',
    password: 'password1234'
  })
  if (davidLoginErr) throw davidLoginErr

  // A) Test Sarah's access:
  const { data: sarahOwnLogs } = await sarahClient.from('vitals_logs').select('id').eq('patient_id', robertPatientId)
  const { data: sarahCrossLogs } = await sarahClient.from('vitals_logs').select('id').eq('patient_id', margaretPatientId)
  const { data: sarahOwnProfile } = await sarahClient.from('patient_profiles').select('user_id').eq('user_id', robertPatientId)
  const { data: sarahCrossProfile } = await sarahClient.from('patient_profiles').select('user_id').eq('user_id', margaretPatientId)

  console.log(`\n   [Sarah Jenkins (Caregiver) Query Results]:`)
  console.log(`   - Query own patient (Robert Chen) vitals: ${sarahOwnLogs?.length || 0} logs returned (PASS: > 0)`)
  console.log(`   - Query cross-tenant (Margaret Holloway) vitals: ${sarahCrossLogs?.length || 0} logs returned (PASS: 0, RLS BLOCKED)`)
  console.log(`   - Query own patient profile: ${sarahOwnProfile?.length || 0} row returned (PASS: 1)`)
  console.log(`   - Query cross-tenant patient profile: ${sarahCrossProfile?.length || 0} row returned (PASS: 0, RLS BLOCKED)`)

  // B) Test David's access:
  const { data: davidOwnLogs } = await davidClient.from('vitals_logs').select('id').eq('patient_id', margaretPatientId)
  const { data: davidCrossLogs } = await davidClient.from('vitals_logs').select('id').eq('patient_id', robertPatientId)
  const { data: davidOwnProfile } = await davidClient.from('patient_profiles').select('user_id').eq('user_id', margaretPatientId)
  const { data: davidCrossProfile } = await davidClient.from('patient_profiles').select('user_id').eq('user_id', robertPatientId)

  console.log(`\n   [David Thorne (Family Member) Query Results]:`)
  console.log(`   - Query own patient (Margaret Holloway) vitals: ${davidOwnLogs?.length || 0} logs returned (PASS: > 0)`)
  console.log(`   - Query cross-tenant (Robert Chen) vitals: ${davidCrossLogs?.length || 0} logs returned (PASS: 0, RLS BLOCKED)`)
  console.log(`   - Query own patient profile: ${davidOwnProfile?.length || 0} row returned (PASS: 1)`)
  console.log(`   - Query cross-tenant patient profile: ${davidCrossProfile?.length || 0} row returned (PASS: 0, RLS BLOCKED)`)

  const isolationVerified = 
    (sarahOwnLogs?.length > 0) &&
    (sarahCrossLogs?.length === 0) &&
    (sarahCrossProfile?.length === 0) &&
    (davidOwnLogs?.length > 0) &&
    (davidCrossLogs?.length === 0) &&
    (davidCrossProfile?.length === 0)

  console.log(`\n   RLS Isolation Integrity Check: ${isolationVerified ? '✅ PERFECT 100% ISOLATION' : '❌ ISOLATION LEAK'}`)

  console.log('\n=============================================================')
  console.log('          ALL E2E AND RLS VERIFICATIONS COMPLETED             ')
  console.log('=============================================================\n')
}

runVerification().catch(err => {
  console.error('Verification error:', err)
  process.exit(1)
})
