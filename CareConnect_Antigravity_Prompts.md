# CareConnect – Antigravity Prompts for the Screenshot Figures (Figures 8 to 23)

These prompts make the CareConnect system match the screens described in **Chapter IV – System User Interface** of the manuscript, so the screenshots you insert agree with the text.

**How to use**

1. Open your CareConnect project in Antigravity.
2. Run **Prompt 0** first. It sets up what every screen depends on: the five roles, permissions, patient-account linking, notifications, audit logging and demo data.
3. Then run the prompts for Figures 8 to 23 one at a time, in order. Test each one in the browser before going to the next.
4. Run the **final prompt** to capture all the screenshots, then paste each image into its matching box in the manuscript.
5. If the agent reports that something works differently from what's described, tell Claude so the manuscript text can be adjusted to match the system.

Each prompt is self-contained, so you can paste it into a fresh agent session.

---

## Prompt 0 – Foundation: five roles, access rules, demo data

```text
You are working on CareConnect, a web-based caregiver reporting and patient monitoring system for Tender Touch Home Care Services (a home care agency in Dumaguete City). Before writing code, inspect this repository and identify the framework, database, auth system, folder structure, and UI styling already in use. Follow those existing conventions. Do not switch frameworks, rewrite working features, or delete existing data.

GOAL: make sure the system has exactly five user roles with correct role-based access.

ROLES
1. Administrator – manages user accounts, patient profiles, care assignments, audit logs, reports.
2. Caregiver – sees only assigned patients; submits shift reports, vital signs, medication administration, urgent updates.
3. Doctor – sees only assigned patients; reviews reports, writes care notes, manages medication schedules, schedules follow-up care, sets vital-sign thresholds.
4. Family Member – READ-ONLY view of the patient(s) they are linked to; can send messages to that patient's care team.
5. Patient – READ-ONLY view of THEIR OWN record only; can send messages to their own care team. Same functions and layout as the Family Member, but always scoped to the logged-in patient's own record.

DATA MODEL (create or adjust only what is missing; keep existing names if equivalent tables already exist)
- users: id, full_name, email (unique), password (hashed), role (administrator | caregiver | doctor | family_member | patient), status (active | inactive), failed_login_attempts, locked_until, timestamps.
- patients: id, full_name, birth_date, sex, address, diagnosis, medical_history, allergies, emergency_contact_name, emergency_contact_phone, user_id (nullable, UNIQUE, references users.id; this is the patient's own login account, a 1:1 "HAS ACCOUNT" link), timestamps.
- care_assignments: id, patient_id, user_id, assigned_role (caregiver | doctor | family_member), start_date. A patient can have many caregivers, one primary doctor, and many family members.
- shift_reports, vital_signs, medications, medication_logs, care_notes, appointments, vital_sign_thresholds, notifications, messages, audit_logs (create these if missing; later prompts add their columns).

ACCESS RULES (enforce on the server, not only by hiding buttons)
- Every route and every query is checked against the user's role.
- Caregivers and doctors can only open patients they are assigned to in care_assignments.
- Family members can only open patients they are linked to as family_member.
- Patients can only open the patient record where patients.user_id = their own user id. Any attempt to open another patient's ID returns 403.
- Patients and family members can never create, edit or delete clinical data (reports, vitals, medications, notes, appointments).
- After login, redirect each role to its own dashboard: /admin, /caregiver, /doctor, /family, /patient (or the equivalent in the existing routing).
- Navigation menus show only the pages the role can use.

SHARED SERVICES (create if missing)
- Notification service: create_notification(user, type, priority [high|normal], title, message, link). Used by later prompts for abnormal vital signs, missed doses, urgent updates and appointment reminders. Also send e-mail for high-priority notifications if mail is configured.
- Audit logging: record login, logout, failed login, create/update/delete on patients, users, reports, vitals, medications, notes and appointments, with user, action, record type, record id, IP address and timestamp.

DEMO DATA (seeder, FICTITIOUS ONLY – no real patient information, per the Data Privacy Act RA 10173)
- 1 administrator, 3 caregivers, 2 doctors, 3 family members, 3 patients who have their own login accounts, plus 2 patients without accounts.
- Link every patient to caregivers, a doctor and at least one family member.
- 14 days of shift reports and vital signs per patient, including a few readings outside normal ranges so alerts and charts have something to show.
- Medications with schedules, a mix of Given/Missed/Refused logs, and upcoming appointments.
- Print the demo login credentials for each role at the end of the seeder output.

ACCEPTANCE CHECK
- Log in as each of the five roles and confirm each lands on its own dashboard with the correct menu.
- As a patient, change the patient ID in the URL to another patient: it must be refused.
- As a family member, confirm there are no edit or delete controls anywhere.
- Report back: the stack you found, the files you changed, and any existing feature that conflicts with these rules.
```

