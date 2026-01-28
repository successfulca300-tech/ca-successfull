import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PublishRequest from '../models/PublishRequest.js';
import User from '../models/User.js';
import Resource from '../models/Resource.js';

dotenv.config();

async function createTestPublishRequest() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://sachi:sachi%40123@cluster0.qfwjc8r.mongodb.net/ca-successful';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get or create a test subadmin
    let subAdmin = await User.findOne({ role: 'subadmin' });
    if (!subAdmin) {
      subAdmin = await User.create({
        name: 'Test SubAdmin',
        email: 'subadmin@test.com',
        password: 'hashedpassword',
        role: 'subadmin',
      });
      console.log('Created test subadmin:', subAdmin._id);
    } else {
      console.log('Found existing subadmin:', subAdmin._id);
    }

    // Get or create a test resource
    let resource = await Resource.findOne({ title: 'Test Resource' });
    if (!resource) {
      resource = await Resource.create({
        title: 'Test Resource for Publish',
        description: 'A test resource',
        category: 'Programming',
        type: 'video',
        resourceUrl: 'https://example.com/resource',
        createdBy: subAdmin._id,
      });
      console.log('Created test resource:', resource._id);
    } else {
      console.log('Found existing resource:', resource._id);
    }

    // Check existing publish requests
    const existing = await PublishRequest.findOne({ contentId: resource._id }).populate('requestedBy', 'name');
    if (existing) {
      console.log('Found existing request:', existing._id, 'Status:', existing.status);
      
      // If it's not pending, create a new one
      if (existing.status !== 'pending') {
        console.log('Creating new pending request...');
        const newRequest = await PublishRequest.create({
          contentType: 'resource',
          contentId: resource._id,
          requestedBy: subAdmin._id,
          status: 'pending',
        });
        console.log('Created new pending request:', newRequest._id);
        const populated = await PublishRequest.findById(newRequest._id).populate('requestedBy', 'name email');
        console.log('Full request:', JSON.stringify(populated, null, 2));
      }
    } else {
      console.log('No request found, creating one...');
      const newRequest = await PublishRequest.create({
        contentType: 'resource',
        contentId: resource._id,
        requestedBy: subAdmin._id,
        status: 'pending',
      });
      console.log('Created pending request:', newRequest._id);
      const populated = await PublishRequest.findById(newRequest._id).populate('requestedBy', 'name email');
      console.log('Full request:', JSON.stringify(populated, null, 2));
    }

    // List all pending requests
    console.log('\nAll pending requests:');
    const allPending = await PublishRequest.find({ status: 'pending' }).populate('requestedBy', 'name email');
    console.log(JSON.stringify(allPending, null, 2));

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createTestPublishRequest();
