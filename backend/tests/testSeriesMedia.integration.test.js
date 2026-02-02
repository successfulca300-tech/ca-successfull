import { jest } from '@jest/globals';

// Mock node-appwrite Storage and InputFile to avoid external calls
jest.mock('node-appwrite', () => {
  const createFileMock = jest.fn().mockResolvedValue({
    $id: 'fake-media-id',
    name: 'media.png',
    sizeOriginal: 1234,
    mimeType: 'image/png',
    $createdAt: new Date().toISOString()
  });
  return {
    Client: jest.fn().mockImplementation(() => ({})),
    Storage: jest.fn().mockImplementation(() => ({ createFile: createFileMock })),
    InputFile: {
      fromBuffer: jest.fn().mockReturnValue({}),
      fromPath: jest.fn().mockReturnValue({})
    }
  };
});

import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.test.app.js';
import User from '../models/User.js';
import TestSeries from '../models/TestSeries.js';
import TestSeriesMedia from '../models/TestSeriesMedia.js';
import { generateToken } from '../utils/generateToken.js';

// Ensure test JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Mock node-appwrite Storage and InputFile to avoid external calls
jest.mock('node-appwrite', () => {
  const createFileMock = jest.fn().mockResolvedValue({
    $id: 'fake-media-id',
    name: 'media.png',
    sizeOriginal: 1234,
    mimeType: 'image/png',
    $createdAt: new Date().toISOString()
  });
  return {
    Client: jest.fn().mockImplementation(() => ({})),
    Storage: jest.fn().mockImplementation(() => ({ createFile: createFileMock })),
    InputFile: {
      fromBuffer: jest.fn().mockReturnValue({}),
      fromPath: jest.fn().mockReturnValue({})
    }
  };
});

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
  await TestSeries.deleteMany({});
  await TestSeriesMedia.deleteMany({});
});

describe('Test series media upload and placeholder creation', () => {
  test('Subadmin uploads image for shorthand s2 -> placeholder TestSeries created, thumbnail saved, media doc inserted', async () => {
    const subadmin = await User.create({ name: 'SubadminMedia', email: 'subadmin-media@example.com', password: 'password123', role: 'subadmin' });
    const token = generateToken(subadmin._id);

    const res = await request(app)
      .post('/api/test-series/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('PNG...fake'), 'thumb.png')
      .field('mediaType', 'image')
      .field('testSeriesId', 's2');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeDefined();

    // Check DB - placeholder TestSeries should have been created
    const ts = await TestSeries.findOne({ seriesType: 'S2' });
    expect(ts).toBeDefined();
    expect(ts.title).toMatch(/S2 Test Series \(Auto-created\)/);
    expect(ts.thumbnail).toBeDefined();

    // Check media doc saved for shorthand id
    const media = await TestSeriesMedia.findOne({ testSeriesId: 's2' });
    expect(media).toBeDefined();
    expect(media.status).toBe('active');
    expect(media.fileId).toBeDefined();
    expect(media.fileId).toBe(res.body.fileId);
  });
});
