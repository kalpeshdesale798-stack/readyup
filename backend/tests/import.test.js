import assert from 'node:assert';
import fs from 'node:fs';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import ImportBatch from '../models/ImportBatch.js';
import Question from '../models/Question.js';

dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';

async function runTestSuite() {
  console.log('=== READYUP IMPORT & REGRESSION AUTOMATED TEST SUITE ===\n');
  await connectDB();

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${name}`);
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  };

  // Login helper
  const getAuthToken = async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    return json?.data?.token;
  };

  const coordinator = await User.findOne({ role: 'coordinator' });
  const coordinatorToken = await getAuthToken(coordinator?.email || 'coordinator@readyup.edu', 'Password123!');
  const studentToken = await getAuthToken('student@readyup.edu', 'Password123!');

  // 1. Preview creates a persisted batch with canonical batch ID
  let smallBatchId = null;
  await test('1. Preview creates a persisted batch with canonical batch ID', async () => {
    const sampleCsv =
      'questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,difficulty,companies,source,year\n' +
      'TEST-REG-001,"What is 15% of 200?",25,30,35,40,B,"200 * 0.15 = 30","Quantitative Aptitude","Percentages",easy,"TCS","Sample Test",2026\n' +
      'TEST-REG-002,"If x + 5 = 12, what is x?",6,7,8,9,B,"x = 12 - 5 = 7","Quantitative Aptitude","Algebra",easy,"Infosys","Sample Test",2026\n';

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'small_test.csv');

    const res = await fetch(`${BASE_URL}/coordinator/import/preview`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${coordinatorToken}` },
      body: formData
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.importBatchId, 'Must return importBatchId');
    assert.ok(json.data.batchId, 'Must return batchId');
    assert.strictEqual(json.data.importBatchId, json.data.batchId);
    assert.strictEqual(json.data.totalRows, 2);
    assert.strictEqual(json.data.validRowsCount, 2);
    assert.strictEqual(json.data.invalidRowsCount, 0);

    smallBatchId = json.data.importBatchId;

    // Verify record in MongoDB
    const persisted = await ImportBatch.findOne({ batchId: smallBatchId });
    assert.ok(persisted, 'Batch must exist in MongoDB');
    assert.strictEqual(persisted.status, 'previewed');
    assert.strictEqual(persisted.previewRows.length, 2);
  });

  // 2. Publish uses that ID and successfully retrieves the batch and persists questions
  await test('2. Publish uses canonical ID and successfully retrieves batch and persists questions', async () => {
    assert.ok(smallBatchId, 'smallBatchId must be present');
    const res = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ importBatchId: smallBatchId, batchId: smallBatchId })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.insertedCount, 2);
    assert.strictEqual(json.data.updatedCount, 0);
    assert.strictEqual(json.data.failedCount, 0);

    // Verify in MongoDB
    const q1 = await Question.findOne({ questionId: 'TEST-REG-001' });
    const q2 = await Question.findOne({ questionId: 'TEST-REG-002' });
    assert.ok(q1, 'TEST-REG-001 must exist in Question collection');
    assert.ok(q2, 'TEST-REG-002 must exist in Question collection');
    assert.strictEqual(q1.correctOption, 'B');
    assert.strictEqual(q2.correctOption, 'B');

    // Clean up temporary test questions and batch
    await Question.deleteMany({ questionId: { $in: ['TEST-REG-001', 'TEST-REG-002'] } });
    await ImportBatch.deleteOne({ batchId: smallBatchId });
  });

  // 3. Missing or empty batch ID returns 400 INVALID_BATCH_ID
  await test('3. Missing or empty batch ID returns 400 INVALID_BATCH_ID', async () => {
    const res = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ importBatchId: '' })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.code, 'INVALID_BATCH_ID');
  });

  // 4. Missing batch record in DB returns 404 BATCH_NOT_FOUND
  await test('4. Missing batch record in DB returns 404 BATCH_NOT_FOUND', async () => {
    const res = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ importBatchId: 'BATCH-DOES-NOT-EXIST' })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 404);
    assert.strictEqual(json.code, 'BATCH_NOT_FOUND');
  });

  // 5. Genuinely expired batch returns 410 BATCH_EXPIRED
  await test('5. Genuinely expired batch returns 410 BATCH_EXPIRED', async () => {
    const testBatchId = 'BATCH-TEMP-EXPIRED-' + Date.now();
    await ImportBatch.create({
      batchId: testBatchId,
      uploadedBy: coordinator._id,
      uploaderName: coordinator.name,
      fileName: 'expired.csv',
      fileType: 'csv',
      totalRows: 1,
      validCount: 1,
      status: 'previewed',
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      previewRows: [{
        questionId: 'TEMP-EXP',
        questionText: 'Expired test',
        options: [{ optionId: 'A', text: '1' }, { optionId: 'B', text: '2' }],
        correctOption: 'A',
        category: 'Quantitative Aptitude',
        topic: 'General'
      }]
    });

    const res = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ importBatchId: testBatchId })
    });
    const json = await res.json();

    // Clean up
    await ImportBatch.deleteOne({ batchId: testBatchId });

    assert.strictEqual(res.status, 410);
    assert.strictEqual(json.code, 'BATCH_EXPIRED');
  });

  // 6. Double-clicking Publish or retrying after a successful publish returns 409 BATCH_ALREADY_CONFIRMED
  await test('6. Double-clicking Publish or retrying returns 409 BATCH_ALREADY_CONFIRMED (idempotency)', async () => {
    const testBatchId = 'BATCH-TEMP-IDEM-' + Date.now();
    await ImportBatch.create({
      batchId: testBatchId,
      uploadedBy: coordinator._id,
      uploaderName: coordinator.name,
      fileName: 'idem.csv',
      fileType: 'csv',
      totalRows: 1,
      validCount: 1,
      status: 'confirmed', // Already confirmed!
      expiresAt: new Date(Date.now() + 3600000),
      previewRows: [{
        questionId: 'TEMP-IDEM',
        questionText: 'Idempotency test',
        options: [{ optionId: 'A', text: '1' }, { optionId: 'B', text: '2' }],
        correctOption: 'A',
        category: 'Quantitative Aptitude',
        topic: 'General'
      }]
    });

    const res = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ importBatchId: testBatchId })
    });
    const json = await res.json();

    // Clean up
    await ImportBatch.deleteOne({ batchId: testBatchId });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(json.code, 'BATCH_ALREADY_CONFIRMED');
  });

  // 7. Authentication failure is NOT misreported as batch expiration
  await test('7. Authentication failure is NOT misreported as batch expiration', async () => {
    const res = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No token
      body: JSON.stringify({ importBatchId: 'BATCH-WHATEVER' })
    });
    assert.strictEqual(res.status, 401, 'Must return 401 Unauthorized');

    // Forbidden for student role
    const studentRes = await fetch(`${BASE_URL}/coordinator/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ importBatchId: 'BATCH-WHATEVER' })
    });
    assert.strictEqual(studentRes.status, 403, 'Must return 403 Forbidden for non-coordinator');
  });

  // 8. Individual question creation continues to work
  await test('8. Individual question creation endpoint (POST /api/v1/questions) continues to work', async () => {
    const tempQId = 'INDIV-TEST-' + Date.now();
    const res = await fetch(`${BASE_URL}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({
        questionId: tempQId,
        questionText: 'Individual question creation test',
        options: [
          { optionId: 'A', text: 'Option Alpha' },
          { optionId: 'B', text: 'Option Beta' },
          { optionId: 'C', text: 'Option Gamma' },
          { optionId: 'D', text: 'Option Delta' }
        ],
        correctOption: 'C',
        explanation: 'Individual creation test explanation',
        category: 'Quantitative Aptitude',
        topic: 'Speed and Distance',
        difficulty: 'medium',
        companies: ['TCS']
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.questionId, tempQId);

    // Verify in DB and clean up
    const saved = await Question.findOne({ questionId: tempQId });
    assert.ok(saved);
    await Question.deleteOne({ questionId: tempQId });
  });

  // 9. Verify 685 RU-APT questions in MongoDB
  await test('9. Published 685 questions from fixture exist and are retrievable in MongoDB', async () => {
    const count = await Question.countDocuments({ questionId: /^RU-APT-/ });
    assert.strictEqual(count, 685, `Expected 685 RU-APT questions in MongoDB, found ${count}`);

    const q1 = await Question.findOne({ questionId: 'RU-APT-0001' });
    assert.ok(q1);
    assert.strictEqual(q1.category, 'Quantitative Aptitude');
    assert.strictEqual(q1.topic, 'Percentages');
    assert.strictEqual(q1.correctOption, 'D');

    const q685 = await Question.findOne({ questionId: 'RU-APT-0685' });
    assert.ok(q685);
    assert.strictEqual(q685.topic, 'Time and Work');
    assert.strictEqual(q685.correctOption, 'B');
  });

  console.log(`\n==========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`==========================================`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((e) => {
  console.error('Test suite uncaught error:', e);
  process.exit(1);
});
