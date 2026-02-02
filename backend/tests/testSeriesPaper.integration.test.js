import { jest } from '@jest/globals';

// Mock Appwrite upload helper to avoid external calls
jest.mock('../utils/appwriteFileService.js', () => ({
  uploadFileToAppwrite: async (buffer, name, mimetype) => ({
    fileId: 'fake-file-id',
    bucketId: 'fake-bucket',
    publicFileUrl: 'https://example.com/fake.pdf'
  }),
  deleteFileFromAppwrite: async (id) => true,
}));

import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.test.app.js'; // lightweight app wrapper for tests
import User from '../models/User.js';
import TestSeriesPaper from '../models/TestSeriesPaper.js';
import Enrollment from '../models/Enrollment.js';
import { generateToken } from '../utils/generateToken.js';

// Ensure test JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await TestSeriesPaper.deleteMany({});
  await Enrollment.deleteMany({});
});

// Mock Appwrite upload helper to avoid external calls
jest.mock('../utils/appwriteFileService.js', () => ({
  uploadFileToAppwrite: async (buffer, name, mimetype) => ({
    fileId: 'fake-file-id',
    bucketId: 'fake-bucket',
    publicFileUrl: 'https://example.com/fake.pdf'
  }),
  deleteFileFromAppwrite: async (id) => true,
}));

describe('Test series paper visibility', () => {
  test('Subadmin uploads paper -> enrolled user can fetch it', async () => {
    // Create users
    const subadmin = await User.create({ name: 'SubAdmin', email: 'subadmin@example.com', password: 'password123', role: 'subadmin' });
    const user = await User.create({ name: 'User', email: 'user@example.com', password: 'password123', role: 'user' });

    const subadminToken = generateToken(subadmin._id);
    const userToken = generateToken(user._id);

    // Create a paper record directly (avoid external Appwrite in unit tests)
    const paper = await TestSeriesPaper.create({
      testSeriesId: 's1',
      group: 'Both',
      subject: 'FR',
      paperType: 'question',
      paperNumber: 1,
      fileName: 'paper.pdf',
      appwriteFileId: 'fake-file-id',
      appwriteBucketId: 'fake-bucket',
      publicFileUrl: 'https://example.com/fake.pdf',
      fileSizeBytes: 1024,
      isAvailable: true,
      publishStatus: 'published',
      isVisibleToUsers: true,
      createdBy: subadmin._id,
    });

    expect(paper).toBeDefined();
    expect(paper.testSeriesId).toBe('s1');

    // Create paid enrollment for user on s1
    await Enrollment.create({ userId: user._id, testSeriesId: 's1', paymentStatus: 'paid', amount: 100, purchasedSubjects: ['FR'] });

    // User fetch grouped papers
    const resPapers = await request(app)
      .get('/api/testseries/s1/papers/grouped')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ group: 'Both' });

    expect(resPapers.status).toBe(200);
    expect(resPapers.body.papers).toBeDefined();
    expect(resPapers.body.papers.FR).toBeDefined();
    expect(resPapers.body.papers.FR.length).toBeGreaterThanOrEqual(1);
  });

  test('Draft paper is not visible to enrolled user', async () => {
    const subadmin = await User.create({ name: 'SubAdmin2', email: 'subadmin2@example.com', password: 'password123', role: 'subadmin' });
    const user = await User.create({ name: 'User2', email: 'user2@example.com', password: 'password123', role: 'user' });

    const subadminToken = generateToken(subadmin._id);
    const userToken = generateToken(user._id);

    // Create paper and then set it to draft
    const paperRecord = await TestSeriesPaper.create({
      testSeriesId: 's2',
      group: 'Both',
      subject: 'FR',
      paperType: 'question',
      paperNumber: 1,
      fileName: 'paper2.pdf',
      appwriteFileId: 'fake-file-id-2',
      appwriteBucketId: 'fake-bucket-2',
      publicFileUrl: 'https://example.com/fake2.pdf',
      fileSizeBytes: 1024,
      isAvailable: true,
      publishStatus: 'published',
      isVisibleToUsers: true,
      createdBy: subadmin._id,
    });

    // Mark draft
    await TestSeriesPaper.findByIdAndUpdate(paperRecord._id, { publishStatus: 'draft' });

    // Enroll user
    await Enrollment.create({ userId: user._id, testSeriesId: 's2', paymentStatus: 'paid', amount: 100, purchasedSubjects: ['FR'] });

    const resPapers = await request(app)
      .get('/api/testseries/s2/papers/grouped')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ group: 'Both' });

    expect(resPapers.status).toBe(200);
    expect(Object.keys(resPapers.body.papers).length).toBe(0);
  });
});
