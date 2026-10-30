import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import utilities
import { ALLOWED_DEPARTMENTS } from '../../frontend/src/constants/departments.js';
import {
  matchDepartment,
  matchTestDepartment,
  escapeCsv,
  buildCsvContent,
  getReportExportData
} from '../../frontend/src/utils/reportsExport.js';

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
}

console.log('======================================================');
console.log('   COORDINATOR REPORTS: COMPLETE VERIFICATION SUITE   ');
console.log('======================================================\n');

// ---------------------------------------------------------------------------
// 1. DATE FILTER REMOVAL & DATE DISPLAY PRESERVATION
// ---------------------------------------------------------------------------
console.log('--- 1. DATE FILTER REMOVAL & DATE DISPLAY PRESERVATION ---');

const reportsPagePath = path.resolve(__dirname, '../../frontend/src/pages/CoordinatorReportsPage.jsx');
const reportsPageSource = fs.readFileSync(reportsPagePath, 'utf8');

test('CoordinatorReportsPage removes date-picker inputs (type="date")', () => {
  assert.strictEqual(
    reportsPageSource.includes('type="date"'),
    false,
    'type="date" input must not exist in CoordinatorReportsPage'
  );
});

test('CoordinatorReportsPage removes dateFrom and dateTo state hooks', () => {
  assert.strictEqual(
    reportsPageSource.includes('dateFrom'),
    false,
    'dateFrom state/query parameter must be removed'
  );
  assert.strictEqual(
    reportsPageSource.includes('dateTo'),
    false,
    'dateTo state/query parameter must be removed'
  );
});

test('CoordinatorReportsPage removes Calendar icon filter control', () => {
  assert.strictEqual(
    reportsPageSource.includes('Calendar className'),
    false,
    'Calendar icon control should be removed from filter bar'
  );
});

test('CoordinatorReportsPage preserves Date display column in attempt table', () => {
  assert.ok(
    reportsPageSource.includes('<th className="py-3.5 px-5">Date</th>'),
    'Date column header must be preserved in table'
  );
  assert.ok(
    reportsPageSource.includes('att.submissionTime') && reportsPageSource.includes('toLocaleDateString()'),
    'Submission date formatting must be preserved'
  );
});

// ---------------------------------------------------------------------------
// 2. DASHBOARD CARD NAVIGATION TO REPORTS
// ---------------------------------------------------------------------------
console.log('\n--- 2. DASHBOARD CARD NAVIGATION TO REPORTS ---');

const dashboardPagePath = path.resolve(__dirname, '../../frontend/src/pages/CoordinatorDashboardPage.jsx');
const dashboardPageSource = fs.readFileSync(dashboardPagePath, 'utf8');

test('Dashboard card "Students Attempted" routes to tab=tests&status=attempted', () => {
  assert.ok(
    dashboardPageSource.includes("case 'Students Attempted':\n        return '/coordinator/reports?tab=tests&status=attempted';") ||
    dashboardPageSource.includes("'/coordinator/reports?tab=tests&status=attempted'"),
    'Students Attempted must navigate to tab=tests&status=attempted'
  );
});

test('Dashboard card "In-Progress Tests" routes to tab=tests&status=in-progress', () => {
  assert.ok(
    dashboardPageSource.includes("case 'In-Progress Tests':\n        return '/coordinator/reports?tab=tests&status=in-progress';") ||
    dashboardPageSource.includes("'/coordinator/reports?tab=tests&status=in-progress'"),
    'In-Progress Tests must navigate to tab=tests&status=in-progress'
  );
});

test('Dashboard card "Unattempted Students" routes to tab=participation&status=unattempted', () => {
  assert.ok(
    dashboardPageSource.includes("case 'Unattempted Students':\n        return '/coordinator/reports?tab=participation&status=unattempted';") ||
    dashboardPageSource.includes("'/coordinator/reports?tab=participation&status=unattempted'"),
    'Unattempted Students must navigate to tab=participation&status=unattempted'
  );
});

test('Direct reports sidebar navigation defaults to tab=tests, status=all', () => {
  // Check default fallbacks in CoordinatorReportsPage
  assert.ok(
    reportsPageSource.includes("if (!raw) return 'tests';"),
    'Reports page must default to tests tab when no tab is provided'
  );
  assert.ok(
    reportsPageSource.includes("if (!raw) return 'all';"),
    'Reports page must default to all status when no status is provided'
  );
});

