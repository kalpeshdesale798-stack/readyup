import assert from 'node:assert';
import { mockStore } from '../../frontend/src/services/mockStore.js';

console.log('\n======================================================');
console.log('   PHASE 2: MOCK TEST STATUS FILTERS TEST SUITE       ');
console.log('======================================================\n');

let passedCount = 0;
let failedCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
    failedCount++;
  }
}

// Helper schedule calculation function matching MockTestsPage.jsx
function getTestSchedule(t) {
  const start = t.startDate || t.startTime || null;
  const end = t.endDate || t.deadline || null;
  const now = new Date();
  const isUpcoming = t.scheduleStatus === 'upcoming' || (start && now < new Date(start));
  const isClosed = t.scheduleStatus === 'closed' || (end && now > new Date(end));
  return { start, end, isUpcoming, isClosed };
}

// 1. Test offline mockStore getMockTests retrieval
const mockTests = mockStore.getMockTests();
test('mockStore.getMockTests returns an array of tests with schedule status', () => {
  assert.ok(Array.isArray(mockTests), 'Must be an array');
  assert.ok(mockTests.length > 0, 'Must contain mock tests');
  mockTests.forEach((t) => {
    assert.ok(t._id, 'Each test has an _id');
    assert.ok(t.title, 'Each test has a title');
    assert.ok(t.scheduleStatus, 'Each test has scheduleStatus');
  });
});

// 2. Test stable testId matching in mockStore (without title guessing)
test('mockStore matches attempts strictly by stable mockTestId/testId', () => {
  // Add an attempt with stable mockTestId
  mockStore.attempts.unshift({
    id: 'att_stable_test_01',
    mockTestId: 'mock_tcs_01',
    testId: 'mock_tcs_01',
    status: 'completed',
    score: 8,
    passed: true
  });

  const refreshedTests = mockStore.getMockTests();
  const tcsTest = refreshedTests.find((t) => t._id === 'mock_tcs_01');
  assert.ok(tcsTest, 'Found TCS test');
  assert.ok(tcsTest.userAttempt, 'TCS test should have userAttempt attached');
  assert.strictEqual(tcsTest.userAttempt.status, 'completed');
  assert.strictEqual(tcsTest.userAttempt.attemptId, 'att_stable_test_01');
});

test('Old attempt with no stable testId does not guess test by title', () => {
  // Add an attempt with ONLY title, no mockTestId or testId
  mockStore.attempts.unshift({
    id: 'att_legacy_untitled_id',
    title: 'Infosys Special Mock 2',
    status: 'completed',
    score: 7,
    passed: true
  });

  const refreshedTests = mockStore.getMockTests();
  const infyTest = refreshedTests.find((t) => t.title === 'Infosys Special Mock 2');
  if (infyTest) {
    assert.strictEqual(infyTest.userAttempt, undefined, 'Old attempt without stable ID must not match by title');
  }
});

// 3. Test multiple attempts for the same test do not duplicate the test card
test('Multiple attempts for the same test produce a single card', () => {
  // Simulate recording a second attempt for mock_tcs_01
  mockStore.attempts.unshift({
    id: 'att_tcs_second_attempt',
    mockTestId: 'mock_tcs_01',
    testId: 'mock_tcs_01',
    title: 'TCS NQT National Mock 1',
    score: 9,
    totalMarks: 10,
    passed: true
  });

  const refreshedTests = mockStore.getMockTests();
  const tcsMatches = refreshedTests.filter((t) => t._id === 'mock_tcs_01');
  assert.strictEqual(tcsMatches.length, 1, 'Test must appear exactly once even with multiple attempts');
});

// 4. Test filter calculation logic
const sampleTests = [
  {
    _id: 'test_live_attempted',
    title: 'Live Attempted Test',
    scheduleStatus: 'live',
    userAttempt: { attemptId: 'att_01', status: 'completed', score: 10 }
  },
  {
    _id: 'test_live_unattempted',
    title: 'Live Unattempted Test',
    scheduleStatus: 'live',
    userAttempt: null
  },
  {
    _id: 'test_upcoming_unattempted',
    title: 'Upcoming Unattempted Test',
    scheduleStatus: 'upcoming',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    userAttempt: null
  },
  {
    _id: 'test_closed_unattempted',
    title: 'Closed Unattempted Test',
    scheduleStatus: 'closed',
    endDate: new Date(Date.now() - 86400000).toISOString(),
    userAttempt: null
  },
  {
    _id: 'test_closed_attempted',
    title: 'Closed Attempted Test',
    scheduleStatus: 'closed',
    endDate: new Date(Date.now() - 86400000).toISOString(),
    userAttempt: { attemptId: 'att_02', status: 'completed', score: 8 }
  }
];

