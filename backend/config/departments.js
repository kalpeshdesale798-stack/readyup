export const ALLOWED_DEPARTMENTS = [
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

export const isValidDepartment = (dept) => {
  if (typeof dept !== 'string') return false;
  return ALLOWED_DEPARTMENTS.includes(dept.trim());
};

export const normalizeDepartment = (dept) => {
  if (typeof dept !== 'string') return null;
  const raw = dept.trim();
  const lower = raw.toLowerCase();
  if (lower === 'all' || lower === 'all departments') return 'ALL';

  const exact = ALLOWED_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (exact) return exact;

  if (lower.includes('central administration') || lower.includes('training & placement') || lower.includes('t&p')) {
    return null;
  }

  if (lower === 'computer science & engineering' || lower === 'cse' || lower === 'cs' || lower.includes('computer')) {
    return 'Computer Engineering';
  }
  if (lower === 'information technology' || lower === 'it') {
    return 'Information Technology';
  }
  if (lower === 'electronics & communication engineering' || lower === 'ece' || lower === 'e&tc' || lower === 'etc' || lower === 'entc' || lower.includes('telecom') || lower.includes('communication')) {
    return 'E & TC';
  }
  if (lower === 'artificial intelligence & data science' || lower === 'ai & ds' || lower === 'ai and ds' || lower.includes('intelligence') || lower.includes('data science') || lower === 'aids') {
    return 'AIDS';
  }
  if (lower === 'computer science and design' || lower === 'cs & design' || lower.includes('design') || lower === 'csd') {
    return 'CSD';
  }
  if (lower === 'mechanical engineering' || lower === 'mech' || lower.includes('mechanical')) {
    return 'Mechanical';
  }
  if (lower === 'civil engineering' || lower.includes('civil')) {
    return 'Civil';
  }
  if (lower === 'electrical engineering' || lower === 'ee' || (lower.includes('electrical') && !lower.includes('electronics'))) {
    return 'Electrical';
  }
  if (lower === 'chemical engineering' || lower.includes('chemical')) {
    return 'Chemical';
  }
  if (lower.includes('robotics') || lower.includes('automation')) {
    return 'Robotics and Automation';
  }

  const stripped = lower.replace(/\s+engineering$/i, '').trim();
  const matched = ALLOWED_DEPARTMENTS.find((d) => d.toLowerCase().replace(/\s+engineering$/i, '').trim() === stripped);
  if (matched) return matched;

  return null;
};

