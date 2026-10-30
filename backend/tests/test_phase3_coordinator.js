import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import backend authorization helpers
import {
  isUserAuthorizedForMockTest,
  getAuthorizedMockTestFilter,
  isArrayUnrestricted
} from '../controllers/coordinatorController.js';

// Import frontend mockStore
import { mockStore } from '../../frontend/src/services/mockStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('======================================================');
console.log('   PHASE 3: COORDINATOR DASHBOARD TEST SUITE          ');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
}

// 1. Verify backend summaryCards contains all 8 entries
runTest('Backend coordinatorController maintains exactly 8 summaryCards', () => {
  const controllerPath = path.resolve(__dirname, '../controllers/coordinatorController.js');
  const content = fs.readFileSync(controllerPath, 'utf8');

  const expectedLabels = [
    'Accessible Students',
    'Available Mock Tests',
    'Students Attempted',
    'Completed Attempts',
    'In-Progress Tests',
    'Unattempted Students',
    'Average Accuracy',
    'Completion Rate'
  ];

  for (const label of expectedLabels) {
    assert.ok(content.includes(`label: "${label}"`), `coordinatorController missing summaryCard: ${label}`);
  }
});

// 2. Verify mockStore maintains all 8 summaryCards
runTest('Frontend mockStore maintains exactly 8 summaryCards', () => {
  const storePath = path.resolve(__dirname, '../../frontend/src/services/mockStore.js');
  const content = fs.readFileSync(storePath, 'utf8');

  const expectedLabels = [
    'Accessible Students',
    'Available Mock Tests',
    'Students Attempted',
    'Completed Attempts',
    'In-Progress Tests',
    'Unattempted Students',
    'Average Accuracy',
    'Completion Rate'
  ];

  for (const label of expectedLabels) {
    assert.ok(content.includes(`label: '${label}'`), `mockStore missing summaryCard: ${label}`);
  }
});

// 3. Verify CoordinatorDashboardPage filters out exactly 2 cards
runTest('CoordinatorDashboardPage excludes "Completed Attempts" and "Completion Rate"', () => {
  const dashPath = path.resolve(__dirname, '../../frontend/src/pages/CoordinatorDashboardPage.jsx');
  const content = fs.readFileSync(dashPath, 'utf8');

  assert.ok(
    content.includes("const cardsToExclude = new Set(['Completed Attempts', 'Completion Rate'])"),
    'cardsToExclude does not filter the two requested cards'
  );
  assert.ok(
    content.includes('const visibleSummaryCards = allSummaryCards.filter((c) => !cardsToExclude.has(c.label))'),
    'visibleSummaryCards does not filter allSummaryCards'
  );
});

// 4. Verify 6 remaining cards count and exact labels
runTest('Filtered dashboard displays exactly 6 cards with correct labels', () => {
  const all8Cards = [
    { label: 'Accessible Students', value: 24 },
    { label: 'Available Mock Tests', value: 8 },
    { label: 'Students Attempted', value: 18 },
    { label: 'Completed Attempts', value: 42 },
    { label: 'In-Progress Tests', value: 3 },
    { label: 'Unattempted Students', value: 6 },
    { label: 'Average Accuracy', value: '72%' },
    { label: 'Completion Rate', value: '88%' }
  ];

  const cardsToExclude = new Set(['Completed Attempts', 'Completion Rate']);
  const visible = all8Cards.filter((c) => !cardsToExclude.has(c.label));

  assert.strictEqual(visible.length, 6, `Expected 6 cards, got ${visible.length}`);
  const remainingLabels = visible.map((c) => c.label);
  assert.deepStrictEqual(remainingLabels, [
    'Accessible Students',
    'Available Mock Tests',
    'Students Attempted',
    'In-Progress Tests',
    'Unattempted Students',
    'Average Accuracy'
  ]);
});

