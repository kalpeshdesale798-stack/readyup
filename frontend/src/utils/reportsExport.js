/**
 * Robust department matching complying with Phase 1 department normalization rules.
 */
export function matchDepartment(itemDept, selectedDept) {
  if (!selectedDept || selectedDept === 'all' || selectedDept === 'All') return true;
  if (!itemDept || typeof itemDept !== 'string') return false;
  const a = itemDept.trim().toLowerCase();
  const b = selectedDept.trim().toLowerCase();
  if (a === b) return true;
  if (a.replace(/\s+engineering$/, '') === b.replace(/\s+engineering$/, '')) return true;
  if (b === 'e & tc' && (a === 'etc' || a === 'e&tc' || a.includes('telecom') || a.includes('communication') || a === 'entc')) return true;
  if (b === 'aids' && (a === 'ai & ds' || a === 'ai and ds' || a.includes('intelligence') || a.includes('data science'))) return true;
  if (b === 'csd' && (a === 'cs & design' || a.includes('design'))) return true;
  if (b === 'computer engineering' && (a.includes('computer') || a === 'cse')) return true;
  if (b === 'information technology' && (a === 'it' || a.includes('information technology'))) return true;
  if (b === 'mechanical' && (a === 'mech' || a.includes('mechanical'))) return true;
  if (b === 'civil' && a.includes('civil')) return true;
  if (b === 'electrical' && (a === 'ee' || (a.includes('electrical') && !a.includes('electronics')))) return true;
  if (b === 'chemical' && a.includes('chemical')) return true;
  if (b === 'robotics and automation' && (a.includes('robotics') || a.includes('automation'))) return true;
  return false;
}

/**
 * Department matching for mock tests based on assignedDepartments / assignedBatches.
 */
export function matchTestDepartment(test, selectedDept) {
  if (!selectedDept || selectedDept === 'all' || selectedDept === 'All') return true;
  if (!test) return false;
  const depts = test.assignedDepartments || [];
  if (depts.length === 0) return true;
  const isOpen = depts.every((d) => {
    const s = String(d).trim().toLowerCase();
    return s === 'all' || s === 'all departments';
  });
  if (isOpen) return true;
  const directMatch = depts.some((d) => matchDepartment(d, selectedDept));
  if (directMatch) return true;
  const batches = test.assignedBatches || [];
  return batches.some((b) => matchDepartment(b, selectedDept));
}

/**
 * Escapes values according to RFC 4180 CSV specifications.
 */
export function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Builds CSV string from headers and 2D row array with UTF-8 BOM.
 */
export function buildCsvContent(headers, rows) {
  return '\uFEFF' + [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(','))
  ].join('\r\n');
}

/**
 * Formats report records for CSV export according to active tab and filters.
 */