---

## Figure 8 – Login Page

```text
Context: CareConnect (home care reporting system) with five roles: administrator, caregiver, doctor, family_member, patient. Follow the existing framework and styling of this repository.

TASK: make the login page match this description:
- Centered card with the CareConnect logo and system name at the top.
- E-mail field and password field, with a "Show Password" toggle (eye icon) on the password field.
- "Forgot Password?" link that sends a password-reset e-mail (use the framework's built-in reset flow if it exists).
- "Log In" button.
- NO public "Register" or "Sign up" link. Accounts are created only by the administrator.
- Lockout: after 5 failed attempts, lock the account for 15 minutes and show "Too many failed attempts. Try again in X minutes." Reset the counter on successful login.
- Clear error message for wrong credentials that does not reveal whether the e-mail exists.
- Deactivated accounts cannot log in ("Your account is inactive. Please contact the administrator.").
- On success, redirect to the role's dashboard (/admin, /caregiver, /doctor, /family, /patient).
- Log login, logout, failed login and lockout events in audit_logs.
- Responsive: looks good at 1366x768 desktop and 390x844 phone.

ACCEPTANCE: test a correct login for each of the five roles, a wrong password, 5 wrong attempts (lockout), an inactive account, and the forgot-password e-mail.
```

## Figure 9 – Notifications and Messages

```text
Context: CareConnect with five roles (administrator, caregiver, doctor, family_member, patient). Follow the existing framework and styling.

TASK A – Notifications (all five roles):
- Bell icon in the top bar with an unread count badge.
- Notifications page listing the user's notifications, newest first, with HIGH-priority items (abnormal vital signs, urgent caregiver updates, missed doses) pinned to the top and marked in red.
- Each item shows icon, title, short message, patient name and time ago. Unread items are bold.
- Clicking an item marks it read and opens the related page (patient record, shift report, or appointment), respecting access rules.
- "Mark all as read" button. Filters: All / Unread / High priority.
- If real-time broadcasting (WebSockets/Pusher/Reverb etc.) is already set up, push new notifications live; otherwise poll every 30 seconds.

TASK B – Messages:
- A messages page with a list of conversations on the left and the selected thread on the right (stacked on phones).
- One conversation per patient care team. Participants: the patient (if the patient has an account), linked family members, the assigned doctor and caregivers, and the administrator.
- Patients and family members can only message their own patient's care team. They cannot message other patients' teams.
- Show sender name, role badge (Doctor, Caregiver, Family, Patient, Admin) and timestamp on each message. Plain text only; trim and validate length.
- A new message creates a normal-priority notification for the other participants.

ACCEPTANCE: send a message as a family member and as a patient; confirm the doctor and caregiver receive it. Confirm a patient cannot open another patient's thread by changing the URL.
```

## Figure 10 – Administrator Dashboard

