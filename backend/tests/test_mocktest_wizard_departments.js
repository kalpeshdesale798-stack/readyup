import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_DEPARTMENTS, isValidDepartment, normalizeDepartment } from '../config/departments.js';
import { getCoordinatorDepartments } from '../controllers/coordinatorController.js';
import { isStudentEligibleForTest } from '../controllers/testController.js';

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

test('1. ALLOWED_DEPARTMENTS single source of truth contains exactly the 10 Phase 1 academic departments', () => {
  assert.strictEqual(ALLOWED_DEPARTMENTS.length, 10);
  assert.deepStrictEqual([...ALLOWED_DEPARTMENTS], EXPECTED_ACADEMIC_DEPTS);
  EXPECTED_ACADEMIC_DEPTS.forEach((dept) => {
    assert.strictEqual(isValidDepartment(dept), true, `${dept} must be valid`);
  });
});

test('2. Administrative and legacy departments are rejected by isValidDepartment', () => {
  const invalid = [
    'Central Administration',
    'Training & Placement Cell',
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'All Departments',
    'ALL'
  ];
  invalid.forEach((dept) => {
    assert.strictEqual(isValidDepartment(dept), false, `${dept} must not be a valid academic department`);
  });
});

test('3. getCoordinatorDepartments endpoint returns exactly the 10 academic departments', async () => {
  let jsonResponse = null;
  const req = {};
  const res = {
    json: (data) => {
      jsonResponse = data;
      return res;
    },
    status: () => res
  };

  await getCoordinatorDepartments(req, res);
  assert.ok(jsonResponse);
  assert.strictEqual(jsonResponse.success, true);
  assert.strictEqual(jsonResponse.data.length, 10);
  assert.deepStrictEqual(jsonResponse.data, EXPECTED_ACADEMIC_DEPTS);

  // Must NOT include administrative options or 'All Departments' in data array
  assert.ok(!jsonResponse.data.includes('Central Administration'));
  assert.ok(!jsonResponse.data.includes('Training & Placement Cell'));
  assert.ok(!jsonResponse.data.includes('Computer Science & Engineering'));
  assert.ok(!jsonResponse.data.includes('Electronics & Communication Engineering'));
  assert.ok(!jsonResponse.data.includes('All Departments'));
  assert.ok(!jsonResponse.data.includes('ALL'));
});

test('4. normalizeDepartment safely normalizes legacy department aliases and campus-wide tokens', () => {
  // Campus-wide tokens
  assert.strictEqual(normalizeDepartment('ALL'), 'ALL');
  assert.strictEqual(normalizeDepartment('all'), 'ALL');
  assert.strictEqual(normalizeDepartment('All Departments'), 'ALL');
  assert.strictEqual(normalizeDepartment('all departments'), 'ALL');

  // Exact canonical departments
  EXPECTED_ACADEMIC_DEPTS.forEach((d) => {
    assert.strictEqual(normalizeDepartment(d), d);
  });

  // Legacy mappings
  assert.strictEqual(normalizeDepartment('Computer Science & Engineering'), 'Computer Engineering');
  assert.strictEqual(normalizeDepartment('CSE'), 'Computer Engineering');
  assert.strictEqual(normalizeDepartment('Electronics & Communication Engineering'), 'E & TC');
  assert.strictEqual(normalizeDepartment('ECE'), 'E & TC');
  assert.strictEqual(normalizeDepartment('ENTC'), 'E & TC');
  assert.strictEqual(normalizeDepartment('Mechanical Engineering'), 'Mechanical');
  assert.strictEqual(normalizeDepartment('Civil Engineering'), 'Civil');
  assert.strictEqual(normalizeDepartment('Electrical Engineering'), 'Electrical');
  assert.strictEqual(normalizeDepartment('Chemical Engineering'), 'Chemical');

  // Administrative departments must be ignored/filtered out (return null)
  assert.strictEqual(normalizeDepartment('Central Administration'), null);
  assert.strictEqual(normalizeDepartment('Training & Placement Cell'), null);
  assert.strictEqual(normalizeDepartment('T&P Cell'), null);
  assert.strictEqual(normalizeDepartment('Unknown Dept'), null);
});

test('5. Student eligibility: Campus-wide test ("ALL") is open to all students across all departments', () => {
  const campusWideTest = {
    title: 'Campus Wide Test',
    assignedDepartments: ['ALL'],
    assignedBatches: ['ALL']
  };

  EXPECTED_ACADEMIC_DEPTS.forEach((dept) => {
    const student = { role: 'student', department: dept, graduationYear: 2026 };
    assert.strictEqual(
      isStudentEligibleForTest(student, campusWideTest),
      true,
      `Student in ${dept} must be eligible for campus-wide test`
    );
  });
});