test('Tab switching resets status and prevents tab hijacking', () => {
  assert.ok(
    reportsPageSource.includes("const handleTabChange = (newTab) => {"),
    'handleTabChange function must be defined'
  );
  // Verify that handleTabChange creates a new URLSearchParams with only the tab (and preserved department)
  assert.ok(
    reportsPageSource.includes("next.set('tab', newTab);") &&
    !reportsPageSource.includes("next.set('status', statusFilter);"),
    'handleTabChange must not retain the previous tab status'
  );
});

test('Special attempted and unattempted views are scoped strictly to their tabs', () => {
  // activeTab === 'tests' && statusFilter === 'attempted'
  assert.ok(
    reportsPageSource.includes("activeTab === 'tests' && (") &&
    reportsPageSource.includes("statusFilter === 'attempted'"),
    'Attempted view must be nested within activeTab === tests'
  );
  // activeTab === 'participation' && statusFilter === 'unattempted'
  assert.ok(
    reportsPageSource.includes("activeTab === 'participation' && (") &&
    reportsPageSource.includes("statusFilter === 'unattempted'"),
    'Unattempted view must be nested within activeTab === participation'
  );
  // Tab 2: activeTab === 'students' renders cleanly
  assert.ok(
    reportsPageSource.includes("activeTab === 'students' && ("),
    'Tab 2 students must render independently'
  );
});

test('Initial mock test selector is rendered when testId is missing', () => {
  assert.ok(
    reportsPageSource.includes('Select a Mock Test to View Attempted Students'),
    'Prompt must require selecting a mock test for attempted students'
  );
  assert.ok(
    reportsPageSource.includes('Select a Mock Test to View Unattempted Candidates'),
    'Prompt must require selecting a mock test for unattempted students'
  );
});

// ---------------------------------------------------------------------------
// 3. DEPARTMENT DROPDOWN & FILTERING
// ---------------------------------------------------------------------------
console.log('\n--- 3. DEPARTMENT DROPDOWN & FILTERING ---');

test('Department dropdown uses ALLOWED_DEPARTMENTS single source of truth', () => {
  assert.strictEqual(ALLOWED_DEPARTMENTS.length, 10, 'Must have exactly 10 approved departments');
  assert.ok(
    reportsPageSource.includes('import { ALLOWED_DEPARTMENTS } from'),
    'Reports page must import ALLOWED_DEPARTMENTS'
  );
  assert.ok(
    reportsPageSource.includes('ALLOWED_DEPARTMENTS.map('),
    'Department dropdown must map over ALLOWED_DEPARTMENTS'
  );
  assert.ok(
    reportsPageSource.includes('<option value="all">All Departments</option>'),
    'Dropdown must include All Departments option'
  );
});

test('matchDepartment correctly handles all 10 approved departments & variants', () => {
  // 1. Computer Engineering
  assert.ok(matchDepartment('Computer Engineering', 'Computer Engineering'));
  assert.ok(matchDepartment('Computer Science & Engineering', 'Computer Engineering'));
  assert.ok(!matchDepartment('Mechanical Engineering', 'Computer Engineering'));

  // 2. Information Technology
  assert.ok(matchDepartment('Information Technology', 'Information Technology'));
  assert.ok(matchDepartment('IT', 'Information Technology'));

  // 3. AIDS
  assert.ok(matchDepartment('AIDS', 'AIDS'));
  assert.ok(matchDepartment('AI & DS', 'AIDS'));
  assert.ok(matchDepartment('Artificial Intelligence & Data Science', 'AIDS'));

  // 4. CSD
  assert.ok(matchDepartment('CSD', 'CSD'));
  assert.ok(matchDepartment('CS & Design', 'CSD'));

  // 5. Civil
  assert.ok(matchDepartment('Civil', 'Civil'));
  assert.ok(matchDepartment('Civil Engineering', 'Civil'));

  // 6. Mechanical
  assert.ok(matchDepartment('Mechanical', 'Mechanical'));
  assert.ok(matchDepartment('Mechanical Engineering', 'Mechanical'));

  // 7. Electrical
  assert.ok(matchDepartment('Electrical', 'Electrical'));
  assert.ok(matchDepartment('Electrical Engineering', 'Electrical'));
  assert.ok(!matchDepartment('Electronics & Telecommunication', 'Electrical'));

  // 8. E & TC
  assert.ok(matchDepartment('E & TC', 'E & TC'));
  assert.ok(matchDepartment('ETC', 'E & TC'));
  assert.ok(matchDepartment('Electronics & Telecommunication', 'E & TC'));

  // 9. Chemical
  assert.ok(matchDepartment('Chemical', 'Chemical'));
  assert.ok(matchDepartment('Chemical Engineering', 'Chemical'));

  // 10. Robotics and Automation
  assert.ok(matchDepartment('Robotics and Automation', 'Robotics and Automation'));
  assert.ok(matchDepartment('Robotics & Automation', 'Robotics and Automation'));

  // "all" matches any department
  assert.ok(matchDepartment('Civil Engineering', 'all'));
  assert.ok(matchDepartment('Mechanical', 'All'));
});