```text
Context: CareConnect with five roles. This prompt is for the ADMINISTRATOR only. Follow the existing framework and styling.

TASK: build the administrator dashboard (/admin):
- Summary cards: Active Patients, Caregivers, Doctors, Patient Accounts (patients with a linked login), Family Members.
- Today's reporting cards: Shift Reports Submitted Today, Pending Reports (assigned caregiver-patient pairs with no report yet for the current shift/day).
- "Pending Reports" table: caregiver name, patient name, shift, and time since the shift started, so the admin sees at a glance who has not submitted.
- "Recent Alerts" panel: latest 10 high-priority notifications across all patients (abnormal vital signs, urgent updates, missed doses), each linking to the patient.
- Quick links: Add User, Add Patient, Audit Logs, Reports.
- Only administrators can access this page (403 for other roles).

ACCEPTANCE: the numbers match the seeded data; a caregiver who has not submitted today appears in Pending Reports and disappears after submitting.
```

## Figure 11 – User Management

```text
Context: CareConnect with five roles: administrator, caregiver, doctor, family_member, patient. ADMINISTRATOR-only page. Follow the existing framework and styling.

TASK: user management page:
- Table of all accounts: name, e-mail, role (colored badge), status (Active/Inactive), date created, actions.
- Search by name or e-mail. Filters by role (all five roles) and by status.
- "Add User" form (modal or page): full name, e-mail, role (dropdown with all five roles), temporary password (or "send set-password e-mail"). Validate unique e-mail and password strength.
- If role = Patient, show an optional "Link to patient record" dropdown listing patients that don't yet have an account (fills patients.user_id; must stay one-to-one).
- Actions: Edit, Deactivate/Reactivate (with confirmation), Reset Password.
- An administrator cannot deactivate their own account.
- Log every create, edit, deactivate, reactivate and password reset in audit_logs.

ACCEPTANCE: create one user of each role, link a patient account to a patient record, deactivate a user and confirm they can no longer log in.
```

## Figure 12 – Patient Management and Care Assignment

```text
Context: CareConnect with five roles. ADMINISTRATOR-only page. Follow the existing framework and styling.

TASK: patient management page:
- Patient list with search, showing name, age, diagnosis, assigned doctor, number of caregivers, and whether the patient has a login account.
- Patient profile form: full name, birth date, sex, address, diagnosis, medical history, allergies, emergency contact name and phone. Required-field validation.
- On the same page, a "Care Assignment" panel with three sections:
  1. Caregivers – assign or remove one or more caregivers (with start date).
  2. Doctor – assign the primary doctor.
  3. Family Members – link one or more family-member accounts.
- A "Patient Account" section: link the patient to a user with role = patient (one-to-one), or show "No account" with a button to create one.
- Saving updates care_assignments, which immediately controls who can see this patient.
- Log changes in audit_logs.

ACCEPTANCE: assign a new caregiver and confirm the patient appears on that caregiver's dashboard; unassign them and confirm access is removed. Link a patient account and log in as that patient to see the record.
```

## Figure 13 – Audit Logs and Reports

```text
Context: CareConnect with five roles. ADMINISTRATOR-only pages. Follow the existing framework and styling.

TASK A – Audit Logs page:
- Table: date and time, user, role, action (login, logout, failed login, create, update, delete, report submitted, etc.), record type, record ID, IP address.
- Filters: date range, user, role, action type. Pagination. Read-only; logs can't be edited or deleted from the UI.

TASK B – Reports page:
- Choose report type and date range (and optionally a patient):
  1. Patient Care Summary – vital-sign history, shift report summaries, care notes for one patient.
  2. Shift Report Compliance – per caregiver: shifts expected, reports submitted, late or missing.
  3. Medication Administration Record – per patient: each scheduled dose with Given/Missed/Refused, time and caregiver.
- Show the report on screen and allow "Export PDF" (and CSV if easy).
- Doctors may generate Patient Care Summary and Medication Administration Record for their own patients only. Patients and family members may download the Patient Care Summary for their own patient only.

ACCEPTANCE: generate each report for the seeded date range and export a PDF; confirm a doctor cannot generate a report for an unassigned patient.
```

## Figure 14 – Caregiver Dashboard (mobile)

