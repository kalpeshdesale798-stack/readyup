import fs from 'node:fs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import ImportBatch from '../models/ImportBatch.js';
import Question from '../models/Question.js';

async function runVerification() {
  console.log('=== READYUP SPREADSHEET IMPORT E2E VERIFICATION ===');
  await connectDB();

  // 1. Authenticate as coordinator
  const coordinator = await User.findOne({ role: 'coordinator' });
  if (!coordinator) {
    throw new Error('No coordinator user found in database');
  }

  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: coordinator.email, password: 'Password123!' })
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success || !loginJson.data?.token) {
    throw new Error('Failed to login as coordinator: ' + JSON.stringify(loginJson));
  }
  const token = loginJson.data.token;
  console.log('✔ Successfully authenticated as coordinator:', coordinator.email);

  // 2. Test Missing Batch ID
  const missingIdRes = await fetch('http://localhost:5000/api/v1/coordinator/import/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  const missingIdJson = await missingIdRes.json();
  if (missingIdRes.status === 400 && missingIdJson.code === 'INVALID_BATCH_ID') {
    console.log('✔ Test 2 Passed: Missing batch ID returned 400 INVALID_BATCH_ID');
  } else {
    throw new Error(`Test 2 Failed: Expected 400 INVALID_BATCH_ID, got ${missingIdRes.status} ${JSON.stringify(missingIdJson)}`);
  }

  // 3. Test Nonexistent Batch ID
  const fakeIdRes = await fetch('http://localhost:5000/api/v1/coordinator/import/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ importBatchId: 'BATCH-NONEXISTENT-999' })
  });
  const fakeIdJson = await fakeIdRes.json();
  if (fakeIdRes.status === 404 && fakeIdJson.code === 'BATCH_NOT_FOUND') {
    console.log('✔ Test 3 Passed: Nonexistent batch returned 404 BATCH_NOT_FOUND');
  } else {
    throw new Error(`Test 3 Failed: Expected 404 BATCH_NOT_FOUND, got ${fakeIdRes.status} ${JSON.stringify(fakeIdJson)}`);
  }

  // 4. Test Expired Batch Handling (410 BATCH_EXPIRED)
  const expiredBatch = await ImportBatch.create({
    batchId: 'BATCH-EXPIRED-TEST',
    uploadedBy: coordinator._id,
    uploaderName: coordinator.name,
    fileName: 'expired_test.csv',
    fileType: 'csv',
    totalRows: 1,
    validCount: 1,
    status: 'previewed',
    expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
    previewRows: [{
      questionId: 'TEST-EXP-001',
      questionText: 'Test expired question',
      options: [{ optionId: 'A', text: '1' }, { optionId: 'B', text: '2' }],
      correctOption: 'A',
      category: 'Quantitative Aptitude',
      topic: 'General'
    }]
  });

  const expiredRes = await fetch('http://localhost:5000/api/v1/coordinator/import/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ importBatchId: 'BATCH-EXPIRED-TEST' })
  });
  const expiredJson = await expiredRes.json();
  // Clean up test batch
  await ImportBatch.deleteOne({ batchId: 'BATCH-EXPIRED-TEST' });

  if (expiredRes.status === 410 && expiredJson.code === 'BATCH_EXPIRED') {
    console.log('✔ Test 4 Passed: Expired batch returned 410 BATCH_EXPIRED');
  } else {
    throw new Error(`Test 4 Failed: Expected 410 BATCH_EXPIRED, got ${expiredRes.status} ${JSON.stringify(expiredJson)}`);
  }

  // 5. Test Auth Failure (Does not misreport as missing/expired batch)
  const noAuthRes = await fetch('http://localhost:5000/api/v1/coordinator/import/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ importBatchId: 'BATCH-ANY' })
  });
  if (noAuthRes.status === 401) {
    console.log('✔ Test 5 Passed: Unauthenticated request returned 401 Unauthorized');
  } else {
    throw new Error(`Test 5 Failed: Expected 401, got ${noAuthRes.status}`);
  }

  // 6. Test 685-Question CSV Preview
  const csvPath = 'C:\\Users\\Kalpesh\\Downloads\\ReadyUp_500plus_company_tagged_aptitude_questions.csv';
  if (!fs.existsSync(csvPath)) {
    throw new Error('CSV fixture file not found at: ' + csvPath);
  }
  const fileBuffer = fs.readFileSync(csvPath);
  const blob = new Blob([fileBuffer], { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', blob, 'ReadyUp_500plus_company_tagged_aptitude_questions.csv');

  console.log('Starting preview of 685 questions...');
  const previewStart = Date.now();
  const previewRes = await fetch('http://localhost:5000/api/v1/coordinator/import/preview', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  const previewElapsed = Date.now() - previewStart;
  const previewJson = await previewRes.json();

  if (!previewJson.success) {
    throw new Error(`Preview failed (${previewRes.status}): ${previewJson.message}`);
  }
  console.log(`✔ Test 6 Passed: Preview succeeded in ${previewElapsed}ms!`);
  console.log('  Canonical Batch ID:', previewJson.data.importBatchId);
  console.log('  Total Rows:', previewJson.data.totalRows);
  console.log('  Valid Rows:', previewJson.data.validRowsCount);
  console.log('  Invalid Rows:', previewJson.data.invalidRowsCount);

  if (previewJson.data.totalRows !== 685 || previewJson.data.validRowsCount !== 685) {
    throw new Error(`Expected 685 rows, got total=${previewJson.data.totalRows}, valid=${previewJson.data.validRowsCount}`);
  }

  const batchId = previewJson.data.importBatchId;

  // 7. Verify batch record persisted in MongoDB
  const dbBatch = await ImportBatch.findOne({ batchId });
  if (!dbBatch) {
    throw new Error('Batch record not found in MongoDB for batchId: ' + batchId);
  }
  if (dbBatch.status !== 'previewed' || dbBatch.previewRows.length !== 685) {
    throw new Error(`Invalid DB batch state: status=${dbBatch.status}, rows=${dbBatch.previewRows.length}`);
  }
  console.log('✔ Test 7 Passed: Batch correctly persisted in MongoDB with 685 previewRows');

  // 8. Confirm & Publish the Batch
  console.log('Confirming and publishing batch...');
  const confirmStart = Date.now();
  const confirmRes = await fetch('http://localhost:5000/api/v1/coordinator/import/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ importBatchId: batchId, batchId: batchId })
  });
  const confirmElapsed = Date.now() - confirmStart;
  const confirmJson = await confirmRes.json();

  if (!confirmJson.success) {
    throw new Error(`Publish failed (${confirmRes.status}): ${confirmJson.message}`);
  }
  console.log(`✔ Test 8 Passed: Publish completed in ${confirmElapsed}ms!`);
  console.log('  Inserted count:', confirmJson.data.insertedCount);
  console.log('  Updated count:', confirmJson.data.updatedCount);
  console.log('  Skipped count:', confirmJson.data.skippedCount);
  console.log('  Failed count:', confirmJson.data.failedCount);

  if (confirmJson.data.insertedCount !== 685) {
    throw new Error(`Expected 685 inserted questions, got ${confirmJson.data.insertedCount}`);
  }

  // 9. Verify questions persisted in MongoDB
  const ruQuestionsCount = await Question.countDocuments({ questionId: /^RU-APT-/ });
  console.log('✔ Test 9 Passed: MongoDB questions count matching ^RU-APT-:', ruQuestionsCount);
  if (ruQuestionsCount !== 685) {
    throw new Error(`Expected 685 RU-APT questions in MongoDB, found ${ruQuestionsCount}`);
  }

  const sampleFirst = await Question.findOne({ questionId: 'RU-APT-0001' });
  const sampleLast = await Question.findOne({ questionId: 'RU-APT-0685' });
  if (!sampleFirst || !sampleLast) {
    throw new Error('Could not find sample questions in MongoDB');
  }
  console.log('✔ Sample RU-APT-0001 verified:', {
    questionText: sampleFirst.questionText,
    correctOption: sampleFirst.correctOption,
    category: sampleFirst.category,
    topic: sampleFirst.topic,
    companies: sampleFirst.companies
  });
  console.log('✔ Sample RU-APT-0685 verified:', {
    questionText: sampleLast.questionText,
    correctOption: sampleLast.correctOption,
    category: sampleLast.category,
    topic: sampleLast.topic,
    companies: sampleLast.companies
  });

  // 10. Idempotency Test: Attempt to republish the same batch
  const republishRes = await fetch('http://localhost:5000/api/v1/coordinator/import/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ importBatchId: batchId })
  });
  const republishJson = await republishRes.json();
  if (republishRes.status === 409 && republishJson.code === 'BATCH_ALREADY_CONFIRMED') {
    console.log('✔ Test 10 Passed: Idempotent retry returned 409 BATCH_ALREADY_CONFIRMED');
  } else {
    throw new Error(`Test 10 Failed: Expected 409 BATCH_ALREADY_CONFIRMED, got ${republishRes.status}`);
  }

  // Verify questions count is STILL exactly 685
  const postRepublishCount = await Question.countDocuments({ questionId: /^RU-APT-/ });
  if (postRepublishCount !== 685) {
    throw new Error(`Question count changed after republish: ${postRepublishCount}`);
  }
  console.log('✔ Idempotency verified: Total RU-APT questions remains exactly 685');

  // 11. Final Batch Status in MongoDB
  const finalBatch = await ImportBatch.findOne({ batchId });
  if (finalBatch.status !== 'confirmed') {
    throw new Error(`Expected batch status to be confirmed, got ${finalBatch.status}`);
  }
  console.log('✔ Test 11 Passed: Final batch status is confirmed');

  console.log('\n========================================');
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('========================================');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