test('6. Student eligibility: Restricted department targeting strictly enforces student department', () => {
  const compAndItTest = {
    title: 'Tech Depts Only',
    assignedDepartments: ['Computer Engineering', 'Information Technology'],
    assignedBatches: ['Computer Engineering', 'Information Technology']
  };

  const compStudent = { role: 'student', department: 'Computer Engineering' };
  const itStudent = { role: 'student', department: 'Information Technology' };
  const mechStudent = { role: 'student', department: 'Mechanical' };
  const civilStudent = { role: 'student', department: 'Civil' };

  assert.strictEqual(isStudentEligibleForTest(compStudent, compAndItTest), true);
  assert.strictEqual(isStudentEligibleForTest(itStudent, compAndItTest), true);
  assert.strictEqual(isStudentEligibleForTest(mechStudent, compAndItTest), false);
  assert.strictEqual(isStudentEligibleForTest(civilStudent, compAndItTest), false);
});

test('7. Student eligibility: Legacy student department profile aliases match canonical test targeting', () => {
  const compTest = {
    title: 'Computer Test',
    assignedDepartments: ['Computer Engineering'],
    assignedBatches: ['Computer Engineering']
  };

  const etcTest = {
    title: 'E&TC Test',
    assignedDepartments: ['E & TC'],
    assignedBatches: ['E & TC']
  };

  // Student with legacy 'Computer Science & Engineering' in profile
  const legacyCompStudent = { role: 'student', department: 'Computer Science & Engineering' };
  assert.strictEqual(isStudentEligibleForTest(legacyCompStudent, compTest), true);

  // Student with legacy 'Electronics & Communication Engineering' in profile
  const legacyEtcStudent = { role: 'student', department: 'Electronics & Communication Engineering' };
  assert.strictEqual(isStudentEligibleForTest(legacyEtcStudent, etcTest), true);
});

test('8. Student eligibility: Legacy test with empty department restrictions is open campus-wide', () => {
  const legacyOpenTest = {
    title: 'Legacy Open Mock',
    assignedDepartments: [],
    assignedBatches: []
  };

  const student = { role: 'student', department: 'Chemical' };
  assert.strictEqual(isStudentEligibleForTest(student, legacyOpenTest), true);
});

test('9. MockStore.getDepartments returns exactly the 10 Phase 1 academic departments', async () => {
  const { mockStore } = await import('../../frontend/src/services/mockStore.js');
  const depts = mockStore.getDepartments();
  assert.strictEqual(depts.length, 10);
  assert.deepStrictEqual(depts, EXPECTED_ACADEMIC_DEPTS);
  assert.ok(!depts.includes('Central Administration'));
  assert.ok(!depts.includes('Training & Placement Cell'));
  assert.ok(!depts.includes('Computer Science & Engineering'));
  assert.ok(!depts.includes('All Departments'));
});

test('10. Multi-select toggle behavior maintains exclusive campus-wide vs academic selection', () => {
  // Helper implementing the wizard handleToggleDepartment behavior
  const handleToggle = (current, dept) => {
    if (dept === 'ALL') return ['ALL'];
    let updated = current.filter((d) => d !== 'ALL');
    if (updated.includes(dept)) {
      updated = updated.filter((d) => d !== dept);
    } else {
      updated.push(dept);
    }
    return updated;
  };

  let selected = ['ALL'];

  // Select Computer Engineering: should remove ALL and add Computer Engineering
  selected = handleToggle(selected, 'Computer Engineering');
  assert.deepStrictEqual(selected, ['Computer Engineering']);

  // Select Information Technology: should keep Computer Engineering and add IT (multi-select)
  selected = handleToggle(selected, 'Information Technology');
  assert.deepStrictEqual(selected, ['Computer Engineering', 'Information Technology']);

  // Select Mechanical: should have 3 departments
  selected = handleToggle(selected, 'Mechanical');
  assert.deepStrictEqual(selected, ['Computer Engineering', 'Information Technology', 'Mechanical']);

  // Toggle off Information Technology: removes IT
  selected = handleToggle(selected, 'Information Technology');
  assert.deepStrictEqual(selected, ['Computer Engineering', 'Mechanical']);

  // Click ALL: resets selection to ['ALL']
  selected = handleToggle(selected, 'ALL');
  assert.deepStrictEqual(selected, ['ALL']);
});

