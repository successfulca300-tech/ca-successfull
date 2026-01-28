const mongoose = require('mongoose');
const FreeResource = require('./models/FreeResource.js');

async function checkAndPublish() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-successful');

    const freeResources = await FreeResource.find({});
    console.log('Total FreeResource documents:', freeResources.length);

    freeResources.forEach((resource, index) => {
      console.log(`Resource ${index + 1}:`, {
        title: resource.title,
        publishStatus: resource.publishStatus,
        isPublished: resource.isPublished,
        isActive: resource.isActive,
        category: resource.category
      });
    });

    // Publish all resources that aren't published
    const unpublished = freeResources.filter(r => r.publishStatus !== 'published' || !r.isPublished);
    console.log('Unpublished resources:', unpublished.length);

    if (unpublished.length > 0) {
      await FreeResource.updateMany(
        { _id: { $in: unpublished.map(r => r._id) } },
        { publishStatus: 'published', isPublished: true, isActive: true }
      );
      console.log('Published', unpublished.length, 'resources');
    }

    const published = await FreeResource.find({ publishStatus: 'published', isPublished: true, isActive: true });
    console.log('Published resources:', published.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndPublish();