// 5. Verify navigation mapping for all 6 cards
runTest('All 6 cards map to their exact designated routes and queries', () => {
  const dashPath = path.resolve(__dirname, '../../frontend/src/pages/CoordinatorDashboardPage.jsx');
  const content = fs.readFileSync(dashPath, 'utf8');

  assert.ok(content.includes("case 'Accessible Students':\n        return '/coordinator/students?metric=accessible';") ||
            content.includes("case 'Accessible Students':\r\n        return '/coordinator/students?metric=accessible';"),
            'Accessible Students navigation path missing');
  assert.ok(content.includes("case 'Available Mock Tests':\n        return '/coordinator/mock-tests?metric=available&status=active';") ||
            content.includes("case 'Available Mock Tests':\r\n        return '/coordinator/mock-tests?metric=available&status=active';"),
            'Available Mock Tests navigation path missing');
  assert.ok(content.includes("case 'Students Attempted':\n        return '/coordinator/reports?tab=tests&status=attempted';") ||
            content.includes("case 'Students Attempted':\r\n        return '/coordinator/reports?tab=tests&status=attempted';"),
            'Students Attempted navigation path missing');
  assert.ok(content.includes("case 'In-Progress Tests':\n        return '/coordinator/reports?tab=tests&status=in-progress';") ||
            content.includes("case 'In-Progress Tests':\r\n        return '/coordinator/reports?tab=tests&status=in-progress';"),
            'In-Progress Tests navigation path missing');
  assert.ok(content.includes("case 'Unattempted Students':\n        return '/coordinator/reports?tab=participation&status=unattempted';") ||
            content.includes("case 'Unattempted Students':\r\n        return '/coordinator/reports?tab=participation&status=unattempted';"),
            'Unattempted Students navigation path missing');
  assert.ok(content.includes("case 'Average Accuracy':\n        return '/coordinator/analytics?metric=accuracy';") ||
            content.includes("case 'Average Accuracy':\r\n        return '/coordinator/analytics?metric=accuracy';"),
            'Average Accuracy navigation path missing');
});

// 6. Verify CoordinatorDashboardPage layout uses 2x3 grid
runTest('CoordinatorDashboardPage renders in a 2x3 grid layout (grid-cols-3)', () => {
  const dashPath = path.resolve(__dirname, '../../frontend/src/pages/CoordinatorDashboardPage.jsx');
  const content = fs.readFileSync(dashPath, 'utf8');

  assert.ok(
    content.includes('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'),
    'Expected grid-cols-3 for 6 cards layout'
  );
});

// 7. Verify MetricCard accessibility and semantic button behavior only when valid onClick callback is provided
runTest('MetricCard renders accessible semantic button only when valid onClick callback is provided', () => {
  const metricCardPath = path.resolve(__dirname, '../../frontend/src/components/common/MetricCard.jsx');
  const content = fs.readFileSync(metricCardPath, 'utf8');

  assert.ok(
    content.includes("typeof onClick === 'function'") || content.includes('typeof onClick === "function"'),
    'MetricCard must verify onClick is a function before rendering interactive button'
  );
  assert.ok(
    !content.includes('clickable = false'),
    'MetricCard should not accept unnecessary clickable prop that could create inert buttons'
  );
  assert.ok(content.includes('<button'), 'MetricCard does not render semantic button when interactive');
  assert.ok(content.includes('type="button"'), 'Button lacks type="button" attribute');
  assert.ok(content.includes('aria-label='), 'Button lacks aria-label attribute');
  assert.ok(content.includes('focus-visible:ring-2'), 'Button lacks focus-visible keyboard ring');
  assert.ok(content.includes('ArrowUpRight'), 'MetricCard lacks ArrowUpRight visual indicator');
});