export function getReportExportData({
  activeTab,
  testsData = [],
  studentsData = [],
  testAttempts = [],
  inProgressAttempts = [],
  unattemptedStudents = [],
  selectedTestObj = null,
  selectedTestId = '',
  statusFilter = 'all',
  departmentFilter = 'all',
  search = ''
}) {
  const normSearch = (search || '').trim().toLowerCase();
  let headers = [];
  let rows = [];

  if (activeTab === 'tests') {
    if (selectedTestId || statusFilter === 'attempted') {
      headers = [
        'Candidate Name',
        'Student Email',
        'Student ID',
        'Department',
        'Mock Test Title',
        'Score',
        'Total Marks',
        'Accuracy (%)',
        'Attempt Number',
        'Status',
        'Result',
        'Submission Date'
      ];

      const filtered = testAttempts.filter((a) => {
        if (!matchDepartment(a.department, departmentFilter)) return false;
        if (normSearch) {
          const matchName = (a.studentName || '').toLowerCase().includes(normSearch);
          const matchEmail = (a.studentEmail || '').toLowerCase().includes(normSearch);
          const matchId = (a.studentId || '').toLowerCase().includes(normSearch);
          if (!matchName && !matchEmail && !matchId) return false;
        }
        return true;
      });

      rows = filtered.map((a) => [
        a.studentName || 'Student',
        a.studentEmail || '',
        a.studentId || 'N/A',
        a.department || 'N/A',
        a.testTitle || selectedTestObj?.title || 'Mock Test',
        a.score ?? 0,
        a.totalMarks ?? 0,
        `${a.accuracy ?? 0}%`,
        `Attempt ${a.attemptNumber || 1}`,
        a.status || 'completed',
        a.result || 'Passed',
        a.submissionTime
          ? new Date(a.submissionTime).toLocaleDateString()
          : a.createdAt
          ? new Date(a.createdAt).toLocaleDateString()
          : 'N/A'
      ]);
    } else if (statusFilter === 'in-progress' && inProgressAttempts && inProgressAttempts.length > 0) {
      headers = [
        'Candidate Name',
        'Student Email',
        'Student ID',
        'Department',
        'Mock Test Title',
        'Attempt Number',
        'Status',
        'Start Time'
      ];

      const filtered = inProgressAttempts.filter((a) => {
        if (!matchDepartment(a.department, departmentFilter)) return false;
        if (normSearch) {
          const matchName = (a.studentName || '').toLowerCase().includes(normSearch);
          const matchEmail = (a.studentEmail || '').toLowerCase().includes(normSearch);
          const matchId = (a.studentId || '').toLowerCase().includes(normSearch);
          if (!matchName && !matchEmail && !matchId) return false;
        }
        return true;
      });

      rows = filtered.map((a) => [
        a.studentName || 'Student',
        a.studentEmail || '',
        a.studentId || 'N/A',
        a.department || 'N/A',
        a.testTitle || 'Mock Test',
        `Attempt ${a.attemptNumber || 1}`,
        a.status || 'in-progress',
        a.startTime ? new Date(a.startTime).toLocaleTimeString() : 'N/A'
      ]);
    } else {
      headers = [
        'Mock Test Title',
        'Company Pattern',
        'Duration (Minutes)',
        'Total Questions',
        'Total Attempts',
        'Completed Attempts',
        'In-Progress Attempts',
        'Pass Rate (%)',
        'Average Accuracy (%)',
        'Status'
      ];

      const filtered = testsData.filter((t) => {
        if (!matchTestDepartment(t, departmentFilter)) return false;
        if (statusFilter !== 'all') {
          if (statusFilter === 'in-progress' && !(t.inProgressAttempts > 0 || t.scheduleStatus === 'active')) return false;
          if (statusFilter === 'completed' && !(t.completedAttempts > 0)) return false;
          if (statusFilter === 'expired' && t.scheduleStatus !== 'closed') return false;
        }
        if (normSearch) {
          const matchTitle = (t.title || '').toLowerCase().includes(normSearch);
          const matchCompany = (t.company || '').toLowerCase().includes(normSearch);
          if (!matchTitle && !matchCompany) return false;
        }
        return true;
      });

      rows = filtered.map((t) => [
        t.title || 'Mock Test',
        t.company || 'General',
        t.durationMinutes || 30,
        t.totalQuestions || 15,
        t.totalAttempts || 0,
        t.completedAttempts || 0,
        t.inProgressAttempts || 0,
        `${t.passRate ?? 0}%`,
        `${t.averageAccuracy ?? 0}%`,
        t.scheduleStatus || 'active'
      ]);
    }
  } else if (activeTab === 'students') {
    headers = [
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
    ];

    const filtered = studentsData.filter((s) => {
      if (!matchDepartment(s.department, departmentFilter)) return false;
      if (normSearch) {
        const matchName = (s.name || '').toLowerCase().includes(normSearch);
        const matchEmail = (s.email || '').toLowerCase().includes(normSearch);
        const matchId = (s.studentId || '').toLowerCase().includes(normSearch);
        if (!matchName && !matchEmail && !matchId) return false;
      }
      return true;
    });

    rows = filtered.map((s) => {
      const testsComp = s.testsCompleted || 0;
      const passed = s.passedCount || 0;
      const passRate = testsComp > 0 ? Math.round((passed / testsComp) * 100) : 0;
      const tier = (s.avgAccuracy || 0) >= 75
        ? 'Placement Ready'
        : (s.avgAccuracy || 0) >= 55
        ? 'Moderate'
        : 'Needs Practice';
      const bestScore = s.bestScore !== undefined ? s.bestScore : s.highestScore !== undefined ? s.highestScore : 'N/A';

      return [
        s.name || 'Candidate',
        s.email || '',
        s.studentId || 'N/A',
        s.department || 'N/A',
        s.graduationYear || 'N/A',
        s.testsAttempted || 0,
        testsComp,
        `${s.avgAccuracy || 0}%`,
        bestScore,
        `${passRate}%`,
        tier
      ];
    });
  } else if (activeTab === 'participation') {
    if (selectedTestId || statusFilter === 'unattempted') {
      headers = [
        'Candidate Name',
        'Student Email',
        'Student ID',
        'Department',
        'Graduation Year',
        'Selected Mock Test',
        'Participation Status'
      ];

      const filtered = unattemptedStudents.filter((s) => {
        if (!matchDepartment(s.department, departmentFilter)) return false;
        if (normSearch) {
          const matchName = (s.name || '').toLowerCase().includes(normSearch);
          const matchEmail = (s.email || '').toLowerCase().includes(normSearch);
          const matchId = (s.studentId || '').toLowerCase().includes(normSearch);
          if (!matchName && !matchEmail && !matchId) return false;
        }
        return true;
      });

      rows = filtered.map((s) => [
        s.name || 'Candidate',
        s.email || '',
        s.studentId || 'N/A',
        s.department || 'N/A',
        s.graduationYear || 'N/A',
        selectedTestObj?.title || 'Selected Mock Test',
        'Not Attempted'
      ]);
    } else {
      headers = [
        'Mock Test Title',
        'Company Pattern',
        'Eligible Students',
        'Candidates Attempted',
        'Pending (Unattempted)',
        'Participation Rate (%)',
        'Status'
      ];

      const filtered = testsData.filter((t) => {
        if (!matchTestDepartment(t, departmentFilter)) return false;
        if (normSearch) {
          const matchTitle = (t.title || '').toLowerCase().includes(normSearch);
          const matchCompany = (t.company || '').toLowerCase().includes(normSearch);
          if (!matchTitle && !matchCompany) return false;
        }
        return true;
      });

      rows = filtered.map((t) => {
        const eligible = t.eligibleStudentsCount || 0;
        const attempted = t.uniqueStudentsAttempted || 0;
        const partPct = eligible > 0 ? Math.round((attempted / eligible) * 100) : 0;

        return [
          t.title || 'Mock Test',
          t.company || 'General',
          eligible,
          attempted,
          t.unattemptedCount ?? Math.max(0, eligible - attempted),
          `${partPct}%`,
          t.scheduleStatus || 'active'
        ];
      });
    }
  }

  return { headers, rows };
}