```text
Context: CareConnect with five roles. This prompt is for the CAREGIVER. Design mobile-first (390x844 phone), but it must also work on desktop. Follow the existing framework and styling.

TASK: caregiver dashboard (/caregiver):
- "My Patients" cards: only patients assigned to this caregiver. Each card shows name, age, diagnosis, latest vital signs with a red/green indicator, and whether today's shift report is submitted.
- "Medications Due This Shift": doses scheduled in the current shift, sorted by time, with Due / Overdue / Done status. Tapping one opens Medication Administration (Figure 16).
- "Latest Doctor's Instructions": the most recent care notes for the caregiver's patients.
- Big buttons: "Submit Shift Report", "Record Medication", and a red "Send Urgent Update".
- Bottom navigation bar on phones.

ACCEPTANCE: log in as a seeded caregiver on a phone-sized viewport; only assigned patients appear; overdue doses are clearly marked.
```

## Figure 15 – Shift Report Form

```text
Context: CareConnect with five roles. CAREGIVER-only form, mobile-first. Follow the existing framework and styling.

TASK: shift report form for one assigned patient, with these sections in this order:
1. Vital Signs – blood pressure (systolic/diastolic), pulse rate, respiratory rate, temperature (°C), oxygen saturation (SpO2 %), blood glucose (optional).
2. General Condition and Observations
3. Activities and Care Provided
4. Food and Fluid Intake
5. Elimination
6. Sleep
7. Behavior / Mood
8. Incidents (yes/no; if yes, a description)

RULES:
- Required fields must be filled before submitting; show inline errors.
- Validate realistic ranges (for example, SpO2 50–100, temperature 30–45) and reject impossible values.
- Compare each vital sign with the doctor's threshold for this patient (vital_sign_thresholds). If a value is outside the range, highlight the field in red as soon as it's entered and show "Outside the doctor's set range".
- Show a confirmation summary before final submit.
- On submit, save the report with the caregiver's account and the server timestamp (caregivers can't change the time). If any value is outside its threshold, create a HIGH-priority notification for the assigned doctor and the administrator.
- Submitted reports are read-only for caregivers; corrections are done as an addendum and recorded in audit_logs.
- Only assigned caregivers can submit for the patient.

ACCEPTANCE: submit a normal report, then one with SpO2 = 88 (below threshold); confirm the field turns red and the doctor gets a high-priority alert.
```

## Figure 16 – Medication Administration

```text
Context: CareConnect with five roles. CAREGIVER page, mobile-first. Follow the existing framework and styling.

TASK: medication administration page for an assigned patient:
- List each dose scheduled for the current shift, with drug name, dosage, route (if available) and scheduled time.
- Three buttons per dose: Given (green), Missed (amber), Refused (red), plus an optional remark field. Missed and Refused require a remark.
- Save the caregiver, status and actual time to medication_logs. Once saved, show the status badge instead of the buttons.
- Doses not marked within 60 minutes after the scheduled time are flagged "Overdue" in red (use a scheduled job/cron or compute on page load).
- Missed, Refused or Overdue doses create a notification to the patient's doctor (HIGH priority for Missed/Overdue).
- Patients and family members see these logs read-only in their own views.

ACCEPTANCE: mark one dose of each type and confirm the doctor receives notifications for Missed and Refused; confirm an old unmarked dose shows "Overdue".
```

## Figure 17 – Send Urgent Update

```text
Context: CareConnect with five roles. CAREGIVER feature. Follow the existing framework and styling.

TASK: urgent update form, reachable from a red "Send Urgent Update" button on the caregiver dashboard and patient page:
- Select patient (assigned patients only).
- Type of event: Fall, Difficulty Breathing, Chest Pain, Loss of Consciousness, Severe Pain, Other.
- Description (required) and optional current vital signs.
- Confirmation dialog: "Send urgent alert to Dr. ___ and the administrator?"
- On send: save the update, immediately create HIGH-priority notifications for the assigned doctor and the administrator (e-mail too if mail is configured), and show the caregiver a success message with the time sent.
- The urgent update appears in the patient's record and timeline.

ACCEPTANCE: send an urgent update and confirm the doctor sees a red alert at the top of their notifications within seconds (or at the next poll).
```

