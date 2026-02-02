import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';

// Load .env from backend directory explicitly to ensure MONGODB_URI and JWT_SECRET are available
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dotenvPath = path.join(__dirname, '..', '.env');
console.log('Attempting to load .env from:', dotenvPath);
const result = dotenv.config({ path: dotenvPath });
if (result.error) {
  console.warn('dotenv failed to load .env from path:', result.error.message);
}

const MONGODB_URI = process.env.MONGODB_URI;
const BACKEND_URL = (process.env.BACKEND_URL || process.env.BACKEND_ORIGIN || 'http://localhost:5000').replace(/\/$/, '');

async function createUser(role) {
  const email = `test_${role}_${Date.now()}@example.com`;
  const existing = await User.findOne({ email });
  if (existing) return existing;
  const user = new User({ name: `Test ${role}`, email, password: 'password', role, isActive: true });
  await user.save();
  return user;
}

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function uploadMedia(url, token, fileBuffer, filename, mediaType, testSeriesId) {
  const form = new (globalThis.FormData)();
  form.append('file', new Blob([fileBuffer], { type: 'image/png' }), filename);
  form.append('mediaType', mediaType);
  form.append('testSeriesId', testSeriesId);

  const res = await fetch(`${url}/api/test-series/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res;
}

async function uploadPaper(url, token, fileBuffer, filename, testSeriesId) {
  const form = new (globalThis.FormData)();
  form.append('paper', new Blob([fileBuffer], { type: 'application/pdf' }), filename);
  form.append('group', 'Group 1');
  form.append('subject', 'FR');
  form.append('paperType', 'question');
  form.append('paperNumber', '1');
  form.append('syllabusPercentage', '100%');
  form.append('series', 'series1');

  const res = await fetch(`${url}/api/testseries/${testSeriesId}/papers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res;
}

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  // Create users
  const subadmin = await createUser('subadmin');
  const normal = await createUser('user');
  console.log('Created users:', subadmin.email, normal.email);

  const subToken = signToken(subadmin);
  const userToken = signToken(normal);

  // Create a tiny PNG buffer (1x1 transparent)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XJbBsAAAAASUVORK5CYII=';
  const pngBuffer = Buffer.from(pngBase64, 'base64');

  console.log('Uploading media as subadmin');
  const mediaRes = await uploadMedia(BACKEND_URL, subToken, pngBuffer, 'thumb.png', 'image', 's1');
  console.log('Media upload status:', mediaRes.status);
  const mediaJson = await (mediaRes.ok ? mediaRes.json() : mediaRes.text());
  console.log('Media upload response:', mediaJson);

  // Upload paper
  const pdfBuffer = Buffer.from('%PDF-1.4 Test PDF\n%...EOF');
  console.log('Uploading paper as subadmin');
  const paperRes = await uploadPaper(BACKEND_URL, subToken, pdfBuffer, 'paper.pdf', 's1');
  console.log('Paper upload status:', paperRes.status);
  const paperJson = await (paperRes.ok ? paperRes.json() : paperRes.text());
  console.log('Paper upload response:', paperJson);

  // As user: fetch fixed overrides
  console.log('Fetching fixed overrides as normal user');
  const foRes = await fetch(`${BACKEND_URL}/api/testseries/fixed-overrides`);
  console.log('Fixed overrides status:', foRes.status);
  const foJson = await foRes.json();
  console.log('Fixed overrides response:', JSON.stringify(foJson, null, 2));

  // Try to fetch proxied thumbnail URL
  const s1Thumb = foJson.overrides?.s1?.thumbnail;
  if (s1Thumb) {
    console.log('Fetching proxied thumbnail URL:', s1Thumb);
    const thumbRes = await fetch(s1Thumb);
    console.log('Thumb fetch status:', thumbRes.status, 'content-type:', thumbRes.headers.get('content-type'));
  }

  // As user: fetch papers list
  const papersRes = await fetch(`${BACKEND_URL}/api/testseries/s1/papers`);
  console.log('Papers list status:', papersRes.status);
  const papersJson = await papersRes.json();
  console.log('Papers list response:', JSON.stringify(papersJson, null, 2));

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});