import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FreeResource from '../models/FreeResource.js';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-successful';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const fixFreeResources = async () => {
  try {
    console.log('\n🔍 Scanning FreeResource collection...\n');

    // Find all FreeResources
    const allResources = await FreeResource.find({});
    console.log(`Total FreeResources: ${allResources.length}\n`);

    // Check for missing fields and fix them
    let fixed = 0;
    for (const resource of allResources) {
      let needsUpdate = false;

      // Ensure publishStatus is set
      if (!resource.publishStatus || !['draft', 'pending', 'published', 'rejected'].includes(resource.publishStatus)) {
        console.log(`⚠️  Resource "${resource.title}" missing/invalid publishStatus. Setting to 'draft'`);
        resource.publishStatus = 'draft';
        needsUpdate = true;
      }

      // Ensure isPublished is boolean
      if (typeof resource.isPublished !== 'boolean') {
        console.log(`⚠️  Resource "${resource.title}" missing isPublished. Setting to false`);
        resource.isPublished = false;
        needsUpdate = true;
      }

      // Ensure isActive is boolean (default true)
      if (typeof resource.isActive !== 'boolean') {
        console.log(`⚠️  Resource "${resource.title}" missing isActive. Setting to true`);
        resource.isActive = true;
        needsUpdate = true;
      }

      // Ensure resourceType is set
      if (!resource.resourceType || !['notes', 'pdf', 'document', 'study-material'].includes(resource.resourceType)) {
        console.log(`⚠️  Resource "${resource.title}" missing/invalid resourceType. Setting to 'document'`);
        resource.resourceType = 'document';
        needsUpdate = true;
      }

      // If publishStatus is 'published', ensure isPublished is true
      if (resource.publishStatus === 'published' && !resource.isPublished) {
        console.log(`✏️  Resource "${resource.title}" is published but isPublished=false. Fixing...`);
        resource.isPublished = true;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await resource.save();
        fixed++;
        console.log(`✅ Fixed resource: "${resource.title}"\n`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total FreeResources: ${allResources.length}`);
    console.log(`   Fixed: ${fixed}`);

    // Show published resources available to users
    const publishedResources = await FreeResource.find({
      publishStatus: 'published',
      isActive: { $ne: false },
      resourceType: { $in: ['notes', 'document'] }
    });

    console.log(`\n📚 Published & Visible Resources: ${publishedResources.length}`);
    publishedResources.forEach(r => {
      console.log(`   • ${r.title} (ID: ${r._id}) - Type: ${r.resourceType}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

(async () => {
  await connectDB();
  await fixFreeResources();
  await mongoose.disconnect();
  console.log('\n✅ Done!\n');
})();
