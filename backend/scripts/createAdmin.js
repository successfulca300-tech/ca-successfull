import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if admin already exists
    const adminEmail = 'sachin123@gmail.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      // Update existing user to admin if not already
      if (adminExists.role !== 'admin') {
        adminExists.role = 'admin';
        adminExists.name = 'Sachin';
        if (adminExists.password !== 'sachin123') {
          adminExists.password = 'sachin123'; // Will be hashed by pre-save hook
        }
        await adminExists.save();
        console.log('✅ Updated existing user to admin:');
        console.log(`   Name: Sachin`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: sachin123`);
      } else {
        console.log('⚠️  Admin user already exists with this email');
      }
    } else {
      // Create new admin user
      const admin = await User.create({
        name: 'Sachin',
        email: adminEmail,
        password: 'sachin123', // Plain password - will be hashed by pre-save hook
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin user created:');
      console.log(`   Name: Sachin`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: sachin123`);
    }

    console.log('\n✅ Admin creation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