test('11. Department search filter correctly filters academic departments and controls All Departments visibility', () => {
  const filterDepts = (query) => {
    const q = query.toLowerCase().trim();
    const showAllCard = !q || 'all departments'.includes(q) || 'all'.includes(q) || 'campus'.includes(q);
    const filtered = !q ? EXPECTED_ACADEMIC_DEPTS : EXPECTED_ACADEMIC_DEPTS.filter((d) => d.toLowerCase().includes(q));
    return { showAllCard, filtered };
  };

  // 1. Empty search: show all card + all 10 departments
  const emptyRes = filterDepts('');
  assert.strictEqual(emptyRes.showAllCard, true);
  assert.strictEqual(emptyRes.filtered.length, 10);

  // 2. Query "comp": hides all card, shows only Computer Engineering
  const compRes = filterDepts('comp');
  assert.strictEqual(compRes.showAllCard, false);
  assert.deepStrictEqual(compRes.filtered, ['Computer Engineering']);

  // 3. Query "all": shows all card, filters out academic departments that don't contain "all"
  const allRes = filterDepts('all');
  assert.strictEqual(allRes.showAllCard, true);

  // 4. Query "tech": Information Technology
  const techRes = filterDepts('tech');
  assert.strictEqual(techRes.showAllCard, false);
  assert.deepStrictEqual(techRes.filtered, ['Information Technology']);
});

test('12. Edit existing mock test normalizes legacy department assignments without rogue cards', () => {
  const normalizeEditTest = (editTest) => {
    const rawDepts = editTest.assignedDepartments?.length
      ? editTest.assignedDepartments
      : editTest.assignedBatches?.length
        ? editTest.assignedBatches
        : ['ALL'];
    const normalizedDepts = Array.isArray(rawDepts)
      ? rawDepts.map((d) => normalizeDepartment(d)).filter(Boolean)
      : [];
    if (normalizedDepts.includes('ALL') || normalizedDepts.length === 0) {
      return ['ALL'];
    }
    return Array.from(new Set(normalizedDepts));
  };

  // Legacy test with old labels
  const legacyTest1 = {
    assignedDepartments: ['Computer Science & Engineering', 'Electronics & Communication Engineering']
  };
  assert.deepStrictEqual(normalizeEditTest(legacyTest1), ['Computer Engineering', 'E & TC']);

  // Legacy test with All Departments string
  const legacyTest2 = {
    assignedDepartments: ['All Departments']
  };
  assert.deepStrictEqual(normalizeEditTest(legacyTest2), ['ALL']);

  // Legacy test with administrative departments only
  const legacyTest3 = {
    assignedDepartments: ['Central Administration', 'Training & Placement Cell']
  };
  assert.deepStrictEqual(normalizeEditTest(legacyTest3), ['ALL']);
});

test('13. Batch-only targeting: 2026 students can access, other batches cannot, even with assignedDepartments=["ALL"]', () => {
  const batch2026Test = {
    title: 'Batch 2026 Placement Drive',
    assignedDepartments: ['ALL'],
    assignedBatches: ['2026']
  };

  // Eligible students from batch 2026 across different departments
  const comp2026 = { role: 'student', department: 'Computer Engineering', graduationYear: 2026 };
  const mech2026 = { role: 'student', department: 'Mechanical', graduationYear: 2026 };
  const civil2026 = { role: 'student', department: 'Civil', graduationYear: '2026' }; // string year

  assert.strictEqual(isStudentEligibleForTest(comp2026, batch2026Test), true);
  assert.strictEqual(isStudentEligibleForTest(mech2026, batch2026Test), true);
  assert.strictEqual(isStudentEligibleForTest(civil2026, batch2026Test), true);

  // Ineligible students from other batches (2024, 2025, 2027)
  const comp2025 = { role: 'student', department: 'Computer Engineering', graduationYear: 2025 };
  const mech2024 = { role: 'student', department: 'Mechanical', graduationYear: 2024 };
  const civil2027 = { role: 'student', department: 'Civil', graduationYear: 2027 };

  assert.strictEqual(isStudentEligibleForTest(comp2025, batch2026Test), false, '2025 batch must be excluded');
  assert.strictEqual(isStudentEligibleForTest(mech2024, batch2026Test), false, '2024 batch must be excluded');
  assert.strictEqual(isStudentEligibleForTest(civil2027, batch2026Test), false, '2027 batch must be excluded');
});