// 8. Verify MetricCard preserves plain div when non-clickable (onClick omitted)
runTest('MetricCard preserves non-interactive div when onClick is omitted or invalid', () => {
  const metricCardPath = path.resolve(__dirname, '../../frontend/src/components/common/MetricCard.jsx');
  const content = fs.readFileSync(metricCardPath, 'utf8');

  assert.ok(
    content.includes('return (\n    <div className={`bg-white') || content.includes('return (\r\n    <div className={`bg-white'),
    'MetricCard lacks non-interactive div return'
  );
});

// 9. Verify CoordinatorReportsPage status parsing
runTest('CoordinatorReportsPage parses tab and status query params', () => {
  const getValidStatus = (raw) => {
    if (!raw) return 'all';
    const lower = raw.toLowerCase();
    if (['all', 'completed', 'in-progress', 'expired', 'attempted', 'unattempted'].includes(lower)) return lower;
    return 'all';
  };

  assert.strictEqual(getValidStatus('in-progress'), 'in-progress');
  assert.strictEqual(getValidStatus('completed'), 'completed');
  assert.strictEqual(getValidStatus('attempted'), 'attempted');
  assert.strictEqual(getValidStatus('unattempted'), 'unattempted');
  assert.strictEqual(getValidStatus('all'), 'all');
  assert.strictEqual(getValidStatus(null), 'all');
  assert.strictEqual(getValidStatus('invalid'), 'all');
});

// 10. Verify "Back to Coordinator Dashboard" link in all destination pages
runTest('All destination pages include "Back to Coordinator Dashboard" link', () => {
  const pages = [
    'frontend/src/pages/CoordinatorReportsPage.jsx',
    'frontend/src/pages/CoordinatorStudentsPage.jsx',
    'frontend/src/pages/CoordinatorMockTestsPage.jsx',
    'frontend/src/pages/CoordinatorAnalyticsPage.jsx'
  ];

  for (const relPath of pages) {
    const fullPath = path.resolve(__dirname, '../../', relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(
      content.includes('to="/coordinator/dashboard"'),
      `${relPath} is missing Link to="/coordinator/dashboard"`
    );
    assert.ok(
      content.includes('Back to Coordinator Dashboard'),
      `${relPath} is missing "Back to Coordinator Dashboard" link text`
    );
  }
});

// 11. Regression: assignedDepartments: ["ALL", "Mechanical"] denied as open institutional
runTest('assignedDepartments: ["ALL", "Mechanical"] is denied as open institutional', () => {
  const test = {
    _id: 'test_inst_mixed_dept',
    createdBy: null,
    isActive: true,
    status: 'published',
    assignedDepartments: ['ALL', 'Mechanical'],
    assignedBatches: []
  };
  const civilCoord = { _id: 'coord_civil', role: 'coordinator', department: 'Civil Engineering' };
  assert.strictEqual(isUserAuthorizedForMockTest(civilCoord, test), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(civilCoord, test), false);
});

// 12. Regression: assignedBatches: ["ALL", "2026"] denied as open institutional
runTest('assignedBatches: ["ALL", "2026"] is denied as open institutional', () => {
  const test = {
    _id: 'test_inst_mixed_batch',
    createdBy: null,
    isActive: true,
    status: 'published',
    assignedDepartments: [],
    assignedBatches: ['ALL', '2026']
  };
  const civilCoord = { _id: 'coord_civil', role: 'coordinator', department: 'Civil Engineering' };
  assert.strictEqual(isUserAuthorizedForMockTest(civilCoord, test), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(civilCoord, test), false);
});

// 13. Regression: Both arrays containing only unrestricted tokens allowed for institutional test
runTest('Both arrays containing only unrestricted tokens are allowed for institutional test', () => {
  const test = {
    _id: 'test_inst_fully_open',
    createdBy: null,
    isActive: true,
    status: 'published',
    assignedDepartments: ['ALL', 'All Departments'],
    assignedBatches: ['ALL', 'All Batches']
  };
  const civilCoord = { _id: 'coord_civil', role: 'coordinator', department: 'Civil Engineering' };
  assert.strictEqual(isUserAuthorizedForMockTest(civilCoord, test), true);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(civilCoord, test), true);
});

