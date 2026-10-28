import connectDB from '../config/db.js';
import User from '../models/User.js';
import fs from 'node:fs';

await connectDB();

const user = await User.findOne({ role: 'coordinator' });
const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: user.email, password: 'Password123!' })
});
const loginData = await loginRes.json();
const token = loginData.data.token;
console.log('Got coordinator token');

const filePath = 'C:\\Users\\Kalpesh\\Downloads\\ReadyUp_500plus_company_tagged_aptitude_questions.csv';
const fileBuffer = fs.readFileSync(filePath);
const blob = new Blob([fileBuffer], { type: 'text/csv' });

const formData = new FormData();
formData.append('file', blob, 'ReadyUp_500plus_company_tagged_aptitude_questions.csv');

console.log('Sending preview request to live backend...');
const start = Date.now();
const res = await fetch('http://localhost:5000/api/v1/coordinator/import/preview', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
const elapsed = Date.now() - start;
console.log(`Preview response status: ${res.status} (took ${elapsed}ms)`);
const json = await res.json();
console.log('Success:', json.success);
console.log('Message:', json.message);
console.log('Data summary:', {
  importBatchId: json.data?.importBatchId,
  totalRows: json.data?.totalRows,
  validRowsCount: json.data?.validRowsCount,
  invalidRowsCount: json.data?.invalidRowsCount,
  errorsCount: json.data?.errors?.length
});

process.exit(0);