## Figure 18 – Doctor Dashboard

```text
Context: CareConnect with five roles. DOCTOR page. Follow the existing framework and styling.

TASK: doctor dashboard (/doctor):
- Top section: "Unread Alerts" (high-priority notifications for this doctor's patients) and "Recently Submitted Reports".
- "My Patients" list: only patients assigned to this doctor. Each row has a status indicator:
  - Green "Normal" – latest readings within thresholds, no open alerts.
  - Amber "Needs Attention" – a missed or refused dose, or a reading close to a threshold, in the last 24 hours.
  - Red "Active Alert" – an unread high-priority alert (abnormal reading or urgent update).
- Clicking a patient opens Patient Health Status (Figure 19).
- Search and filter by status.

ACCEPTANCE: a patient with an out-of-range reading shows red; after the doctor opens and acknowledges the alert, the status updates.
```

## Figure 19 – Patient Health Status and Vital-Sign Trends

```text
Context: CareConnect with five roles. DOCTOR page; the read-only version is reused for patients and family members (Figures 22 and 23). Follow the existing framework and styling, and use the chart library already in the project (if none, use Chart.js).

TASK: patient health status page:
- Header: patient name, age, diagnosis, allergies (highlighted), assigned caregivers.
- "Latest Vital Signs" cards with the time recorded and red/green indicators against the doctor's thresholds.
- Line charts, one per vital sign (BP systolic/diastolic, pulse, respiratory rate, temperature, SpO2, glucose), over a selectable period (7 days / 14 days / 30 days / custom).
- On each chart, shade the acceptable range (min–max threshold) as a band so out-of-range points stand out; color out-of-range points red.
- Below the charts: recent shift reports (expandable), medication compliance for the period (% given; list of missed/refused), and care notes.
- Doctors can only open assigned patients.

ACCEPTANCE: the seeded out-of-range readings appear outside the shaded band in red; changing the period updates the charts.
```

## Figure 20 – Care Notes and Vital-Sign Thresholds

```text
Context: CareConnect with five roles. DOCTOR page. Follow the existing framework and styling.

TASK A – Care notes:
- Form to write a care instruction or remark for an assigned patient (text, optional priority: routine/important).
- Saved notes show date, doctor name and text, newest first.
- New notes appear immediately on the assigned caregivers' dashboards under "Latest Doctor's Instructions" and send them a notification.
- Patients and family members can see care notes read-only.

TASK B – Vital-sign thresholds (per patient):
- Editable table with Min and Max for: BP systolic, BP diastolic, pulse rate, respiratory rate, temperature, SpO2, blood glucose.
- Pre-fill sensible adult defaults if none are set; validate that Min < Max.
- Saving updates the thresholds used by the shift report form (Figure 15), the alerts and the chart bands (Figure 19).
- Log threshold changes in audit_logs.

ACCEPTANCE: lower the SpO2 minimum, submit a caregiver report below it, and confirm the alert and red highlight follow the new threshold.
```

## Figure 21 – Medication Schedule and Follow-up Care

```text
Context: CareConnect with five roles. DOCTOR page. Follow the existing framework and styling.

TASK A – Medication schedule:
- Form per assigned patient: drug name, dosage, route, frequency (e.g., once daily, every 8 hours, custom times), schedule times, start date, end date, instructions.
- Generate the scheduled doses so they appear on the caregiver's "Medications Due This Shift" and Medication Administration page (Figure 16).
- List active and ended medications; edit or discontinue (with reason).

TASK B – Follow-up care / appointments:
- Form: type (check-up, laboratory test, therapy, other), date and time, location, purpose/notes.
- Calendar view (month/week) of appointments, plus a list view.
- Send a reminder notification to the assigned caregivers, the patient (if they have an account) and linked family members 1 day before.

The medication schedule and appointments must appear in the caregiver dashboard and, read-only, in the patient and family member dashboards.

ACCEPTANCE: add a medication every 8 hours and confirm the doses appear for the caregiver; add an appointment and confirm it shows on the patient's and family member's dashboards.
```