test('14. Department-only targeting: eligible department students across any batch can access', () => {
  const deptOnlyTest = {
    title: 'Computer Engineering Only',
    assignedDepartments: ['Computer Engineering'],
    assignedBatches: ['ALL']
  };

  const comp2025 = { role: 'student', department: 'Computer Engineering', graduationYear: 2025 };
  const comp2026 = { role: 'student', department: 'Computer Engineering', graduationYear: 2026 };
  const comp2027 = { role: 'student', department: 'Computer Engineering', graduationYear: 2027 };
  const mech2026 = { role: 'student', department: 'Mechanical', graduationYear: 2026 };

  assert.strictEqual(isStudentEligibleForTest(comp2025, deptOnlyTest), true);
  assert.strictEqual(isStudentEligibleForTest(comp2026, deptOnlyTest), true);
  assert.strictEqual(isStudentEligibleForTest(comp2027, deptOnlyTest), true);
  assert.strictEqual(isStudentEligibleForTest(mech2026, deptOnlyTest), false);
});

test('15. Combined department-and-batch targeting: requires matching BOTH department AND batch', () => {
  const combinedTest = {
    title: 'Computer Engineering - Batch 2026 Only',
    assignedDepartments: ['Computer Engineering'],
    assignedBatches: ['2026']
  };

  const matchBoth = { role: 'student', department: 'Computer Engineering', graduationYear: 2026 };
  const wrongBatch = { role: 'student', department: 'Computer Engineering', graduationYear: 2025 };
  const wrongDept = { role: 'student', department: 'Mechanical', graduationYear: 2026 };
  const wrongBoth = { role: 'student', department: 'Civil', graduationYear: 2024 };

  assert.strictEqual(isStudentEligibleForTest(matchBoth, combinedTest), true, 'Matching both must be eligible');
  assert.strictEqual(isStudentEligibleForTest(wrongBatch, combinedTest), false, 'Wrong batch must be ineligible');
  assert.strictEqual(isStudentEligibleForTest(wrongDept, combinedTest), false, 'Wrong department must be ineligible');
  assert.strictEqual(isStudentEligibleForTest(wrongBoth, combinedTest), false, 'Wrong both must be ineligible');
});

test('16. Campus-wide targeting: all students across all 10 departments and batches are eligible', () => {
  const campusWide1 = { assignedDepartments: ['ALL'], assignedBatches: ['ALL'] };
  const campusWide2 = { assignedDepartments: [], assignedBatches: [] };

  const students = [
    { role: 'student', department: 'Computer Engineering', graduationYear: 2026 },
    { role: 'student', department: 'Civil', graduationYear: 2025 },
    { role: 'student', department: 'Robotics and Automation', graduationYear: 2027 },
    { role: 'student', department: 'Chemical', graduationYear: 2024 }
  ];

  students.forEach((s) => {
    assert.strictEqual(isStudentEligibleForTest(s, campusWide1), true);
    assert.strictEqual(isStudentEligibleForTest(s, campusWide2), true);
  });
});

test('17. MockStore getCoordinatorStudents respects decoupled department and batch restrictions', async () => {
  const { mockStore } = await import('../../frontend/src/services/mockStore.js');
  const adminUser = { role: 'admin', isActive: true };

  // Set up mock test in mockStore with batch 2026 only
  const batchTest = mockStore.createMockTest({
    title: 'MockStore 2026 Test',
    createdBy: 'coord_test',
    assignedDepartments: ['ALL'],
    assignedBatches: ['2026']
  });

  const res = mockStore.getCoordinatorStudents({ testId: batchTest._id }, adminUser);
  const students = res.data || res;
  assert.ok(students.length > 0, 'Should find 2026 students');
  students.forEach((s) => {
    assert.strictEqual(String(s.graduationYear), '2026', 'All returned students must be batch 2026');
  });

  // Set up mock test with combined Computer Engineering and batch 2026
  const combinedTest = mockStore.createMockTest({
    title: 'MockStore Comp 2026 Test',
    createdBy: 'coord_test',
    assignedDepartments: ['Computer Engineering'],
    assignedBatches: ['2026']
  });

  const combinedRes = mockStore.getCoordinatorStudents({ testId: combinedTest._id }, adminUser);
  const combinedStudents = combinedRes.data || combinedRes;
  assert.ok(combinedStudents.length > 0, 'Should find Computer Engineering 2026 students');
  combinedStudents.forEach((s) => {
    assert.strictEqual(String(s.graduationYear), '2026');
    assert.ok(
      s.department.toLowerCase().includes('computer') || s.department.toLowerCase().includes('cse'),
      'Must match computer department'
    );
  });
});