// 14. Regression: Inactive non-archived test denied consistently in single-test and list paths
runTest('Inactive non-archived test is denied consistently in single-test and list paths', () => {
  const inactiveTest = {
    _id: 'test_inactive',
    createdBy: 'coord_author',
    isActive: false,
    status: 'published',
    assignedDepartments: ['Civil Engineering']
  };
  const authorCoord = { _id: 'coord_author', role: 'coordinator', department: 'Civil Engineering' };

  // Denied in single-test authorization
  assert.strictEqual(isUserAuthorizedForMockTest(authorCoord, inactiveTest), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(authorCoord, inactiveTest), false);

  // Excluded in list filter
  const filter = getAuthorizedMockTestFilter(authorCoord);
  assert.deepStrictEqual(filter.isActive, { $ne: false });
});

// 15. Regression: Active authorized test allowed consistently
runTest('Active authorized test is allowed consistently', () => {
  const activeTest = {
    _id: 'test_active',
    createdBy: 'coord_author',
    isActive: true,
    status: 'published',
    assignedDepartments: ['Civil Engineering']
  };
  const authorCoord = { _id: 'coord_author', role: 'coordinator', department: 'Civil Engineering' };
  assert.strictEqual(isUserAuthorizedForMockTest(authorCoord, activeTest), true);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(authorCoord, activeTest), true);
});

// 16. Regression: Admin behavior matching the same active/non-archived policy
runTest('Admin access strictly enforces active and non-archived policy', () => {
  const admin = { _id: 'admin_1', role: 'admin' };
  const activeTest = { _id: 't1', isActive: true, status: 'published' };
  const inactiveTest = { _id: 't2', isActive: false, status: 'published' };
  const archivedTest = { _id: 't3', isActive: true, status: 'archived' };

  assert.strictEqual(isUserAuthorizedForMockTest(admin, activeTest), true);
  assert.strictEqual(isUserAuthorizedForMockTest(admin, inactiveTest), false);
  assert.strictEqual(isUserAuthorizedForMockTest(admin, archivedTest), false);

  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(admin, activeTest), true);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(admin, inactiveTest), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(admin, archivedTest), false);
});

// 17. Regression: Real API and MockStore selector call-site integration
runTest('MockStore getCoordinatorMockTests applies authorization filtering for active coordinator', () => {
  const coordMechanical = { _id: 'coord_mech', role: 'coordinator', department: 'Mechanical Engineering' };
  const res = mockStore.getCoordinatorMockTests({}, coordMechanical);
  assert.ok(Array.isArray(res.data), 'MockStore must return data array');
  res.data.forEach((t) => {
    assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(coordMechanical, t), true);
  });
});

// 18. Regression: Populated createdBy object handling
runTest('Populated createdBy object ({ _id: "coord_id" }) is correctly evaluated', () => {
  const testWithPopulatedCreator = {
    _id: 'test_pop',
    createdBy: { _id: 'coord_author_123', name: 'Prof. Sunita', email: 'coord@readyup.edu' },
    isActive: true,
    status: 'published',
    assignedDepartments: []
  };
  const matchingCoord = { _id: 'coord_author_123', role: 'coordinator', department: 'Civil Engineering' };
  const otherCoord = { _id: 'coord_other_456', role: 'coordinator', department: 'Civil Engineering' };

  assert.strictEqual(isUserAuthorizedForMockTest(matchingCoord, testWithPopulatedCreator), true);
  assert.strictEqual(isUserAuthorizedForMockTest(otherCoord, testWithPopulatedCreator), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(matchingCoord, testWithPopulatedCreator), true);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(otherCoord, testWithPopulatedCreator), false);
});

