import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Clear existing admin and subadmin users with these specific emails
    await User.deleteMany({ 
      email: { $in: ['nisank123456@gmail.com', 'kurmisachin833@gmail.com'] } 
    });
    console.log(' Cleared existing admin and subadmin users');

    // Create Admin User
    const adminEmail = 'nisank123456@gmail.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      // Don't hash password here - let the pre-save hook handle it
      const admin = await User.create({
        name:'Nj',
        email: adminEmail,
        password: 'admin123', // Plain password - will be hashed by pre-save hook
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin user created:');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: admin123`);
    } else {
      console.log('⚠️  Admin user already exists');
    }

    // Create Sub-Admin User
    const subadminEmail = 'kurmisachin833@gmail.com';
    const subadminExists = await User.findOne({ email: subadminEmail });

    if (!subadminExists) {
      // Don't hash password here - let the pre-save hook handle it
      const subadmin = await User.create({
        name: 'Sachin',
        email: subadminEmail,
        password: 'subadmin123', // Plain password - will be hashed by pre-save hook
        role: 'subadmin',
        isActive: true,
      });
      console.log('✅ Sub-Admin user created:');
      console.log(`   Email: ${subadminEmail}`);
      console.log(`   Password: subadmin123`);
    } else {
      console.log('⚠️  Sub-Admin user already exists');
    }

    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();

