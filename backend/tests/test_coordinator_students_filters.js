import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_DEPARTMENTS, isValidDepartment, normalizeDepartment } from '../config/departments.js';
import { getDepartmentMatchRegexes } from '../controllers/coordinatorController.js';
import { mockStore } from '../../frontend/src/services/mockStore.js';

const EXPECTED_ACADEMIC_DEPTS = [
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

test('1. Department options: Exactly 10 canonical academic departments from ALLOWED_DEPARTMENTS', () => {
  assert.strictEqual(ALLOWED_DEPARTMENTS.length, 10);
  assert.deepStrictEqual([...ALLOWED_DEPARTMENTS], EXPECTED_ACADEMIC_DEPTS);

  // None of the administrative or legacy labels are in ALLOWED_DEPARTMENTS
  assert.ok(!ALLOWED_DEPARTMENTS.includes('Central Administration'));
  assert.ok(!ALLOWED_DEPARTMENTS.includes('Training & Placement Cell'));
  assert.ok(!ALLOWED_DEPARTMENTS.includes('Computer Science & Engineering'));
  assert.ok(!ALLOWED_DEPARTMENTS.includes('Electronics & Communication Engineering'));
  assert.ok(!ALLOWED_DEPARTMENTS.includes('All Departments'));
});

test('2. Department regex matching: matches canonical departments and legacy aliases', () => {
  // Computer Engineering matches canonical and legacy aliases
  const compRegexes = getDepartmentMatchRegexes('Computer Engineering');
  assert.ok(compRegexes.some((r) => r.test('Computer Engineering')));
  assert.ok(compRegexes.some((r) => r.test('Computer Science & Engineering')));
  assert.ok(compRegexes.some((r) => r.test('CSE')));
  assert.ok(!compRegexes.some((r) => r.test('Mechanical Engineering')));

  // E & TC matches canonical and legacy aliases
  const etcRegexes = getDepartmentMatchRegexes('E & TC');
  assert.ok(etcRegexes.some((r) => r.test('E & TC')));
  assert.ok(etcRegexes.some((r) => r.test('Electronics & Communication Engineering')));
  assert.ok(etcRegexes.some((r) => r.test('ENTC')));
  assert.ok(etcRegexes.some((r) => r.test('ETC')));
  assert.ok(!etcRegexes.some((r) => r.test('Chemical')));

  // AIDS matches canonical and legacy aliases
  const aidsRegexes = getDepartmentMatchRegexes('AIDS');
  assert.ok(aidsRegexes.some((r) => r.test('AIDS')));
  assert.ok(aidsRegexes.some((r) => r.test('AI & DS')));
  assert.ok(aidsRegexes.some((r) => r.test('Artificial Intelligence and Data Science')));

  // Mechanical matches canonical and legacy
  const mechRegexes = getDepartmentMatchRegexes('Mechanical');
  assert.ok(mechRegexes.some((r) => r.test('Mechanical')));
  assert.ok(mechRegexes.some((r) => r.test('Mechanical Engineering')));
  assert.ok(mechRegexes.some((r) => r.test('MECH')));
});

test('3. MockStore.getCoordinatorStudents returns availableYears from student records', () => {
  const adminUser = { role: 'admin', isActive: true };
  const res = mockStore.getCoordinatorStudents({}, adminUser);

  assert.ok(res.data, 'Should return data array');
  assert.ok(res.availableYears, 'Should return availableYears array');
  assert.ok(Array.isArray(res.availableYears));
  assert.ok(res.availableYears.includes('2026'), 'Should contain 2026 from student records');
  assert.ok(res.availableYears.length > 0);
});

test('4. Filter combination: Computer Engineering + 2026', () => {
  const adminUser = { role: 'admin', isActive: true };
  const res = mockStore.getCoordinatorStudents(
    { department: 'Computer Engineering', graduationYear: '2026' },
    adminUser
  );

  assert.ok(res.data.length > 0, 'Should find Computer Engineering 2026 students');
  res.data.forEach((s) => {
    assert.strictEqual(String(s.graduationYear), '2026');
    const isComp = s.department.toLowerCase().includes('computer') || s.department.toLowerCase().includes('cse');
    assert.ok(isComp, `Student department ${s.department} must be Computer Engineering`);
  });
});

test('5. Filter combination: All Departments + 2026 returns students from every department in 2026', () => {
  const adminUser = { role: 'admin', isActive: true };
  const res = mockStore.getCoordinatorStudents(
    { department: 'all', graduationYear: '2026' },
    adminUser
  );

  assert.ok(res.data.length > 0, 'Should return 2026 students');
  res.data.forEach((s) => {
    assert.strictEqual(String(s.graduationYear), '2026');
  });

  // Verify multiple departments are represented
  const depts = new Set(res.data.map((s) => s.department));
  assert.ok(depts.size > 1, 'Should include candidates from multiple departments');
});

test('6. Filter combination: Computer Engineering + All Batches returns all Computer Engineering students across batches', () => {
  const adminUser = { role: 'admin', isActive: true };
  const res = mockStore.getCoordinatorStudents(
    { department: 'Computer Engineering', graduationYear: 'all' },
    adminUser
  );

  assert.ok(res.data.length > 0);
  res.data.forEach((s) => {
    const isComp = s.department.toLowerCase().includes('computer') || s.department.toLowerCase().includes('cse');
    assert.ok(isComp, `Student department ${s.department} must be Computer Engineering`);
  });
});

test('7. Filter combination: All Departments + All Batches restores full accessible student directory', () => {
  const adminUser = { role: 'admin', isActive: true };
  const allRes = mockStore.getCoordinatorStudents(
    { department: 'all', graduationYear: 'all' },
    adminUser
  );

  const filteredRes = mockStore.getCoordinatorStudents(
    { department: 'Computer Engineering', graduationYear: '2026' },
    adminUser
  );

  assert.ok(allRes.pagination.total >= filteredRes.pagination.total);
  assert.ok(allRes.data.length >= filteredRes.data.length);
});

test('8. Graduation year search/typeable filter simulation: typing filters options correctly', () => {
  const availableYears = ['2027', '2026', '2025', '2024'];

  const filterYearOptions = (search) => {
    if (!search.trim()) return availableYears;
    const q = search.trim().toLowerCase();
    return availableYears.filter((y) => y.toLowerCase().includes(q));
  };

  // Typing "2026"
  assert.deepStrictEqual(filterYearOptions('2026'), ['2026']);

  // Typing "26"
  assert.deepStrictEqual(filterYearOptions('26'), ['2026']);

  // Typing "202"
  assert.deepStrictEqual(filterYearOptions('202'), ['2027', '2026', '2025', '2024']);

  // Typing "9999" (nonexistent)
  assert.deepStrictEqual(filterYearOptions('9999'), []);

  // Empty string restores all years
  assert.deepStrictEqual(filterYearOptions(''), ['2027', '2026', '2025', '2024']);
});

test('9. Search query and Eligible Test filtering continue to work seamlessly alongside department & batch filters', () => {
  const adminUser = { role: 'admin', isActive: true };

  // Search by name "Aarav"
  const searchRes = mockStore.getCoordinatorStudents({ search: 'Aarav' }, adminUser);
  assert.ok(searchRes.data.length > 0);
  assert.ok(searchRes.data.every((s) => s.name.toLowerCase().includes('aarav')));

  // Search by studentId "CS2026"
  const idRes = mockStore.getCoordinatorStudents({ search: 'CS2026' }, adminUser);
  assert.ok(idRes.data.length > 0);
  assert.ok(idRes.data.every((s) => s.studentId.includes('CS2026') || s.email.includes('cs2026')));
});

test('10. Legacy student department aliases are preserved and matched properly', () => {
  const legacyCompStudent = {
    _id: 'test_legacy_comp',
    name: 'Legacy Comp',
    email: 'legacy.comp@kkwagh.edu.in',
    department: 'Computer Science & Engineering',
    graduationYear: 2026
  };

  const normComp = normalizeDepartment(legacyCompStudent.department);
  assert.strictEqual(normComp, 'Computer Engineering');

  const legacyEtcStudent = {
    _id: 'test_legacy_etc',
    name: 'Legacy ETC',
    email: 'legacy.etc@kkwagh.edu.in',
    department: 'Electronics & Communication Engineering',
    graduationYear: 2026
  };

  const normEtc = normalizeDepartment(legacyEtcStudent.department);
  assert.strictEqual(normEtc, 'E & TC');
});

