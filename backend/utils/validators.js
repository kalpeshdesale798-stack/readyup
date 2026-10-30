export const INSTITUTIONAL_EMAIL_DOMAIN = '@kkwagh.edu.in';

export const normalizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

export const isValidInstitutionalEmail = (email) => {
  if (typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@kkwagh\.edu\.in$/;
  return regex.test(normalized);
};