test('matchTestDepartment handles open institutional and department-restricted tests', () => {
  const openTest = { assignedDepartments: ['all'] };
  assert.ok(matchTestDepartment(openTest, 'Mechanical'));

  const emptyTest = { assignedDepartments: [] };
  assert.ok(matchTestDepartment(emptyTest, 'Civil'));

  const restrictedTest = { assignedDepartments: ['Computer Engineering'] };
  assert.ok(matchTestDepartment(restrictedTest, 'Computer Engineering'));
  assert.ok(!matchTestDepartment(restrictedTest, 'Mechanical'));
});

// ---------------------------------------------------------------------------
// 4. CSV EXPORT IMPLEMENTATION & RFC 4180 COMPLIANCE
// ---------------------------------------------------------------------------
console.log('\n--- 4. CSV EXPORT IMPLEMENTATION & RFC 4180 COMPLIANCE ---');

test('RFC 4180 escapeCsv escapes quotes and wraps correctly', () => {
  assert.strictEqual(escapeCsv('Simple Text'), '"Simple Text"');
  assert.strictEqual(escapeCsv('Contains, comma'), '"Contains, comma"');
  assert.strictEqual(escapeCsv('Contains "quotes" inside'), '"Contains ""quotes"" inside"');
  assert.strictEqual(escapeCsv('Line1\nLine2'), '"Line1\nLine2"');
  assert.strictEqual(escapeCsv(null), '""');
  assert.strictEqual(escapeCsv(undefined), '""');
});

test('buildCsvContent prefixes UTF-8 BOM and joins with CRLF', () => {
  const headers = ['Name', 'Email'];
  const rows = [['John Doe', 'john@kkwagh.edu.in']];
  const csv = buildCsvContent(headers, rows);
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
  assert.ok(csv.includes('\r\n'), 'CSV lines must be joined with CRLF');
  assert.ok(csv.includes('"John Doe","john@kkwagh.edu.in"'));
});

test('CSV Export for Tab 1 (Test-Wise Results - Attempt level) has correct columns', () => {
  const mockAttempts = [
    {
      studentName: 'Alice Smith',
      studentEmail: 'alice@kkwagh.edu.in',
      studentId: 'STU-001',
      department: 'Computer Engineering',
      testTitle: 'TCS NQT 2024',
      score: 14,
      totalMarks: 15,
      accuracy: 93,
      attemptNumber: 1,
      status: 'completed',
      result: 'Passed',
      submissionTime: '2026-10-25T10:00:00Z'
    },
    {
      studentName: 'Bob Jones',
      studentEmail: 'bob@kkwagh.edu.in',
      studentId: 'STU-002',
      department: 'Mechanical',
      testTitle: 'TCS NQT 2024',
      score: 8,
      totalMarks: 15,
      accuracy: 53,
      attemptNumber: 1,
      status: 'completed',
      result: 'Needs Review',
      submissionTime: '2026-10-25T11:00:00Z'
    }
  ];

  // All departments
  const exportAll = getReportExportData({
    activeTab: 'tests',
    statusFilter: 'attempted',
    selectedTestId: 'test_1',
    testAttempts: mockAttempts,
    departmentFilter: 'all'
  });

  assert.strictEqual(exportAll.headers[0], 'Candidate Name');
  assert.strictEqual(exportAll.headers[3], 'Department');
  assert.strictEqual(exportAll.headers[4], 'Mock Test Title');
  assert.strictEqual(exportAll.headers[5], 'Score');
  assert.strictEqual(exportAll.headers[7], 'Accuracy (%)');
  assert.strictEqual(exportAll.headers[8], 'Attempt Number');
  assert.strictEqual(exportAll.headers[11], 'Submission Date');
  assert.strictEqual(exportAll.rows.length, 2, 'Should export all 2 rows when departmentFilter is all');

  // Filtered by Computer Engineering
  const exportComp = getReportExportData({
    activeTab: 'tests',
    statusFilter: 'attempted',
    selectedTestId: 'test_1',
    testAttempts: mockAttempts,
    departmentFilter: 'Computer Engineering'
  });
  assert.strictEqual(exportComp.rows.length, 1, 'Should filter to 1 Computer Engineering row');
  assert.strictEqual(exportComp.rows[0][0], 'Alice Smith');
});