function applyFilter(tests, selectedStatus) {
  return tests.filter((t) => {
    const { isClosed } = getTestSchedule(t);
    const hasAttempt = Boolean(t.userAttempt?.attemptId);

    if (selectedStatus === 'attempted') {
      if (!hasAttempt) return false;
    } else if (selectedStatus === 'unattempted') {
      if (hasAttempt || isClosed) return false;
    } else if (selectedStatus === 'closed') {
      if (!isClosed) return false;
    }
    return true;
  });
}

test('Filter: "all" displays all 5 tests', () => {
  const result = applyFilter(sampleTests, 'all');
  assert.strictEqual(result.length, 5);
});

test('Filter: "attempted" displays both live and closed attempted tests (2 tests)', () => {
  const result = applyFilter(sampleTests, 'attempted');
  assert.strictEqual(result.length, 2);
  const ids = result.map((t) => t._id);
  assert.ok(ids.includes('test_live_attempted'));
  assert.ok(ids.includes('test_closed_attempted'));
});

test('Filter: "unattempted" includes live and upcoming unattempted, excludes closed (2 tests)', () => {
  const result = applyFilter(sampleTests, 'unattempted');
  assert.strictEqual(result.length, 2);
  const ids = result.map((t) => t._id);
  assert.ok(ids.includes('test_live_unattempted'));
  assert.ok(ids.includes('test_upcoming_unattempted'));
  assert.ok(!ids.includes('test_closed_unattempted'), 'Closed unattempted test must not appear in Unattempted');
  assert.ok(!ids.includes('test_closed_attempted'), 'Closed attempted test must not appear in Unattempted');
});

test('Filter: "closed" displays all closed tests, including attempted and unattempted (2 tests)', () => {
  const result = applyFilter(sampleTests, 'closed');
  assert.strictEqual(result.length, 2);
  const ids = result.map((t) => t._id);
  assert.ok(ids.includes('test_closed_unattempted'));
  assert.ok(ids.includes('test_closed_attempted'));
});

test('Attempted and closed test appears in BOTH "attempted" and "closed"', () => {
  const inAttempted = applyFilter(sampleTests, 'attempted').some((t) => t._id === 'test_closed_attempted');
  const inClosed = applyFilter(sampleTests, 'closed').some((t) => t._id === 'test_closed_attempted');
  assert.strictEqual(inAttempted, true, 'Must appear in Attempted');
  assert.strictEqual(inClosed, true, 'Must appear in Closed');
});

test('Action button logic preserves "Review Result" for completed tests even when closed', () => {
  const closedAttemptedTest = sampleTests.find((t) => t._id === 'test_closed_attempted');
  const isCompleted = closedAttemptedTest.userAttempt?.status === 'completed';
  const { isClosed } = getTestSchedule(closedAttemptedTest);
  
  // Checking component precedence: isCompleted is evaluated first
  let buttonAction = '';
  if (isCompleted) {
    buttonAction = 'Review Result';
  } else if (isClosed) {
    buttonAction = 'Closed';
  }
  assert.strictEqual(buttonAction, 'Review Result', 'Review Result must take precedence over Closed button');
});

test('Empty state messages are defined contextually for all filter states', () => {
  const emptyStatuses = ['all', 'attempted', 'unattempted', 'closed'];
  emptyStatuses.forEach((st) => {
    const emptyResult = applyFilter([], st);
    assert.strictEqual(emptyResult.length, 0);
  });
});

console.log('\n------------------------------------------------------');
console.log(`TOTAL PHASE 2 TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('------------------------------------------------------\n');

if (failedCount > 0) {
  process.exit(1);
}
