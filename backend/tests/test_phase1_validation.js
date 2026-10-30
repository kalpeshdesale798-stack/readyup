import assert from 'node:assert';
import { ALLOWED_DEPARTMENTS, isValidDepartment } from '../config/departments.js';
import { isValidInstitutionalEmail, normalizeEmail } from '../utils/validators.js';

console.log('\n======================================================');
console.log('   PHASE 1: INSTITUTIONAL EMAIL & DEPARTMENT TESTS    ');
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

// 1. Institutional Email Validation Tests
test('Valid email: student@kkwagh.edu.in', () => {
  assert.strictEqual(isValidInstitutionalEmail('student@kkwagh.edu.in'), true);
});

test('Valid email with uppercase: Student.2026@KKWAGH.EDU.IN (normalized)', () => {
  const norm = normalizeEmail('Student.2026@KKWAGH.EDU.IN');
  assert.strictEqual(norm, 'student.2026@kkwagh.edu.in');
  assert.strictEqual(isValidInstitutionalEmail(norm), true);
});

test('Valid email with trimming: "  coordinator@kkwagh.edu.in  "', () => {
  const norm = normalizeEmail('  coordinator@kkwagh.edu.in  ');
  assert.strictEqual(norm, 'coordinator@kkwagh.edu.in');
  assert.strictEqual(isValidInstitutionalEmail(norm), true);
});

test('Reject invalid domain: user@gmail.com', () => {
  assert.strictEqual(isValidInstitutionalEmail('user@gmail.com'), false);
});

test('Reject invalid domain: user@yahoo.com', () => {
  assert.strictEqual(isValidInstitutionalEmail('user@yahoo.com'), false);
});

test('Reject invalid domain: user@outlook.com', () => {
  assert.strictEqual(isValidInstitutionalEmail('user@outlook.com'), false);
});

test('Reject partial domain: student@kkwagh.edu', () => {
  assert.strictEqual(isValidInstitutionalEmail('student@kkwagh.edu'), false);
});

test('Reject sub-extension attack: hacker@kkwagh.edu.in.evil.com', () => {
  assert.strictEqual(isValidInstitutionalEmail('hacker@kkwagh.edu.in.evil.com'), false);
});

test('Reject empty or non-string inputs', () => {
  assert.strictEqual(isValidInstitutionalEmail(''), false);
  assert.strictEqual(isValidInstitutionalEmail(null), false);
  assert.strictEqual(isValidInstitutionalEmail(undefined), false);
});

// 2. Department Validation Tests
test('Exactly 10 allowed departments configured', () => {
  assert.strictEqual(ALLOWED_DEPARTMENTS.length, 10);
});

const EXPECTED_DEPTS = [
  'Computer Engineering',
  'Information Technology',
  'AIDS',
  'CSD',
  'Civil',
  'Mechanical',
  'Electrical',
  'E & TC',
  'Chemical',
  'Robotics and Automation'
];

EXPECTED_DEPTS.forEach((dept) => {
  test(`Department valid: ${dept}`, () => {
    assert.strictEqual(ALLOWED_DEPARTMENTS.includes(dept), true);
    assert.strictEqual(isValidDepartment(dept), true);
  });
});

test('Reject arbitrary department: "Computer Science & Engineering"', () => {
  assert.strictEqual(isValidDepartment('Computer Science & Engineering'), false);
});

test('Reject arbitrary department: "Software Engineering"', () => {
  assert.strictEqual(isValidDepartment('Software Engineering'), false);
});

test('Reject empty department', () => {
  assert.strictEqual(isValidDepartment(''), false);
  assert.strictEqual(isValidDepartment(null), false);
});

// 3. Controller Simulation Tests for Auth logic
test('Register controller logic accepts valid institutional email & valid department', () => {
  const email = 'newstudent@kkwagh.edu.in';
  const dept = 'Computer Engineering';
  const normalized = normalizeEmail(email);
  assert.strictEqual(isValidInstitutionalEmail(normalized), true);
  assert.strictEqual(isValidDepartment(dept), true);
});

test('Register controller logic rejects non-institutional email', () => {
  const email = 'newstudent@gmail.com';
  const normalized = normalizeEmail(email);
  assert.strictEqual(isValidInstitutionalEmail(normalized), false);
});

test('Register controller logic rejects invalid department', () => {
  const dept = 'Aerospace Engineering';
  assert.strictEqual(isValidDepartment(dept), false);
});

test('Update profile logic allows approved department update', () => {
  const newDept = 'Robotics and Automation';
  const currentUserDept = 'Computer Engineering';
  const isAllowed = isValidDepartment(newDept) || currentUserDept === newDept;
  assert.strictEqual(isAllowed, true);
});

test('Update profile logic preserves legacy department when unchanged', () => {
  const legacyDept = 'Computer Science & Engineering';
  const currentUserDept = 'Computer Science & Engineering';
  const isAllowed = isValidDepartment(legacyDept) || currentUserDept === legacyDept;
  assert.strictEqual(isAllowed, true, 'Legacy department must not be overwritten or rejected if unchanged');
});

test('Update profile logic rejects arbitrary new department', () => {
  const arbitraryDept = 'Random Branch';
  const currentUserDept = 'Computer Engineering';
  const isAllowed = isValidDepartment(arbitraryDept) || currentUserDept === arbitraryDept;
  assert.strictEqual(isAllowed, false);
});

console.log('\n------------------------------------------------------');
console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('------------------------------------------------------\n');

if (failedCount > 0) {
  process.exit(1);
}