test('CSV Export for Tab 2 (Student Performance Report) has correct columns including Best Score', () => {
  const mockStudents = [
    {
      name: 'Charlie Brown',
      email: 'charlie@kkwagh.edu.in',
      studentId: 'STU-003',
      department: 'Information Technology',
      graduationYear: 2026,
      testsAttempted: 4,
      testsCompleted: 3,
      avgAccuracy: 78,
      bestScore: 14,
      passedCount: 3
    },
    {
      name: 'Diana Prince',
      email: 'diana@kkwagh.edu.in',
      studentId: 'STU-004',
      department: 'Electrical',
      graduationYear: 2026,
      testsAttempted: 2,
      testsCompleted: 1,
      avgAccuracy: 45,
      bestScore: 7,
      passedCount: 0
    }
  ];

  const exportStudents = getReportExportData({
    activeTab: 'students',
    studentsData: mockStudents,
    departmentFilter: 'all'
  });

  assert.deepStrictEqual(exportStudents.headers, [
    'Candidate Name',
    'Student Email',
    'Student ID',
    'Department',
    'Graduation Year',
    'Tests Attempted',
    'Completed Tests',
    'Average Accuracy (%)',
    'Best Score',
    'Pass Rate (%)',
    'Performance Tier'
  ]);
  assert.strictEqual(exportStudents.rows.length, 2);
  assert.strictEqual(exportStudents.rows[0][8], 14, 'Best Score should be exported');
  assert.strictEqual(exportStudents.rows[0][10], 'Placement Ready');
  assert.strictEqual(exportStudents.rows[1][10], 'Needs Practice');
});

test('CSV Export for Tab 3 (Attempted vs Not-Attempted) has correct columns', () => {
  const mockUnattempted = [
    {
      name: 'Evan Wright',
      email: 'evan@kkwagh.edu.in',
      studentId: 'STU-005',
      department: 'Civil',
      graduationYear: 2026
    }
  ];

  const exportUnattempted = getReportExportData({
    activeTab: 'participation',
    statusFilter: 'unattempted',
    selectedTestId: 'test_1',
    selectedTestObj: { title: 'Infosys SP Test' },
    unattemptedStudents: mockUnattempted,
    departmentFilter: 'all'
  });

  assert.deepStrictEqual(exportUnattempted.headers, [
    'Candidate Name',
    'Student Email',
    'Student ID',
    'Department',
    'Graduation Year',
    'Selected Mock Test',
    'Participation Status'
  ]);
  assert.strictEqual(exportUnattempted.rows.length, 1);
  assert.strictEqual(exportUnattempted.rows[0][5], 'Infosys SP Test');
  assert.strictEqual(exportUnattempted.rows[0][6], 'Not Attempted');
});

test('CSV Export returns empty rows and does not crash when 0 matching records', () => {
  const exportEmpty = getReportExportData({
    activeTab: 'tests',
    statusFilter: 'attempted',
    selectedTestId: 'test_1',
    testAttempts: [],
    departmentFilter: 'Mechanical'
  });

  assert.strictEqual(exportEmpty.rows.length, 0);
  assert.ok(Array.isArray(exportEmpty.headers) && exportEmpty.headers.length > 0);
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n------------------------------------------------------');
console.log(`TOTAL REPORTS TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}