## Figure 22 – Family Member Dashboard

```text
Context: CareConnect with five roles. FAMILY MEMBER page; READ-ONLY. Follow the existing framework and styling; must work well on phones.

TASK: family member dashboard (/family):
- If linked to more than one patient, show a patient selector; otherwise show the single linked patient.
- Read-only summary of the selected patient:
  - Latest status and latest vital signs, with simple normal/attention indicators.
  - Recent vital-sign trend (reuse the read-only charts from Figure 19, without threshold editing).
  - Care summary: short summaries of the last few shift reports (no internal-only fields).
  - Medication schedule and compliance (given/missed/refused, read-only).
  - Upcoming appointments.
- "Message the Care Team" button opening the patient's message thread (Figure 9).
- NO create, edit or delete controls anywhere. Server-side checks must block any write attempt.
- Family members can only view patients they are linked to.

ACCEPTANCE: log in as a seeded family member, confirm only linked patients are visible, no edit controls exist, and a direct POST/PUT to clinical endpoints is rejected.
```

## Figure 23 – Patient Dashboard

```text
Context: CareConnect with five roles. PATIENT page; READ-ONLY. It has the same layout and functions as the Family Member dashboard (Figure 22), but it is always scoped to the logged-in patient's own record (patients.user_id = current user id). Follow the existing framework and styling; must work well on phones.

TASK: patient dashboard (/patient):
- Reuse the family member dashboard components, but don't show a patient selector. Always load the logged-in patient's own record.
- Show their own latest status and vital signs, recent trend charts (read-only), care summaries, medication schedule and compliance, and upcoming appointments.
- "Message My Care Team" button opening their own message thread.
- Use friendly, plain-language labels ("My Health Today", "My Medicines", "My Appointments").
- NO create, edit or delete controls for clinical information. Changes are made only by the assigned caregivers and doctors. The patient can only edit their own profile and password.
- If a patient-role account isn't linked to any patient record, show "Your account is not yet linked to a patient record. Please contact the administrator." instead of an error.

ACCEPTANCE: log in as a seeded patient, confirm only their own data appears, changing any patient ID in the URL is refused (403), and there are no edit controls for clinical data.
```

---

## Final prompt – Capture the screenshots for the manuscript

```text
Using the seeded FICTITIOUS demo data only, run the app locally and capture screenshots for the CareConnect manuscript with the browser. Log in as the correct role for each screen. Desktop screenshots at 1366x768, phone screenshots at 390x844. Hide any developer toolbars. Make sure every screen shows realistic data (no empty tables).

Save them in a folder named manuscript_screenshots with these exact names:
fig08_login_page.png                  (logged out, desktop)
fig09_notifications_messages.png      (doctor: notifications panel open; also capture fig09b_messages.png showing a message thread)
fig10_admin_dashboard.png             (administrator, desktop)
fig11_user_management.png             (administrator, user list; also fig11b_add_user.png with the Add User form open)
fig12_patient_management.png          (administrator, patient profile and care assignment panel)
fig13_audit_logs_reports.png          (administrator, audit logs; also fig13b_reports.png)
fig14_caregiver_dashboard.png         (caregiver, PHONE size)
fig15_shift_report_form.png           (caregiver, phone, with one vital sign highlighted red as out of range)
fig16_medication_administration.png   (caregiver, phone, showing Given/Missed/Refused and one Overdue dose)
fig17_send_urgent_update.png          (caregiver, phone, form filled in before sending)
fig18_doctor_dashboard.png            (doctor, desktop, with at least one red Active Alert patient)
fig19_patient_health_status.png       (doctor, desktop, charts with shaded threshold bands and a red out-of-range point)
fig20_care_notes_thresholds.png       (doctor, desktop)
fig21_medication_followup.png         (doctor, desktop, medication form and appointment calendar)
fig22_family_dashboard.png            (family member, phone or desktop)
fig23_patient_dashboard.png           (patient, phone or desktop)

After capturing, list any screen that does not match its description and explain what differs.
```
