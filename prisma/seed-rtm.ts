import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_CASES = [
  // ─── PERSONNEL ───────────────────────────────────────────────
  {
    ursId:       'URS-PER-001',
    module:      'PERSONNEL',
    phase:       'OQ' as const,
    title:       'Create new person record',
    description: 'Verify the system can create a person with all required fields',
    steps:       JSON.stringify([
      'Login as Super Admin',
      'Navigate to /personnel/new',
      'Fill in all required fields: Employee ID, Name, Email, Role, Designation, Joining Date, Unit',
      'Click Create person',
      'Enter justification in the modal',
      'Click Confirm action',
    ]),
    expected:    'Person record created. Temporary password emailed. Audit log entry created with WHO/WHEN/WHAT/WHY.',
    priority:    'M',
  },
  {
    ursId:       'URS-PER-002',
    module:      'PERSONNEL',
    phase:       'OQ' as const,
    title:       'Assign person to Unit and Department',
    description: 'Verify Unit and Department assignment works correctly',
    steps:       JSON.stringify([
      'Create a new person',
      'Select Unit 1 from the Unit dropdown',
      'Observe Department dropdown filters to Unit 1 departments only',
      'Select Quality Control department',
      'Save the person record',
    ]),
    expected:    'Person assigned to Unit 1 / Quality Control. Department list filtered by selected unit.',
    priority:    'M',
  },
  {
    ursId:       'URS-PER-003',
    module:      'PERSONNEL',
    phase:       'OQ' as const,
    title:       'Manager-subordinate reporting relationship',
    description: 'Verify manager can see subordinate training data',
    steps:       JSON.stringify([
      'Create Person A with MANAGER role',
      'Create Person B with USER role, set Manager = Person A',
      'Assign training to Person B',
      'Login as Person A',
      'Navigate to /assignments → My Team tab',
    ]),
    expected:    'Person A sees Person B\'s assignments. Persons not reporting to A are not visible.',
    priority:    'M',
  },
  {
    ursId:       'URS-PER-004',
    module:      'PERSONNEL',
    phase:       'OQ' as const,
    title:       'Deactivate person — soft delete',
    description: 'Verify deactivation preserves records but removes active access',
    steps:       JSON.stringify([
      'Open any active person record',
      'Click Deactivate account',
      'Enter justification',
      'Confirm deactivation',
      'Attempt to login as deactivated person',
    ]),
    expected:    'Person record marked inactive. Login rejected. All historical records retained. Audit log shows DELETE action.',
    priority:    'M',
  },

  // ─── TRAINING TOPICS ─────────────────────────────────────────
  {
    ursId:       'URS-TOP-001',
    module:      'TRAINING_TOPIC',
    phase:       'OQ' as const,
    title:       'Create training topic',
    description: 'Verify topic can be created and appears in master list',
    steps:       JSON.stringify([
      'Login as Training Head',
      'Navigate to /topics/new',
      'Enter topic name and description',
      'Select at least one department',
      'Confirm with justification',
    ]),
    expected:    'Topic appears in master list. Department badge shows on topic card. Audit log records CREATE.',
    priority:    'M',
  },
  {
    ursId:       'URS-TOP-002',
    module:      'TRAINING_TOPIC',
    phase:       'OQ' as const,
    title:       'Department mapping drives induction',
    description: 'Verify new person auto-receives topics mapped to their department',
    steps:       JSON.stringify([
      'Ensure Topic X is mapped to Quality Control department',
      'Create a new person assigned to Quality Control',
      'Login as the new person',
      'Navigate to /assignments',
    ]),
    expected:    'Topic X appears as an INDUCTION assignment for the new person with a due date 14 days from joining.',
    priority:    'M',
  },

  // ─── CONTENT MANAGEMENT ──────────────────────────────────────
  {
    ursId:       'URS-CNT-001',
    module:      'CONTENT',
    phase:       'OQ' as const,
    title:       'Upload training material',
    description: 'Verify file upload to MinIO storage works',
    steps:       JSON.stringify([
      'Login as Training Head',
      'Navigate to /content/upload',
      'Select a topic and fill all fields',
      'Select version type: Minor',
      'Drag and drop a .pptx file',
      'Confirm with justification',
    ]),
    expected:    'File uploaded to MinIO. Material appears in content list with DRAFT status. Audit log records UPLOAD.',
    priority:    'M',
  },
  {
    ursId:       'URS-CNT-003',
    module:      'CONTENT',
    phase:       'OQ' as const,
    title:       'Version control — major version triggers retraining',
    description: 'Verify major version change auto-creates retraining assignments',
    steps:       JSON.stringify([
      'Ensure Person A has COMPLETED training on Topic X',
      'Upload a new MAJOR version for Topic X material',
      'Approve the new version',
      'Login as Person A',
      'Navigate to /assignments',
    ]),
    expected:    'Person A has a new RETRAINING assignment for Topic X. Notification sent. Audit log shows APPROVE with MAJOR version type.',
    priority:    'M',
  },
  {
    ursId:       'URS-CNT-005',
    module:      'CONTENT',
    phase:       'OQ' as const,
    title:       'Minor version — acknowledgement only',
    description: 'Verify minor version requires only read & understood acknowledgement',
    steps:       JSON.stringify([
      'Upload a MINOR version for Topic X',
      'Approve it',
      'Login as a person assigned to Topic X',
      'Open the assignment and click Read & understood',
    ]),
    expected:    'Assignment marked COMPLETED without requiring assessment. If topic has MCQ bank, assessment still required.',
    priority:    'H',
  },

  // ─── TRAINING ASSIGNMENT ─────────────────────────────────────
  {
    ursId:       'URS-TNA-001',
    module:      'TRAINING_ASSIGNMENT',
    phase:       'OQ' as const,
    title:       'Assign training — induction trigger',
    description: 'Verify training can be manually assigned with INDUCTION trigger',
    steps:       JSON.stringify([
      'Login as Training Head',
      'Navigate to /assignments/new',
      'Select a topic, trigger INDUCTION, set due date',
      'Select a person individually',
      'Confirm with justification',
    ]),
    expected:    'Assignment created. Person receives in-app notification. Audit log records ASSIGN with personId and trigger.',
    priority:    'M',
  },
  {
    ursId:       'URS-TNA-003',
    module:      'TRAINING_ASSIGNMENT',
    phase:       'OQ' as const,
    title:       'Bulk assignment to department',
    description: 'Verify bulk assignment assigns to all active persons in department',
    steps:       JSON.stringify([
      'Navigate to /assignments/new',
      'Select mode: By department',
      'Select a topic and department with 3+ members',
      'Set due date and trigger',
      'Confirm with justification',
    ]),
    expected:    'All active persons in department receive assignment. Skipped count shown for already-assigned. Count matches department size.',
    priority:    'M',
  },
  {
    ursId:       'URS-TNA-004',
    module:      'TRAINING_ASSIGNMENT',
    phase:       'OQ' as const,
    title:       'Duplicate assignment prevention',
    description: 'Verify system prevents duplicate active assignments for same person+topic',
    steps:       JSON.stringify([
      'Assign Topic X to Person A',
      'Attempt to assign Topic X to Person A again',
    ]),
    expected:    'Second assignment not created. Success message shows skipped count = 1 with person\'s name.',
    priority:    'M',
  },

  // ─── ASSESSMENT ──────────────────────────────────────────────
  {
    ursId:       'URS-ASM-001',
    module:      'ASSESSMENT',
    phase:       'OQ' as const,
    title:       'Create question bank',
    description: 'Verify question bank can be created for a topic',
    steps:       JSON.stringify([
      'Login as Trainer or Training Head',
      'Navigate to /assessments/banks/new',
      'Select a topic without an existing bank',
      'Set pass mark to 80%, 5 questions per attempt, 3 max attempts',
      'Confirm with justification',
    ]),
    expected:    'Question bank created. Topic now requires assessment completion. Audit log records CREATE.',
    priority:    'M',
  },
  {
    ursId:       'URS-ASM-002',
    module:      'ASSESSMENT',
    phase:       'OQ' as const,
    title:       'MCQ question creation',
    description: 'Verify MCQ questions can be added to question bank',
    steps:       JSON.stringify([
      'Open a question bank',
      'Click + Add question',
      'Enter question text and four options',
      'Select correct answer using the radio button',
      'Confirm with justification',
    ]),
    expected:    'Question appears in bank. Correct answer stored server-side. Audit log records CREATE.',
    priority:    'M',
  },
  {
    ursId:       'URS-ASM-003',
    module:      'ASSESSMENT',
    phase:       'OQ' as const,
    title:       'Passing percentage enforced at 80%',
    description: 'Verify 80% pass mark is applied per SOP QbD-QA-SOP-007',
    steps:       JSON.stringify([
      'Create a question bank with 80% pass mark',
      'Add 5 questions',
      'As the test user, attempt the assessment',
      'Answer 3 out of 5 correctly (60%) and submit',
      'Attempt again, answer 4 out of 5 correctly (80%) and submit',
    ]),
    expected:    'First attempt: FAIL at 60%. Second attempt: PASS at 80%. Assignment marked COMPLETED on pass.',
    priority:    'M',
  },
  {
    ursId:       'URS-ASM-004',
    module:      'ASSESSMENT',
    phase:       'OQ' as const,
    title:       'Assessment outcome — Pass/Fail/Needs Retraining',
    description: 'Verify all three outcome types are correctly generated',
    steps:       JSON.stringify([
      'Create assessment with max 2 attempts',
      'Attempt 1: answer all wrong → FAIL',
      'Attempt 2: answer all wrong → NEEDS_RETRAINING',
      'Verify attempt 3 is blocked',
    ]),
    expected:    'Attempt 1: FAIL. Attempt 2: NEEDS_RETRAINING. Attempt 3: blocked with error message. New RETRAINING assignment auto-created.',
    priority:    'M',
  },
  {
    ursId:       'URS-ASM-005',
    module:      'ASSESSMENT',
    phase:       'OQ' as const,
    title:       'Randomised question selection',
    description: 'Verify each attempt draws a random subset from the question pool',
    steps:       JSON.stringify([
      'Create a question bank with 10 questions, 5 per attempt',
      'Take the assessment twice',
      'Compare the question sets presented in each attempt',
    ]),
    expected:    'Question sets differ between attempts. Server draws random subset each time. Correct answers not visible to client.',
    priority:    'H',
  },
  {
    ursId:       'URS-ASM-006',
    module:      'ASSESSMENT',
    phase:       'OQ' as const,
    title:       'Attempt limit enforcement — server side',
    description: 'Verify attempt limit cannot be bypassed by the client',
    steps:       JSON.stringify([
      'Exhaust all attempts via normal UI',
      'Attempt to POST to /api/assessments/attempt/submit directly via API tool',
    ]),
    expected:    'API returns 400 — Maximum attempts exceeded. No additional attempt record created.',
    priority:    'M',
  },

  // ─── REFRESHER TRAINING ───────────────────────────────────────
  {
    ursId:       'URS-RFR-001',
    module:      'REFRESHER',
    phase:       'OQ' as const,
    title:       'Planned refresher training',
    description: 'Verify planned refresher can be created and linked assignment generated',
    steps:       JSON.stringify([
      'Login as Training Head',
      'Navigate to /refresher/new',
      'Select trigger type: Planned',
      'Select topic, due date, and one person',
      'Enter justification (min 15 chars)',
      'Confirm',
    ]),
    expected:    'RefresherTrigger record created with PLANNED type. Linked TrainingAssignment created with trigger=REFRESHER. Person notified.',
    priority:    'M',
  },
  {
    ursId:       'URS-RFR-002',
    module:      'REFRESHER',
    phase:       'OQ' as const,
    title:       'Deviation-triggered refresher',
    description: 'Verify QA can raise a deviation-triggered refresher with mandatory justification',
    steps:       JSON.stringify([
      'Navigate to /refresher/new',
      'Select trigger type: Deviation',
      'Attempt to confirm with less than 15 character justification',
      'Enter a full justification describing the deviation',
      'Confirm',
    ]),
    expected:    'Short justification blocked by UI. Full justification accepted. DEVIATION badge visible on refresher record.',
    priority:    'M',
  },
  {
    ursId:       'URS-RFR-003',
    module:      'REFRESHER',
    phase:       'OQ' as const,
    title:       'Refresher status syncs on completion',
    description: 'Verify RefresherTrigger status updates when linked assignment completes',
    steps:       JSON.stringify([
      'Create a refresher for Person A on Topic X (no question bank)',
      'Login as Person A',
      'Open the REFRESHER assignment and click Read & understood',
      'Login as admin and navigate to /refresher',
    ]),
    expected:    'RefresherTrigger status → COMPLETED. Completed date populated. Stats card updates.',
    priority:    'M',
  },

  // ─── SCIENTIST QUALIFICATION ──────────────────────────────────
  {
    ursId:       'URS-SQF-001',
    module:      'QUALIFICATION',
    phase:       'OQ' as const,
    title:       'Create qualification record',
    description: 'Verify OJT qualification record creation with 2-step signatory chain',
    steps:       JSON.stringify([
      'Login as Training Head',
      'Navigate to /qualifications/new',
      'Select analyst, technique, date performed, supervisor',
      'Confirm with justification',
      'View the created record',
    ]),
    expected:    'Record created with IN_PROGRESS status. Two signatory steps: TRAINER (pending) → TRAINING_HEAD (pending). Audit log records CREATE.',
    priority:    'M',
  },
  {
    ursId:       'URS-SQF-002',
    module:      'QUALIFICATION',
    phase:       'OQ' as const,
    title:       'Upload scanned qualification evidence',
    description: 'Verify QA can upload scanned documents against a qualification record',
    steps:       JSON.stringify([
      'Open an IN_PROGRESS qualification record',
      'Click Details to expand',
      'Enter description: Bench worksheet 30-Jun-2026',
      'Select a PDF file',
      'Click Upload',
    ]),
    expected:    'Document uploaded to MinIO qualifications/ folder. Toast notification shown. Document thumbnail visible with click-to-view. Audit log records UPLOAD.',
    priority:    'M',
  },
  {
    ursId:       'URS-SQF-003',
    module:      'QUALIFICATION',
    phase:       'OQ' as const,
    title:       'Two-step signatory chain sign-off',
    description: 'Verify step 1 and step 2 must be signed in sequence',
    steps:       JSON.stringify([
      'Open an IN_PROGRESS qualification',
      'Click Sign step 1, enter justification, confirm',
      'Verify step 2 is now pending',
      'Click Sign step 2, enter justification, confirm',
    ]),
    expected:    'Step 1 signed by Trainer. Step 2 signed by Training Head. Record status → APPROVED. Certificate auto-generated.',
    priority:    'M',
  },
  {
    ursId:       'URS-SQF-004',
    module:      'QUALIFICATION',
    phase:       'OQ' as const,
    title:       'Qualification expiry and auto-detection',
    description: 'Verify expired qualifications are auto-detected',
    steps:       JSON.stringify([
      'Approve a qualification',
      'Via Prisma Studio: set expiryDate to yesterday',
      'Reload /qualifications',
    ]),
    expected:    'Record status → EXPIRED. Competency matrix cell shows Expired in red. Analyst receives QUALIFICATION_EXPIRY notification.',
    priority:    'M',
  },

  // ─── CERTIFICATE ──────────────────────────────────────────────
  {
    ursId:       'URS-CRT-001',
    module:      'QUALIFICATION',
    phase:       'OQ' as const,
    title:       'Certificate auto-generated on qualification approval',
    description: 'Verify certificate is generated with unique number on final sign-off',
    steps:       JSON.stringify([
      'Complete both signatory steps on a qualification',
      'Verify certificate badge appears on the record',
      'Note the certificate number format: CERT-YYYY-NNNNN',
    ]),
    expected:    'Certificate created with unique number. Stored in DB. Badge shows on qualification card. Analyst notified.',
    priority:    'M',
  },
  {
    ursId:       'URS-CRT-002',
    module:      'QUALIFICATION',
    phase:       'OQ' as const,
    title:       'Unique certificate number per issuance',
    description: 'Verify no two certificates share the same number',
    steps:       JSON.stringify([
      'Create and approve two separate qualifications for different analysts',
      'Compare certificate numbers',
    ]),
    expected:    'Each certificate has a unique number. Format: CERT-{YEAR}-{SEQUENCE}. Numbers are sequential within a year.',
    priority:    'H',
  },

  // ─── AUDIT TRAIL ─────────────────────────────────────────────
  {
    ursId:       'URS-CMP-002',
    module:      'AUDIT_TRAIL',
    phase:       'OQ' as const,
    title:       'Audit trail captures WHO/WHEN/WHAT/WHY',
    description: 'Verify every write action creates an audit log with all four dimensions',
    steps:       JSON.stringify([
      'Perform any write action (e.g. create person)',
      'Navigate to /audit-trail',
      'Find the corresponding audit log entry',
      'Verify all four fields: userId (WHO), createdAt (WHEN), action+beforeValue+afterValue (WHAT), justification (WHY)',
    ]),
    expected:    'Audit log entry present. All four ALCOA+ dimensions captured. Entry cannot be edited or deleted.',
    priority:    'M',
  },
  {
    ursId:       'URS-CMP-003',
    module:      'AUDIT_TRAIL',
    phase:       'OQ' as const,
    title:       'Audit trail is non-editable',
    description: 'Verify audit trail cannot be modified via any API',
    steps:       JSON.stringify([
      'Attempt POST to /api/audit',
      'Attempt PUT to /api/audit',
      'Attempt DELETE to /api/audit',
    ]),
    expected:    'All three return 405 Method Not Allowed. No audit records created, modified, or deleted.',
    priority:    'M',
  },

  // ─── ACCESS CONTROL ──────────────────────────────────────────
  {
    ursId:       'URS-NFR-006',
    module:      'AUTH',
    phase:       'OQ' as const,
    title:       'Role-based access control — USER cannot access admin pages',
    description: 'Verify USER role cannot access restricted pages',
    steps:       JSON.stringify([
      'Login as a USER role account',
      'Attempt to navigate to /personnel/new',
      'Attempt to navigate to /topics/new',
      'Attempt to navigate to /content/upload',
      'Attempt to navigate to /admin',
    ]),
    expected:    'All four pages redirect to /unauthorised. No data is accessible or modifiable.',
    priority:    'M',
  },
  {
    ursId:       'URS-NFR-005',
    module:      'AUTH',
    phase:       'OQ' as const,
    title:       'Session expires after 8 hours',
    description: 'Verify JWT session maxAge enforcement',
    steps:       JSON.stringify([
      'Login as any user',
      'Note the session cookie expiry time',
      'Verify maxAge = 8 hours (28800 seconds)',
    ]),
    expected:    'Session cookie has an 8-hour expiry. After expiry, user is redirected to /login on next request.',
    priority:    'M',
  },
  {
    ursId:       'URS-NFR-005',
    module:      'AUTH',
    phase:       'OQ' as const,
    title:       'Force password change on first login',
    description: 'Verify mustChangePassword flag enforces password change before access',
    steps:       JSON.stringify([
      'Create a new person (mustChangePassword defaults to true)',
      'Login with their temporary password',
    ]),
    expected:    'Middleware redirects to /change-password. All other pages inaccessible until password changed.',
    priority:    'M',
  },

  // ─── NOTIFICATIONS ────────────────────────────────────────────
  {
    ursId:       'URS-NOT-001',
    module:      'NOTIFICATION',
    phase:       'OQ' as const,
    title:       'In-app notification on training assignment',
    description: 'Verify person receives in-app notification when training is assigned',
    steps:       JSON.stringify([
      'Login as Training Head',
      'Assign a training to Person A',
      'Login as Person A',
      'Check notification bell',
    ]),
    expected:    'Bell badge shows unread count. Dropdown shows assignment notification with topic name and due date.',
    priority:    'M',
  },

  // ─── REPORTS ─────────────────────────────────────────────────
  {
    ursId:       'URS-RPT-001',
    module:      'REPORTS',
    phase:       'PQ' as const,
    title:       'Training Matrix — all persons and topics',
    description: 'Verify training matrix shows correct status for all persons',
    steps:       JSON.stringify([
      'Navigate to /reports → Training Matrix tab',
      'Verify rows = all active persons',
      'Verify columns = all active topics',
      'Verify cell colours match assignment statuses',
      'Click Export CSV',
    ]),
    expected:    'Matrix renders correctly. Status symbols match database records. CSV downloads with correct headers and data.',
    priority:    'M',
  },
  {
    ursId:       'URS-RPT-003',
    module:      'REPORTS',
    phase:       'PQ' as const,
    title:       'Overdue report accuracy',
    description: 'Verify overdue report shows all overdue assignments with correct days count',
    steps:       JSON.stringify([
      'Navigate to /reports → Overdue Report tab',
      'Verify days overdue calculation for a known overdue assignment',
    ]),
    expected:    'Days overdue = today - dueDate. Manager column shows correct reporting manager. Export CSV works.',
    priority:    'M',
  },
  {
    ursId:       'URS-RPT-004',
    module:      'REPORTS',
    phase:       'PQ' as const,
    title:       'Qualification status board with expiry',
    description: 'Verify qualification status report shows correct expiry information',
    steps:       JSON.stringify([
      'Navigate to /reports → Qualification Status tab',
      'Verify expiry countdown for an approved qualification',
      'Filter by Approved status',
      'Export CSV',
    ]),
    expected:    'Days to expiry calculated correctly. Expiring soon shown in amber. Expired shown in red. CSV accurate.',
    priority:    'M',
  },
  {
    ursId:       'URS-RPT-002',
    module:      'REPORTS',
    phase:       'PQ' as const,
    title:       'Training Index per person',
    description: 'Verify per-person training index matches Format QbD/QA/F/007-09',
    steps:       JSON.stringify([
      'Navigate to /reports → Training Index tab',
      'Select a specific person from the dropdown',
      'Verify all their assignments appear with correct dates and outcomes',
      'Export CSV',
    ]),
    expected:    'All assignments listed chronologically. Scores and outcomes correct. CSV matches screen data.',
    priority:    'M',
  },

  // ─── PERFORMANCE ─────────────────────────────────────────────
  {
    ursId:       'URS-NFR-001',
    module:      'SYSTEM',
    phase:       'PQ' as const,
    title:       'System supports 20 concurrent users',
    description: 'Verify system remains responsive under concurrent load',
    steps:       JSON.stringify([
      'Simulate 20 concurrent browser sessions',
      'Each session performs: login, view assignments, submit assessment',
      'Measure response times',
    ]),
    expected:    'All 20 sessions complete without error. Average response time < 3 seconds. No deadlocks or timeouts.',
    priority:    'M',
  },

  // ─── INSTALLATION QUALIFICATION ───────────────────────────────
  {
    ursId:       'URS-VAL-001',
    module:      'SYSTEM',
    phase:       'IQ' as const,
    title:       'Application installation verification',
    description: 'Verify the application is correctly installed and all services running',
    steps:       JSON.stringify([
      'Verify Next.js server starts without errors: npm run dev',
      'Verify Prisma connection to PostgreSQL (Neon)',
      'Verify MinIO is accessible at localhost:9000',
      'Verify MinIO console at localhost:9001',
      'Verify tcms-documents bucket exists in MinIO',
      'Verify all environment variables are set in .env.local',
    ]),
    expected:    'All services running. No connection errors. All environment variables present. Prisma client generated.',
    priority:    'M',
  },
  {
    ursId:       'URS-VAL-001',
    module:      'SYSTEM',
    phase:       'IQ' as const,
    title:       'Database schema verification',
    description: 'Verify all required database tables exist with correct structure',
    steps:       JSON.stringify([
      'Open Prisma Studio: npx prisma studio',
      'Verify presence of all tables: persons, units, departments, training_topics, training_materials, material_versions, training_assignments, question_banks, questions, assessment_attempts, qualification_records, techniques, signatory_entries, scanned_documents, certificates, refresher_triggers, notifications, audit_logs',
      'Verify seed data: 2 units, 2 departments, 3 persons',
    ]),
    expected:    'All 18 tables present. Seed data correct. No orphaned records.',
    priority:    'M',
  },
]

async function main() {
  console.log('🌱 Seeding RTM test cases...')

  // Clear existing test cases
  await prisma.testCase.deleteMany({})

  for (const tc of TEST_CASES) {
    await prisma.testCase.create({ data: tc })
  }

  console.log(`✅ ${TEST_CASES.length} test cases seeded`)
  console.log('   IQ:', TEST_CASES.filter((t) => t.phase === 'IQ').length)
  console.log('   OQ:', TEST_CASES.filter((t) => t.phase === 'OQ').length)
  console.log('   PQ:', TEST_CASES.filter((t) => t.phase === 'PQ').length)
}

main()
  .catch((e) => {
    console.error('❌ RTM seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())