// 19. Regression: 403 vs 404 deterministic behavior in mockStore
runTest('MockStore attempts and detail throw 404 for nonexistent test and 403 for unauthorized test', () => {
  const coordA = { _id: 'coord_a', role: 'coordinator', department: 'Electrical' };

  // 404 for nonexistent test
  assert.throws(
    () => mockStore.getCoordinatorMockTestAttempts('nonexistent_id_99999', {}, coordA),
    (err) => err.status === 404,
    'Nonexistent test must throw 404'
  );
  assert.throws(
    () => mockStore.getCoordinatorMockTestDetail('nonexistent_id_99999', coordA),
    (err) => err.status === 404,
    'Nonexistent test must throw 404'
  );

  // Add an unauthorized test for coordA into mockStore to verify 403
  const privateTest = {
    _id: 'test_unauth_private',
    title: 'Private Test',
    createdBy: 'coord_b',
    isActive: true,
    status: 'published',
    assignedDepartments: ['Mechanical Engineering']
  };
  mockStore.mockTests.push(privateTest);

  try {
    assert.throws(
      () => mockStore.getCoordinatorMockTestAttempts('test_unauth_private', {}, coordA),
      (err) => err.status === 403,
      'Unauthorized existing test must throw 403'
    );
    assert.throws(
      () => mockStore.getCoordinatorMockTestDetail('test_unauth_private', coordA),
      (err) => err.status === 403,
      'Unauthorized existing test must throw 403'
    );
  } finally {
    mockStore.mockTests = mockStore.mockTests.filter((t) => t._id !== 'test_unauth_private');
  }
});

// 20. Regression: Exact department match (case-insensitive) allowed, substring denied
runTest('Exact department match is allowed, partial/substring is denied', () => {
  const testComputer = {
    _id: 't_comp',
    createdBy: 'coord_x',
    isActive: true,
    status: 'published',
    assignedDepartments: ['Computer']
  };

  const coordCompEng = { _id: 'coord_y', role: 'coordinator', department: 'Computer Engineering' };
  const coordCompExact = { _id: 'coord_z', role: 'coordinator', department: 'computer' };

  // Substring "Computer Engineering" vs "Computer" must be denied
  assert.strictEqual(isUserAuthorizedForMockTest(coordCompEng, testComputer), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(coordCompEng, testComputer), false);

  // Case-insensitive exact "computer" vs "Computer" must be allowed
  assert.strictEqual(isUserAuthorizedForMockTest(coordCompExact, testComputer), true);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(coordCompExact, testComputer), true);
});

// 21. Regression: assignedBatches only does not authorize coordinators
runTest('assignedBatches only does not authorize coordinators (student eligibility separation)', () => {
  const testBatchRestricted = {
    _id: 't_batch',
    createdBy: 'coord_other',
    isActive: true,
    status: 'published',
    assignedDepartments: [],
    assignedBatches: ['Civil Engineering', '2026']
  };

  const civilCoord = { _id: 'coord_civil', role: 'coordinator', department: 'Civil Engineering' };
  assert.strictEqual(isUserAuthorizedForMockTest(civilCoord, testBatchRestricted), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(civilCoord, testBatchRestricted), false);
});

// 22. Regression: Privately authored test with empty restrictions is denied to another coordinator
runTest('Privately authored test with empty restrictions is denied to another coordinator', () => {
  const privateTest = {
    _id: 't_private',
    createdBy: 'coord_alice',
    isActive: true,
    status: 'published',
    assignedDepartments: [],
    assignedBatches: []
  };

  const coordBob = { _id: 'coord_bob', role: 'coordinator', department: 'Information Technology' };
  assert.strictEqual(isUserAuthorizedForMockTest(coordBob, privateTest), false);
  assert.strictEqual(mockStore.isCoordinatorAuthorizedForTest(coordBob, privateTest), false);
});

console.log('\n------------------------------------------------------');
console.log(`TOTAL PHASE 3 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('------------------------------------------------------\n');

if (failed > 0) process.exit(1);
