import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000/api';

// Test data
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NTlkZGE0YzI0NmU4NDAwMGI4YTU5YSIsImlhdCI6MTczNDAxMjEzMSwic2hhZG9dFBhc3N3b3JkIjp0cnVlfQ.q1zDlU2qhCpGGQ9VN0QHkZkP9g4Cs_ZwxhEcNhEMpFo';

async function testUpload() {
  try {
    console.log('🚀 Starting typed resource upload test...\n');

    // Create a test file
    const testFileName = 'test-video.txt';
    const testFilePath = path.join(process.cwd(), testFileName);
    fs.writeFileSync(testFilePath, 'This is a test video file');

    // Get all categories first
    console.log('📋 Fetching categories...');
    const categoriesRes = await fetch(`${API_URL}/categories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });

    if (!categoriesRes.ok) {
      throw new Error(`Failed to fetch categories: ${categoriesRes.statusText}`);
    }

    const categoriesData = await categoriesRes.json();
    const category = categoriesData.categories?.[0];

    if (!category) {
      console.warn('⚠️  No categories found. Using placeholder.');
      category = { _id: '6759d5e3c246e84000b8a58e', name: 'General' };
    }

    console.log(`✓ Found category: ${category.name} (${category._id})\n`);

    // Test each resource type
    const testCases = [
      {
        resourceCategory: 'video',
        title: '🎥 Test Video Course',
        description: 'This is a test video resource',
      },
      {
        resourceCategory: 'book',
        title: '📚 Test Book',
        description: 'This is a test book resource',
      },
      {
        resourceCategory: 'test',
        title: '📝 Test Series',
        description: 'This is a test series resource',
      },
      {
        resourceCategory: 'notes',
        title: '📄 Test Notes',
        description: 'This is a test notes resource',
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n📤 Testing ${testCase.resourceCategory} upload...`);

      const formData = new FormData();
      formData.append('title', testCase.title);
      formData.append('description', testCase.description);
      formData.append('category', category._id);
      formData.append('resourceCategory', testCase.resourceCategory);
      formData.append('file', fs.createReadStream(testFilePath));

      const response = await fetch(`${API_URL}/typed-resources/create-typed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Failed: ${response.statusText}`);
        console.error('Error:', errorData);
        continue;
      }

      const data = await response.json();
      console.log(`✓ ${testCase.resourceCategory} uploaded successfully!`);
      console.log(`  ID: ${data.collectionId}`);
      console.log(`  Message: ${data.message}`);
    }

    // Clean up
    fs.unlinkSync(testFilePath);

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testUpload();
